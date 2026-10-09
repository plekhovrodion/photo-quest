import { CLIP_OBJECTS } from '../data/clip';
import wasmUrl from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url';

// CLIP (ViT-B/32, квантованный): сравниваем фото с описаниями всех предметов игры и смотрим, на каком месте нужный.
// Описания посчитаны заранее (scripts/build-clip.mjs), в браузере считается только картинка.
const BASE = import.meta.env.BASE_URL;
export const CLIP_URL = `${BASE}models/clip/vision.onnx`;
const TEXT_URL = `${BASE}models/clip/text.json`;

const SIZE = 224;
const MEAN = [0.48145466, 0.4578275, 0.40821073];
const STD = [0.26862954, 0.26130258, 0.27577711];

type Table = [string, Float32Array][];
export type TextSet = 'ens';
interface Ready {
  run(pixels: Float32Array): Promise<Float32Array>;
  sets: Record<TextSet, Table>; // описания предметов: одна фраза или ансамбль из нескольких
  bg: Table; // «фон»: пустая комната, рука, стена и т. п.
}

let readyP: Promise<Ready> | null = null;

export function loadClip(): Promise<Ready> {
  readyP ??= (async () => {
    const [ort, textRaw, bytes] = await Promise.all([
      import('onnxruntime-web/wasm'),
      fetch(TEXT_URL).then((r) => r.json() as Promise<Record<'ens' | 'bg', Record<string, number[]>>>),
      fetch(CLIP_URL).then((r) => r.arrayBuffer()),
    ]);
    ort.env.wasm.wasmPaths = { wasm: wasmUrl }; // загрузчик внутри бандла, подгружаем только сам wasm
    ort.env.wasm.numThreads = 1; // без многопоточности не нужны особые заголовки сервера
    const session = await ort.InferenceSession.create(new Uint8Array(bytes), { executionProviders: ['wasm'] });
    const run = async (pixels: Float32Array) => {
      const out = await session.run({ pixel_values: new ort.Tensor('float32', pixels, [1, 3, SIZE, SIZE]) });
      return normalize(out.image_embeds.data as Float32Array);
    };
    const table = (o: Record<string, number[]>): Table => Object.entries(o).map(([k, v]) => [k, Float32Array.from(v)] as [string, Float32Array]);
    await run(new Float32Array(3 * SIZE * SIZE)); // прогрев
    return { run, sets: { ens: table(textRaw.ens) }, bg: table(textRaw.bg) };
  })();
  readyP.catch(() => { readyP = null; });
  return readyP;
}

const normalize = (v: Float32Array): Float32Array => {
  let s = 0;
  for (const x of v) s += x * x;
  const n = Math.sqrt(s) || 1;
  return v.map((x) => x / n);
};

// Вырез кадра -> 224x224, значения по правилам CLIP. 'full' — весь кадр целиком с серыми полями.
export type CropKind = 'center' | 'full' | 'start' | 'end';

export function toPixels(src: CanvasImageSource, w: number, h: number, kind: CropKind = 'center'): Float32Array {
  const side = Math.min(w, h);
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.imageSmoothingQuality = 'high';
  if (kind === 'full') {
    g.fillStyle = 'rgb(124,116,104)'; // среднее значение CLIP, поля не влияют на признаки
    g.fillRect(0, 0, SIZE, SIZE);
    const k = SIZE / Math.max(w, h);
    g.drawImage(src, 0, 0, w, h, (SIZE - w * k) / 2, (SIZE - h * k) / 2, w * k, h * k);
  } else {
    const wide = w >= h;
    const off = kind === 'center' ? (Math.max(w, h) - side) / 2 : kind === 'start' ? 0 : Math.max(w, h) - side;
    g.drawImage(src, wide ? off : 0, wide ? 0 : off, side, side, 0, 0, SIZE, SIZE);
  }
  const d = g.getImageData(0, 0, SIZE, SIZE).data;
  const out = new Float32Array(3 * SIZE * SIZE);
  const plane = SIZE * SIZE;
  for (let i = 0; i < plane; i++) {
    for (let ch = 0; ch < 3; ch++) out[ch * plane + i] = (d[i * 4 + ch] / 255 - MEAN[ch]) / STD[ch];
  }
  return out;
}

export interface ClipRank { en: string; ru: string; score: number; bg?: boolean }

// Какие вырезы проверяем: центр всегда; для вытянутого кадра ещё его края, плюс весь кадр целиком.
export function cropsFor(w: number, h: number, multi: boolean): CropKind[] {
  if (!multi) return ['center'];
  const r = Math.max(w, h) / Math.min(w, h);
  return r > 1.15 ? ['center', 'full', 'start', 'end'] : ['center', 'full'];
}

export async function embedCrops(src: CanvasImageSource, w: number, h: number, crops: CropKind[]): Promise<Float32Array[]> {
  const m = await loadClip();
  const out: Float32Array[] = [];
  for (const k of crops) out.push(await m.run(toPixels(src, w, h, k)));
  return out;
}

const dot = (a: Float32Array, b: Float32Array) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

export interface ScoreOpts { set: TextSet; bg: boolean }

// Сходство по вырезам: для каждого предмета берём лучший вырез. Фон идёт в тот же список.
export function scoreEmbeds(embeds: Float32Array[], tables: { objects: Table; bg: Table }, bgOn: boolean): ClipRank[] {
  const best = (t: Float32Array) => Math.max(...embeds.map((e) => dot(e, t)));
  const objs = tables.objects.map(([en, t]) => ({ en, ru: CLIP_OBJECTS[en] ?? en, score: best(t) }));
  const bgs = bgOn ? tables.bg.map(([n, t]) => ({ en: `~${n}`, ru: n, score: best(t), bg: true })) : [];
  return [...objs, ...bgs].sort((a, b) => b.score - a.score);
}

// Рабочие настройки; значения выбраны по замерам (см. README).
// Замер на 342 фото: ансамбль описаний и «фон» дают +1,5% к узнаванию и меньше ложных срабатываний;
// несколько вырезов почти не помогают (+0,2%), но замедляют проверку в 2–4 раза, поэтому выключены.
export const CLIP_CONFIG: { set: TextSet; bg: boolean; multi: boolean } = { set: 'ens', bg: true, multi: false };

// Все предметы игры, от самого похожего на фото к наименее похожему.
export async function rankObjects(src: CanvasImageSource, w: number, h: number, cfg = CLIP_CONFIG): Promise<ClipRank[]> {
  const m = await loadClip();
  const embeds = await embedCrops(src, w, h, cropsFor(w, h, cfg.multi));
  return scoreEmbeds(embeds, { objects: m.sets[cfg.set], bg: m.bg }, cfg.bg);
}

export async function clipTables() {
  const m = await loadClip();
  return { sets: m.sets, bg: m.bg };
}

// Вероятность предмета среди всех вариантов (предметы игры и «фон»): softmax с масштабом CLIP (100).
export function clipProb(ranks: ClipRank[], en: string): number {
  if (!ranks.length) return 0;
  const top = ranks[0].score;
  let sum = 0, mine = 0;
  for (const r of ranks) {
    const z = Math.exp(100 * (r.score - top));
    sum += z;
    if (r.en === en) mine = z;
  }
  return mine / sum;
}

// Порог засчитывания. Замер: при 0,02 узнаётся 87,7% (было 88,3% по правилу «в первых шести»), а путаница
// с соседними предметами того же места вдвое реже: 10% вместо 20%.
export const CLIP_ACCEPT = 0.02;
export const clipAccepts = (ranks: ClipRank[], en: string): boolean => clipProb(ranks, en) >= CLIP_ACCEPT;

// Нужный предмет входит в первые `top` по сходству.
export const CLIP_TOP = 2;
export const clipHas = (ranks: ClipRank[], en: string, top = CLIP_TOP): boolean =>
  ranks.slice(0, top).some((r) => r.en === en);

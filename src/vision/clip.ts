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

interface Ready {
  run(pixels: Float32Array): Promise<Float32Array>;
  text: [string, Float32Array][];
}

let readyP: Promise<Ready> | null = null;

export function loadClip(): Promise<Ready> {
  readyP ??= (async () => {
    const [ort, textRaw, bytes] = await Promise.all([
      import('onnxruntime-web/wasm'),
      fetch(TEXT_URL).then((r) => r.json() as Promise<Record<string, number[]>>),
      fetch(CLIP_URL).then((r) => r.arrayBuffer()),
    ]);
    ort.env.wasm.wasmPaths = { wasm: wasmUrl }; // загрузчик внутри бандла, подгружаем только сам wasm
    ort.env.wasm.numThreads = 1; // без многопоточности не нужны особые заголовки сервера
    const session = await ort.InferenceSession.create(new Uint8Array(bytes), { executionProviders: ['wasm'] });
    const run = async (pixels: Float32Array) => {
      const out = await session.run({ pixel_values: new ort.Tensor('float32', pixels, [1, 3, SIZE, SIZE]) });
      return normalize(out.image_embeds.data as Float32Array);
    };
    const text = Object.entries(textRaw).map(([k, v]) => [k, Float32Array.from(v)] as [string, Float32Array]);
    await run(new Float32Array(3 * SIZE * SIZE)); // прогрев
    return { run, text };
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

// Центральный квадрат кадра -> 224x224, значения по правилам CLIP.
export function toPixels(src: CanvasImageSource, w: number, h: number): Float32Array {
  const side = Math.min(w, h);
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, (w - side) / 2, (h - side) / 2, side, side, 0, 0, SIZE, SIZE);
  const d = g.getImageData(0, 0, SIZE, SIZE).data;
  const out = new Float32Array(3 * SIZE * SIZE);
  const plane = SIZE * SIZE;
  for (let i = 0; i < plane; i++) {
    for (let ch = 0; ch < 3; ch++) out[ch * plane + i] = (d[i * 4 + ch] / 255 - MEAN[ch]) / STD[ch];
  }
  return out;
}

export interface ClipRank { en: string; ru: string; score: number }

// Все предметы игры, от самого похожего на фото к наименее похожему.
export async function rankObjects(src: CanvasImageSource, w: number, h: number): Promise<ClipRank[]> {
  const m = await loadClip();
  const e = await m.run(toPixels(src, w, h));
  return m.text
    .map(([en, t]) => {
      let s = 0;
      for (let i = 0; i < e.length; i++) s += e[i] * t[i];
      return { en, ru: CLIP_OBJECTS[en] ?? en, score: s };
    })
    .sort((a, b) => b.score - a.score);
}

// Нужный предмет входит в первые `top` по сходству.
export const CLIP_TOP = 2;
export const clipHas = (ranks: ClipRank[], en: string, top = CLIP_TOP): boolean =>
  ranks.slice(0, top).some((r) => r.en === en);

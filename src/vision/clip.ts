import { scoreEmbeds, type Table, type ClipRank } from './clipScoring';
export { clipProb, clipAccepts, clipHas, CLIP_TOP, scoreEmbeds, type ClipRank } from './clipScoring';
import { fetchWithProgress, setClipReady, setClipLoading, setClipStage, setClipError } from './models';
import { prepareModelCache } from './modelCache';
import { CLIP_MODEL_VERSION } from './clipConstants';
import { assertRecognitionSupport } from './clipSupport';
export { CLIP_ACCEPT } from './clipConstants';

// MobileCLIP-S0 fp16: сравниваем фото с описаниями предметов игры и смотрим, на каком месте нужный.
// Описания посчитаны заранее (scripts/build-clip.mjs), в браузере считается только картинка.
const BASE = import.meta.env.BASE_URL;
export const CLIP_URL = `${BASE}models/clip/vision.onnx?v=${CLIP_MODEL_VERSION}`;
const TEXT_URL = `${BASE}models/clip/text.json?v=${CLIP_MODEL_VERSION}`;

const SIZE = 256;

export type TextSet = 'ens';
export interface ScoreOpts { set: TextSet; bg: boolean }
interface Ready {
  run(pixels: Float32Array): Promise<Float32Array>;
  sets: Record<TextSet, Table>; // описания предметов: одна фраза или ансамбль из нескольких
  bg: Table; // «фон»: пустая комната, рука, стена и т. п.
}

let readyP: Promise<Ready> | null = null;

export function loadClip(): Promise<Ready> {
  if (readyP) return readyP;
  setClipLoading();
  const attempt = new Promise<Ready>((resolve, reject) => {
    assertRecognitionSupport();
    const worker = new Worker(new URL('./clipWorker.ts', import.meta.url), { type: 'module' });
    const controller = new AbortController();
    const waiting = new Map<number, { ok: (v: Float32Array) => void; fail: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
    let nextId = 1;
    let dead = false;
    let tables: Pick<Ready, 'sets' | 'bg'>;
    const fail = (error: Error) => {
      if (dead) return;
      dead = true;
      clearTimeout(initTimer);
      controller.abort();
      worker.terminate();
      for (const pending of waiting.values()) { clearTimeout(pending.timer); pending.fail(error); }
      waiting.clear();
      readyP = null;
      setClipError(error);
      reject(error);
    };
    // Не оставляем зависший worker навсегда в кэше; повторный вход сможет восстановить модель.
    const initTimer = setTimeout(() => fail(new Error('Не удалось загрузить CLIP за 3 минуты')), 180_000);
    const run = (pixels: Float32Array) => new Promise<Float32Array>((ok, rejectRun) => {
      if (dead) { rejectRun(new Error('CLIP worker остановлен')); return; }
      const id = nextId++;
      const timer = setTimeout(() => fail(new Error('CLIP не ответил на запрос распознавания')), 60_000);
      waiting.set(id, { ok, fail: rejectRun, timer });
      try { worker.postMessage({ type: 'run', id, pixels }, [pixels.buffer]); }
      catch (error) { fail(new Error(String(error))); }
    });
    worker.addEventListener('message', (e: MessageEvent) => {
      if (dead) return;
      const m = e.data as { type: string; id?: number; emb?: Float32Array; message?: string; stage?: 'warmup' };
      if (m.type === 'ready') {
        clearTimeout(initTimer);
        setClipReady();
        resolve({ run, ...tables });
      } else if (m.type === 'result') {
        const pending = waiting.get(m.id!);
        if (pending) { clearTimeout(pending.timer); pending.ok(m.emb!); waiting.delete(m.id!); }
      } else if (m.type === 'stage' && m.stage) setClipStage(m.stage);
      else if (m.type === 'error') fail(new Error(m.message ?? 'Ошибка CLIP'));
    });
    worker.addEventListener('error', (e) => fail(new Error(e.message || 'CLIP worker завершился с ошибкой')));
    worker.addEventListener('messageerror', () => fail(new Error('Не удалось прочитать ответ CLIP')));
    void (async () => {
      await prepareModelCache();
      const [bytes, textRaw] = await Promise.all([
        fetchWithProgress(CLIP_URL, 'clip', controller.signal),
        fetch(TEXT_URL, { signal: controller.signal }).then((r) => {
          if (!r.ok) throw new Error(`CLIP text: ${r.status}`);
          return r.json() as Promise<Record<'ens' | 'bg', Record<string, number[]>>>;
        }),
      ]);
      const table = (o: Record<string, number[]>): Table => Object.entries(o).map(([k, v]) => [k, Float32Array.from(v)]);
      tables = { sets: { ens: table(textRaw.ens) }, bg: table(textRaw.bg) };
      if (!dead) {
        setClipStage('initialize');
        worker.postMessage({ type: 'init', bytes }, [bytes]);
      }
    })().catch((error) => fail(new Error(String(error))));
  });
  readyP = attempt;
  void attempt.catch((error) => {
    if (readyP === attempt) { readyP = null; setClipError(error); }
  });
  return attempt;
}

// Центральный квадрат -> 256x256 и RGB в диапазоне 0..1, как в MobileCLIP-S0.
// 'full' — весь кадр целиком с серыми полями.
export type CropKind = 'center' | 'full' | 'start' | 'end';

export function toPixels(src: CanvasImageSource, w: number, h: number, kind: CropKind = 'center'): Float32Array {
  const side = Math.min(w, h);
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.imageSmoothingQuality = 'high';
  if (kind === 'full') {
    g.fillStyle = 'rgb(124,116,104)'; // нейтральные поля для полного кадра
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
    for (let ch = 0; ch < 3; ch++) out[ch * plane + i] = d[i * 4 + ch] / 255;
  }
  return out;
}


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

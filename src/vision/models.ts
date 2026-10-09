import type { Prediction } from './labels';

// Модели лежат в public/models (скачаны с официальных адресов Google), поэтому грузятся с нашего же сайта:
// быстро, кэшируются браузером и работают без интернета.
const BASE = import.meta.env.BASE_URL ?? '/';
export const COCO_URL = `${BASE}models/ssdlite_mobilenet_v2/model.json`;
export const MOBILENET_URL = `${BASE}models/mobilenet_v2/model.json`;

export interface CocoModel {
  detect(img: HTMLVideoElement | HTMLCanvasElement, maxBoxes?: number, minScore?: number): Promise<Array<{ bbox: number[]; class: string; score: number }>>;
}
export interface MobilenetModel {
  classify(img: HTMLCanvasElement | HTMLVideoElement, topk: number): Promise<Prediction[]>;
}

export interface ModelStatus { coco: number; mobilenet: number; backend: string }
const status: ModelStatus = { coco: 0, mobilenet: 0, backend: '' };
const listeners = new Set<(s: ModelStatus) => void>();
const emit = () => listeners.forEach((l) => l({ ...status }));

export const modelStatus = (): ModelStatus => ({ ...status });
export function onModelStatus(cb: (s: ModelStatus) => void): () => void {
  listeners.add(cb);
  cb({ ...status });
  return () => { listeners.delete(cb); };
}

// Скачиваем model.json и все куски весов с подсчётом процентов; потом загрузчик tfjs берёт их из кэша браузера.
async function prefetch(modelUrl: string, key: 'coco' | 'mobilenet'): Promise<void> {
  const base = modelUrl.slice(0, modelUrl.lastIndexOf('/') + 1);
  const manifest = await (await fetch(modelUrl)).json();
  const paths: string[] = manifest.weightsManifest.flatMap((g: { paths: string[] }) => g.paths);
  const part = new Array(paths.length).fill(0);
  const report = () => { status[key] = Math.min(0.95, part.reduce((a, b) => a + b, 0) / paths.length); emit(); };
  await Promise.all(paths.map(async (p, i) => {
    const res = await fetch(base + p);
    const total = Number(res.headers.get('content-length')) || 4_194_304;
    const reader = res.body?.getReader();
    if (!reader) { await res.arrayBuffer(); part[i] = 1; report(); return; }
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      got += value.length;
      part[i] = Math.min(1, got / total);
      report();
    }
    part[i] = 1;
    report();
  }));
}

let tfP: Promise<typeof import('@tensorflow/tfjs')> | null = null;
function loadTf() {
  tfP ??= (async () => {
    const tf = await import('@tensorflow/tfjs');
    try { await tf.setBackend('webgl'); } catch { /* останется бэкенд по умолчанию */ }
    await tf.ready();
    status.backend = tf.getBackend();
    emit();
    return tf;
  })();
  return tfP;
}

const blank = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

let cocoP: Promise<CocoModel> | null = null;
export function loadCoco(): Promise<CocoModel> {
  cocoP ??= (async () => {
    const [, coco] = await Promise.all([loadTf().then(() => prefetch(COCO_URL, 'coco')), import('@tensorflow-models/coco-ssd')]);
    const model = (await coco.load({ base: 'lite_mobilenet_v2', modelUrl: COCO_URL })) as unknown as CocoModel;
    try { await model.detect(blank(320, 240), 1, 0.9); } catch { /* прогрев не обязателен */ }
    status.coco = 1;
    emit();
    return model;
  })();
  cocoP.catch(() => { cocoP = null; status.coco = 0; emit(); });
  return cocoP;
}

let mnP: Promise<MobilenetModel> | null = null;
export function loadMobilenet(): Promise<MobilenetModel> {
  mnP ??= (async () => {
    const [, mobilenet] = await Promise.all([loadTf().then(() => prefetch(MOBILENET_URL, 'mobilenet')), import('@tensorflow-models/mobilenet')]);
    const model = (await mobilenet.load({ version: 2, alpha: 1.0, modelUrl: MOBILENET_URL })) as unknown as MobilenetModel;
    try { await model.classify(blank(224, 224), 1); } catch { /* прогрев не обязателен */ }
    status.mobilenet = 1;
    emit();
    return model;
  })();
  mnP.catch(() => { mnP = null; status.mobilenet = 0; emit(); });
  return mnP;
}

// Запускаем загрузку обеих моделей в фоне (при старте игры и при входе в категорию).
export function preloadModels(withClip = true): void {
  // CLIP тяжелее (~90 МБ) и запускается на основном потоке, поэтому грузится после лёгких моделей и только когда игрок уже в игре.
  // Он необязателен: без него проверка работает на MobileNet и COCO.
  const light = Promise.all([loadMobilenet(), loadCoco()]);
  if (withClip) light.then(() => import('./clip')).then((m) => m.loadClip()).catch(() => {});
  else light.catch(() => {});
}

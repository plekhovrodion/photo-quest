// Модели лежат в public/models (скачаны с официальных адресов Google), поэтому грузятся с нашего же сайта:
// быстро, кэшируются браузером и работают без интернета.
const BASE = import.meta.env.BASE_URL ?? '/';
export const COCO_URL = `${BASE}models/ssdlite_mobilenet_v2/model.json`;

export interface CocoModel {
  detect(img: HTMLVideoElement | HTMLCanvasElement, maxBoxes?: number, minScore?: number): Promise<Array<{ bbox: number[]; class: string; score: number }>>;
}

export interface ModelStatus { coco: number; clip: number; backend: string; cocoError?: string; clipError?: string }
const status: ModelStatus = { coco: 0, clip: 0, backend: '' };
const listeners = new Set<(s: ModelStatus) => void>();
const emit = () => listeners.forEach((l) => l({ ...status }));

export const modelStatus = (): ModelStatus => ({ ...status });
export function onModelStatus(cb: (s: ModelStatus) => void): () => void {
  listeners.add(cb);
  cb({ ...status });
  return () => { listeners.delete(cb); };
}

// Скачиваем один файл с подсчётом процентов (для CLIP) и отдаём его байты.
export async function fetchWithProgress(url: string, key: 'clip', signal?: AbortSignal): Promise<ArrayBuffer> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body?.getReader();
  if (!reader) return res.arrayBuffer();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    if (total) { status[key] = Math.min(0.95, got / total); emit(); }
  }
  const out = new Uint8Array(got);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out.buffer;
}
export function setClipReady(): void { status.clip = 1; status.clipError = undefined; emit(); }
export function setClipLoading(): void { status.clip = 0; status.clipError = undefined; emit(); }
export function setClipError(error: unknown): void { status.clip = 0; status.clipError = String(error); emit(); }

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
    status.cocoError = undefined;
    const [, coco] = await Promise.all([loadTf(), import('@tensorflow-models/coco-ssd')]);
    const model = (await coco.load({ base: 'lite_mobilenet_v2', modelUrl: COCO_URL })) as unknown as CocoModel;
    try { await model.detect(blank(320, 240), 1, 0.9); } catch { /* прогрев не обязателен */ }
    status.coco = 1;
    emit();
    return model;
  })();
  cocoP.catch((error) => { cocoP = null; status.coco = 0; status.cocoError = String(error); emit(); });
  return cocoP;
}

// CLIP нужен для предметов, которых нет среди 80 классов COCO. Загружаем его
// на всех устройствах, включая телефоны: иначе часть заданий нельзя пройти.
// Функцию оставляем как единую точку политики загрузки тяжёлых моделей.
export function heavyModelsAllowed(): boolean {
  return true;
}

// Запускаем загрузку моделей в фоне (при старте игры и при входе в категорию).
export function preloadModels(withClip = true): void {
  // При входе в уровень запускаем обе загрузки независимо: ошибка COCO не должна
  // задерживать CLIP, который нужен для предметов вне классов COCO.
  void loadCoco().catch(() => {});
  if (withClip && heavyModelsAllowed()) void import('./clip').then((m) => m.loadClip()).catch(() => {});
}

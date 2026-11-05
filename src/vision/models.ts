// Модели лежат в public/models (скачаны с официальных адресов Google), поэтому грузятся с нашего же сайта:
// быстро, кэшируются браузером и работают без интернета.
const BASE = import.meta.env.BASE_URL ?? '/';
export const COCO_URL = `${BASE}models/ssdlite_mobilenet_v2/model.json`;

export interface CocoModel {
  detect(img: HTMLVideoElement | HTMLCanvasElement, maxBoxes?: number, minScore?: number): Promise<Array<{ bbox: number[]; class: string; score: number }>>;
}

export interface ModelStatus { coco: number; clip: number; backend: string }
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
export async function fetchWithProgress(url: string, key: 'clip'): Promise<ArrayBuffer> {
  const res = await fetch(url);
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
export function setClipReady(): void { status.clip = 1; emit(); }

// Скачиваем model.json и все куски весов с подсчётом процентов; потом загрузчик tfjs берёт их из кэша браузера.
async function prefetch(modelUrl: string, key: 'coco'): Promise<void> {
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

// Всё нужное для проверки фото уже загружено.
export const modelsReady = (): boolean => status.coco >= 1 && (!heavyModelsAllowed() || status.clip >= 1);

// Грузит обе модели и сообщает общий прогресс 0…1 (по размеру файлов: COCO ~18 МБ, CLIP ~89 МБ). Ошибки не бросает:
// игра работает и с тем, что удалось загрузить.
export async function whenModelsReady(onProgress: (p: number) => void): Promise<void> {
  const clipOn = heavyModelsAllowed();
  const off = onModelStatus((s) => onProgress(clipOn ? 0.17 * s.coco + 0.83 * s.clip : s.coco));
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const loads = Promise.all([
      loadCoco().catch(() => {}),
      ...(clipOn ? [import('./clip').then((m) => m.loadClip()).catch(() => {})] : []),
    ]).then(() => {});
    // При зависшей сети или ошибке инициализации камеры не нужно бесконечно ждать модель.
    await Promise.race([loads, new Promise<void>((resolve) => { timer = setTimeout(resolve, 20_000); })]);
  } finally {
    if (timer) clearTimeout(timer);
    off();
  }
}

// Автоматический benchmark в настоящем браузерном окружении. Использует те же
// модели, препроцессинг и пороги, что игра, затем отправляет JSON локальному runner.
import { LEVELS } from './data/tasks';
import { loadCoco, modelStatus } from './vision/models';
import { rankObjects, clipProb, CLIP_ACCEPT } from './vision/clip';
import { matchesLabels } from './vision/labels';

interface Sample {
  source: string; imageId: string; image: string; taskId: string; level: string;
  target: string; bbox: [number, number, number, number]; objectArea: number; size: string;
}
interface Result extends Sample {
  coco: boolean; clipFull: boolean; clipCrop: boolean; gameFull: boolean; gameCrop: boolean;
  clipFullProb: number; clipCropProb: number; cocoTop: string[]; clipTop: string[];
  cocoMs: number; clipFullMs: number; clipCropMs: number;
}

const params = new URLSearchParams(location.search);
const manifestUrl = params.get('manifest') ?? '/eval-data/open-images/manifest.jsonl';
const limit = Math.max(0, Number(params.get('limit') ?? 0) || 0);
const status = document.getElementById('status')!;
const rows = document.getElementById('rows')!;
const taskById = new Map(LEVELS.flatMap((level) => level.tasks.map((task) => [task.id, task] as const)));
const round = (n: number) => Math.round(n * 10000) / 10000;

function balanced(samples: Sample[], max: number): Sample[] {
  if (!max || samples.length <= max) return samples;
  const groups = new Map<string, Sample[]>();
  for (const sample of samples) {
    const group = groups.get(sample.taskId) ?? [];
    group.push(sample);
    groups.set(sample.taskId, group);
  }
  const out: Sample[] = [];
  for (let i = 0; out.length < max; i++) {
    let added = false;
    for (const group of groups.values()) {
      if (group[i] && out.length < max) { out.push(group[i]); added = true; }
    }
    if (!added) break;
  }
  return out;
}

function canvasOf(source: CanvasImageSource, width: number, height: number, maxSide = 640): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext('2d')!.drawImage(source, 0, 0, width, height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function cropOf(source: CanvasImageSource, width: number, height: number, box: Sample['bbox']): HTMLCanvasElement {
  const [nx0, ny0, nx1, ny1] = box;
  const x = nx0 * width, y = ny0 * height, w = (nx1 - nx0) * width, h = (ny1 - ny0) * height;
  const margin = 0.12;
  const x0 = Math.max(0, x - w * margin), y0 = Math.max(0, y - h * margin);
  const x1 = Math.min(width, x + w * (1 + margin)), y1 = Math.min(height, y + h * (1 + margin));
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 640 / Math.max(x1 - x0, y1 - y0));
  canvas.width = Math.max(1, Math.round((x1 - x0) * scale));
  canvas.height = Math.max(1, Math.round((y1 - y0) * scale));
  canvas.getContext('2d')!.drawImage(source, x0, y0, x1 - x0, y1 - y0, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function one(sample: Sample, cocoModel: Awaited<ReturnType<typeof loadCoco>>): Promise<Result> {
  const response = await fetch(`/eval-data/open-images/${sample.image}`);
  if (!response.ok) throw new Error(`${sample.image}: HTTP ${response.status}`);
  const bitmap = await createImageBitmap(await response.blob());
  const full = canvasOf(bitmap, bitmap.width, bitmap.height);
  const crop = cropOf(bitmap, bitmap.width, bitmap.height, sample.bbox);
  bitmap.close();
  const task = taskById.get(sample.taskId);
  const words = task?.local?.kind === 'labels' ? task.local.words : [];

  let at = performance.now();
  const detections = await cocoModel.detect(full, 8, 0.3);
  const cocoMs = performance.now() - at;
  const coco = matchesLabels(detections.map((d) => ({ className: d.class, probability: d.score })), words);

  at = performance.now();
  const fullRanks = await rankObjects(full, full.width, full.height);
  const clipFullMs = performance.now() - at;
  const clipFullProb = clipProb(fullRanks, sample.target);

  at = performance.now();
  const cropRanks = await rankObjects(crop, crop.width, crop.height);
  const clipCropMs = performance.now() - at;
  const clipCropProb = clipProb(cropRanks, sample.target);
  full.width = full.height = crop.width = crop.height = 1;

  return {
    ...sample, coco, clipFull: clipFullProb >= CLIP_ACCEPT, clipCrop: clipCropProb >= CLIP_ACCEPT,
    gameFull: coco || clipFullProb >= CLIP_ACCEPT, gameCrop: coco || clipCropProb >= CLIP_ACCEPT,
    clipFullProb: round(clipFullProb), clipCropProb: round(clipCropProb),
    cocoTop: detections.slice(0, 5).map((d) => `${d.class}:${round(d.score)}`),
    clipTop: fullRanks.filter((r) => !r.bg).slice(0, 5).map((r) => `${r.en}:${round(clipProb(fullRanks, r.en))}`),
    cocoMs: Math.round(cocoMs), clipFullMs: Math.round(clipFullMs), clipCropMs: Math.round(clipCropMs),
  };
}

function summary(results: Result[]) {
  const byTask: Record<string, { n: number; coco: number; clipFull: number; clipCrop: number; gameFull: number; gameCrop: number }> = {};
  for (const result of results) {
    const row = byTask[result.taskId] ??= { n: 0, coco: 0, clipFull: 0, clipCrop: 0, gameFull: 0, gameCrop: 0 };
    row.n++;
    for (const key of ['coco', 'clipFull', 'clipCrop', 'gameFull', 'gameCrop'] as const) row[key] += Number(result[key]);
  }
  const rate = (hits: number, n: number) => n ? round(hits / n) : 0;
  const tasks = Object.fromEntries(Object.entries(byTask).map(([id, row]) => [id, {
    n: row.n, coco: rate(row.coco, row.n), clipFull: rate(row.clipFull, row.n), clipCrop: rate(row.clipCrop, row.n),
    gameFull: rate(row.gameFull, row.n), gameCrop: rate(row.gameCrop, row.n),
  }]));
  const total = Object.values(byTask).reduce((n, row) => n + row.n, 0);
  const overall = Object.fromEntries((['coco', 'clipFull', 'clipCrop', 'gameFull', 'gameCrop'] as const).map((key) => [key, rate(results.filter((r) => r[key]).length, total)]));
  return { total, overall, tasks };
}

function paint(results: Result[]) {
  const report = summary(results);
  rows.innerHTML = Object.entries(report.tasks).map(([id, r]) => `<tr><td>${id}</td><td>${r.n}</td><td>${Math.round(r.coco * 100)}%</td><td>${Math.round(r.clipFull * 100)}%</td><td>${Math.round(r.clipCrop * 100)}%</td><td>${Math.round(r.gameFull * 100)}%</td><td>${Math.round(r.gameCrop * 100)}%</td></tr>`).join('');
}

async function run() {
  const manifest = await fetch(manifestUrl).then(async (r) => {
    if (!r.ok) throw new Error(`${manifestUrl}: HTTP ${r.status}`);
    return (await r.text()).trim().split(/\n+/).filter(Boolean).map((line) => JSON.parse(line) as Sample);
  });
  const samples = balanced(manifest, limit);
  status.textContent = `Загрузка моделей · ${samples.length} примеров`;
  const cocoModel = await loadCoco();
  await import('./vision/clip').then((m) => m.loadClip());
  const results: Result[] = [], errors: Array<{ sample: Sample; error: string }> = [];
  for (let i = 0; i < samples.length; i++) {
    try { results.push(await one(samples[i], cocoModel)); }
    catch (error) { errors.push({ sample: samples[i], error: String(error) }); }
    if ((i + 1) % 5 === 0 || i + 1 === samples.length) {
      status.textContent = `${i + 1}/${samples.length} · ошибок ${errors.length}`;
      paint(results);
    }
  }
  const report = {
    generatedAt: new Date().toISOString(), manifest: manifestUrl, requested: samples.length,
    model: { coco: 'COCO-SSD lite_mobilenet_v2', clip: 'CLIP ViT-B/32 q8', clipThreshold: CLIP_ACCEPT, backend: modelStatus().backend },
    ...summary(results), results, errors,
  };
  const sent = await fetch('/eval-result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report) });
  if (!sent.ok) throw new Error(`Не удалось сохранить отчёт: HTTP ${sent.status}`);
  status.textContent = `Готово: ${results.length} примеров, ошибок ${errors.length}`;
}

void run().catch(async (error) => {
  status.textContent = `Ошибка: ${String(error)}`;
  await fetch('/eval-result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fatal: String(error) }) }).catch(() => {});
});

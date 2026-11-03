import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { resolve, join } from 'node:path';
import { createInterface } from 'node:readline';
import { LEVELS } from '../../src/data/tasks.ts';

const ROOT = resolve(process.cwd(), '.eval-data/open-images');
const META = join(ROOT, 'metadata');
const IMAGES = join(ROOT, 'images');
const CLASS_URL = 'https://storage.googleapis.com/openimages/v7/oidv7-class-descriptions-boxable.csv';
// В V7 используются те же проверенные bounding boxes, опубликованные для V5.
const BOX_URL = 'https://storage.googleapis.com/openimages/v5/validation-annotations-bbox.csv';
const IMAGE_URL = (id) => `https://open-images-dataset.s3.amazonaws.com/validation/${id}.jpg`;

const args = process.argv.slice(2);
const value = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const perClass = Math.max(1, Number(value('--per-class', '50')) || 50);
const metadataOnly = args.includes('--metadata-only');
const concurrency = Math.max(1, Number(value('--concurrency', '8')) || 8);

mkdirSync(META, { recursive: true });
mkdirSync(IMAGES, { recursive: true });

async function download(url, path) {
  if (existsSync(path) && statSync(path).size > 1000) return;
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`${url}: HTTP ${res.status}`);
  const temp = `${path}.part`;
  await pipeline(Readable.fromWeb(res.body), createWriteStream(temp));
  const { renameSync } = await import('node:fs');
  renameSync(temp, path);
}

function csv(line) {
  const out = [];
  let value = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) { out.push(value); value = ''; }
    else value += ch;
  }
  out.push(value);
  return out;
}

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const ALIASES = {
  refrigerator: ['refrigerator'],
  'microwave oven': ['microwave oven'],
  'frying pan': ['frying pan'],
  television: ['television', 'monitor'],
  'wall clock': ['clock', 'alarm clock', 'wall clock'],
  'potted plant': ['houseplant', 'potted plant'],
  'teddy bear': ['teddy bear'],
  'mobile phone': ['mobile phone'],
  'computer keyboard': ['computer keyboard', 'keyboard'],
  'computer mouse': ['computer mouse'],
  shoe: ['footwear', 'shoe'],
  'orange fruit': ['orange'],
  bicycle: ['bicycle'],
  'wine glass': ['wine glass'],
  'picture frame': ['picture frame'],
  'pencil case': ['pencil case'],
  'glue stick': ['glue', 'glue stick'],
  'shampoo bottle': ['shampoo'],
  hairbrush: ['hair dryer', 'hairbrush', 'comb'],
  soap: ['soap dispenser'],
  toothpaste: ['toothpaste'],
  'rubber duck': ['rubber duck', 'duck'],
  bathtub: ['bathtub'],
  boots: ['boot'],
  gloves: ['glove'],
  necktie: ['tie'],
  airplane: ['fixed-wing aircraft', 'aircraft'],
};

function activeTasks() {
  return LEVELS.flatMap((level) => level.tasks.flatMap((task) => {
    if (task.local?.kind !== 'labels' || !task.local.clip) return [];
    return [{ taskId: task.id, level: level.id, target: task.local.clip, prompt: task.prompt }];
  }));
}

await Promise.all([
  download(CLASS_URL, join(META, 'classes.csv')),
  download(BOX_URL, join(META, 'validation-boxes.csv')),
]);

const classRows = readFileSync(join(META, 'classes.csv'), 'utf8').trim().split(/\r?\n/).map(csv);
const classByName = new Map(classRows.map(([id, name]) => [normalize(name), { id, name }]));
const tasks = activeTasks();
const coverage = tasks.map((task) => {
  const candidates = [...(ALIASES[task.target] ?? []), task.target];
  const hit = candidates.map(normalize).map((name) => classByName.get(name)).find(Boolean);
  return { ...task, openImagesId: hit?.id ?? null, openImagesClass: hit?.name ?? null };
});

const found = coverage.filter((x) => x.openImagesId);
const missing = coverage.filter((x) => !x.openImagesId);
writeFileSync(join(ROOT, 'coverage.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), activeTasks: tasks.length, covered: found.length, missing: missing.length, tasks: coverage }, null, 2)}\n`);
console.log(`Open Images: ${found.length}/${tasks.length} активных предметов сопоставлены`);
if (missing.length) console.log(`Нет класса: ${missing.map((x) => `${x.taskId} (${x.target})`).join(', ')}`);
if (metadataOnly) process.exit(0);

const targetsByLabel = new Map();
for (const item of found) {
  const list = targetsByLabel.get(item.openImagesId) ?? [];
  list.push(item);
  targetsByLabel.set(item.openImagesId, list);
}

const selected = new Map(found.map((x) => [x.taskId, { large: [], medium: [], small: [] }]));
const limit = Math.max(perClass * 8, 100);
const score = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const keep = (arr, sample) => {
  arr.push(sample);
  if (arr.length > limit) {
    arr.sort((a, b) => a.score - b.score);
    arr.length = limit;
  }
};

const boxesPath = join(META, 'validation-boxes.csv');
const lines = createInterface({ input: createReadStream(boxesPath), crlfDelay: Infinity });
let header;
for await (const line of lines) {
  const row = csv(line);
  if (!header) { header = Object.fromEntries(row.map((name, i) => [name, i])); continue; }
  const label = row[header.LabelName];
  const matched = targetsByLabel.get(label);
  if (!matched || row[header.IsGroupOf] === '1' || row[header.IsDepiction] === '1') continue;
  const x0 = Number(row[header.XMin]), x1 = Number(row[header.XMax]);
  const y0 = Number(row[header.YMin]), y1 = Number(row[header.YMax]);
  const area = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  const size = area >= 0.08 ? 'large' : area >= 0.02 ? 'medium' : 'small';
  const imageId = row[header.ImageID];
  for (const task of matched) keep(selected.get(task.taskId)[size], {
    score: score(`${task.taskId}:${imageId}:${x0}:${y0}`),
    source: 'open-images-v7', split: 'validation', imageId,
    image: `images/${imageId}.jpg`, url: IMAGE_URL(imageId),
    taskId: task.taskId, level: task.level, target: task.target,
    sourceClass: task.openImagesClass, sourceClassId: task.openImagesId,
    bbox: [x0, y0, x1, y1], objectArea: Number(area.toFixed(6)), size,
  });
}

const quota = {
  large: Math.ceil(perClass * 0.6),
  medium: Math.ceil(perClass * 0.3),
  small: perClass,
};
const manifest = [];
for (const task of found) {
  const buckets = selected.get(task.taskId);
  const chosen = [];
  for (const size of ['large', 'medium', 'small']) {
    buckets[size].sort((a, b) => a.score - b.score);
    const need = Math.min(quota[size], perClass - chosen.length);
    chosen.push(...buckets[size].slice(0, need));
  }
  // Если в предпочтительных корзинах не хватило кадров, добираем любым размером.
  if (chosen.length < perClass) {
    const used = new Set(chosen.map((x) => `${x.imageId}:${x.bbox.join(':')}`));
    const rest = Object.values(buckets).flat().filter((x) => !used.has(`${x.imageId}:${x.bbox.join(':')}`)).sort((a, b) => a.score - b.score);
    chosen.push(...rest.slice(0, perClass - chosen.length));
  }
  manifest.push(...chosen);
}

const images = [...new Map(manifest.map((x) => [x.imageId, x])).values()];
let done = 0, failed = 0, cursor = 0;
async function worker() {
  for (;;) {
    const i = cursor++;
    if (i >= images.length) return;
    const item = images[i];
    try { await download(item.url, join(ROOT, item.image)); done++; }
    catch (error) { failed++; console.error(`Не скачан ${item.imageId}: ${error.message}`); }
    if ((done + failed) % 50 === 0) console.log(`Изображения: ${done + failed}/${images.length}`);
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));

const available = new Set(images.filter((x) => existsSync(join(ROOT, x.image))).map((x) => x.imageId));
const finalManifest = manifest.filter((x) => available.has(x.imageId)).map(({ score: _, ...x }) => x);
writeFileSync(join(ROOT, 'manifest.jsonl'), `${finalManifest.map((x) => JSON.stringify(x)).join('\n')}\n`);
const counts = Object.fromEntries(found.map((x) => [x.taskId, finalManifest.filter((m) => m.taskId === x.taskId).length]));
writeFileSync(join(ROOT, 'summary.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), requestedPerClass: perClass, samples: finalManifest.length, images: available.size, failedDownloads: failed, counts }, null, 2)}\n`);
console.log(`Готово: ${finalManifest.length} примеров, ${available.size} изображений, ${failed} ошибок загрузки`);

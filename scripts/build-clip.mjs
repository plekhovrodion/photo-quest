// Одноразовая сборка файлов CLIP для игры: public/models/clip/{vision.onnx,text.json}.
// Запуск: node scripts/build-clip.mjs  (нужен интернет, скачивает модель с Hugging Face).
import { mkdirSync, writeFileSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { env, AutoTokenizer, CLIPTextModelWithProjection } from '@huggingface/transformers';
import { CLIP_OBJECTS, clipPrompt } from '../src/data/clip.ts';

const ID = 'Xenova/clip-vit-base-patch32';
const OUT = 'public/models/clip';
env.cacheDir = './.hf-cache';
mkdirSync(OUT, { recursive: true });

const tok = await AutoTokenizer.from_pretrained(ID);
const tm = await CLIPTextModelWithProjection.from_pretrained(ID, { dtype: 'q8' });
const names = Object.keys(CLIP_OBJECTS);
const { text_embeds } = await tm(tok(names.map(clipPrompt), { padding: true, truncation: true }));
const D = text_embeds.dims[1];
const out = {};
names.forEach((n, i) => {
  const v = Array.from(text_embeds.data.slice(i * D, (i + 1) * D));
  const len = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  out[n] = v.map((x) => Math.round((x / len) * 1e5) / 1e5);
});
writeFileSync(join(OUT, 'text.json'), JSON.stringify(out));

// Картинная часть: берём квантованную ONNX из кэша загрузки.
const find = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? find(p) : [p];
});
const { AutoProcessor, CLIPVisionModelWithProjection } = await import('@huggingface/transformers');
await CLIPVisionModelWithProjection.from_pretrained(ID, { dtype: 'q8' });
await AutoProcessor.from_pretrained(ID);
const vis = find('./.hf-cache').find((p) => p.endsWith('vision_model_quantized.onnx'));
copyFileSync(vis, join(OUT, 'vision.onnx'));
console.log('ok', names.length, 'меток, dim', D, statSync(join(OUT, 'vision.onnx')).size, 'байт');

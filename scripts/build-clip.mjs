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
const embed = async (texts) => {
  const { text_embeds } = await tm(tok(texts, { padding: true, truncation: true }));
  const D = text_embeds.dims[1];
  return texts.map((_, i) => unit(Array.from(text_embeds.data.slice(i * D, (i + 1) * D))));
};
const unit = (v) => { const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1; return v.map((x) => x / n); };
const round = (v) => v.map((x) => Math.round(x * 1e5) / 1e5);

// Ансамбль описаний: усреднённые вложения нескольких формулировок надёжнее одной.
const TEMPLATES = [
  (n) => `a photo of a ${n}.`, (n) => `a close-up photo of a ${n}.`, (n) => `a photo of a ${n} on a table.`,
  (n) => `a photo of a ${n} at home.`, (n) => `a bright photo of a ${n}.`, (n) => `a photo of the ${n}.`,
  (n) => `a low resolution photo of a ${n}.`, (n) => `a photo of a ${n} held in a hand.`,
];
// «Фон»: то, что часто попадает в кадр вместо предмета. Если фон похож сильнее предмета, предмет не засчитываем.
const BACKGROUND = ['an empty room', 'a wall', 'a floor', 'a human hand', 'a blurry photo', 'a dark photo', 'a ceiling', 'a window', 'a person', 'a bed sheet'];

const ens = {}, bg = {};
for (const n of names) {
  const vs = await embed(TEMPLATES.map((t) => t(n)));
  ens[n] = round(unit(vs[0].map((_, j) => vs.reduce((s, v) => s + v[j], 0))));
}
const bgv = await embed(BACKGROUND.map((n) => `a photo of ${n}.`));
BACKGROUND.forEach((n, i) => { bg[n] = round(bgv[i]); });
const D = bgv[0].length;
writeFileSync(join(OUT, 'text.json'), JSON.stringify({ ens, bg }));

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

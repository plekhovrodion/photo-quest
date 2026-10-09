import type { LocalCheck } from '../data/tasks';
import { colorShares } from './color';
import { evaluate, type Ctx } from './evaluate';
import { matchesLabels, PROB_MIN, type Prediction } from './labels';
import { ruName } from './names';

const SAMPLE = 96;

async function toCanvas(photo: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(photo);
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0);
  bmp.close();
  return canvas;
}

// Модель и tfjs грузятся лениво, при первой проверке предмета, чтобы не раздувать старт.
let modelPromise: Promise<{ classify(img: HTMLCanvasElement, topk: number): Promise<Prediction[]> }> | null = null;
function loadModel() {
  modelPromise ??= (async () => {
    const [tf, mobilenet] = await Promise.all([import('@tensorflow/tfjs'), import('@tensorflow-models/mobilenet')]);
    await tf.ready();
    return mobilenet.load({ version: 2, alpha: 1.0 });
  })();
  modelPromise.catch(() => { modelPromise = null; });
  return modelPromise;
}

export function preloadModel(): void {
  loadModel().catch(() => {});
}

// Все слова-метки, участвующие в проверке (для выбора подписи найденного предмета).
function wordsOf(check: LocalCheck): string[] {
  if (check.kind === 'labels') return check.words;
  if (check.kind === 'and') return check.checks.flatMap(wordsOf);
  return [];
}

// Русское название найденного предмета: берём лучший класс, подходящий под задание, иначе самый уверенный.
function pickLabel(preds: Prediction[] | null, check: LocalCheck): string | undefined {
  if (!preds?.length) return undefined;
  const words = wordsOf(check);
  const confident = preds.filter((p) => p.probability >= PROB_MIN);
  const best = confident.find((p) => words.length && matchesLabels([p], words)) ?? confident[0];
  return (best && ruName(best.className)) ?? undefined;
}

export async function localVerify(photo: Blob, check: LocalCheck): Promise<{ match: boolean; reason: string; label?: string }> {
  const canvas = await toCanvas(photo);
  const cache: { preds: Prediction[] | null } = { preds: null };
  const ctx: Ctx = {
    shares: () => {
      const small = document.createElement('canvas');
      small.width = small.height = SAMPLE;
      const c2d = small.getContext('2d', { willReadFrequently: true })!;
      c2d.drawImage(canvas, 0, 0, SAMPLE, SAMPLE);
      return colorShares(c2d.getImageData(0, 0, SAMPLE, SAMPLE).data, SAMPLE, SAMPLE);
    },
    predictions: async () => (cache.preds ??= await (await loadModel()).classify(canvas, 5)),
  };
  const match = await evaluate(check, ctx);
  return { match, reason: cache.preds?.[0]?.className ?? 'local', label: match ? pickLabel(cache.preds, check) : undefined };
}

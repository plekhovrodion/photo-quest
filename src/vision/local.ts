import type { LocalCheck } from '../data/tasks';
import { colorShares, type ColorName } from './color';
import { evaluate, type Ctx } from './evaluate';
import { matchesLabels, PROB_MIN, type Prediction } from './labels';
import { COLOR_RU, ruName } from './names';

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

// Какой цвет заметнее всего в центре кадра. Белый, чёрный и серый часто просто фон,
// поэтому сначала берём самый заметный цветной оттенок, и только если его нет — нейтральный.
const CHROMATIC: ColorName[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown'];
export function colorPhrase(shares: Record<ColorName, number>): string | undefined {
  const top = (names: ColorName[]) => names.map((n) => [n, shares[n]] as const).sort((a, b) => b[1] - a[1])[0];
  const [cn, cs] = top(CHROMATIC);
  if (cs >= 0.08) return `Здесь в основном ${COLOR_RU[cn]} цвет`;
  const [nn, ns] = top(['white', 'black', 'gray']);
  return ns >= 0.15 ? `Здесь в основном ${COLOR_RU[nn]} цвет` : undefined;
}

// Первый узнанный предмет на фото (для ответа «ты нашёл не то»).
function anyLabel(preds: Prediction[] | null): string | undefined {
  for (const p of preds ?? []) {
    if (p.probability < PROB_MIN) continue;
    const n = ruName(p.className);
    if (n) return n;
  }
  return undefined;
}

export async function localVerify(
  photo: Blob,
  check: LocalCheck,
): Promise<{ match: boolean; reason: string; label?: string; found?: string }> {
  const canvas = await toCanvas(photo);
  const cache: { preds: Prediction[] | null; shares: Record<ColorName, number> | null } = { preds: null, shares: null };
  const getShares = () => {
    if (!cache.shares) {
      const small = document.createElement('canvas');
      small.width = small.height = SAMPLE;
      const c2d = small.getContext('2d', { willReadFrequently: true })!;
      c2d.drawImage(canvas, 0, 0, SAMPLE, SAMPLE);
      cache.shares = colorShares(c2d.getImageData(0, 0, SAMPLE, SAMPLE).data, SAMPLE, SAMPLE);
    }
    return cache.shares;
  };
  const getPreds = async () => (cache.preds ??= await (await loadModel()).classify(canvas, 5));
  const match = await evaluate(check, { shares: getShares, predictions: getPreds });
  const reason = cache.preds?.[0]?.className ?? 'local';
  if (match) return { match, reason, label: pickLabel(cache.preds, check) };

  // Неверно: объясняем, что заврик увидел на фото.
  let found: string | undefined;
  if (check.kind === 'color' || check.kind === 'multicolor') {
    found = colorPhrase(getShares());
  } else {
    const label = anyLabel(await getPreds());
    found = label ? `Это ${label}` : colorPhrase(getShares());
  }
  return { match, reason, found };
}

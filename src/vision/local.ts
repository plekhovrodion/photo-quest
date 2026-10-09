import type { LocalCheck } from '../data/tasks';
import { colorShares, type ColorName } from './color';
import { evaluate, isMaybe, type Ctx } from './evaluate';
import { matchesLabels, PROB_MIN, type Prediction } from './labels';
import { COLOR_RU, ruName } from './names';
import { loadCoco, loadMobilenet } from './models';
import { rankObjects, clipAccepts, type ClipRank } from './clip';
import { CLIP_OBJECTS } from '../data/clip';

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

export { preloadModels as preloadModel } from './models';

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

// Сигналы проверки: класс, найденный живой камерой, идёт первым и считается уверенным.
export function fusePredictions(top: Prediction[], liveClass?: string): Prediction[] {
  return liveClass ? [{ className: liveClass, probability: 0.9 }, ...top] : top;
}

export interface VerifyOpts {
  cropped?: boolean; // кадр уже вырезан по предмету — цвет считаем по всему кадру
  liveClass?: string; // класс, который живая камера нашла в рамке (COCO), учитывается как ещё один сигнал
}

export async function localVerify(
  photo: Blob,
  check: LocalCheck,
  opts: VerifyOpts = {},
): Promise<{ match: boolean; maybe?: boolean; reason: string; label?: string; found?: string; foundLabel?: string }> {
  const canvas = await toCanvas(photo);
  const cache: { preds: Prediction[] | null; shares: Record<ColorName, number> | null } = { preds: null, shares: null };
  const getShares = () => {
    if (!cache.shares) {
      const small = document.createElement('canvas');
      small.width = small.height = SAMPLE;
      const c2d = small.getContext('2d', { willReadFrequently: true })!;
      c2d.drawImage(canvas, 0, 0, SAMPLE, SAMPLE);
      cache.shares = colorShares(c2d.getImageData(0, 0, SAMPLE, SAMPLE).data, SAMPLE, SAMPLE, opts.cropped ? 0.06 : 0.2);
    }
    return cache.shares;
  };
  // Сигналы: MobileNet по снимку (top-10), детектор COCO по тому же снимку (80 классов, знает вилку, ножницы,
  // зубную щётку, птицу, морковку) и класс, найденный живой камерой.
  const getPreds = async () => {
    if (!cache.preds) {
      const [top, dets] = await Promise.all([
        loadMobilenet().then((m) => m.classify(canvas, 10)),
        loadCoco().then((m) => m.detect(canvas, 6, 0.3)).catch(() => []),
      ]);
      cache.preds = fusePredictions([...top, ...dets.map((d) => ({ className: d.class, probability: d.score }))], opts.liveClass);
    }
    return cache.preds;
  };
  let clipRanks: ClipRank[] | null | undefined;
  const getClip = async () => {
    if (clipRanks === undefined) clipRanks = await rankObjects(canvas, canvas.width, canvas.height).catch(() => null);
    return clipRanks;
  };
  const ctx: Ctx = { shares: getShares, predictions: getPreds, clip: getClip };
  const match = await evaluate(check, ctx);
  const reason = cache.preds?.[0]?.className ?? 'local';
  if (match) {
    const byPreds = pickLabel(cache.preds, check);
    const viaClip = check.kind === 'labels' && check.clip && clipRanks && clipAccepts(clipRanks, check.clip);
    // Если предмет узнал только CLIP, называем его по заданию, а не по случайному классу MobileNet.
    return { match, reason, label: viaClip ? CLIP_OBJECTS[check.clip!] : byPreds };
  }

  // Неверно: объясняем, что заврик увидел на фото.
  let found: string | undefined;
  let foundLabel: string | undefined;
  if (check.kind === 'color' || check.kind === 'multicolor') {
    found = colorPhrase(getShares());
  } else {
    foundLabel = anyLabel(await getPreds()) ?? (await getClip())?.find((r) => !r.bg)?.ru;
    found = foundLabel ? `Это ${foundLabel}` : colorPhrase(getShares());
  }
  return { match, maybe: await isMaybe(check, ctx), reason, found, foundLabel };
}

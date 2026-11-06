import type { LocalCheck } from '../data/tasks';
import { colorShares, type ColorName } from './color';
import { evaluate, isMaybe, type Ctx } from './evaluate';
import { COLOR_RU } from './names';
import type { ClipRank } from './clip';
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

// Какой цвет заметнее всего в центре кадра. Белый, чёрный и серый часто просто фон,
// поэтому сначала берём самый заметный цветной оттенок, и только если его нет — нейтральный.
const CHROMATIC: ColorName[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown'];
export function colorPhrase(shares: Record<ColorName, number>): string | undefined {
  const top = (names: ColorName[]) => names.map((name) => [name, shares[name]] as const).sort((a, b) => b[1] - a[1])[0];
  const [cn, cs] = top(CHROMATIC);
  if (cs >= 0.08) return `Здесь в основном ${COLOR_RU[cn]} цвет`;
  const [nn, ns] = top(['white', 'black', 'gray']);
  return ns >= 0.15 ? `Здесь в основном ${COLOR_RU[nn]} цвет` : undefined;
}

export interface VerifyOpts {
  cropped?: boolean; // кадр уже вырезан по предмету — цвет считаем по всему кадру
  liveClip?: boolean; // CLIP уже узнал нужный предмет в этом кадре в живой камере
}

export async function localVerify(
  photo: Blob,
  check: LocalCheck,
  opts: VerifyOpts = {},
): Promise<{ match: boolean; maybe?: boolean; reason: string; label?: string; found?: string; foundLabel?: string }> {
  const canvas = await toCanvas(photo);
  let shares: Record<ColorName, number> | null = null;
  const getShares = () => {
    if (!shares) {
      const small = document.createElement('canvas');
      small.width = small.height = SAMPLE;
      const ctx = small.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(canvas, 0, 0, SAMPLE, SAMPLE);
      shares = colorShares(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data, SAMPLE, SAMPLE, opts.cropped ? 0.06 : 0.2);
    }
    return shares;
  };
  let clipRanks: ClipRank[] | null | undefined;
  const getClip = async () => {
    if (clipRanks === undefined) {
      const clip = await import('./clip');
      clipRanks = await clip.rankObjects(canvas, canvas.width, canvas.height).catch(() => null);
    }
    return clipRanks;
  };
  const ctx: Ctx = { shares: getShares, clip: getClip, liveClip: opts.liveClip };
  const match = await evaluate(check, ctx);
  const reason = clipRanks?.[0]?.en ?? 'local';
  if (match) {
    const label = check.kind === 'labels' && check.clip ? CLIP_OBJECTS[check.clip] : undefined;
    return { match, reason, label };
  }

  let found: string | undefined;
  let foundLabel: string | undefined;
  if (check.kind === 'color' || check.kind === 'multicolor') {
    found = colorPhrase(getShares());
  } else {
    const clipTop = (await getClip())?.find((rank) => !rank.bg);
    const clip = await import('./clip');
    const sure = clipTop && clipRanks && clip.clipProb(clipRanks, clipTop.en) >= 0.3 ? clipTop.ru : undefined;
    foundLabel = sure ?? clipTop?.ru;
    found = foundLabel ? `Это ${foundLabel}` : colorPhrase(getShares());
  }
  return { match, maybe: await isMaybe(check, ctx), reason, found, foundLabel };
}

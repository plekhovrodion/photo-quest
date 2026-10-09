import type { LocalCheck } from '../data/tasks';
import { COLOR_SHARE_MIN, hasColor, type ColorName } from './color';
import { matchesLabels, type Prediction } from './labels';
import { clipHas, type ClipRank } from './clip';

// Ленивый контекст: цвета и предсказания MobileNet считаются только если нужны.
export interface Ctx {
  shares(): Record<ColorName, number> | Promise<Record<ColorName, number>>;
  predictions(): Prediction[] | Promise<Prediction[]>;
  clip?(): Promise<ClipRank[] | null>; // CLIP считается только если остальные модели не узнали предмет
}

export const ANY_PROB_MIN = 0.15; // «на фото есть узнаваемый предмет»
const MULTI_SHARE_MIN = 0.1;
const CHROMATIC: ColorName[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown'];

export async function evaluate(check: LocalCheck, ctx: Ctx): Promise<boolean> {
  switch (check.kind) {
    case 'color':
      return hasColor(await ctx.shares(), check.color);
    case 'labels': {
      if (matchesLabels(await ctx.predictions(), check.words)) return true;
      if (!check.clip || !ctx.clip) return false;
      const ranks = await ctx.clip();
      return !!ranks && clipHas(ranks, check.clip);
    }
    case 'and':
      for (const c of check.checks) if (!(await evaluate(c, ctx))) return false;
      return true;
    case 'any':
      return (await ctx.predictions()).some((p) => p.probability >= ANY_PROB_MIN);
    case 'multicolor': {
      const s = await ctx.shares();
      return CHROMATIC.filter((c) => s[c] >= MULTI_SHARE_MIN).length >= check.min;
    }
  }
}

export { COLOR_SHARE_MIN };

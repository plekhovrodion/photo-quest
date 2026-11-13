import type { LocalCheck } from '../data/tasks';
import { COLOR_SHARE_MIN, hasColor, type ColorName } from './color';
import { clipAccepts, clipProb, type ClipRank } from './clipScoring';
import { CLIP_ACCEPT } from './clipConstants';

// Ленивый контекст: вычисляем цветовые доли или CLIP ранжирование только когда они нужны.
export interface Ctx {
  shares(): Record<ColorName, number> | Promise<Record<ColorName, number>>;
  liveClip?: boolean; // CLIP узнал предмет в живой камере: засчитываем без повторной проверки
  clip?(): Promise<ClipRank[] | null>;
}

export const ANY_PROB_MIN = 0.15; // «на фото есть узнаваемый предмет»
const MULTI_SHARE_MIN = 0.1;
const CHROMATIC: ColorName[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown'];

export async function evaluate(check: LocalCheck, ctx: Ctx): Promise<boolean> {
  switch (check.kind) {
    case 'color':
      return hasColor(await ctx.shares(), check.color);
    case 'labels': {
      if (ctx.liveClip) return true;
      if (!check.clip || !ctx.clip) return false;
      const ranks = await ctx.clip();
      return !!ranks && clipAccepts(ranks, check.clip);
    }
    case 'and':
      for (const c of check.checks) if (!(await evaluate(c, ctx))) return false;
      return true;
    case 'any':
      if (!ctx.clip) return false;
      {
        const ranks = await ctx.clip();
        const top = ranks?.find((rank) => !rank.bg);
        return !!ranks && !!top && clipProb(ranks, top.en) >= ANY_PROB_MIN;
      }
    case 'multicolor': {
      const s = await ctx.shares();
      return CHROMATIC.filter((c) => s[c] >= MULTI_SHARE_MIN).length >= check.min;
    }
  }
}

// «Не уверен»: фото почти подошло. Тогда игра не отказывает, а спрашивает ребёнка.
export const COLOR_MAYBE = COLOR_SHARE_MIN / 2;
const CLIP_MAYBE = CLIP_ACCEPT / 2;

export async function isMaybe(check: LocalCheck, ctx: Ctx): Promise<boolean> {
  switch (check.kind) {
    case 'color':
      return (await ctx.shares())[check.color] >= COLOR_MAYBE;
    case 'labels': {
      if (!check.clip || !ctx.clip) return false;
      const ranks = await ctx.clip();
      const probability = ranks ? clipProb(ranks, check.clip) : 0;
      return probability >= CLIP_MAYBE && probability < CLIP_ACCEPT;
    }
    default:
      return false;
  }
}

export { COLOR_SHARE_MIN };

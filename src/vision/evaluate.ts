import type { LocalCheck } from '../data/tasks';
import { COLOR_SHARE_MIN, hasColor, type ColorName } from './color';
import { matchesLabels, type Prediction } from './labels';

// Ленивый контекст: цвета и предсказания детектора считаются только если нужны.
export interface Ctx {
  shares(): Record<ColorName, number> | Promise<Record<ColorName, number>>;
  predictions(): Prediction[] | Promise<Prediction[]>;
}

export const ANY_PROB_MIN = 0.15; // «на фото есть узнаваемый предмет»
const MULTI_SHARE_MIN = 0.1;
const CHROMATIC: ColorName[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown'];

export async function evaluate(check: LocalCheck, ctx: Ctx): Promise<boolean> {
  switch (check.kind) {
    case 'color':
      return hasColor(await ctx.shares(), check.color);
    case 'labels': {
      return matchesLabels(await ctx.predictions(), check.words);
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

// «Не уверен»: фото почти подошло. Тогда игра не отказывает, а спрашивает ребёнка.
export const PROB_MAYBE = 0.015; // детектор видит нужный класс, но совсем слабо
export const COLOR_MAYBE = COLOR_SHARE_MIN / 2;

export async function isMaybe(check: LocalCheck, ctx: Ctx): Promise<boolean> {
  switch (check.kind) {
    case 'color':
      return (await ctx.shares())[check.color] >= COLOR_MAYBE;
    case 'labels': {
      const weak = (await ctx.predictions()).some(
        (p) => p.probability >= PROB_MAYBE && check.words.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(p.className)),
      );
      return weak;
    }
    default:
      return false;
  }
}

export { COLOR_SHARE_MIN };

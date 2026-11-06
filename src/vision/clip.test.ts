import { describe, expect, it } from 'vitest';
import { CLIP_OBJECTS } from '../data/clip';
import { LEVELS } from '../data/tasks';
import { clipHas, clipProb, clipAccepts, type ClipRank } from './clip';
import { evaluate, isMaybe } from './evaluate';

const ranks = (...en: string[]): ClipRank[] => en.map((e, i) => ({ en: e, ru: e, score: 1 - i / 10 }));

describe('CLIP', () => {
  it('предмет засчитывается, если он среди первых двух', () => {
    expect(clipHas(ranks('spoon', 'fork', 'cup'), 'fork')).toBe(true);
    expect(clipHas(ranks('spoon', 'fork', 'cup'), 'cup')).toBe(false);
  });

  it('у каждого задания с предметом есть описание для CLIP', () => {
    for (const l of LEVELS) for (const t of l.tasks) {
      if (t.local?.kind !== 'labels') continue;
      expect(t.local.clip, t.id).toBeTruthy();
      expect(CLIP_OBJECTS[t.local.clip!], `${t.id}: ${t.local.clip}`).toBeTruthy();
    }
  });

  it('evaluate: CLIP узнаёт предмет и проверяет его', async () => {
    const check = { kind: 'labels' as const, words: ['bench'], clip: 'bench' };
    const base = { shares: () => ({}) as never };
    expect(await evaluate(check, { ...base, clip: async () => ranks('bench', 'chair') })).toBe(true);
    expect(await evaluate(check, { ...base, clip: async () => ranks('chair', 'sofa', 'bench') })).toBe(false);
    expect(await evaluate(check, { ...base, clip: async () => null })).toBe(false);
    expect(await evaluate(check, base)).toBe(false);
  });
});

describe('«не уверен»', () => {
  const base = { shares: () => ({ red: 0.12 }) as never };
  it('предмет: слабый сигнал моделей — «возможно»', async () => {
    const check = { kind: 'labels' as const, words: ['spoon'], clip: 'spoon' };
    const sameScore = (count: number): ClipRank[] => Array.from({ length: count }, (_, i) => ({ en: i === 0 ? 'spoon' : `other-${i}`, ru: '', score: 0.3 }));
    const weak = sameScore(75);
    const veryWeak = sameScore(150);
    expect(await isMaybe(check, { ...base, clip: async () => weak })).toBe(true);
    expect(await isMaybe(check, { ...base, clip: async () => veryWeak })).toBe(false);
  });
  it('цвет: половина порога — «возможно»', async () => {
    expect(await isMaybe({ kind: 'color', color: 'red' }, base)).toBe(true);
    expect(await isMaybe({ kind: 'color', color: 'blue' }, base)).toBe(false);
  });
});

describe('вероятность CLIP', () => {
  const r = (pairs: [string, number][]): ClipRank[] => pairs.map(([en, score]) => ({ en, ru: en, score }));
  it('лидер получает высокую вероятность, отстающий почти нулевую', () => {
    const ranks = r([['spoon', 0.3], ['fork', 0.29], ['cup', 0.2]]);
    expect(clipProb(ranks, 'spoon')).toBeGreaterThan(0.5);
    expect(clipProb(ranks, 'fork')).toBeGreaterThan(0.2); // отстаёт на 0,01 — ещё близко
    expect(clipProb(ranks, 'cup')).toBeLessThan(0.001);
    expect(clipProb(ranks, 'нет такого')).toBe(0);
  });
  it('порог засчитывания: близкий второй проходит, далёкий нет', () => {
    const ranks = r([['spoon', 0.3], ['fork', 0.28], ['cup', 0.25]]);
    expect(clipAccepts(ranks, 'spoon')).toBe(true);
    expect(clipAccepts(ranks, 'fork')).toBe(true);
    expect(clipAccepts(ranks, 'cup')).toBe(false);
  });
  it('фон вытесняет предмет: если «пустая комната» похожа сильнее, предмет не засчитывается', () => {
    const ranks: ClipRank[] = [{ en: '~an empty room', ru: 'an empty room', score: 0.3, bg: true }, { en: 'spoon', ru: 'spoon', score: 0.2 }];
    expect(clipAccepts(ranks, 'spoon')).toBe(false);
  });
});

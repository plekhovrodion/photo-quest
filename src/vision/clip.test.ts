import { describe, expect, it } from 'vitest';
import { CLIP_OBJECTS } from '../data/clip';
import { LEVELS } from '../data/tasks';
import { clipHas, type ClipRank } from './clip';
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

  it('evaluate: старые модели не узнали, CLIP узнал — засчитываем', async () => {
    const check = { kind: 'labels' as const, words: ['bench'], clip: 'bench' };
    const base = { shares: () => ({}) as never, predictions: () => [{ className: 'jigsaw puzzle', probability: 0.9 }] };
    expect(await evaluate(check, { ...base, clip: async () => ranks('bench', 'chair') })).toBe(true);
    expect(await evaluate(check, { ...base, clip: async () => ranks('chair', 'sofa', 'bench') })).toBe(false);
    expect(await evaluate(check, { ...base, clip: async () => null })).toBe(false);
    expect(await evaluate(check, base)).toBe(false);
  });
});

describe('«не уверен»', () => {
  const base = { shares: () => ({ red: 0.12 }) as never };
  it('предмет: слабый сигнал или CLIP на местах 3–6 — «возможно»', async () => {
    const check = { kind: 'labels' as const, words: ['spoon'], clip: 'spoon' };
    const preds = (p: number) => () => [{ className: 'wooden spoon', probability: p }];
    expect(await isMaybe(check, { ...base, predictions: preds(0.02) })).toBe(true);
    expect(await isMaybe(check, { ...base, predictions: preds(0.001) })).toBe(false);
    expect(await isMaybe(check, { ...base, predictions: preds(0.001), clip: async () => ranks('fork', 'cup', 'plate', 'spoon') })).toBe(true);
    expect(await isMaybe(check, { ...base, predictions: preds(0.001), clip: async () => ranks('a', 'b', 'c', 'd', 'e', 'f', 'spoon') })).toBe(false);
  });
  it('цвет: половина порога — «возможно»', async () => {
    expect(await isMaybe({ kind: 'color', color: 'red' }, { ...base, predictions: () => [] })).toBe(true);
    expect(await isMaybe({ kind: 'color', color: 'blue' }, { ...base, predictions: () => [] })).toBe(false);
  });
});

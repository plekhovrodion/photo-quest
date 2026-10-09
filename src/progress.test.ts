import { describe, expect, it } from 'vitest';
import { LEVELS } from './data/tasks';
import { SHOP, LEVEL_BONUS, buy, canBuy, isPassed, loadProgress, recordResult } from './progress';

const fresh = () => loadProgress();

describe('progress', () => {
  it('вспышки начисляются за найденное и бонус за первое прохождение', () => {
    const p = recordResult(fresh(), 'a', 20, true);
    expect(p.flashes).toBe(20 + LEVEL_BONUS);
  });
  it('бонус за уровень даётся один раз', () => {
    let p = recordResult(fresh(), 'a', 20, true);
    p = recordResult(p, 'a', 10, true);
    expect(p.flashes).toBe(20 + LEVEL_BONUS + 10);
  });
  it('лучший результат не ухудшается', () => {
    let p = recordResult(fresh(), 'a', 20, true);
    p = recordResult(p, 'a', 5, false);
    expect(p.levels.a).toEqual({ stars: 20, passed: true });
  });
  it('покупка списывает вспышки и не повторяется', () => {
    const item = SHOP[0];
    let p = { levels: {}, flashes: item.price + 3, owned: [] as string[] };
    expect(canBuy(p, item)).toBe(true);
    p = buy(p, item);
    expect(p.flashes).toBe(3);
    expect(p.owned).toEqual([item.id]);
    expect(canBuy(p, item)).toBe(false);
    expect(buy(p, item)).toBe(p);
  });
  it('нельзя купить без денег', () => {
    const p = { levels: {}, flashes: 0, owned: [] as string[] };
    expect(buy(p, SHOP[0])).toBe(p);
  });
  it('порог прохождения 70%', () => {
    expect(isPassed(7, 10)).toBe(true);
    expect(isPassed(6, 10)).toBe(false);
  });
  it('у всех заданий уникальные id и есть подсказки', () => {
    const tasks = LEVELS.flatMap((l) => l.tasks);
    expect(new Set(tasks.map((x) => x.id)).size).toBe(tasks.length);
    expect(tasks.every((x) => x.hint)).toBe(true);
  });
});

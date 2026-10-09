import { describe, expect, it } from 'vitest';
import { LEVELS } from './data/tasks';
import { SHOP, LEVEL_BONUS, buy, canBuy, loadProgress, recordTask } from './progress';

const fresh = () => loadProgress();
const lvl = { id: 'a', tasks: [{ id: 't1' }, { id: 't2' }] };

describe('recordTask', () => {
  it('начисляет вспышки за первое нахождение', () => {
    const { progress, levelDone } = recordTask(fresh(), lvl, 't1', 3);
    expect(progress.flashes).toBe(3);
    expect(progress.found.t1).toBe(3);
    expect(levelDone).toBe(false);
  });
  it('повторное нахождение ничего не даёт', () => {
    const once = recordTask(fresh(), lvl, 't1', 3).progress;
    const again = recordTask(once, lvl, 't1', 3);
    expect(again.progress).toBe(once);
    expect(again.levelDone).toBe(false);
  });
  it('бонус за категорию, когда найдены все задания, один раз', () => {
    const a = recordTask(fresh(), lvl, 't1', 3).progress;
    const b = recordTask(a, lvl, 't2', 2);
    expect(b.levelDone).toBe(true);
    expect(b.progress.flashes).toBe(3 + 2 + LEVEL_BONUS);
    expect(b.progress.levels.a).toEqual({ stars: 5, passed: true });
  });
});

describe('магазин', () => {
  const base = { levels: {}, found: {}, owned: [] as string[] };
  it('покупка списывает вспышки и не повторяется', () => {
    const item = SHOP[0];
    let p = { ...base, flashes: item.price + 3 };
    expect(canBuy(p, item)).toBe(true);
    p = buy(p, item);
    expect(p.flashes).toBe(3);
    expect(p.owned).toEqual([item.id]);
    expect(canBuy(p, item)).toBe(false);
    expect(buy(p, item)).toBe(p);
  });
  it('нельзя купить без денег', () => {
    const p = { ...base, flashes: 0 };
    expect(buy(p, SHOP[0])).toBe(p);
  });
});

describe('банк заданий', () => {
  it('у всех заданий уникальные id и есть подсказки', () => {
    const tasks = LEVELS.flatMap((l) => l.tasks);
    expect(new Set(tasks.map((x) => x.id)).size).toBe(tasks.length);
    expect(tasks.every((x) => x.hint)).toBe(true);
  });
});

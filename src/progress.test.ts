import { describe, expect, it } from 'vitest';
import { LEVELS } from './data/tasks';
import { LEVEL_BONUS, canUnlock, isUnlocked, loadProgress, priceOf, recordTask, sanitizeOwned, unlockLevel } from './progress';

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

describe('открытие мест за вспышки', () => {
  const base = { levels: {}, found: {}, owned: [] as string[] };
  it('«Цвета» открыты сразу, остальные закрыты', () => {
    expect(priceOf('colors')).toBe(0);
    expect(isUnlocked(base, 'colors')).toBe(true);
    expect(isUnlocked(base, 'kitchen')).toBe(false);
    expect(priceOf('kitchen')).toBeGreaterThan(0);
  });
  it('покупка списывает вспышки и открывает место', () => {
    const price = priceOf('kitchen');
    let p = { ...base, flashes: price + 3 };
    expect(canUnlock(p, 'kitchen')).toBe(true);
    p = unlockLevel(p, 'kitchen');
    expect(p.flashes).toBe(3);
    expect(p.owned).toEqual(['kitchen']);
    expect(isUnlocked(p, 'kitchen')).toBe(true);
    expect(canUnlock(p, 'kitchen')).toBe(false); // повторно нельзя
    expect(unlockLevel(p, 'kitchen')).toBe(p);
  });
  it('без денег открыть нельзя', () => {
    const p = { ...base, flashes: priceOf('kitchen') - 1 };
    expect(canUnlock(p, 'kitchen')).toBe(false);
    expect(unlockLevel(p, 'kitchen')).toBe(p);
  });
  it('цены растут вместе с «дальностью» мест и достижимы', () => {
    const paid = LEVELS.filter((l) => l.price > 0);
    expect(paid.length).toBe(LEVELS.length - 1);
    for (const l of paid) expect(l.price).toBeLessThanOrEqual(40);
    // всё в «Цветах» (10 заданий по 3 вспышки + бонус) хватает на первое платное место
    expect(10 * 3 + LEVEL_BONUS).toBeGreaterThan(priceOf('kitchen'));
  });
  it('старые id друзей из магазина отбрасываются', () => {
    expect(sanitizeOwned(['grisha', 'kitchen', 'kitchen', 'ship', 7, null])).toEqual(['kitchen']);
    expect(sanitizeOwned('x')).toEqual([]);
  });
});

describe('банк заданий', () => {
  it('у всех заданий уникальные id и есть подсказки', () => {
    const tasks = LEVELS.flatMap((l) => l.tasks);
    expect(new Set(tasks.map((x) => x.id)).size).toBe(tasks.length);
    expect(tasks.every((x) => x.hint)).toBe(true);
  });
});

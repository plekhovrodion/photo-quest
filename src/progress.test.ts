import { describe, expect, it } from 'vitest';
import { LEVELS } from './data/tasks';
import { LEVEL_BONUS, loadProgress, priceOf, recordTask, sanitizeOwned } from './progress';

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


describe('банк заданий', () => {
  it('у всех заданий уникальные id и есть подсказки', () => {
    const tasks = LEVELS.flatMap((l) => l.tasks);
    expect(new Set(tasks.map((x) => x.id)).size).toBe(tasks.length);
    expect(tasks.every((x) => x.hint)).toBe(true);
  });
});

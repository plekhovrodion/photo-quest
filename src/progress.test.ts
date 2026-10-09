import { describe, expect, it } from 'vitest';
import { LEVELS } from './data/tasks';
import { isPassed, isUnlocked, recordResult } from './progress';

describe('progress', () => {
  it('первый уровень открыт, остальные закрыты', () => {
    expect(isUnlocked({}, 0)).toBe(true);
    expect(isUnlocked({}, 1)).toBe(false);
  });
  it('уровень открывается после прохождения предыдущего', () => {
    const p = recordResult({}, LEVELS[0].id, 20, true);
    expect(isUnlocked(p, 1)).toBe(true);
    expect(isUnlocked(p, 2)).toBe(false);
  });
  it('результат не ухудшается', () => {
    let p = recordResult({}, 'a', 20, true);
    p = recordResult(p, 'a', 5, false);
    expect(p.a).toEqual({ stars: 20, passed: true });
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

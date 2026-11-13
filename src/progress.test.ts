import { describe, expect, it, vi } from 'vitest';
import { LEVELS } from './data/tasks';
import { loadProgress, recordTask } from './progress';

const fresh = () => loadProgress();
const lvl = { id: 'a', tasks: [{ id: 't1' }, { id: 't2' }] };

describe('recordTask', () => {
  it('сохраняет первое нахождение', () => {
    const { progress, levelDone } = recordTask(fresh(), lvl, 't1', 3);
    expect(progress.found.t1).toBe(3);
    expect(levelDone).toBe(false);
  });
  it('повторное нахождение ничего не даёт', () => {
    const once = recordTask(fresh(), lvl, 't1', 3).progress;
    const again = recordTask(once, lvl, 't1', 3);
    expect(again.progress).toBe(once);
    expect(again.levelDone).toBe(false);
  });
  it('отмечает категорию, когда найдены все задания', () => {
    const a = recordTask(fresh(), lvl, 't1', 3).progress;
    const b = recordTask(a, lvl, 't2', 2);
    expect(b.levelDone).toBe(true);
    expect(b.progress.levels.a).toEqual({ stars: 5, passed: true });
  });
});

describe('старый прогресс', () => {
  it('пересчитывает завершённость по находкам и текущим заданиям', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ found: { 'color-red': 3 }, levels: { colors: { passed: true, stars: 30 } } }),
    });
    expect(loadProgress().levels).toEqual({});
    vi.unstubAllGlobals();
  });
  it('сохраняет находки и убирает удалённую валюту', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ found: { 'color-red': 3 }, levels: {}, flashes: 12, owned: ['kitchen'], fed: { sonya: 2 } }),
    });
    expect(loadProgress()).toEqual({ found: { 'color-red': 3 }, levels: {} });
    vi.unstubAllGlobals();
  });
});


describe('банк заданий', () => {
  it('у всех заданий уникальные id и есть подсказки', () => {
    const tasks = LEVELS.flatMap((l) => l.tasks);
    expect(new Set(tasks.map((x) => x.id)).size).toBe(tasks.length);
    expect(tasks.every((x) => x.hint)).toBe(true);
  });
});

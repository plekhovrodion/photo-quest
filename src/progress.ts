import { LEVELS } from './data/tasks';

export interface LevelProgress {
  stars: number;
  passed: boolean;
}

export interface Progress {
  levels: Record<string, LevelProgress>;
  found: Record<string, number>; // id задания -> звёзды, с которыми оно найдено
}

const KEY = 'photoquest.progress.v2';
const empty = (): Progress => ({ levels: {}, found: {} });

export function loadProgress(key = KEY): Progress {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return empty();
    const data = JSON.parse(raw) as Partial<Progress>;
    const found = Object.fromEntries(Object.entries(data.found ?? {}).filter(([id, stars]) =>
      /^[a-z0-9][a-z0-9._-]{0,63}$/.test(id) && Number.isInteger(stars) && stars >= 1 && stars <= 3));
    return progressFromFound(found);
  } catch {
    return empty();
  }
}

export function saveProgress(p: Progress, key = KEY): void {
  try {
    localStorage.setItem(key, JSON.stringify({ found: p.found }));
  } catch {
    // приватный режим или переполнение: прогресс просто не сохранится
  }
}

export function recordTask(
  p: Progress,
  level: { id: string; tasks: { id: string }[] },
  taskId: string,
  earned: number,
): { progress: Progress; levelDone: boolean } {
  if ((p.found[taskId] ?? 0) >= earned) return { progress: p, levelDone: false };
  const found = { ...p.found, [taskId]: earned };
  const levels = [...LEVELS.filter((item) => item.id !== level.id), level];
  const progress = progressFromFound(found, levels);
  return { progress, levelDone: !!progress.levels[level.id]?.passed && !p.levels[level.id]?.passed };
}

export function progressFromFound(found: Record<string, number>, levels: { id: string; tasks: { id: string }[] }[] = LEVELS): Progress {
  const completed: Progress['levels'] = {};
  for (const level of levels) {
    if (level.tasks.length && level.tasks.every((task) => found[task.id] !== undefined)) {
      completed[level.id] = { passed: true, stars: level.tasks.reduce((total, task) => total + found[task.id], 0) };
    }
  }
  return { found, levels: completed };
}

export function mergeProgress(a: Progress, b: Progress): Progress {
  const found: Record<string, number> = { ...a.found };
  for (const [id, stars] of Object.entries(b.found)) found[id] = Math.max(found[id] ?? 0, stars);
  return progressFromFound(found);
}

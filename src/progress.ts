import { LEVELS, PASS_RATIO } from './data/tasks';

export interface LevelProgress {
  stars: number;
  passed: boolean;
}
export type Progress = Record<string, LevelProgress>;

const KEY = 'photoquest.progress.v1';

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Progress) : {};
  } catch {
    return {};
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // приватный режим или переполнение: прогресс просто не сохранится
  }
}

export const isPassed = (found: number, total: number): boolean => found / total >= PASS_RATIO;

// Результат не ухудшается при повторном прохождении.
export function recordResult(p: Progress, levelId: string, stars: number, passed: boolean): Progress {
  const prev = p[levelId];
  return {
    ...p,
    [levelId]: { stars: Math.max(prev?.stars ?? 0, stars), passed: (prev?.passed ?? false) || passed },
  };
}

export function isUnlocked(p: Progress, levelIndex: number): boolean {
  return levelIndex === 0 || p[LEVELS[levelIndex - 1].id]?.passed === true;
}

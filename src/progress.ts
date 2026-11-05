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

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const data = JSON.parse(raw) as Partial<Progress>;
    return { levels: data.levels ?? {}, found: data.found ?? {} };
  } catch {
    return empty();
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
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
  if (p.found[taskId] !== undefined) return { progress: p, levelDone: false };
  const found = { ...p.found, [taskId]: earned };
  const all = level.tasks.every((t) => found[t.id] !== undefined);
  const levelDone = all && !p.levels[level.id]?.passed;
  const stars = level.tasks.reduce((n, t) => n + (found[t.id] ?? 0), 0);
  return {
    levelDone,
    progress: {
      ...p,
      found,
      levels: all ? { ...p.levels, [level.id]: { stars, passed: true } } : p.levels,
    },
  };
}

export function mergeProgress(a: Progress, b: Progress): Progress {
  const found: Record<string, number> = { ...a.found };
  for (const [id, stars] of Object.entries(b.found)) found[id] = Math.max(found[id] ?? 0, stars);
  const levels: Progress['levels'] = { ...a.levels };
  for (const [id, lp] of Object.entries(b.levels)) {
    const prev = levels[id];
    levels[id] = { stars: Math.max(prev?.stars ?? 0, lp.stars), passed: (prev?.passed ?? false) || lp.passed };
  }
  return { found, levels };
}

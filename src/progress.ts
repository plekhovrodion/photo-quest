import { LEVELS } from './data/tasks';

export interface LevelProgress {
  stars: number;
  passed: boolean;
}

// Внутренняя валюта — «вспышки» (как вспышка фотоаппарата); значок рисуется в ui/icons.ts.
export interface Progress {
  levels: Record<string, LevelProgress>;
  found: Record<string, number>; // id задания -> звёзды, с которыми оно найдено
  flashes: number;
  owned: string[]; // id мест (категорий), открытых за вспышки
  fed?: Record<string, number>; // сколько вспышек скормлено заврикам (id заврика -> число)
  look?: Record<string, { hue: number; hat: string | null; badge: string | null }>; // внешний вид заврика
}

export const CURRENCY = { name: 'вспышки' };
export const LEVEL_BONUS = 5;

// Места открываются за вспышки: «Цвета» бесплатны, остальные покупаются (цена — в data/tasks.ts).
export const priceOf = (levelId: string): number => LEVELS.find((l) => l.id === levelId)?.price ?? 0;
// Для тестирования: VITE_OPEN_ALL=1 открывает все места без покупки (см. .env.development и .env.production).
const OPEN_ALL = import.meta.env?.VITE_OPEN_ALL === '1';
export const isUnlocked = (p: Pick<Progress, 'owned'>, levelId: string): boolean => OPEN_ALL || priceOf(levelId) === 0 || p.owned.includes(levelId);
export const canUnlock = (p: Pick<Progress, 'owned' | 'flashes'>, levelId: string): boolean =>
  !isUnlocked(p, levelId) && p.flashes >= priceOf(levelId);

export function unlockLevel(p: Progress, levelId: string): Progress {
  return canUnlock(p, levelId) ? { ...p, flashes: p.flashes - priceOf(levelId), owned: [...p.owned, levelId] } : p;
}

// Оставляем только существующие платные места (в старых сохранениях там лежали id друзей из магазина).
export const sanitizeOwned = (owned: unknown): string[] =>
  Array.isArray(owned) ? [...new Set(owned.filter((id): id is string => typeof id === 'string' && priceOf(id) > 0))] : [];

const KEY = 'photoquest.progress.v2';
const empty = (): Progress => ({ levels: {}, found: {}, flashes: 0, owned: [] });

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const data = { ...empty(), ...(JSON.parse(raw) as Progress) };
    return { ...data, owned: sanitizeOwned(data.owned) };
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

// Награда даётся один раз за каждое найденное задание, чтобы вспышки нельзя было фармить повтором.
// Бонус LEVEL_BONUS — один раз, когда найдены все задания категории.
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
      flashes: p.flashes + earned + (levelDone ? LEVEL_BONUS : 0),
      levels: all ? { ...p.levels, [level.id]: { stars, passed: true } } : p.levels,
    },
  };
}

// Вспышки выводятся из найденного и купленного, поэтому при слиянии двух устройств не теряются траты.
export function computeFlashes(p: Pick<Progress, 'found' | 'levels' | 'owned' | 'fed'>): number {
  const earned = Object.values(p.found).reduce((n, v) => n + v, 0);
  const bonuses = Object.values(p.levels).filter((l) => l.passed).length * LEVEL_BONUS;
  const spent = p.owned.reduce((n, id) => n + priceOf(id), 0) + Object.values(p.fed ?? {}).reduce((n, v) => n + v, 0);
  return Math.max(0, earned + bonuses - spent);
}

// Слияние прогресса с двух устройств: объединяем найденное и купленное, звёзды берём максимальные.
export function mergeProgress(a: Progress, b: Progress): Progress {
  const found: Record<string, number> = { ...a.found };
  for (const [id, stars] of Object.entries(b.found)) found[id] = Math.max(found[id] ?? 0, stars);
  const levels: Progress['levels'] = { ...a.levels };
  for (const [id, lp] of Object.entries(b.levels)) {
    const prev = levels[id];
    levels[id] = { stars: Math.max(prev?.stars ?? 0, lp.stars), passed: (prev?.passed ?? false) || lp.passed };
  }
  const owned = [...new Set([...a.owned, ...b.owned])];
  const fed: Record<string, number> = { ...(a.fed ?? {}) };
  for (const [id, n] of Object.entries(b.fed ?? {})) fed[id] = Math.max(fed[id] ?? 0, n);
  const look = { ...(b.look ?? {}), ...(a.look ?? {}) }; // внешний вид: приоритет у текущего устройства
  return { found, levels, owned, fed, look, flashes: computeFlashes({ found, levels, owned, fed }) };
}

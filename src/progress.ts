export interface LevelProgress {
  stars: number;
  passed: boolean;
}

// Внутренняя валюта — «вспышки» ⚡ (как вспышка фотоаппарата).
export interface Progress {
  levels: Record<string, LevelProgress>;
  found: Record<string, number>; // id задания -> звёзды, с которыми оно найдено
  flashes: number;
  owned: string[];
}

export interface ShopItem {
  id: string;
  emoji: string;
  name: string;
  price: number;
}

export const CURRENCY = { emoji: '⚡', name: 'вспышки' };
export const LEVEL_BONUS = 5;

export const SHOP: ShopItem[] = [
  { id: 'cat', emoji: '🐱', name: 'Котёнок', price: 10 },
  { id: 'dog', emoji: '🐶', name: 'Щенок', price: 10 },
  { id: 'rocket', emoji: '🚀', name: 'Ракета', price: 20 },
  { id: 'unicorn', emoji: '🦄', name: 'Единорог', price: 30 },
  { id: 'dino', emoji: '🦖', name: 'Динозавр', price: 40 },
  { id: 'robot', emoji: '🤖', name: 'Робот', price: 50 },
  { id: 'rainbow', emoji: '🌈', name: 'Радуга', price: 60 },
  { id: 'crown', emoji: '👑', name: 'Корона', price: 100 },
];

const KEY = 'photoquest.progress.v2';
const empty = (): Progress => ({ levels: {}, found: {}, flashes: 0, owned: [] });

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty(), ...(JSON.parse(raw) as Progress) } : empty();
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

export const canBuy = (p: Progress, item: ShopItem): boolean =>
  !p.owned.includes(item.id) && p.flashes >= item.price;

export function buy(p: Progress, item: ShopItem): Progress {
  return canBuy(p, item) ? { ...p, flashes: p.flashes - item.price, owned: [...p.owned, item.id] } : p;
}

// Вспышки выводятся из найденного и купленного, поэтому при слиянии двух устройств не теряются траты.
export function computeFlashes(p: Pick<Progress, 'found' | 'levels' | 'owned'>): number {
  const earned = Object.values(p.found).reduce((n, v) => n + v, 0);
  const bonuses = Object.values(p.levels).filter((l) => l.passed).length * LEVEL_BONUS;
  const spent = p.owned.reduce((n, id) => n + (SHOP.find((i) => i.id === id)?.price ?? 0), 0);
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
  return { found, levels, owned, flashes: computeFlashes({ found, levels, owned }) };
}

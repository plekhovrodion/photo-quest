import { PASS_RATIO } from './data/tasks';

export interface LevelProgress {
  stars: number;
  passed: boolean;
}

// Внутренняя валюта — «вспышки» ⚡ (как вспышка фотоаппарата).
export interface Progress {
  levels: Record<string, LevelProgress>;
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
const empty = (): Progress => ({ levels: {}, flashes: 0, owned: [] });

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

export const isPassed = (found: number, total: number): boolean => found / total >= PASS_RATIO;

// Фиксирует результат прохождения и начисляет вспышки.
// Бонус LEVEL_BONUS даётся один раз — за первое прохождение уровня.
export function recordResult(p: Progress, levelId: string, earned: number, passed: boolean): Progress {
  const prev = p.levels[levelId];
  const bonus = passed && !prev?.passed ? LEVEL_BONUS : 0;
  return {
    ...p,
    flashes: p.flashes + earned + bonus,
    levels: {
      ...p.levels,
      [levelId]: { stars: Math.max(prev?.stars ?? 0, earned), passed: (prev?.passed ?? false) || passed },
    },
  };
}

export const canBuy = (p: Progress, item: ShopItem): boolean =>
  !p.owned.includes(item.id) && p.flashes >= item.price;

export function buy(p: Progress, item: ShopItem): Progress {
  return canBuy(p, item) ? { ...p, flashes: p.flashes - item.price, owned: [...p.owned, item.id] } : p;
}

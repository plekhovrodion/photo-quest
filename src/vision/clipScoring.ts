import { CLIP_OBJECTS } from '../data/clip';
import { CLIP_ACCEPT } from './clipConstants';
export interface ClipRank { en: string; ru: string; score: number; bg?: boolean }
export type Table = [string, Float32Array][];
const dot = (a: Float32Array, b: Float32Array) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

// Сходство по вырезам: для каждого предмета берём лучший вырез. Фон идёт в тот же список.
export function scoreEmbeds(embeds: Float32Array[], tables: { objects: Table; bg: Table }, bgOn: boolean): ClipRank[] {
  const best = (t: Float32Array) => Math.max(...embeds.map((e) => dot(e, t)));
  const objs = tables.objects.map(([en, t]) => ({ en, ru: CLIP_OBJECTS[en] ?? en, score: best(t) }));
  const bgs = bgOn ? tables.bg.map(([n, t]) => ({ en: `~${n}`, ru: n, score: best(t), bg: true })) : [];
  return [...objs, ...bgs].sort((a, b) => b.score - a.score);
}

// Вероятность предмета среди всех вариантов (предметы игры и «фон»): softmax с масштабом CLIP (100).
export function clipProb(ranks: ClipRank[], en: string): number {
  if (!ranks.length) return 0;
  const top = ranks[0].score;
  let sum = 0, mine = 0;
  for (const r of ranks) {
    const z = Math.exp(100 * (r.score - top));
    sum += z;
    if (r.en === en) mine = z;
  }
  return mine / sum;
}

// Порог засчитывания. Замер: при 0,02 узнаётся 87,7% (было 88,3% по правилу «в первых шести»), а путаница
// с соседними предметами того же места вдвое реже: 10% вместо 20%.
export const clipAccepts = (ranks: ClipRank[], en: string): boolean => clipProb(ranks, en) >= CLIP_ACCEPT;

// Нужный предмет входит в первые `top` по сходству.
export const CLIP_TOP = 2;
export const clipHas = (ranks: ClipRank[], en: string, top = CLIP_TOP): boolean =>
  ranks.slice(0, top).some((r) => r.en === en);

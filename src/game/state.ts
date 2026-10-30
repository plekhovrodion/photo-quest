import type { Task } from '../data/tasks';

export type Phase = 'task' | 'camera' | 'checking' | 'result' | 'finish';

export interface GameState {
  tasks: Task[];
  index: number;
  phase: Phase;
  attempts: number;
  lastMatch: boolean | null;
  score: number;
  stars: number;
  results: boolean[];
}

export type Action =
  | { type: 'start-camera' }
  | { type: 'photo-taken' }
  | { type: 'verified'; match: boolean }
  | { type: 'check-failed' }
  | { type: 'cancel-camera' }
  | { type: 'skip' }
  | { type: 'next' };

export function createGame(tasks: Task[]): GameState {
  return {
    tasks,
    index: 0,
    phase: tasks.length ? 'task' : 'finish',
    attempts: 0,
    lastMatch: null,
    score: 0,
    stars: 0,
    results: [],
  };
}

// Звёзд за найденное задание: попыток нет, ребёнок ищет сколько нужно.
export const STARS_PER_TASK = 3;

export function currentTask(s: GameState): Task | undefined {
  return s.tasks[s.index];
}

export function reduce(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'start-camera':
      return s.phase === 'task' ? { ...s, phase: 'camera' } : s;
    case 'cancel-camera':
      return s.phase === 'camera' ? { ...s, phase: 'task' } : s;
    case 'photo-taken':
      return s.phase === 'camera' ? { ...s, phase: 'checking' } : s;
    case 'check-failed':
      // Сбой сети/AI — не считаем попыткой, ребёнок снимает ещё раз.
      return s.phase === 'checking' ? { ...s, phase: 'task' } : s;
    case 'verified':
      if (s.phase !== 'checking') return s;
      return {
        ...s,
        phase: 'result',
        lastMatch: a.match,
        attempts: s.attempts + 1,
        score: a.match ? s.score + 1 : s.score,
        stars: a.match ? s.stars + STARS_PER_TASK : s.stars,
      };
    case 'next': {
      if (s.phase !== 'result') return s;
      if (s.lastMatch === false) return { ...s, phase: 'task', lastMatch: null }; // снова то же задание
      return advance(s);
    }
    case 'skip':
      // «Другое задание»: после неудачной попытки или прямо с экрана задания
      return (s.phase === 'result' && s.lastMatch === false) || s.phase === 'task' ? advance(s) : s;
  }
}

function advance(s: GameState): GameState {
  const index = s.index + 1;
  return {
    ...s,
    index,
    results: [...s.results, s.lastMatch === true],
    phase: index >= s.tasks.length ? 'finish' : 'task',
    attempts: 0,
    lastMatch: null,
  };
}

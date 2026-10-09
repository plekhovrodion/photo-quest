import { describe, expect, it } from 'vitest';
import { TASKS } from '../data/tasks';
import { createGame, reduce, canSkip, MAX_ATTEMPTS, type GameState } from './state';

const run = (s: GameState, ...types: Array<Parameters<typeof reduce>[1]>) =>
  types.reduce(reduce, s);

const attempt = (s: GameState, match: boolean) =>
  run(s, { type: 'start-camera' }, { type: 'photo-taken' }, { type: 'verified', match });

describe('game state', () => {
  it('верный ответ -> результат, затем следующее задание', () => {
    let s = attempt(createGame(TASKS.slice(0, 2)), true);
    expect(s.score).toBe(1);
    s = reduce(s, { type: 'next' });
    expect(s.index).toBe(1);
    expect(s.phase).toBe('task');
    expect(s.attempts).toBe(0);
  });

  it('неверный ответ -> ещё попытка на том же задании', () => {
    let s = attempt(createGame(TASKS.slice(0, 2)), false);
    expect(canSkip(s)).toBe(false);
    s = reduce(s, { type: 'next' });
    expect(s.index).toBe(0);
    expect(s.phase).toBe('task');
  });

  it(`после ${MAX_ATTEMPTS} неудач задание пропускается`, () => {
    let s = createGame(TASKS.slice(0, 2));
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      s = attempt(s, false);
      if (i < MAX_ATTEMPTS - 1) s = reduce(s, { type: 'next' });
    }
    expect(canSkip(s)).toBe(true);
    s = reduce(s, { type: 'next' });
    expect(s.index).toBe(1);
    expect(s.score).toBe(0);
  });

  it('сбой проверки не тратит попытку', () => {
    let s = run(createGame(TASKS), { type: 'start-camera' }, { type: 'photo-taken' }, { type: 'check-failed' });
    expect(s.phase).toBe('task');
    expect(s.attempts).toBe(0);
  });

  it('последнее задание ведёт на финиш', () => {
    const s = reduce(attempt(createGame(TASKS.slice(0, 1)), true), { type: 'next' });
    expect(s.phase).toBe('finish');
  });

  it('недопустимые переходы игнорируются', () => {
    const s = createGame(TASKS);
    expect(reduce(s, { type: 'photo-taken' })).toBe(s);
    expect(reduce(s, { type: 'next' })).toBe(s);
  });
});

describe('звёзды', () => {
  it('3 звезды с первой попытки, 2 со второй', () => {
    const first = attempt(createGame(TASKS.slice(0, 2)), true);
    expect(first.stars).toBe(3);
    let second = attempt(createGame(TASKS.slice(0, 2)), false);
    second = reduce(second, { type: 'next' });
    second = attempt(second, true);
    expect(second.stars).toBe(2);
  });
});

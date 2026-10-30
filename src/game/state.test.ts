import { describe, expect, it } from 'vitest';
import { TASKS } from '../data/tasks';
import { createGame, reduce, STARS_PER_TASK, type GameState } from './state';

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

  it('неверный ответ -> можно искать снова сколько угодно раз', () => {
    let s = createGame(TASKS.slice(0, 2));
    for (let i = 0; i < 5; i++) {
      s = attempt(s, false);
      s = reduce(s, { type: 'next' });
      expect(s.index).toBe(0);
      expect(s.phase).toBe('task');
    }
  });

  it('«другое задание» после неудачи переходит дальше без очков', () => {
    let s = attempt(createGame(TASKS.slice(0, 2)), false);
    s = reduce(s, { type: 'skip' });
    expect(s.index).toBe(1);
    expect(s.score).toBe(0);
    expect(s.phase).toBe('task');
  });

  it('пропустить можно и сразу с экрана задания, но не во время проверки', () => {
    const fresh = createGame(TASKS.slice(0, 2));
    expect(reduce(fresh, { type: 'skip' }).index).toBe(1);
    const checking = run(fresh, { type: 'start-camera' }, { type: 'photo-taken' });
    expect(reduce(checking, { type: 'skip' })).toBe(checking);
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
  it('за найденное всегда одинаково, сколько бы раз ни снимал', () => {
    const first = attempt(createGame(TASKS.slice(0, 2)), true);
    expect(first.stars).toBe(STARS_PER_TASK);
    let later = attempt(createGame(TASKS.slice(0, 2)), false);
    later = reduce(later, { type: 'next' });
    later = attempt(later, true);
    expect(later.stars).toBe(STARS_PER_TASK);
  });
});

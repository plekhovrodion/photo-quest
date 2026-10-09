import { describe, expect, it } from 'vitest';
import { computeFlashes, mergeProgress, type Progress } from './progress';
import { feed, fedOf, lookOf, setLook, stageOf, STAGE_AT } from './zavrik';

const P = (over: Partial<Progress> = {}): Progress => ({ levels: {}, found: {}, flashes: 0, owned: [], ...over });

describe('заврики', () => {
  it('уровень растёт по порогам', () => {
    expect(stageOf(0).stage).toBe(1);
    expect(stageOf(STAGE_AT[1]).stage).toBe(2);
    expect(stageOf(STAGE_AT[4]).stage).toBe(5);
    expect(stageOf(999).need).toBeNull();
    expect(stageOf(5)).toMatchObject({ stage: 2, into: 1, need: 6 });
  });

  it('кормление тратит вспышку и сообщает о новом уровне', () => {
    let p = P({ flashes: 10 });
    let up: number | null = null;
    for (let i = 0; i < STAGE_AT[1]; i++) ({ progress: p, levelUp: up } = feed(p, 'sonya'));
    expect(p.flashes).toBe(10 - STAGE_AT[1]);
    expect(fedOf(p, 'sonya')).toBe(STAGE_AT[1]);
    expect(up).toBe(2);
  });

  it('без вспышек покормить нельзя', () => {
    const p = P({ flashes: 0 });
    expect(feed(p, 'grisha').progress).toBe(p);
  });

  it('одежда открывается только с нужного уровня', () => {
    const p = P({ fed: { grisha: 0, sonya: 0 } });
    expect(lookOf(setLook(p, 'sonya', { hat: 'party' }), 'sonya').hat).toBeNull();
    const big = P({ fed: { grisha: 0, sonya: STAGE_AT[2] } });
    expect(lookOf(setLook(big, 'sonya', { hat: 'party', hue: 120 }), 'sonya')).toMatchObject({ hat: 'party', hue: 120 });
    expect(lookOf(setLook(big, 'sonya', { hat: 'crown' }), 'sonya').hat).toBeNull(); // корона с 5 уровня
    expect(lookOf(setLook(big, 'sonya', { hue: 7 }), 'sonya').hue).toBe(0); // нет такого цвета
  });

  it('вспышки считаются с учётом скормленного, при слиянии берём максимум', () => {
    const found = { a: 3, b: 3, c: 3, d: 3 };
    expect(computeFlashes({ found, levels: {}, owned: [], fed: { sonya: 5 } })).toBe(12 - 5);
    const m = mergeProgress(P({ found, fed: { sonya: 5 } }), P({ found, fed: { sonya: 3, grisha: 2 } }));
    expect(m.fed).toEqual({ sonya: 5, grisha: 2 });
    expect(m.flashes).toBe(12 - 7);
  });
});

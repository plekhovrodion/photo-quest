import { describe, expect, it } from 'vitest';
import { BoxTracker, centerBox, expandBox, iou } from './box';

describe('iou', () => {
  it('одинаковые рамки — 1, непересекающиеся — 0', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    expect(iou(a, a)).toBe(1);
    expect(iou(a, { x: 20, y: 20, w: 5, h: 5 })).toBe(0);
  });
  it('половина пересечения', () => {
    expect(iou({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 0, w: 10, h: 10 })).toBeCloseTo(50 / 150, 5);
  });
});

describe('expandBox', () => {
  const frame = { w: 640, h: 480 };
  it('добавляет запас и не выходит за кадр', () => {
    const e = expandBox({ x: 100, y: 100, w: 100, h: 100 }, 0.1, frame);
    expect(e).toEqual({ x: 90, y: 90, w: 120, h: 120 });
    const edge = expandBox({ x: 0, y: 0, w: 100, h: 100 }, 0.5, frame);
    expect(edge.x).toBe(0);
    expect(edge.y).toBe(0);
    expect(edge.w).toBe(150);
  });
  it('слишком маленькую рамку растягивает до минимума', () => {
    const e = expandBox({ x: 300, y: 200, w: 10, h: 10 }, 0.1, frame, 64);
    expect(e.w).toBeGreaterThanOrEqual(64);
    expect(e.h).toBeGreaterThanOrEqual(64);
  });
  it('центральная рамка', () => {
    expect(centerBox(frame, 0.5)).toEqual({ x: 160, y: 120, w: 320, h: 240 });
  });
});

describe('BoxTracker', () => {
  const a = { x: 100, y: 100, w: 100, h: 100 };
  it('без рамки сбрасывается', () => {
    const t = new BoxTracker();
    t.update(a, 0);
    expect(t.update(null, 100)).toEqual({ box: null, stableMs: 0 });
  });
  it('на месте — растёт время «захвата»', () => {
    const t = new BoxTracker();
    t.update(a, 0);
    expect(t.update({ ...a, x: 101 }, 300).stableMs).toBe(300);
    expect(t.update({ ...a, x: 100 }, 700).stableMs).toBe(700);
  });
  it('при движении время захвата обнуляется', () => {
    const t = new BoxTracker();
    t.update(a, 0);
    t.update(a, 500);
    const r = t.update({ x: 130, y: 100, w: 100, h: 100 }, 600); // сдвиг: iou < 0.8
    expect(r.stableMs).toBe(0);
  });
  it('резкий скачок — новая цель без сглаживания', () => {
    const t = new BoxTracker();
    t.update(a, 0);
    const far = { x: 400, y: 300, w: 80, h: 80 };
    expect(t.update(far, 100).box).toEqual(far);
  });
  it('сглаживает дрожание', () => {
    const t = new BoxTracker(0.5);
    t.update(a, 0);
    const r = t.update({ ...a, x: 110 }, 100);
    expect(r.box!.x).toBeGreaterThan(100);
    expect(r.box!.x).toBeLessThan(110);
  });
});

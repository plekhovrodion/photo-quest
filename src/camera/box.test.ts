import { describe, expect, it } from 'vitest';
import { BoxFollower, centerBox, expandBox, iou } from './box';

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

describe('BoxFollower', () => {
  const a = { x: 100, y: 100, w: 100, h: 100 };
  it('держит рамку-призрак при коротких пропусках детектора', () => {
    const f = new BoxFollower();
    f.observe(a, 0);
    f.frame(0);
    f.observe(null, 200); // пропуск 200 мс < 450
    expect(f.frame(200).box).not.toBeNull();
  });
  it('сбрасывает рамку после долгого пропуска', () => {
    const f = new BoxFollower();
    f.observe(a, 0);
    f.frame(0);
    f.observe(null, 600);
    expect(f.frame(600).box).toBeNull();
    expect(f.current()).toBeNull();
  });
  it('на месте — растёт время захвата, при движении обнуляется', () => {
    const f = new BoxFollower();
    f.observe(a, 0);
    f.observe({ ...a, x: 101 }, 300);
    expect(f.frame(300).stableMs).toBe(300);
    f.observe({ x: 140, y: 100, w: 100, h: 100 }, 400); // заметный сдвиг
    expect(f.frame(400).stableMs).toBe(0);
  });
  it('плавно приближается к цели, а не прыгает', () => {
    const f = new BoxFollower(100);
    f.observe(a, 0);
    f.frame(0);
    f.observe({ x: 160, y: 100, w: 100, h: 100 }, 16);
    const s1 = f.frame(16).box!.x;
    expect(s1).toBeGreaterThan(100);
    expect(s1).toBeLessThan(160);
    const s2 = f.frame(400).box!.x;
    expect(s2).toBeGreaterThan(s1);
  });
  it('резкий скачок — новая цель', () => {
    const f = new BoxFollower();
    f.observe(a, 0);
    f.frame(0);
    f.observe({ x: 400, y: 300, w: 80, h: 80 }, 100);
    expect(f.frame(100).stableMs).toBe(0);
  });
  it('первый кадр без плавности', () => {
    const f = new BoxFollower();
    f.observe(a, 0);
    expect(f.frame(0).box).toEqual(a);
  });
});

import { describe, expect, it } from 'vitest';
import { initialRect, moveRect, resizeRect, toSource, MIN_SIDE } from './cropMath';

const B = { w: 400, h: 300 };

describe('cropMath', () => {
  it('начальная рамка по центру, 80% кадра', () => {
    expect(initialRect(B)).toEqual({ x: 40, y: 30, w: 320, h: 240 });
  });
  it('сдвиг не выходит за края', () => {
    const r = { x: 40, y: 30, w: 320, h: 240 };
    expect(moveRect(r, 500, 500, B)).toEqual({ x: 80, y: 60, w: 320, h: 240 });
    expect(moveRect(r, -500, -500, B)).toEqual({ x: 0, y: 0, w: 320, h: 240 });
  });
  it('изменение размера держит противоположный угол и минимальный размер', () => {
    const r = { x: 100, y: 100, w: 200, h: 150 };
    const se = resizeRect(r, 'se', 50, 20, B);
    expect(se).toEqual({ x: 100, y: 100, w: 250, h: 170 });
    const nw = resizeRect(r, 'nw', 500, 500, B);
    expect(nw.w).toBe(MIN_SIDE);
    expect(nw.h).toBe(MIN_SIDE);
    expect(nw.x + nw.w).toBe(300); // правый край не двигается
    expect(nw.y + nw.h).toBe(250); // нижний край не двигается
  });
  it('рамка не вылезает за кадр при растягивании', () => {
    const r = resizeRect({ x: 300, y: 200, w: 50, h: 50 }, 'se', 999, 999, B);
    expect(r.x + r.w).toBe(400);
    expect(r.y + r.h).toBe(300);
  });
  it('перевод в координаты исходного изображения', () => {
    expect(toSource({ x: 50, y: 25, w: 200, h: 100 }, 0.5)).toEqual({ x: 100, y: 50, w: 400, h: 200 });
  });
});

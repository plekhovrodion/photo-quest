export interface Rect { x: number; y: number; w: number; h: number }
export type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se';

export const MIN_SIDE = 64;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

// Начальная рамка: 80% кадра по центру.
export function initialRect(bounds: { w: number; h: number }): Rect {
  const w = bounds.w * 0.8, h = bounds.h * 0.8;
  return { x: (bounds.w - w) / 2, y: (bounds.h - h) / 2, w, h };
}

// Сдвиг рамки целиком — не выходит за края кадра.
export function moveRect(r: Rect, dx: number, dy: number, b: { w: number; h: number }): Rect {
  return { ...r, x: clamp(r.x + dx, 0, b.w - r.w), y: clamp(r.y + dy, 0, b.h - r.h) };
}

// Изменение размера за угол: противоположный угол остаётся на месте.
export function resizeRect(r: Rect, handle: Exclude<Handle, 'move'>, dx: number, dy: number, b: { w: number; h: number }, min = MIN_SIDE): Rect {
  let x0 = r.x, y0 = r.y, x1 = r.x + r.w, y1 = r.y + r.h;
  if (handle === 'nw' || handle === 'sw') x0 = clamp(x0 + dx, 0, x1 - min); else x1 = clamp(x1 + dx, x0 + min, b.w);
  if (handle === 'nw' || handle === 'ne') y0 = clamp(y0 + dy, 0, y1 - min); else y1 = clamp(y1 + dy, y0 + min, b.h);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// Рамка из экранных координат (картинка показана с масштабом) в пиксели исходного изображения.
export function toSource(r: Rect, scale: number): Rect {
  return { x: Math.round(r.x / scale), y: Math.round(r.y / scale), w: Math.round(r.w / scale), h: Math.round(r.h / scale) };
}

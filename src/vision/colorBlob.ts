import { classifyPixel, type ColorName } from './color';
import type { Box } from '../camera/box';

// Находит самое большое связное пятно нужного цвета (по уменьшенному кадру RGBA).
// Нужно для живой камеры в заданиях на цвет: рамка вокруг красного, синего и т. д. без нейросети.
export function colorBlob(data: ArrayLike<number>, w: number, h: number, target: ColorName, minShare = 0.012): Box | null {
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = classifyPixel(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) === target ? 1 : 0;

  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  let best: { size: number; x0: number; y0: number; x1: number; y1: number } | null = null;

  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || seen[start]) continue;
    let size = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w, y = (p / w) | 0;
      size++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (mask[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
      }
    }
    if (!best || size > best.size) best = { size, x0, y0, x1, y1 };
  }
  if (!best || best.size < minShare * w * h) return null;
  return { x: best.x0, y: best.y0, w: best.x1 - best.x0 + 1, h: best.y1 - best.y0 + 1 };
}

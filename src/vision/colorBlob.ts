import { classifyPixel, type ColorName } from './color';
import type { Box } from '../camera/box';

export interface BlobOptions {
  minShare?: number; // минимальная площадь пятна (доля кадра)
  maxShare?: number; // слишком большое пятно — это фон (стена, стол), его не берём
  center?: { x: number; y: number }; // прицел, доли 0..1
}

interface Component { size: number; x0: number; y0: number; x1: number; y1: number; cx: number; cy: number }

// Находит пятно нужного цвета по уменьшенному кадру RGBA. Нужно для живой камеры в заданиях на цвет.
// Берём пятно у прицела (в центре кадра), а не просто самое большое; фон (пятно почти на весь кадр
// или прилегающее к трём сторонам) отбрасываем.
export function colorBlob(data: ArrayLike<number>, w: number, h: number, target: ColorName, opts: BlobOptions = {}): Box | null {
  const { minShare = 0.02, maxShare = 0.6, center = { x: 0.5, y: 0.5 } } = opts;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = classifyPixel(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) === target ? 1 : 0;

  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const comps: Component[] = [];
  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || seen[start]) continue;
    let size = 0, x0 = w, y0 = h, x1 = 0, y1 = 0, sx = 0, sy = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w, y = (p / w) | 0;
      size++; sx += x; sy += y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (mask[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
      }
    }
    comps.push({ size, x0, y0, x1, y1, cx: sx / size, cy: sy / size });
  }

  const cx = center.x * w, cy = center.y * h;
  let best: { c: Component; rank: number } | null = null;
  for (const c of comps) {
    const share = c.size / (w * h);
    if (share < minShare || share > maxShare) continue;
    const edges = Number(c.x0 === 0) + Number(c.y0 === 0) + Number(c.x1 === w - 1) + Number(c.y1 === h - 1);
    if (edges >= 3) continue; // фон: прилегает к трём сторонам кадра
    const holdsCenter = cx >= c.x0 && cx <= c.x1 && cy >= c.y0 && cy <= c.y1;
    const dist = Math.hypot((c.cx - cx) / w, (c.cy - cy) / h);
    const rank = (holdsCenter ? 1 : 0) + share - dist * 0.8;
    if (!best || rank > best.rank) best = { c, rank };
  }
  return best ? { x: best.c.x0, y: best.c.y0, w: best.c.x1 - best.c.x0 + 1, h: best.c.y1 - best.c.y0 + 1 } : null;
}

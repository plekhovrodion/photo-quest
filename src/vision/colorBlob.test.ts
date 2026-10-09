import { describe, expect, it } from 'vitest';
import { colorBlob } from './colorBlob';

const W = 40, H = 30;
function frame(draw: (set: (x: number, y: number, c: [number, number, number]) => void) => void) {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) d.set([240, 240, 240, 255], i * 4);
  draw((x, y, c) => d.set([c[0], c[1], c[2], 255], (y * W + x) * 4));
  return d;
}
const rect = (set: any, x0: number, y0: number, w: number, h: number, c: [number, number, number]) => {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, c);
};

describe('colorBlob', () => {
  it('находит красный прямоугольник', () => {
    const d = frame((s) => rect(s, 10, 8, 12, 10, [220, 30, 30]));
    expect(colorBlob(d, W, H, 'red')).toEqual({ x: 10, y: 8, w: 12, h: 10 });
  });
  it('другой цвет не находит', () => {
    const d = frame((s) => rect(s, 10, 8, 12, 10, [220, 30, 30]));
    expect(colorBlob(d, W, H, 'blue')).toBeNull();
  });
  it('из двух пятен берёт большее', () => {
    const d = frame((s) => { rect(s, 2, 2, 4, 4, [30, 60, 210]); rect(s, 20, 10, 12, 12, [30, 60, 210]); });
    expect(colorBlob(d, W, H, 'blue')).toEqual({ x: 20, y: 10, w: 12, h: 12 });
  });
  it('мелкий шум игнорируется', () => {
    const d = frame((s) => rect(s, 5, 5, 2, 2, [220, 30, 30]));
    expect(colorBlob(d, W, H, 'red')).toBeNull();
  });
});

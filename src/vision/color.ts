export type ColorName =
  | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'brown' | 'white' | 'black' | 'gray';

// Доля пикселей целевого цвета, при которой считаем, что предмет этого цвета.
export const COLOR_SHARE_MIN = 0.2;

export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb), d = max - min;
  let h = 0;
  if (d) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max];
}

export function classifyPixel(r: number, g: number, b: number): ColorName {
  const [h, s, v] = rgbToHsv(r, g, b);
  if (v < 0.22) return 'black';
  if (s < 0.2) return v > 0.74 ? 'white' : v < 0.36 ? 'black' : 'gray';
  if (s < 0.62 && v > 0.7 && (h >= 315 || h < 18)) return 'pink';
  if (h >= 10 && h < 45 && v < 0.62 && s >= 0.3) return 'brown';
  if (h >= 345 || h < 15) return 'red';
  if (h < 40) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 170) return 'green';
  if (h < 260) return 'blue';
  if (h < 320) return 'purple';
  return 'pink';
}

// Доли цветов по центру кадра (по умолчанию центральные 60%): там обычно находится предмет.
// Для кадра, уже обрезанного по предмету, берём почти всё (margin меньше).
export function colorShares(data: ArrayLike<number>, width: number, height: number, margin = 0.2): Record<ColorName, number> {
  const shares: Record<ColorName, number> = {
    red: 0, orange: 0, yellow: 0, green: 0, blue: 0, purple: 0, pink: 0, brown: 0, white: 0, black: 0, gray: 0,
  };
  const x0 = Math.floor(width * margin), x1 = Math.ceil(width * (1 - margin));
  const y0 = Math.floor(height * margin), y1 = Math.ceil(height * (1 - margin));
  let total = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      shares[classifyPixel(data[i], data[i + 1], data[i + 2])]++;
      total++;
    }
  }
  for (const k of Object.keys(shares) as ColorName[]) shares[k] = total ? shares[k] / total : 0;
  return shares;
}

export const hasColor = (shares: Record<ColorName, number>, target: ColorName): boolean =>
  shares[target] >= COLOR_SHARE_MIN;

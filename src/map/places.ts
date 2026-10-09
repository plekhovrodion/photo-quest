// Мини-диорамы «мест» для главного экрана: изометрические комнаты и дворики из простых фигур.
// Маленький движок: коробки, цилиндры, шары, конусы и крыши рисуются в порядке «от дальнего к ближнему».
export const U = 20; // размер клетки: полуширина ромба
const CX = 100, CY = 70; // положение дальнего угла площадки на холсте 200x180

type Pt = readonly [number, number];
export const P = (gx: number, gy: number, z = 0): Pt => [CX + (gx - gy) * U, CY + ((gx + gy) * U) / 2 - z];
export const fmt = (p: Pt) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
export const poly = (pts: Pt[], fill: string, extra = '') => `<polygon points="${pts.map(fmt).join(' ')}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
export function mix(hex: string, to: string, t: number): string {
  const a = hex.replace('#', ''), b = to.replace('#', '');
  const c = (i: number) => clamp(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t);
  return `#${[0, 2, 4].map((i) => c(i).toString(16).padStart(2, '0')).join('')}`;
}
// Три грани одного цвета: верх светлее, левая — основной, правая темнее.
export const tones = (c: string) => ({ t: mix(c, '#ffffff', 0.32), l: c, r: mix(c, '#000000', 0.26) });

export interface Item { k: number; svg: string }
export const depth = (x: number, y: number, z: number) => x + y + z / 100;

export const box = (x: number, y: number, w: number, d: number, h: number, c: string, z = 0, k?: number): Item => {
  const T = tones(c), z1 = z + h;
  return {
    k: k ?? depth(x + w / 2, y + d / 2, z),
    svg:
      poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z1), P(x, y + d, z1)], T.l) +
      poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z1), P(x + w, y, z1)], T.r) +
      poly([P(x, y, z1), P(x + w, y, z1), P(x + w, y + d, z1), P(x, y + d, z1)], T.t),
  };
};

export const cyl = (x: number, y: number, r: number, h: number, c: string, z = 0, k?: number): Item => {
  const T = tones(c), R = r * U * 1.4, [bx, by] = P(x, y, z), [, ty] = P(x, y, z + h);
  return {
    k: k ?? depth(x, y, z) + 0.2,
    svg:
      `<path d="M${(bx - R).toFixed(1)},${ty.toFixed(1)}L${(bx - R).toFixed(1)},${by.toFixed(1)}A${R.toFixed(1)},${(R / 2).toFixed(1)} 0 0 0 ${(bx + R).toFixed(1)},${by.toFixed(1)}L${(bx + R).toFixed(1)},${ty.toFixed(1)}Z" fill="${T.l}"/>` +
      `<path d="M${bx.toFixed(1)},${(by + R / 2).toFixed(1)}A${R.toFixed(1)},${(R / 2).toFixed(1)} 0 0 0 ${(bx + R).toFixed(1)},${by.toFixed(1)}L${(bx + R).toFixed(1)},${ty.toFixed(1)}L${bx.toFixed(1)},${ty.toFixed(1)}Z" fill="${T.r}" opacity=".5"/>` +
      `<ellipse cx="${bx.toFixed(1)}" cy="${ty.toFixed(1)}" rx="${R.toFixed(1)}" ry="${(R / 2).toFixed(1)}" fill="${T.t}"/>`,
  };
};

export const ball = (x: number, y: number, r: number, c: string, z = 0, k?: number): Item => {
  const [bx, by] = P(x, y, z + r);
  return {
    k: k ?? depth(x, y, z) + 0.3,
    svg: `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${r}" fill="${c}"/>` +
      `<circle cx="${(bx - r * 0.3).toFixed(1)}" cy="${(by - r * 0.32).toFixed(1)}" r="${(r * 0.38).toFixed(1)}" fill="#fff" opacity=".4"/>`,
  };
};

export const cone = (x: number, y: number, r: number, h: number, c: string, z = 0, k?: number): Item => {
  const T = tones(c), R = r * U * 1.4, [bx, by] = P(x, y, z), [, ty] = P(x, y, z + h);
  return {
    k: k ?? depth(x, y, z) + 0.2,
    svg: `<path d="M${(bx - R).toFixed(1)},${by.toFixed(1)}A${R.toFixed(1)},${(R / 2).toFixed(1)} 0 0 0 ${(bx + R).toFixed(1)},${by.toFixed(1)}L${bx.toFixed(1)},${ty.toFixed(1)}Z" fill="${T.l}"/>` +
      `<path d="M${bx.toFixed(1)},${(by + R / 2).toFixed(1)}A${R.toFixed(1)},${(R / 2).toFixed(1)} 0 0 0 ${(bx + R).toFixed(1)},${by.toFixed(1)}L${bx.toFixed(1)},${ty.toFixed(1)}Z" fill="${T.r}" opacity=".55"/>`,
  };
};

// Двускатная крыша: конёк вдоль оси gy.
export const roof = (x: number, y: number, w: number, d: number, h: number, c: string, z: number, k?: number): Item => {
  const T = tones(c), mx = x + w / 2;
  return {
    k: k ?? depth(x + w / 2, y + d / 2, z) + 0.5,
    svg:
      poly([P(x, y + d, z), P(x + w, y + d, z), P(mx, y + d, z + h)], T.l) +
      poly([P(x + w, y, z), P(x + w, y + d, z), P(mx, y + d, z + h), P(mx, y, z + h)], T.r),
  };
};

// Плоские детали на гранях: окно, дверь, картина.
export const faceL = (x0: number, x1: number, y: number, z0: number, z1: number, c: string, k: number): Item =>
  ({ k, svg: poly([P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1)], c) });
export const faceR = (x: number, y0: number, y1: number, z0: number, z1: number, c: string, k: number): Item =>
  ({ k, svg: poly([P(x, y0, z0), P(x, y1, z0), P(x, y1, z1), P(x, y0, z1)], c) });

function platform(top: string): string {
  const T = tones(top), SIDE = 14;
  return (
    `<ellipse cx="100" cy="${CY + 4 * U + 10}" rx="78" ry="14" fill="rgba(10,5,40,.3)"/>` +
    poly([P(0, 4), P(4, 4), P(4, 4, -SIDE), P(0, 4, -SIDE)], mix(top, '#000000', 0.22)) +
    poly([P(4, 0), P(4, 4), P(4, 4, -SIDE), P(4, 0, -SIDE)], mix(top, '#000000', 0.42)) +
    poly([P(0, 0), P(4, 0), P(4, 4), P(0, 4)], T.l)
  );
}

// Две задние стены комнаты.
const walls = (c: string, h = 70): Item[] => [box(0, 0, 4, 0.18, h, c, 0, 0.1), box(0, 0.18, 0.18, 3.82, h, c, 0, 0.11)];

const scenes: Record<string, () => { floor: string; items: Item[] }> = {
  // Цвета: мольберт с радугой и баночки с краской
  colors: () => ({
    floor: '#fecdd3',
    items: [
      ...walls('#fff1f2', 60),
      box(0.7, 2.2, 2.2, 0.18, 34, '#ffffff', 22, 5), // холст
      faceL(0.7, 1.25, 2.38, 22, 56, '#ef4444', 5.1), faceL(1.25, 1.8, 2.38, 22, 56, '#facc15', 5.1),
      faceL(1.8, 2.35, 2.38, 22, 56, '#22c55e', 5.1), faceL(2.35, 2.9, 2.38, 22, 56, '#3b82f6', 5.1),
      cyl(0.9, 2.3, 0.06, 24, '#92400e', 0, 4.9), cyl(2.7, 2.3, 0.06, 24, '#92400e', 0, 4.9),
      cyl(1.0, 0.9, 0.42, 24, '#ef4444', 0), cyl(2.2, 1.0, 0.42, 24, '#facc15', 0), cyl(3.2, 1.9, 0.42, 24, '#3b82f6', 0),
      ball(3.5, 3.4, 7, '#22c55e', 0), ball(1.3, 3.5, 6, '#a855f7', 0),
    ],
  }),
  // Кухня
  kitchen: () => ({
    floor: '#fde68a',
    items: [
      ...walls('#fff4e0'),
      box(0.3, 0.25, 2.3, 0.9, 26, '#d97706'), box(0.25, 0.2, 2.4, 1.0, 4, '#fef3c7', 26, depth(1.45, 0.7, 26)),
      box(0.3, 0.25, 1.7, 0.5, 22, '#b45309', 46, 3.0),
      box(2.7, 0.25, 1.0, 0.9, 26, '#94a3b8'),
      cyl(3.05, 0.55, 0.2, 2, '#1e293b', 26, 4.1), cyl(3.4, 0.85, 0.2, 2, '#1e293b', 26, 4.15), cyl(3.15, 0.6, 0.34, 10, '#ef4444', 28, 4.3),
      box(0.3, 1.5, 0.95, 1.0, 62, '#e2e8f0', 0, 4.0), faceR(1.25, 1.65, 1.8, 30, 48, '#64748b', 4.05),
      cyl(2.7, 2.7, 0.7, 16, '#92400e', 0), cyl(2.7, 2.7, 0.18, 14, '#a16207', 0, 5.3),
      cyl(1.9, 3.3, 0.28, 12, '#ef4444', 0, 6.0), cyl(3.5, 3.3, 0.28, 12, '#ef4444', 0, 6.4),
      ball(1.2, 0.7, 6, '#ef4444', 30, 3.2),
    ],
  }),
  // Комната
  room: () => ({
    floor: '#bfdbfe',
    items: [
      ...walls('#e0e7ff'),
      box(0.3, 0.3, 1.4, 2.2, 10, '#94a3b8'), box(0.3, 0.3, 1.4, 2.2, 7, '#fecdd3', 10, 3.0),
      box(0.3, 1.1, 1.4, 1.4, 3, '#6366f1', 17, 3.1), box(0.45, 0.4, 1.1, 0.55, 5, '#ffffff', 17, 3.2),
      box(2.3, 0.3, 1.4, 0.6, 14, '#92400e'), faceL(2.45, 3.55, 0.9, 16, 38, '#0f172a', 3.4), faceL(2.55, 3.45, 0.9, 19, 35, '#38bdf8', 3.5),
      box(2.3, 1.7, 1.5, 1.5, 14, '#f472b6'), box(2.3, 1.7, 1.5, 0.35, 24, '#ec4899', 0, 4.6),
      cyl(1.8, 3.4, 0.07, 36, '#475569', 0, 5.0), cyl(1.8, 3.4, 0.3, 14, '#fde047', 32, 5.1),
      cyl(3.6, 3.5, 0.3, 12, '#c2410c', 0, 6.4), ball(3.6, 3.5, 14, '#22c55e', 10, 6.5),
      faceR(0.18, 1.3, 2.7, 34, 58, '#bae6fd', 0.2),
    ],
  }),
  // Школа
  school: () => ({
    floor: '#86efac',
    items: [
      box(0.4, 0.4, 3.2, 2.6, 52, '#fde68a'), roof(0.3, 0.3, 3.4, 2.8, 26, '#ef4444', 52),
      faceL(1.6, 2.4, 3.0, 0, 28, '#7c2d12', 6.1), ball(2.25, 3.0, 2, '#fde047', 12, 6.2),
      faceL(0.7, 1.3, 3.0, 28, 44, '#7dd3fc', 6.1), faceL(2.8, 3.4, 3.0, 28, 44, '#7dd3fc', 6.1),
      faceL(0.7, 1.3, 3.0, 4, 20, '#7dd3fc', 6.1), faceL(2.8, 3.4, 3.0, 4, 20, '#7dd3fc', 6.1),
      faceR(3.6, 0.8, 1.5, 24, 42, '#7dd3fc', 6.1), faceR(3.6, 1.9, 2.6, 24, 42, '#7dd3fc', 6.1),
      box(1.55, 3.0, 0.9, 1.0, 1, '#e2e8f0', 0, 6.0),
      cyl(3.7, 3.6, 0.04, 70, '#64748b', 0, 7.0), { k: 7.1, svg: poly([P(3.7, 3.6, 70), P(3.7, 3.6, 56), P(3.7 - 0.9, 3.6 + 0.9, 62)], '#3b82f6') },
      ball(0.4, 3.5, 11, '#16a34a', 4, 6.5), cyl(0.4, 3.5, 0.06, 6, '#92400e', 0, 6.4),
    ],
  }),
  // Ванная
  bath: () => ({
    floor: '#99f6e4',
    items: [
      ...walls('#f0fdfa'),
      box(0.3, 0.3, 2.6, 1.2, 18, '#f8fafc'), box(0.45, 0.45, 2.3, 0.9, 1, '#38bdf8', 17, 3.0),
      cyl(0.45, 0.9, 0.09, 18, '#94a3b8', 18, 3.1), ball(1.4, 0.9, 5, '#ffffff', 18, 3.2), ball(2.1, 1.1, 4, '#ffffff', 18, 3.3), ball(1.8, 0.7, 3.5, '#e0f2fe', 18, 3.4),
      box(0.3, 1.9, 0.9, 1.1, 24, '#e2e8f0', 0, 4.0), box(0.4, 2.05, 0.6, 0.8, 3, '#bae6fd', 24, 4.1),
      faceR(0.18, 1.95, 2.95, 40, 64, '#bae6fd', 0.2),
      box(2.9, 0.3, 0.8, 0.5, 24, '#f8fafc', 0, 3.6), cyl(3.3, 1.2, 0.42, 14, '#f8fafc', 0, 4.4),
      faceL(1.8, 2.5, 0.18, 40, 54, '#f472b6', 0.2),
    ],
  }),
  // Прихожая
  hall: () => ({
    floor: '#fbcfe8',
    items: [
      ...walls('#fdf2f8'),
      faceL(0.6, 1.8, 0.18, 0, 60, '#92400e', 0.2), ball(1.6, 0.18, 2.5, '#fde047', 28, 0.3),
      cyl(3.4, 0.7, 0.07, 66, '#64748b', 0, 3.0), box(3.15, 0.55, 0.55, 0.3, 28, '#3b82f6', 32, 3.1), cone(3.4, 0.7, 0.24, 8, '#f59e0b', 56, 3.2),
      box(0.4, 2.3, 1.3, 0.6, 8, '#92400e', 0, 4.0), box(0.5, 2.38, 0.45, 0.26, 6, '#ef4444', 8, 4.1), box(1.05, 2.38, 0.45, 0.26, 6, '#22c55e', 8, 4.2),
      cone(2.3, 3.3, 0.46, 30, '#a855f7', 14, 5.0), cyl(2.3, 3.3, 0.04, 32, '#475569', 0, 4.9), cyl(2.3, 3.3, 0.04, 10, '#475569', 44, 5.1),
      box(3.0, 2.8, 0.75, 0.55, 22, '#22c55e', 0, 5.6),
    ],
  }),
  // Еда: прилавок с фруктами
  food: () => ({
    floor: '#fed7aa',
    items: [
      box(0.4, 0.8, 3.2, 1.2, 22, '#f59e0b'), box(0.35, 0.75, 3.3, 1.3, 3, '#fef3c7', 22, 3.2),
      ball(0.9, 1.1, 7, '#ef4444', 25, 3.3), ball(1.4, 1.5, 7, '#ef4444', 25, 3.4), ball(1.9, 1.2, 7, '#fb923c', 25, 3.35),
      ball(2.4, 1.5, 7, '#facc15', 25, 3.45), ball(2.9, 1.2, 7, '#84cc16', 25, 3.4), cone(1.2, 1.7, 0.18, 16, '#f97316', 25, 3.5),
      cyl(0.5, 0.85, 0.05, 56, '#92400e', 0, 3.6), cyl(3.5, 0.85, 0.05, 56, '#92400e', 0, 3.6),
      roof(0.3, 0.7, 3.4, 1.5, 14, '#ef4444', 56, 3.9),
      box(2.5, 2.7, 0.95, 0.8, 12, '#a16207', 0, 5.0), ball(2.8, 3.0, 6, '#ef4444', 12, 5.1), ball(3.2, 3.2, 6, '#22c55e', 12, 5.2),
      cyl(1.2, 3.1, 0.5, 10, '#b45309', 0, 5.3), ball(1.1, 3.1, 6, '#facc15', 10, 5.4), ball(1.4, 3.2, 6, '#facc15', 10, 5.5),
    ],
  }),
  // Двор и лес
  outdoor: () => ({
    floor: '#86efac',
    items: [
      cyl(0.9, 0.9, 0.16, 34, '#92400e', 0, 2.0), ball(0.9, 0.9, 22, '#15803d', 26, 2.1), ball(0.6, 1.3, 15, '#16a34a', 30, 2.2),
      cyl(3.2, 1.2, 0.13, 26, '#92400e', 0, 2.6), ball(3.2, 1.2, 17, '#22c55e', 20, 2.7),
      box(1.2, 2.2, 2.2, 0.6, 1, '#fde68a', 0, 3.0),
      box(1.4, 2.9, 1.5, 0.45, 10, '#b45309', 0, 4.6), box(1.4, 3.3, 1.5, 0.12, 22, '#92400e', 0, 4.7),
      cyl(0.5, 3.4, 0.2, 10, '#fef3c7', 0, 5.2), ball(0.5, 3.4, 11, '#ef4444', 8, 5.3), ball(0.4, 3.35, 2, '#fff', 17, 5.35),
      ball(3.5, 3.4, 6, '#ef4444', 0, 5.4), ball(2.8, 0.5, 3, '#f472b6', 0, 2.9), ball(3.0, 0.4, 3, '#facc15', 0, 2.9),
    ],
  }),
};

export const PLACE_IDS = Object.keys(scenes);

// Готовая SVG-картинка места: площадка + предметы в порядке от дальнего к ближнему.
export function placeSvg(id: string): string {
  const build = scenes[id];
  if (!build) return '';
  const { floor, items } = build();
  const body = [...items].sort((a, b) => a.k - b.k).map((i) => i.svg).join('');
  return `<svg class="place-svg" viewBox="0 0 200 182" aria-hidden="true">${platform(floor)}${body}</svg>`;
}

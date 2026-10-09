// Изометрия 2:1: клетка (gx, gy) проецируется в экран как ромб TW x TH.
export const TW = 104; // ширина плитки
export const TH = 52; // высота ромба
export const NODE_H = 30; // высота плитки задания
export const ROAD_H = 8; // высота плитки дороги
export const STEP = 3; // клеток между заданиями

export interface Cell { gx: number; gy: number; node: number | null }

// Путь зигзагом: от задания к заданию STEP клеток, на каждом задании направление меняется.
export function isoPath(n: number): Cell[] {
  const cells: Cell[] = [{ gx: 0, gy: 0, node: 0 }];
  let gx = 0, gy = 0, dir = 0;
  for (let i = 1; i < n; i++) {
    for (let k = 1; k <= STEP; k++) {
      if (dir === 0) gx++; else gy++;
      cells.push({ gx, gy, node: k === STEP ? i : null });
    }
    dir ^= 1;
  }
  return cells;
}

export const project = (gx: number, gy: number) => ({ sx: ((gx - gy) * TW) / 2, sy: ((gx + gy) * TH) / 2 });

// Главная: категории — «места» (изометрические диорамы) в два столбика со сдвигом (единицы — «дизайн-пиксели» ширины 360).
export const WORLD = { W: 360, CUBE_W: 165, CUBE_H: 150, LABEL_H: 36, ROW: 196, OFFSET: 98 };

export interface WorldItem { cx: number; top: number }

export function worldLayout(n: number): { W: number; H: number; items: WorldItem[] } {
  const { W, CUBE_H, LABEL_H, ROW, OFFSET } = WORLD;
  const items: WorldItem[] = Array.from({ length: n }, (_, i) => {
    const col = i % 2;
    return { cx: col ? W * 0.73 : W * 0.27, top: Math.floor(i / 2) * ROW + (col ? OFFSET : 0) };
  });
  const H = Math.max(...items.map((p) => p.top)) + CUBE_H + LABEL_H + 6;
  return { W, H, items };
}

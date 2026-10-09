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

import { describe, expect, it } from 'vitest';
import { isoPath, project, STEP } from './iso';

describe('isoPath', () => {
  it('содержит все задания по порядку и дорогу между ними', () => {
    const cells = isoPath(8);
    expect(cells.filter((c) => c.node !== null).map((c) => c.node)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(cells).toHaveLength(1 + 7 * STEP);
  });
  it('клетки не повторяются и соседние шагом в одну клетку', () => {
    const cells = isoPath(10);
    expect(new Set(cells.map((c) => `${c.gx},${c.gy}`)).size).toBe(cells.length);
    for (let i = 1; i < cells.length; i++) {
      const d = Math.abs(cells[i].gx - cells[i - 1].gx) + Math.abs(cells[i].gy - cells[i - 1].gy);
      expect(d).toBe(1);
    }
  });
  it('зигзаг: задания чередуются слева и справа', () => {
    const xs = isoPath(6).filter((c) => c.node !== null).map((c) => project(c.gx, c.gy).sx);
    expect(xs[1]).toBeGreaterThan(xs[0]);
    expect(xs[2]).toBeLessThan(xs[1]);
    expect(xs[3]).toBeGreaterThan(xs[2]);
  });
  it('вниз по экрану путь только спускается', () => {
    const ys = isoPath(6).map((c) => project(c.gx, c.gy).sy);
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThan(ys[i - 1]);
  });
});

import { worldLayout, WORLD } from './iso';

describe('worldLayout', () => {
  it('два столбика со сдвигом, кубы не пересекаются', () => {
    const { items, H } = worldLayout(6);
    expect(items).toHaveLength(6);
    expect(items[1].cx).toBeGreaterThan(items[0].cx);
    expect(items[1].top).toBeGreaterThan(items[0].top);
    // в одном столбике соседние кубы не наезжают друг на друга по вертикали
    expect(items[2].top - items[0].top).toBeGreaterThanOrEqual(WORLD.CUBE_H + WORLD.LABEL_H);
    expect(Math.max(...items.map((p) => p.top)) + WORLD.CUBE_H + WORLD.LABEL_H).toBeLessThanOrEqual(H);
  });
  it('кубы помещаются по ширине', () => {
    for (const p of worldLayout(6).items) {
      expect(p.cx - WORLD.CUBE_W / 2).toBeGreaterThanOrEqual(0);
      expect(p.cx + WORLD.CUBE_W / 2).toBeLessThanOrEqual(WORLD.W);
    }
  });
});

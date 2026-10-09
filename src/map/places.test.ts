import { describe, expect, it } from 'vitest';
import { LEVELS } from '../data/tasks';
import { mix, placeSvg, PLACE_IDS, tones } from './places';

describe('места на главной', () => {
  it('у каждой категории есть своё место', () => {
    for (const l of LEVELS) expect(PLACE_IDS, l.id).toContain(l.id);
  });
  it('картинки корректные: есть фигуры и нет NaN', () => {
    for (const id of PLACE_IDS) {
      const svg = placeSvg(id);
      expect(svg.startsWith('<svg'), id).toBe(true);
      expect(svg.match(/<polygon|<path|<circle|<ellipse/g)!.length, id).toBeGreaterThan(20);
      expect(svg, id).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
  it('неизвестное место — пустая строка', () => {
    expect(placeSvg('nope')).toBe('');
  });
  it('цвета граней: верх светлее, правая грань темнее', () => {
    const t = tones('#808080');
    const lum = (h: string) => parseInt(h.slice(1, 3), 16);
    expect(lum(t.t)).toBeGreaterThan(lum(t.l));
    expect(lum(t.r)).toBeLessThan(lum(t.l));
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});

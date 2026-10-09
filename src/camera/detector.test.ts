import { describe, expect, it } from 'vitest';
import { pickDetection } from './detector';

const frame = { w: 640, h: 480 };
const P = (cls: string, score: number, bbox: number[]) => ({ class: cls, score, bbox });

describe('pickDetection', () => {
  it('людей игнорирует', () => {
    expect(pickDetection([P('person', 0.95, [100, 50, 300, 400])], frame, {})).toBeNull();
  });
  it('низкую уверенность игнорирует', () => {
    expect(pickDetection([P('cup', 0.2, [250, 200, 100, 100])], frame, {})).toBeNull();
  });
  it('предпочитает предмет, подходящий под задание', () => {
    const d = pickDetection(
      [P('book', 0.9, [260, 190, 120, 100]), P('cup', 0.6, [20, 20, 60, 60])],
      frame, { words: ['cup', 'mug'] },
    );
    expect(d?.className).toBe('cup');
  });
  it('без подсказки берёт крупный предмет ближе к центру', () => {
    const d = pickDetection([P('cup', 0.7, [10, 10, 40, 40]), P('book', 0.7, [220, 160, 200, 160])], frame, {});
    expect(d?.className).toBe('book');
  });
  it('возвращает рамку в координатах кадра', () => {
    expect(pickDetection([P('cup', 0.8, [10, 20, 30, 40])], frame, {})?.box).toEqual({ x: 10, y: 20, w: 30, h: 40 });
  });
});

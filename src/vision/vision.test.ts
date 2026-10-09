import { describe, expect, it } from 'vitest';
import { classifyPixel, colorShares, hasColor } from './color';
import { matchesLabels } from './labels';

describe('classifyPixel', () => {
  const cases: Array<[string, [number, number, number]]> = [
    ['red', [220, 30, 30]], ['blue', [30, 60, 200]], ['green', [40, 170, 60]], ['yellow', [250, 220, 40]],
    ['orange', [255, 150, 30]], ['purple', [150, 60, 200]], ['pink', [255, 150, 190]], ['brown', [120, 70, 30]],
    ['white', [250, 250, 250]], ['black', [10, 10, 10]], ['gray', [128, 128, 128]],
  ];
  it.each(cases)('%s', (name, [r, g, b]) => expect(classifyPixel(r, g, b)).toBe(name));
});

describe('colorShares', () => {
  const solid = (r: number, g: number, b: number, n = 10) => {
    const d = new Uint8ClampedArray(n * n * 4);
    for (let i = 0; i < n * n; i++) d.set([r, g, b, 255], i * 4);
    return d;
  };
  it('сплошной красный: красный найден, синий нет', () => {
    const s = colorShares(solid(220, 30, 30), 10, 10);
    expect(hasColor(s, 'red')).toBe(true);
    expect(hasColor(s, 'blue')).toBe(false);
  });
  it('красный предмет в центре на белом фоне засчитывается', () => {
    const d = solid(250, 250, 250);
    for (let y = 3; y < 7; y++) for (let x = 3; x < 7; x++) d.set([220, 30, 30, 255], (y * 10 + x) * 4);
    expect(hasColor(colorShares(d, 10, 10), 'red')).toBe(true);
  });
});

describe('matchesLabels', () => {
  const preds = [{ className: 'coffee mug', probability: 0.5 }, { className: 'cup', probability: 0.2 }];
  it('находит класс по целому слову', () => expect(matchesLabels(preds, ['mug'])).toBe(true));
  it('не срабатывает на часть слова', () => expect(matchesLabels([{ className: 'open', probability: 0.9 }], ['pen'])).toBe(false));
  it('игнорирует низкую уверенность', () => expect(matchesLabels([{ className: 'mug', probability: 0.01 }], ['mug'])).toBe(false));
});

import { evaluate } from './evaluate';
import { LEVELS } from '../data/tasks';

const ctxOf = (shares: Partial<Record<string, number>>, preds: Array<[string, number]>) => ({
  shares: () => ({ red: 0, orange: 0, yellow: 0, green: 0, blue: 0, purple: 0, pink: 0, brown: 0, white: 0, black: 0, gray: 0, ...shares }) as any,
  predictions: () => preds.map(([className, probability]) => ({ className, probability })),
});

describe('evaluate', () => {
  it('and: нужны и цвет, и предмет', async () => {
    const check = { kind: 'and', checks: [{ kind: 'color', color: 'red' }, { kind: 'labels', words: ['ball'] }] } as const;
    expect(await evaluate(check as any, ctxOf({ red: 0.5 }, [['soccer ball', 0.6]]))).toBe(true);
    expect(await evaluate(check as any, ctxOf({ red: 0.5 }, [['mug', 0.6]]))).toBe(false);
    expect(await evaluate(check as any, ctxOf({ blue: 0.5 }, [['soccer ball', 0.6]]))).toBe(false);
  });
  it('multicolor: два разных цвета', async () => {
    const c = { kind: 'multicolor', min: 2 } as const;
    expect(await evaluate(c, ctxOf({ red: 0.3, blue: 0.3 }, []))).toBe(true);
    expect(await evaluate(c, ctxOf({ red: 0.6 }, []))).toBe(false);
  });
  it('any: нужен узнаваемый предмет', async () => {
    expect(await evaluate({ kind: 'any' }, ctxOf({}, [['mug', 0.5]]))).toBe(true);
    expect(await evaluate({ kind: 'any' }, ctxOf({}, [['mug', 0.05]]))).toBe(false);
  });
});

describe('покрытие заданий', () => {
  it('у каждого задания есть локальная проверка', () => {
    const missing = LEVELS.flatMap((l) => l.tasks).filter((t) => !t.local).map((t) => t.id);
    expect(missing).toEqual([]);
  });
});

import { ruName } from './names';

describe('ruName', () => {
  it('переводит классы ImageNet', () => {
    expect(ruName('coffee mug')).toBe('кружка');
    expect(ruName('ballpoint, ballpoint pen, ballpen, Biro')).toBe('шариковая ручка');
    expect(ruName('book jacket, dust cover, dust jacket')).toBe('книга');
    expect(ruName('ping-pong ball')).toBe('мяч');
  });
  it('не срабатывает на часть слова и на неизвестное', () => {
    expect(ruName('open')).toBeNull();
    expect(ruName('banana')).toBeNull();
  });
});

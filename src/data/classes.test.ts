import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { LEVELS } from './tasks';
import { matchesLabels } from '../vision/labels';

// Настоящий список классов детектора COCO-SSD (из установленной библиотеки).
const require = createRequire(import.meta.url);
const COCO: string[] = (Object.values(require('@tensorflow-models/coco-ssd/dist/classes.js').CLASSES) as Array<{ displayName: string }>).map((c) => c.displayName);

const objectTasks = LEVELS.flatMap((l) => l.tasks.map((t) => ({ level: l.id, t }))).filter(({ t }) => t.local?.kind === 'labels');
const hits = (words: string[], names: string[]) => names.filter((n) => matchesLabels([{ className: n, probability: 1 }], words));

describe('предметы заданий и классы моделей', () => {
  it('списки классов загрузились', () => {
    expect(COCO).toHaveLength(80);
  });

  // Предмет без класса COCO проверяет только CLIP, поэтому у каждого задания есть либо класс COCO, либо название для CLIP.
  it.each(objectTasks.map(({ t }) => [t.id, t] as const))('%s: есть класс COCO или название для CLIP', (_id, t) => {
    const { words, clip } = t.local as { words: string[]; clip?: string };
    expect(hits(words, COCO).length > 0 || !!clip, `для «${t.prompt}» нет ни класса COCO, ни названия для CLIP`).toBe(true);
  });

  it('в уровне разные задания не путаются на одном классе (кроме известных пар)', () => {
    const allowed = new Set<string>(); // классы COCO, на которых допустимо путать задания одного уровня
    for (const level of LEVELS) {
      const tasks = level.tasks.filter((t) => t.local?.kind === 'labels');
      const owner = new Map<string, string>();
      for (const t of tasks) {
        const words = (t.local as { words: string[] }).words;
        for (const c of hits(words, COCO)) {
          if (allowed.has(c)) continue;
          const other = owner.get(c);
          expect(other === undefined || other === t.id, `класс «${c}» подходит сразу двум заданиям в «${level.title}»: ${other} и ${t.id}`).toBe(true);
          owner.set(c, t.id);
        }
      }
    }
  });

  it('конкретные примеры: холодильник и ножницы по COCO', () => {
    const find = (id: string) => (objectTasks.find(({ t }) => t.id === id)!.t.local as { words: string[] }).words;
    expect(hits(find('object-fridge'), COCO)).toEqual(['refrigerator']);
    expect(hits(find('object-scissors'), COCO)).toEqual(['scissors']);
  });
});

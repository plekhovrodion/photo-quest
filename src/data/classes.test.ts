import { describe, expect, it } from 'vitest';
import { LEVELS } from './tasks';
import { matchesLabels } from '../vision/labels';
import { YOLO_CLASSES } from '../vision/yolo';

const COCO = YOLO_CLASSES;

const objectTasks = LEVELS.flatMap((l) => l.tasks.map((t) => ({ level: l.id, t }))).filter(({ t }) => t.local?.kind === 'labels');
const hits = (words: string[], names: string[]) => names.filter((n) => matchesLabels([{ className: n, probability: 1 }], words));

describe('предметы заданий и классы YOLO', () => {
  it('стандартная модель YOLO содержит 80 классов COCO', () => {
    expect(COCO).toHaveLength(80);
  });

  it.each(objectTasks.map(({ t }) => [t.id, t] as const))('%s: есть класс YOLO', (_id, t) => {
    const { words } = t.local as { words: string[] };
    expect(hits(words, COCO).length > 0, `для «${t.prompt}» нет класса в YOLO`).toBe(true);
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

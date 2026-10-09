import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { LEVELS } from './tasks';
import { matchesLabels } from '../vision/labels';

// Настоящие списки классов, которые отдают модели (из установленных библиотек).
const require = createRequire(import.meta.url);
const IMAGENET: string[] = Object.values(require('@tensorflow-models/mobilenet/dist/imagenet_classes.js').IMAGENET_CLASSES);
const COCO: string[] = (Object.values(require('@tensorflow-models/coco-ssd/dist/classes.js').CLASSES) as Array<{ displayName: string }>).map((c) => c.displayName);

const objectTasks = LEVELS.flatMap((l) => l.tasks.map((t) => ({ level: l.id, t }))).filter(({ t }) => t.local?.kind === 'labels');
const hits = (words: string[], names: string[]) => names.filter((n) => matchesLabels([{ className: n, probability: 1 }], words));

describe('предметы заданий и классы моделей', () => {
  it('списки классов загрузились', () => {
    expect(IMAGENET).toHaveLength(1000);
    expect(COCO).toHaveLength(80);
  });

  it.each(objectTasks.map(({ t }) => [t.id, t] as const))('%s: слова находят хотя бы один настоящий класс', (_id, t) => {
    const words = (t.local as { words: string[] }).words;
    const found = [...hits(words, IMAGENET), ...hits(words, COCO)];
    expect(found.length, `для «${t.prompt}» нет классов`).toBeGreaterThan(0);
  });

  it('в уровне разные задания не путаются на одном классе (кроме известных пар)', () => {
    const allowed = new Set(['studio couch, day bed', 'tow truck, tow car, wrecker']); // «диван»/«кровать» и «машина»/«грузовик» делят эти классы
    for (const level of LEVELS) {
      const tasks = level.tasks.filter((t) => t.local?.kind === 'labels');
      const owner = new Map<string, string>();
      for (const t of tasks) {
        const words = (t.local as { words: string[] }).words;
        for (const c of [...hits(words, IMAGENET), ...hits(words, COCO)]) {
          if (allowed.has(c)) continue;
          const other = owner.get(c);
          expect(other === undefined || other === t.id, `класс «${c}» подходит сразу двум заданиям в «${level.title}»: ${other} и ${t.id}`).toBe(true);
          owner.set(c, t.id);
        }
      }
    }
  });

  it('конкретные примеры: вилка только по COCO, ручка по ImageNet', () => {
    const find = (id: string) => (objectTasks.find(({ t }) => t.id === id)!.t.local as { words: string[] }).words;
    expect(hits(find('object-fork'), IMAGENET)).toEqual([]);
    expect(hits(find('object-fork'), COCO)).toEqual(['fork']);
    expect(hits(find('object-pen'), IMAGENET).length).toBeGreaterThan(0);
    expect(hits(find('object-scissors'), COCO)).toEqual(['scissors']);
  });
});

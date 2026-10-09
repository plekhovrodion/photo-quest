import { describe, expect, it } from 'vitest';
import { LEVELS } from '../data/tasks';
import { OBJECT_IDS, objectSvg } from './objects';

describe('3D-предметы', () => {
  it('для каждого задания с предметом есть картинка', () => {
    for (const l of LEVELS) for (const t of l.tasks) {
      if (t.local?.kind !== 'labels') continue;
      const id = t.id.replace(/^object-/, '');
      expect(OBJECT_IDS, `${t.id}`).toContain(id);
      expect(objectSvg(id)).toContain('<svg');
    }
  });
  it('неизвестный предмет — пустая строка', () => {
    expect(objectSvg('нет такого')).toBe('');
  });
});

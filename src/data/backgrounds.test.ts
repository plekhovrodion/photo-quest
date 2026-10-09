import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { BACKGROUNDS, backgroundFor } from './backgrounds';
import { LEVELS } from './tasks';

describe('backgrounds', () => {
  it('у главной и у каждой категории есть фон', () => {
    expect(BACKGROUNDS.menu).toBeDefined();
    for (const l of LEVELS) expect(BACKGROUNDS[l.id], l.id).toBeDefined();
  });
  it('все файлы фонов лежат в public/art', () => {
    for (const b of Object.values(BACKGROUNDS)) expect(existsSync(`public/art/${b.file}`), b.file).toBe(true);
  });
  it('неизвестная категория получает фон главной', () => {
    expect(backgroundFor('nope')).toBe(BACKGROUNDS.menu);
    expect(backgroundFor(null)).toBe(BACKGROUNDS.menu);
  });
});

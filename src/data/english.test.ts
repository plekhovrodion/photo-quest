import { describe, it, expect } from 'vitest';
import { TASKS } from './tasks';
import { englishFor } from './english';

describe('английские слова', () => {
  it('есть у каждого задания', () => {
    const missing = TASKS.filter((t) => !englishFor(t.id)).map((t) => t.id);
    expect(missing).toEqual([]);
  });
});

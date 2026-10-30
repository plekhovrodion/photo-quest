import { describe, expect, it } from 'vitest';
import { recordedFor } from './voice';

describe('записанная озвучка', () => {
  it('находит запись по тексту задания и не путает русские фразы с английскими словами', () => {
    expect(recordedFor('Найди предмет с красным цветом')).toMatch(/voice\/task-red\.mp3$/);
    expect(recordedFor('Найди предмет с красным цветом', true)).toBeNull();
    expect(recordedFor('такой фразы нет')).toBeNull();
  });
});

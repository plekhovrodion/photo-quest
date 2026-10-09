import { describe, expect, it } from 'vitest';
import { CHAPTERS, allLevelsHaveChapter, chapterFor } from './story';

describe('story', () => {
  it('у каждого уровня есть глава, цвета уникальны', () => {
    expect(allLevelsHaveChapter()).toBe(true);
    expect(new Set(CHAPTERS.map((c) => c.color)).size).toBe(CHAPTERS.length);
  });
  it('chapterFor находит главу по id уровня', () => {
    expect(chapterFor('colors').place).toBe('Долина Красок');
  });
});

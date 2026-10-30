import { describe, it, expect } from 'vitest';
import { ALL_PHRASES, PRAISE, TRY_AGAIN, pickPhrase } from './phrases';

describe('заготовленные фразы', () => {
  it('у каждой фразы уникальный код и текст', () => {
    const ids = ALL_PHRASES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ALL_PHRASES.every((p) => p.text.trim().length > 0)).toBe(true);
  });
  it('в сообщении о неудаче нет объяснения, что в кадре', () => {
    expect(TRY_AGAIN.some((p) => /это (похоже|\w+ыи?)/i.test(p.text) && /предмет|кошк|ложк/i.test(p.text))).toBe(false);
  });
  it('подряд одна и та же фраза не выпадает', () => {
    let prev = pickPhrase(PRAISE).id;
    for (let i = 0; i < 50; i++) { const cur = pickPhrase(PRAISE).id; expect(cur).not.toBe(prev); prev = cur; }
  });
});

import { describe, expect, it } from 'vitest';
import { beadsLimitHtml } from './beadsLimit';

describe('beadsLimitHtml', () => {
  it('показывает текст и оригинальные иллюстрации из макета', () => {
    const html = beadsLimitHtml().replace(/\u00a0/g, ' ');
    expect(html).toContain('Позови взрослых, чтобы продолжить');
    expect(html).toContain('Выучить английские слова');
    expect(html).toContain('Запомнить их произношение');
    expect(html).toContain('Подружиться с английским через реальный мир');
    for (const asset of ['cat.svg', 'paws-back.svg', 'paws-front.svg', 'paw.svg']) {
      expect(html).toContain(`art/beads/${asset}`);
    }
  });

  it('всегда показывает кнопку «Открыть полный доступ»', () => {
    expect(beadsLimitHtml()).toContain('Открыть полный доступ');
  });
});

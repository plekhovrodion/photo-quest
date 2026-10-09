import { describe, expect, it } from 'vitest';
import { scoreVoice } from './sounds';

const v = (name: string, lang = 'ru-RU', localService = true) => ({ name, lang, localService });

describe('выбор голоса', () => {
  it('нейросетевой лучше обычного, компактный хуже, нерусский не берём', () => {
    expect(scoreVoice(v('Microsoft Svetlana Online (Natural) - Russian'))).toBeGreaterThan(scoreVoice(v('Milena')));
    expect(scoreVoice(v('Milena'))).toBeGreaterThan(scoreVoice(v('Russian Compact')));
    expect(scoreVoice(v('Милена'))).toBeGreaterThan(scoreVoice(v('Russian Compact')));
    expect(scoreVoice(v('Samantha', 'en-US'))).toBeLessThan(0);
  });
});

import { describe, expect, it } from 'vitest';
import { parseVerifyResponse } from './verify';

describe('parseVerifyResponse', () => {
  it('принимает корректный ответ', () => {
    expect(parseVerifyResponse({ match: true, reason: 'ok' })).toEqual({ match: true, reason: 'ok' });
  });
  it('подставляет пустую причину', () => {
    expect(parseVerifyResponse({ match: false })).toEqual({ match: false, reason: '' });
  });
  it('отклоняет мусор', () => {
    expect(() => parseVerifyResponse(null)).toThrow();
    expect(() => parseVerifyResponse({ match: 'yes' })).toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import { feedbackConfig } from './feedback';

describe('feedbackConfig', () => {
  it('использует отдельную анкету ФотоКвеста в общем сервисе', () => {
    expect(feedbackConfig('https://uchi.ru/content_feedback/')).toEqual({
      apiVersion: 1,
      baseUrl: 'https://uchi.ru/content_feedback',
      projectName: 'photo_quest',
      formName: 'feedback',
    });
  });

  it('поддерживает адрес сервиса за шлюзом', () => {
    expect(feedbackConfig('/content_feedback')?.baseUrl).toBe('/content_feedback');
  });

  it.each(['', '   ', '<%FEEDBACK_API_URL%>'])('отключает форму без настроенного адреса %s', (url) => {
    expect(feedbackConfig(url)).toBeNull();
  });
});

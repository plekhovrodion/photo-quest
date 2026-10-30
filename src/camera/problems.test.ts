import { describe, expect, it } from 'vitest';
import { classifyCameraError, detectPlatform, instructionSteps, PROBLEM_SCREENS, unavailableReason } from './problems';

describe('ошибки камеры', () => {
  it('различает отказ, отсутствие, занятость и прочее', () => {
    expect(classifyCameraError({ name: 'NotAllowedError' })).toBe('denied');
    expect(classifyCameraError({ name: 'PermissionDeniedError' })).toBe('denied');
    expect(classifyCameraError({ name: 'NotFoundError' })).toBe('nocamera');
    expect(classifyCameraError({ name: 'NotReadableError' })).toBe('busy');
    expect(classifyCameraError(new Error('что-то'))).toBe('other');
    expect(classifyCameraError(null)).toBe('other');
  });

  it('без https причина — защищённая ссылка, без API — нет камеры', () => {
    expect(unavailableReason(false, true)).toBe('insecure');
    expect(unavailableReason(true, false)).toBe('nocamera');
  });

  it('у каждой причины есть текст и кнопка, доступ ведёт к инструкции', () => {
    for (const k of Object.keys(PROBLEM_SCREENS) as Array<keyof typeof PROBLEM_SCREENS>) {
      expect(PROBLEM_SCREENS[k].title.length).toBeGreaterThan(0);
      expect(PROBLEM_SCREENS[k].button.length).toBeGreaterThan(0);
    }
    expect(PROBLEM_SCREENS.denied.next).toBe('instructions');
    expect(PROBLEM_SCREENS.nocamera.next).toBe('close');
  });
});

describe('платформа и инструкция', () => {
  it('узнаёт iOS, в том числе iPad под видом Mac, и Android', () => {
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5)).toBe('ios');
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe('ios');
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe('desktop');
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 5)).toBe('android');
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0)).toBe('desktop');
  });

  it('у каждой платформы своя инструкция с шагом про возврат в игру', () => {
    const all = (['ios', 'android', 'safari', 'yandex', 'firefox', 'chrome'] as const).map(instructionSteps);
    for (const steps of all) expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(all[0].join(' ')).toMatch(/Safari/);
    expect(all[1].join(' ')).toMatch(/Chrome/);
    expect(new Set(all.map((s) => s.join('|'))).size).toBe(6);
  });
});

import { helpArt } from './problems';
describe('helpArt', () => {
  it('по браузеру на компьютере и по системе на телефоне', () => {
    expect(helpArt('Mozilla/5.0 (Macintosh) AppleWebKit Version/17 Safari/605', 'desktop')).toBe('safari');
    expect(helpArt('Mozilla/5.0 Chrome/120 Safari/537', 'desktop')).toBe('chrome');
    expect(helpArt('Mozilla/5.0 Chrome/120 Safari/537 Edg/120', 'desktop')).toBe('chrome');
    expect(helpArt('Mozilla/5.0 Gecko Firefox/121', 'desktop')).toBe('firefox');
    expect(helpArt('Mozilla/5.0 Chrome/120 YaBrowser/24 Safari/537', 'desktop')).toBe('yandex');
    expect(helpArt('x', 'ios')).toBe('ios');
    expect(helpArt('x', 'android')).toBe('android');
  });
});

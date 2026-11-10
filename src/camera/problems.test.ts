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
    const all = (['ios', 'android', 'safari', 'yandex', 'firefox', 'chrome', 'edge'] as const).map(instructionSteps);
    for (const steps of all) expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(all[0].join(' ')).toMatch(/Safari/);
    expect(all[1].join(' ')).toMatch(/браузер/);
    expect(new Set(all.map((s) => s.join('|'))).size).toBe(7);
  });
});

import { helpArt } from './problems';
describe('helpArt', () => {
  it('по браузеру на компьютере и по системе на телефоне', () => {
    expect(helpArt('Mozilla/5.0 (Macintosh) AppleWebKit Version/17 Safari/605', 'desktop')).toBe('safari');
    expect(helpArt('Mozilla/5.0 Chrome/120 Safari/537', 'desktop')).toBe('chrome');
    expect(helpArt('Mozilla/5.0 Chrome/120 Safari/537 Edg/120', 'desktop')).toBe('edge');
    expect(helpArt('Mozilla/5.0 Gecko Firefox/121', 'desktop')).toBe('firefox');
    expect(helpArt('Mozilla/5.0 Chrome/120 YaBrowser/24 Safari/537', 'desktop')).toBe('yandex');
    expect(helpArt('x', 'ios')).toBe('ios');
    expect(helpArt('x', 'android')).toBe('android');
  });
});


describe('инструкция Safari на компьютере', () => {
  it('ведёт к разрешению камеры на вкладке Сайты', () => {
    const steps = instructionSteps('safari').join(' ');
    expect(steps).toContain('«Настройки»');
    expect(steps).toContain('«Сайты»');
    expect(steps).toContain('«Камера»');
    expect(steps).toContain('«Разрешить»');
    expect(steps).not.toContain('переключатель');
  });
});


describe('инструкции по браузерам', () => {
  it('показывает отдельный путь для Edge', () => {
    expect(instructionSteps('edge').join(' ')).toContain('«Разрешения для этого сайта»');
  });
  it('указывает Разрешить в Chrome и Яндексе', () => {
    for (const browser of ['chrome', 'yandex'] as const) {
      expect(instructionSteps(browser).join(' ')).toContain('«Разрешить»');
      expect(instructionSteps(browser).join(' ')).not.toContain('переключатель');
    }
  });
  it('описывает разрешения Firefox и настройки Safari на iOS', () => {
    expect(instructionSteps('firefox').join(' ')).toContain('«Использовать по умолчанию»');
    expect(instructionSteps('ios').join(' ')).toContain('«Настройки для веб-сайтов»');
    expect(instructionSteps('ios').join(' ')).not.toContain('переключатель');
  });
});


describe('мобильные браузеры', () => {
  it.each([
    ['Android Chrome/130 Safari/537', 'android', 'android-chrome'],
    ['Android Chrome/130 YaBrowser/24', 'android', 'android-yandex'],
    ['Android Chrome/130 EdgA/130', 'android', 'android-edge'],
    ['Android Chrome/130 OPR/80', 'android', 'android-opera'],
    ['Android Firefox/130', 'android', 'android-firefox'],
    ['iPhone CriOS/130 Safari/605', 'ios', 'ios-chrome'],
    ['iPhone FxiOS/130', 'ios', 'ios-firefox'],
    ['iPhone Version/18 Safari/605', 'ios', 'ios'],
  ] as const)('выбирает инструкцию для %s', (ua, platform, expected) => {
    expect(helpArt(ua, platform)).toBe(expected);
  });
  it('использует мобильные пути Яндекса, Opera и Edge', () => {
    expect(instructionSteps('android-yandex').join(' ')).toContain('«О сайте»');
    expect(instructionSteps('android-opera').join(' ')).toContain('щита');
    expect(instructionSteps('android-edge').join(' ')).toContain('Microsoft Edge');
    expect(instructionSteps('ios-chrome').join(' ')).toContain('Google Chrome');
  });
});

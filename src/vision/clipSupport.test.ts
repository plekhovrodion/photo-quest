import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertRecognitionSupport, UnsupportedRecognitionError } from './clipSupport';

afterEach(() => vi.unstubAllGlobals());

describe('совместимость распознавания', () => {
  it('разрешает запуск в среде с поддержкой SIMD', () => {
    expect(() => assertRecognitionSupport()).not.toThrow();
  });

  it('проверяет возможности, а не только заявленную версию iOS', () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone OS 15_0', maxTouchPoints: 1 });
    vi.stubGlobal('WebAssembly', { validate: () => true });
    expect(() => assertRecognitionSupport()).not.toThrow();
  });

  it('объясняет необходимость обновить iOS при отсутствии SIMD', () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone OS 15_0', maxTouchPoints: 1 });
    vi.stubGlobal('WebAssembly', { validate: () => false });
    expect(() => assertRecognitionSupport()).toThrow(UnsupportedRecognitionError);
    expect(() => assertRecognitionSupport()).toThrow('Обновите iOS');
  });

  it('распознаёт iPad с настольной строкой браузера', () => {
    vi.stubGlobal('navigator', { userAgent: 'Macintosh', maxTouchPoints: 5 });
    vi.stubGlobal('WebAssembly', undefined);
    expect(() => assertRecognitionSupport()).toThrow('Обновите iOS');
  });

  it('обрабатывает исключения старого WebAssembly без падения страницы', () => {
    vi.stubGlobal('navigator', { userAgent: 'Desktop', maxTouchPoints: 0 });
    vi.stubGlobal('WebAssembly', { validate: () => { throw new Error('unsupported'); } });
    expect(() => assertRecognitionSupport()).toThrow('Обновите браузер');
  });
});

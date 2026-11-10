import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let register: ReturnType<typeof vi.fn>;
let persist: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  register = vi.fn().mockResolvedValue({ installing: null, waiting: null });
  persist = vi.fn().mockResolvedValue(false);
  vi.stubGlobal('navigator', { serviceWorker: { register, ready: Promise.resolve() }, storage: { persist } });
  vi.stubGlobal('window', { caches: {} });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('подготовка кэша модели', () => {
  it('разделяет регистрацию между параллельными загрузками', async () => {
    const { prepareModelCache } = await import('./modelCache');
    const first = prepareModelCache();
    expect(prepareModelCache()).toBe(first);
    await first;
    expect(register).toHaveBeenCalledOnce();
  });

  it('не блокирует модель при запрещённом Service Worker', async () => {
    register.mockRejectedValue(new Error('SecurityError'));
    const { prepareModelCache } = await import('./modelCache');
    await expect(prepareModelCache()).resolves.toBeUndefined();
  });

  it('продолжает загрузку через две секунды, если регистрация зависла', async () => {
    register.mockReturnValue(new Promise(() => {}));
    const { prepareModelCache } = await import('./modelCache');
    let finished = false;
    const ready = prepareModelCache().then(() => { finished = true; });
    await vi.advanceTimersByTimeAsync(1999);
    expect(finished).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await ready;
    expect(finished).toBe(true);
  });

  it('не ожидает бесконечно разрешения сохранять данные', async () => {
    persist.mockReturnValue(new Promise(() => {}));
    const { prepareModelCache } = await import('./modelCache');
    await expect(prepareModelCache()).resolves.toBeUndefined();
  });

  it('дожидается активации устанавливаемого обновления', async () => {
    const worker = Object.assign(new EventTarget(), { state: 'installing' });
    register.mockResolvedValue({ installing: worker });
    const { prepareModelCache } = await import('./modelCache');
    let finished = false;
    const ready = prepareModelCache().then(() => { finished = true; });
    await vi.advanceTimersByTimeAsync(0);
    expect(finished).toBe(false);
    worker.state = 'activated';
    worker.dispatchEvent(new Event('statechange'));
    await ready;
    expect(finished).toBe(true);
  });
});

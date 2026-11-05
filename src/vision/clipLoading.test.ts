import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  bytes: vi.fn(), ready: vi.fn(), loading: vi.fn(), error: vi.fn(),
}));
vi.mock('./models', () => ({
  heavyModelsAllowed: () => true,
  fetchWithProgress: mocks.bytes,
  setClipReady: mocks.ready,
  setClipLoading: mocks.loading,
  setClipError: mocks.error,
}));

class FakeWorker extends EventTarget {
  static instances: FakeWorker[] = [];
  static initError = false;
  terminate = vi.fn();
  messages: Array<{ type: string; id?: number }> = [];
  constructor() { super(); FakeWorker.instances.push(this); }
  postMessage(message: { type: string; id?: number }) {
    this.messages.push(message);
    if (message.type === 'init') queueMicrotask(() => this.reply(FakeWorker.initError
      ? { type: 'error', message: 'runtime unavailable' } : { type: 'ready' }));
  }
  reply(data: object) { this.dispatchEvent(new MessageEvent('message', { data })); }
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  FakeWorker.instances = [];
  FakeWorker.initError = false;
  mocks.bytes.mockResolvedValue(new ArrayBuffer(8));
  vi.stubGlobal('Worker', FakeWorker);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ens: { laptop: [1, 0] }, bg: { wall: [0, 1] } }) }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('CLIP lifetime across camera screens', () => {
  it('shares an in-flight load and reuses the ready model on re-entry', async () => {
    const { loadClip } = await import('./clip');
    const first = loadClip();
    expect(loadClip()).toBe(first);
    const model = await first;
    expect(await loadClip()).toBe(model);
    expect(mocks.bytes).toHaveBeenCalledTimes(1);
    expect(FakeWorker.instances).toHaveLength(1);
  });

  it('terminates a failed initializer and allows a fresh attempt', async () => {
    const { loadClip } = await import('./clip');
    FakeWorker.initError = true;
    await expect(loadClip()).rejects.toThrow('runtime unavailable');
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
    FakeWorker.initError = false;
    await expect(loadClip()).resolves.toHaveProperty('run');
    expect(FakeWorker.instances).toHaveLength(2);
  });

  it('rejects a pending inference after worker failure and resets readiness', async () => {
    const { loadClip } = await import('./clip');
    const model = await loadClip();
    const result = model.run(new Float32Array(3));
    const rejected = expect(result).rejects.toThrow('worker crashed');
    FakeWorker.instances[0].dispatchEvent(Object.assign(new Event('error'), { message: 'worker crashed' }));
    await rejected;
    expect(mocks.error).toHaveBeenCalled();
    await loadClip();
    expect(FakeWorker.instances).toHaveLength(2);
  });

  it('times out hung inference instead of retaining a dead worker forever', async () => {
    vi.useFakeTimers();
    const { loadClip } = await import('./clip');
    const model = await loadClip();
    const result = model.run(new Float32Array(3));
    const rejected = expect(result).rejects.toThrow('не ответил');
    await vi.advanceTimersByTimeAsync(60_000);
    await rejected;
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });

  it('rejects failed text downloads instead of marking the model ready', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const { loadClip } = await import('./clip');
    await expect(loadClip()).rejects.toThrow('CLIP text: 404');
    expect(mocks.ready).not.toHaveBeenCalled();
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });
});

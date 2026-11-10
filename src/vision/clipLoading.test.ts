import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  bytes: vi.fn(), ready: vi.fn(), loading: vi.fn(), stage: vi.fn(), error: vi.fn(),
}));
vi.mock('./models', () => ({
  fetchWithProgress: mocks.bytes,
  setClipReady: mocks.ready,
  setClipLoading: mocks.loading,
  setClipStage: mocks.stage,
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

  it('checks browser support before downloading weights or starting a worker', async () => {
    vi.stubGlobal('WebAssembly', { validate: () => false });
    vi.stubGlobal('navigator', { userAgent: 'iPhone OS 15_0', maxTouchPoints: 1 });
    const { loadClip } = await import('./clip');
    await expect(loadClip()).rejects.toThrow('Обновите iOS');
    expect(mocks.bytes).not.toHaveBeenCalled();
    expect(FakeWorker.instances).toHaveLength(0);
    expect(mocks.error).toHaveBeenCalled();
  });

  it('downloads matching versions of the model and text embeddings', async () => {
    const { loadClip, CLIP_URL } = await import('./clip');
    await loadClip();
    const model = new URL(CLIP_URL, 'https://example.com');
    const text = new URL(vi.mocked(fetch).mock.calls[0][0] as string, 'https://example.com');
    expect(model.searchParams.get('v')).toBeTruthy();
    expect(text.searchParams.get('v')).toBe(model.searchParams.get('v'));
    expect(mocks.stage).toHaveBeenCalledWith('initialize');
    FakeWorker.instances[0].reply({ type: 'stage', stage: 'warmup' });
    expect(mocks.stage).toHaveBeenCalledWith('warmup');
  });
});

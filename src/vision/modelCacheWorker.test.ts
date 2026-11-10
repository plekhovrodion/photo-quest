import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../../public/model-cache-sw.js', import.meta.url), 'utf8');

function setup() {
  const cache = {
    match: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(true),
  };
  const response = { ok: true, clone: () => ({}) };
  const fetch = vi.fn().mockResolvedValue(response);
  const claim = vi.fn().mockResolvedValue(undefined);
  const handlers = new Map<string, (event: object) => void>();
  runInNewContext(source, {
    URL, caches, fetch,
    self: {
      location: { origin: 'https://example.com' },
      clients: { claim },
      addEventListener: (name: string, handler: (event: object) => void) => handlers.set(name, handler),
    },
  });
  const request = { method: 'GET', url: 'https://example.com/photo_quest/models/clip/vision.onnx?v=test' };
  const download = async () => {
    let result!: Promise<unknown>;
    const tasks: Promise<unknown>[] = [];
    handlers.get('fetch')!({
      request,
      respondWith: (promise: Promise<unknown>) => { result = promise; },
      waitUntil: (promise: Promise<unknown>) => tasks.push(promise),
    });
    const received = await result;
    await Promise.all(tasks);
    return received;
  };
  return { cache, caches, response, fetch, claim, handlers, request, download };
}

describe('кэш модели в Service Worker', () => {
  it('скачивает модель, когда Safari блокирует открытие кэша', async () => {
    const test = setup();
    test.caches.open.mockRejectedValue(new Error('SecurityError'));
    expect(await test.download()).toBe(test.response);
    expect(test.fetch).toHaveBeenCalledWith(test.request);
  });

  it('скачивает модель при ошибке чтения кэша', async () => {
    const test = setup();
    test.cache.match.mockRejectedValue(new Error('InvalidStateError'));
    expect(await test.download()).toBe(test.response);
  });

  it('использует сохранённый ответ для той же версии модели', async () => {
    const test = setup();
    const saved = {};
    test.cache.match.mockResolvedValue(saved);
    expect(await test.download()).toBe(saved);
    expect(test.cache.match).toHaveBeenCalledWith(test.request);
    expect(test.fetch).not.toHaveBeenCalled();
  });

  it('отдаёт скачанный файл, даже если запись в кэш не удалась', async () => {
    const test = setup();
    test.cache.put.mockRejectedValue(new Error('QuotaExceededError'));
    expect(await test.download()).toBe(test.response);
  });

  it('активирует обновление даже при ошибке очистки старого кэша', async () => {
    const test = setup();
    test.caches.keys.mockRejectedValue(new Error('SecurityError'));
    let activation!: Promise<unknown>;
    test.handlers.get('activate')!({ waitUntil: (task: Promise<unknown>) => { activation = task; } });
    await activation;
    expect(test.claim).toHaveBeenCalledOnce();
  });
});

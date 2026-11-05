import { describe, expect, it, vi } from 'vitest';
import { mergeProgress, type Progress } from '../progress';
import { FoundApiStore, SyncedStore, progressFromFound, type ProgressStore } from './store';

const P = (over: Partial<Progress> = {}): Progress => ({ levels: {}, found: {}, ...over });
const mem = (init: Progress): ProgressStore & { data: Progress } => {
  const s = { data: init, async load() { return s.data; }, async save(p: Progress) { s.data = p; } };
  return s;
};

describe('mergeProgress', () => {
  it('объединяет найденное и берёт максимум звёзд', () => {
    const a = P({ found: { x: 3, y: 1 } });
    const b = P({ found: { y: 3, z: 2 } });
    expect(mergeProgress(a, b).found).toEqual({ x: 3, y: 3, z: 2 });
  });

});

describe('SyncedStore', () => {
  it('при старте сливает локальный и удалённый прогресс в оба места', async () => {
    const local = mem(P({ found: { a: 3 } }));
    const remote = mem(P({ found: { b: 2 } }));
    const merged = await new SyncedStore(local, remote).load();
    expect(merged.found).toEqual({ a: 3, b: 2 });
    expect(local.data.found).toEqual({ a: 3, b: 2 });
    expect(remote.data.found).toEqual({ a: 3, b: 2 });
  });
  it('при недоступном сервере остаётся локальный прогресс', async () => {
    const local = mem(P({ found: { a: 3 } }));
    const remote: ProgressStore = { load: vi.fn().mockRejectedValue(new Error('net')), save: vi.fn().mockRejectedValue(new Error('net')) };
    const merged = await new SyncedStore(local, remote).load();
    expect(merged.found).toEqual({ a: 3 });
  });
  it('save пишет локально сразу и повторяет отправку после сбоя', async () => {
    const local = mem(P());
    let fail = true;
    const sent: Progress[] = [];
    const remote: ProgressStore = {
      load: async () => P(),
      save: async (p) => { if (fail) throw new Error('net'); sent.push(p); },
    };
    const store = new SyncedStore(local, remote);
    await store.save(P({ found: { a: 1 } }));
    expect(local.data.found).toEqual({ a: 1 });
    expect(sent).toHaveLength(0);
    fail = false;
    await store.flush();
    expect(sent).toHaveLength(1);
  });
});

describe('FoundApiStore (бэкенд photo-quest-api)', () => {
  const okJson = (data: unknown) => ({ ok: true, status: 200, json: async () => data }) as Response;

  it('load: берёт found с сервера и выводит категории', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ found: { 'color-red': 3 } }));
    vi.stubGlobal('fetch', fetchMock);
    const p = await new FoundApiStore('/api/v1', () => ({ 'Uchi-User-Id': '5' })).load();
    expect(p.found).toEqual({ 'color-red': 3 });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/progress');
    expect(fetchMock.mock.calls[0][1].headers['Uchi-User-Id']).toBe('5');
    vi.unstubAllGlobals();
  });

  it('save: отправляет только found через /progress/sync', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ found: {} }));
    vi.stubGlobal('fetch', fetchMock);
    await new FoundApiStore('/api/v1').save(P({ found: { a: 2 } }));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/progress/sync');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ found: { a: 2 } });
    vi.unstubAllGlobals();
  });

  it('save без находок ничего не шлёт, ошибка сервера бросает исключение', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 502 } as Response);
    vi.stubGlobal('fetch', fetchMock);
    await new FoundApiStore('/api/v1').save(P());
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(new FoundApiStore('/api/v1').load()).rejects.toThrow('502');
    vi.unstubAllGlobals();
  });

  it('progressFromFound отмечает полностью найденную категорию', () => {
    expect(progressFromFound({}).levels).toEqual({});
  });
});

describe('SyncedStore с итогом сервера (бусины)', () => {
  it('при старте берёт итог сервера: задания, на которые не хватило бусин, в прогресс не попадают', async () => {
    const local = mem(P({ found: { a: 3, b: 3 } }));
    const remote: ProgressStore = {
      load: async () => P({ found: { a: 3 } }),
      save: async () => {},
      reconcile: async () => P({ found: { a: 3 } }), // b отклонён
    };
    const result = await new SyncedStore(local, remote).load();
    expect(result.found).toEqual({ a: 3 });
    expect(local.data.found).toEqual({ a: 3 });
  });
});

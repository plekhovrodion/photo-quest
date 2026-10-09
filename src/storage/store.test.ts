import { describe, expect, it, vi } from 'vitest';
import { computeFlashes, mergeProgress, LEVEL_BONUS, SHOP, type Progress } from '../progress';
import { SyncedStore, type ProgressStore } from './store';

const P = (over: Partial<Progress> = {}): Progress => ({ levels: {}, found: {}, flashes: 0, owned: [], ...over });
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
  it('объединяет покупки и не теряет траты', () => {
    const item = SHOP[0];
    const a = P({ found: { x: 3, y: 3, z: 3, w: 3 }, owned: [item.id], flashes: 12 - item.price });
    const b = P({ found: { x: 3 }, flashes: 3 });
    const m = mergeProgress(a, b);
    expect(m.owned).toEqual([item.id]);
    expect(m.flashes).toBe(12 - item.price); // найдено 12, потрачено на покупку
  });
  it('бонус за категорию учитывается один раз', () => {
    const lv = { stars: 5, passed: true };
    const m = mergeProgress(P({ levels: { a: lv }, found: { t: 5 } }), P({ levels: { a: lv }, found: { t: 5 } }));
    expect(m.flashes).toBe(5 + LEVEL_BONUS);
  });
  it('computeFlashes не уходит в минус', () => {
    expect(computeFlashes(P({ owned: [SHOP[0].id] }))).toBe(0);
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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyBeads, canAfford, claimFound, configureEconomy, getBeads } from './economy';

const resp = (status: number, body: unknown = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe('бусины', () => {
  beforeEach(() => applyBeads({ beads_cost: 0 }));
  afterEach(() => vi.unstubAllGlobals());

  it('applyBeads принимает цену и остаток из ответа сервера', () => {
    applyBeads({ beads_cost: 2, beads_remaining: 4 });
    expect(getBeads()).toEqual({ cost: 2, remaining: 4 });
  });

  it('canAfford: найденные открыты всегда, новое только если бусин хватает', () => {
    expect(canAfford(false, { cost: 0 })).toBe(true); // оплата выключена
    expect(canAfford(false, { cost: 2, remaining: 1 })).toBe(false);
    expect(canAfford(true, { cost: 2, remaining: 0 })).toBe(true); // уже найденное
    expect(canAfford(false, { cost: 2, remaining: 2 })).toBe(true);
    expect(canAfford(false, { cost: 2 })).toBe(true); // баланс неизвестен: играть не мешаем
  });

  it('claimFound: 200 принимает находку и обновляет остаток', async () => {
    const fetchMock = vi.fn().mockResolvedValue(resp(200, { found: { red: 3 }, beads_cost: 2, beads_remaining: 4 }));
    vi.stubGlobal('fetch', fetchMock);
    configureEconomy('/api/v1', () => ({ 'Uchi-User-Id': '5' }));
    expect(await claimFound('red', 3)).toBe('ok');
    expect(getBeads().remaining).toBe(4);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/progress/found/red');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ stars: 3 });
    expect(init.headers['Uchi-User-Id']).toBe('5');
  });

  it('claimFound: 403 значит бусин нет, остаток обнуляется', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resp(403, { errors: ['insufficient_beads'] })));
    configureEconomy('/api/v1');
    applyBeads({ beads_cost: 2, beads_remaining: 2 });
    expect(await claimFound('red', 3)).toBe('insufficient');
    expect(getBeads()).toEqual({ cost: 2, remaining: 0 });
  });

  it('claimFound: сеть или ошибка сервера дают offline, игра продолжается', async () => {
    configureEconomy('/api/v1');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')));
    expect(await claimFound('red', 3)).toBe('offline');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resp(502)));
    expect(await claimFound('red', 3)).toBe('offline');
  });
});

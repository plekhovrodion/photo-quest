import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearExplainCache, explainObject } from './explain';

const ok = (text: unknown) => ({ ok: true, json: async () => ({ text }) }) as Response;

beforeEach(() => clearExplainCache());
afterEach(() => vi.unstubAllGlobals());

describe('explainObject', () => {
  it('возвращает текст и кэширует по названию', async () => {
    const f = vi.fn().mockResolvedValue(ok('Это кружка. Из неё пьют чай.'));
    vi.stubGlobal('fetch', f);
    expect(await explainObject('Кружка')).toBe('Это кружка. Из неё пьют чай.');
    expect(await explainObject('кружка')).toBe('Это кружка. Из неё пьют чай.');
    expect(f).toHaveBeenCalledTimes(1);
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ label: 'кружка' });
  });
  it('при ошибке сервера или сети — null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502 } as Response));
    expect(await explainObject('мяч')).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    expect(await explainObject('мяч')).toBeNull();
  });
  it('мусорный ответ — null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(42)));
    expect(await explainObject('стол')).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok('   ')));
    expect(await explainObject('стул')).toBeNull();
  });
  it('пустое название не отправляется', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    expect(await explainObject('  ')).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});

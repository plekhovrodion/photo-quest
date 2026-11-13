// Бусины: за каждое новое найденное задание списывается цена BEADS_COST (её ставит бэкенд). Баланс и оплата живут на сервере,
// браузер только спрашивает: хватает ли бусин и принял ли сервер находку. Без адреса API (VITE_PROGRESS_API) бусин нет, всё бесплатно.
export interface Beads {
  cost: number; // цена нового задания, 0 значит оплата выключена
  remaining?: number; // сколько бусин осталось (нет, если баланс неизвестен или ученик с премиумом)
}

export type Claim = 'ok' | 'insufficient' | 'offline';

let beads: Beads = { cost: 0 };

export const getBeads = (): Beads => beads;

// Принять состояние бусин из ответа сервера (поля beads_cost и beads_remaining)
export function applyBeads(data: { beads_cost?: number; beads_remaining?: number } | null | undefined): void {
  if (!data) return;
  beads = { cost: data.beads_cost ?? 0, remaining: data.beads_remaining };
}

// Можно ли открыть задание: найденные открыты всегда, новое только если бусин хватает (неизвестный баланс не мешает играть)
export function canAfford(alreadyFound: boolean, b: Beads = beads): boolean {
  if (alreadyFound || b.cost <= 0) return true;
  return b.remaining === undefined || b.remaining >= b.cost;
}

interface Api { baseUrl: string; headers: () => Record<string, string>; timeoutMs: number }
let api: Api | null = null;

export function configureEconomy(baseUrl: string, headers: () => Record<string, string> = () => ({}), timeoutMs = 8000) {
  api = { baseUrl, headers, timeoutMs };
}

// Записать находку на сервере (это и есть списание бусин). 'insufficient': бусин не хватило, находка не принята;
// 'offline': сервер недоступен, находка остаётся на устройстве и уйдёт при следующей синхронизации.
export async function claimFound(taskId: string, stars: number, signal?: AbortSignal): Promise<Claim> {
  signal?.throwIfAborted();
  if (!api) return 'ok';
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(), api.timeoutMs);
  try {
    const res = await fetch(`${api.baseUrl}/progress/found/${encodeURIComponent(taskId)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...api.headers() },
      body: JSON.stringify({ stars }),
      signal: controller.signal,
    });
    if (res.status === 403) {
      applyBeads({ beads_cost: beads.cost, beads_remaining: 0 });
      return 'insufficient';
    }
    if (res.status === 409) location.reload();
    if (!res.ok) return 'offline';
    applyBeads(await res.json());
    return 'ok';
  } catch {
    signal?.throwIfAborted();
    return 'offline';
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

import { loadProgress, mergeProgress, saveProgress, type Progress } from '../progress';
import { LEVELS } from '../data/tasks';
import { applyBeads, configureEconomy } from '../api/economy';

export interface ProgressStore {
  load(): Promise<Progress>;
  save(p: Progress): Promise<void>;
  // Сервер главный для оплаты: отдаёт итог после синхронизации (принятое сервером). Есть только у удалённого хранилища.
  reconcile?(p: Progress): Promise<Progress>;
}

export class LocalStore implements ProgressStore {
  async load() { return loadProgress(); }
  async save(p: Progress) { saveProgress(p); }
}

// Бэкенд photo-quest-api (Go): хранит только найденные задания. Категории выводятся из них.
// GET {base}/progress -> {found}, POST {base}/progress/sync {found} -> {found}. Ученика определяет шлюз Учи по заголовку Uchi-User-Id;
// на локальной разработке id подставляем из VITE_DEV_USER_ID.
export function progressFromFound(found: Record<string, number>): Progress {
  const levels: Progress['levels'] = {};
  for (const l of LEVELS) {
    if (l.tasks.length && l.tasks.every((t) => found[t.id] !== undefined)) {
      levels[l.id] = { stars: l.tasks.reduce((n, t) => n + (found[t.id] ?? 0), 0), passed: true };
    }
  }
  return { levels, found };
}

export class FoundApiStore implements ProgressStore {
  constructor(
    private baseUrl: string,
    private headers: () => Record<string, string> = () => ({}),
    private timeoutMs = 8000,
  ) {}

  private async req(path: string, method: 'GET' | 'POST', body?: unknown): Promise<{ found: Record<string, number>; rejected: string[] }> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...this.headers() },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new Error(`progress ${method} ${path} ${res.status}`);
    const data = (await res.json()) as { found?: Record<string, number>; rejected?: string[]; beads_cost?: number; beads_remaining?: number };
    applyBeads(data); // сколько бусин осталось и сколько стоит задание
    return { found: data.found ?? {}, rejected: data.rejected ?? [] };
  }

  async load(): Promise<Progress> {
    const { found } = await this.req('/progress', 'GET');
    return mergeProgress({ levels: {}, found: {} }, progressFromFound(found));
  }

  async save(p: Progress): Promise<void> {
    if (Object.keys(p.found).length) await this.req('/progress/sync', 'POST', { found: p.found });
  }

  // Отправить находки с устройства и принять итог сервера: то, на что не хватило бусин (rejected), в прогресс не попадает
  async reconcile(p: Progress): Promise<Progress> {
    const { found } = Object.keys(p.found).length ? await this.req('/progress/sync', 'POST', { found: p.found }) : await this.req('/progress', 'GET');
    return mergeProgress({ levels: {}, found: {} }, progressFromFound(found));
  }
}

// Локально сохраняем всегда и мгновенно; в удалённое пишем с повтором при ошибке сети.
export class SyncedStore implements ProgressStore {
  private dirty = false;

  constructor(private local: ProgressStore, private remote: ProgressStore) {
    if (typeof addEventListener === 'function') addEventListener('online', () => void this.flush());
  }

  // При старте: берём локальное, подмешиваем удалённое и записываем результат обратно в оба места.
  async load(): Promise<Progress> {
    const local = await this.local.load();
    try {
      const merged = mergeProgress(local, await this.remote.load());
      // Если удалённое хранилище умеет, берём итог сервера (с учётом оплаты бусинами), а не наше объединение
      const result = this.remote.reconcile ? await this.remote.reconcile(merged) : merged;
      if (!this.remote.reconcile) await this.remote.save(merged);
      await this.local.save(result);
      this.dirty = false;
      return result;
    } catch {
      this.dirty = true;
      return local;
    }
  }

  private latest: Progress | null = null;

  async save(p: Progress): Promise<void> {
    await this.local.save(p);
    this.latest = p;
    this.dirty = true;
    await this.flush();
  }

  async flush(): Promise<void> {
    if (!this.dirty || !this.latest) return;
    try {
      await this.remote.save(this.latest);
      this.dirty = false;
    } catch {
      // останется dirty, повторим при следующем сохранении или при событии online
    }
  }
}

// Удалённое хранилище включается только если задан адрес API прогресса (VITE_PROGRESS_API).
export function createStore(): ProgressStore {
  const url = import.meta.env.VITE_PROGRESS_API as string | undefined;
  const local = new LocalStore();
  if (!url) return local;
  const devUser = import.meta.env.VITE_DEV_USER_ID as string | undefined;
  const devAccount = import.meta.env.VITE_DEV_ACCOUNT_ID as string | undefined;
  const headers = (): Record<string, string> => ({
    ...(devUser ? { 'Uchi-User-Id': devUser } : {}),
    ...(devAccount ? { 'Uchi-Account-Id': devAccount } : {}),
  });
  configureEconomy(url, headers); // оплата бусинами идёт через тот же API
  return new SyncedStore(local, new FoundApiStore(url, headers));
}

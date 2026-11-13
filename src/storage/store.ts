import { loadProgress, mergeProgress, saveProgress, progressFromFound, type Progress } from '../progress';
export { progressFromFound } from '../progress';
import { applyBeads, configureEconomy } from '../api/economy';

export interface ProgressStore {
  load(): Promise<Progress>;
  save(p: Progress): Promise<void>;
  confirm?(taskId: string, stars: number): void;
  subscribe?(listener: (p: Progress) => void): () => void;
  // Сервер главный для оплаты: отдаёт итог после синхронизации (принятое сервером). Есть только у удалённого хранилища.
  reconcile?(p: Progress): Promise<Progress>;
}

export class LocalStore implements ProgressStore {
  constructor(private key?: () => string | undefined) {}
  async load() {
    const key = this.key?.();
    if (this.key && !key) throw new Error('Student identity unavailable');
    return loadProgress(key);
  }
  async save(p: Progress) {
    const key = this.key?.();
    if (!this.key || key) saveProgress(p, key);
  }
}

// Бэкенд photo-quest-api (Go): хранит только найденные задания. Категории выводятся из них.
// GET {base}/progress -> {found}, POST {base}/progress/sync {found} -> {found}. Ученика определяет шлюз Учи по заголовку Uchi-User-Id;
// на локальной разработке id подставляем из VITE_DEV_USER_ID.
export class FoundApiStore implements ProgressStore {
  private userId: string | undefined;

  constructor(
    private baseUrl: string,
    private headers: () => Record<string, string> = () => ({}),
    private timeoutMs = 8000,
    private identify: (userId: string) => void = () => {},
    private requireIdentity = false,
  ) {}

  private async req(path: string, method: 'GET' | 'POST', body?: unknown): Promise<{ found: Record<string, number>; rejected: string[] }> {
    if (this.requireIdentity && method === 'POST' && !this.userId) await this.req('/progress', 'GET');
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...this.headers() },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (res.status === 409) location.reload();
    if (!res.ok) throw new Error(`progress ${method} ${path} ${res.status}`);
    const data = (await res.json()) as { user_id?: string; found?: Record<string, number>; rejected?: string[]; beads_cost?: number; beads_remaining?: number };
    const userId = data.user_id;
    if (this.requireIdentity && !userId) throw new Error('Missing authenticated user identity');
    if (userId) {
      this.identify(userId);
      this.userId = userId;
    }
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
  private latest: Progress | null = null;
  private confirmed: Progress = progressFromFound({});
  private sending: Promise<void> | null = null;
  private listeners = new Set<(p: Progress) => void>();

  constructor(private local: ProgressStore, private remote: ProgressStore) {
    if (typeof addEventListener === 'function') addEventListener('online', () => void this.flush());
  }

  subscribe(listener: (p: Progress) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  confirm(taskId: string, stars: number): void {
    this.confirmed = mergeProgress(this.confirmed, progressFromFound({ [taskId]: stars }));
  }

  async load(): Promise<Progress> {
    try {
      // The authenticated response binds local storage before any device progress is read.
      this.confirmed = await this.remote.load();
      this.latest = mergeProgress(await this.local.load(), this.confirmed);
      await this.local.save(this.latest);
      await this.flush();
    } catch {
      this.latest = await this.local.load();
    }
    return this.latest;
  }

  async save(p: Progress): Promise<void> {
    this.latest = p;
    await this.local.save(p);
    await this.flush();
  }

  async flush(): Promise<void> {
    if (this.sending) return this.sending;
    this.sending = this.sendPending().finally(() => { this.sending = null; });
    return this.sending;
  }

  private async sendPending(): Promise<void> {
    while (this.latest) {
      const snapshot = this.latest;
      const found = Object.fromEntries(Object.entries(snapshot.found)
        .filter(([id, stars]) => stars > (this.confirmed.found[id] ?? 0)));
      if (!Object.keys(found).length) return;
      try {
        const pending = progressFromFound(found);
        let result = snapshot;
        if (this.remote.reconcile) result = await this.remote.reconcile(pending);
        else await this.remote.save(snapshot);
        this.confirmed = mergeProgress(this.confirmed, result);
        // Preserve finds earned while this request was in flight.
        const newer = Object.fromEntries(Object.entries(this.latest.found)
          .filter(([id, stars]) => stars > (snapshot.found[id] ?? 0)));
        this.latest = mergeProgress(this.confirmed, progressFromFound(newer));
        await this.local.save(this.latest);
        this.listeners.forEach((listener) => listener(this.latest!));
      } catch {
        // Identity may have become available during this request.
        await this.local.save(this.latest);
        return;
      }
    }
  }
}

// Удалённое хранилище включается только если задан адрес API прогресса (VITE_PROGRESS_API).
export function createStore(): ProgressStore {
  const url = import.meta.env.VITE_PROGRESS_API as string | undefined;
  if (!url) return new LocalStore();
  let userId: string | undefined;
  const local = new LocalStore(() => userId ? `photoquest.progress.v2.user.${userId}` : undefined);
  const devUser = import.meta.env.VITE_DEV_USER_ID as string | undefined;
  const devAccount = import.meta.env.VITE_DEV_ACCOUNT_ID as string | undefined;
  const headers = (): Record<string, string> => ({
    ...(userId ? { 'X-PhotoQuest-User-Id': userId } : {}),
    ...(devUser ? { 'Uchi-User-Id': devUser } : {}),
    ...(devAccount ? { 'Uchi-Account-Id': devAccount } : {}),
  });
  configureEconomy(url, headers); // оплата бусинами идёт через тот же API
  return new SyncedStore(local, new FoundApiStore(url, headers, 8000, (id) => {
    if (userId && userId !== id) {
      location.reload();
      throw new Error('Authenticated user changed');
    }
    userId = id;
  }, true));
}

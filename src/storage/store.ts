import { loadProgress, mergeProgress, saveProgress, type Progress } from '../progress';

export interface ProgressStore {
  load(): Promise<Progress>;
  save(p: Progress): Promise<void>;
}

export class LocalStore implements ProgressStore {
  async load() { return loadProgress(); }
  async save(p: Progress) { saveProgress(p); }
}

// Удалённое хранилище: GET/PUT {baseUrl}/progress. Авторизация — на стороне платформы:
// по умолчанию отправляем cookie сессии (credentials: 'include'); заголовки можно подменить.
export class RemoteStore implements ProgressStore {
  constructor(
    private baseUrl: string,
    private headers: () => Promise<Record<string, string>> = async () => ({}),
    private timeoutMs = 8000,
  ) {}

  private async req(method: 'GET' | 'PUT', body?: Progress): Promise<Response> {
    const res = await fetch(`${this.baseUrl}/progress`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(await this.headers()) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new Error(`progress ${method} ${res.status}`);
    return res;
  }

  async load(): Promise<Progress> {
    const data = await (await this.req('GET')).json();
    return mergeProgress({ levels: {}, found: {}, flashes: 0, owned: [] }, data);
  }

  async save(p: Progress): Promise<void> {
    await this.req('PUT', p);
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
      await this.local.save(merged);
      await this.remote.save(merged);
      this.dirty = false;
      return merged;
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

// Удалённое хранилище включается только если задан адрес API прогресса.
export function createStore(): ProgressStore {
  const url = import.meta.env.VITE_PROGRESS_API as string | undefined;
  const local = new LocalStore();
  return url ? new SyncedStore(local, new RemoteStore(url)) : local;
}

// Альбом находок: фото ребёнка хранятся только в этом браузере (IndexedDB), на сервер не уходят.
export interface Sticker {
  id: string; // id задания
  blob: Blob;
  ts: number;
}

export interface AlbumStore {
  all(): Promise<Sticker[]>;
  put(s: Sticker): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

// Запасной вариант, если IndexedDB недоступна (приватный режим): наклейки живут до закрытия вкладки.
export class MemoryAlbum implements AlbumStore {
  private m = new Map<string, Sticker>();
  async all() { return [...this.m.values()]; }
  async put(s: Sticker) { this.m.set(s.id, s); }
  async remove(id: string) { this.m.delete(id); }
  async clear() { this.m.clear(); }
}

const DB = 'photoquest-album';
const STORE = 'stickers';

export class IdbAlbum implements AlbumStore {
  private db: Promise<IDBDatabase> | null = null;
  private open() {
    this.db ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.db;
  }
  private async run<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const req = f(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  all() { return this.run('readonly', (s) => s.getAll() as IDBRequest<Sticker[]>); }
  async put(s: Sticker) { await this.run('readwrite', (st) => st.put(s)); }
  async remove(id: string) { await this.run('readwrite', (st) => st.delete(id)); }
  async clear() { await this.run('readwrite', (st) => st.clear()); }
}

export function createAlbum(): AlbumStore {
  try {
    if (typeof indexedDB !== 'undefined') return new IdbAlbum();
  } catch { /* IndexedDB запрещена */ }
  return new MemoryAlbum();
}

// Любая операция с хранилищем не должна ломать игру: при сбое переключаемся на память.
export class SafeAlbum implements AlbumStore {
  private fallback = new MemoryAlbum();
  constructor(private main: AlbumStore = createAlbum()) {}
  private async guard<T>(f: (a: AlbumStore) => Promise<T>): Promise<T> {
    try { return await f(this.main); } catch { return f(this.fallback); }
  }
  all() { return this.guard((a) => a.all()); }
  put(s: Sticker) { return this.guard((a) => a.put(s)); }
  remove(id: string) { return this.guard((a) => a.remove(id)); }
  clear() { return this.guard((a) => a.clear()); }
}

export const album: AlbumStore = new SafeAlbum();

// Уменьшаем фото для наклейки: хватает 360 px по длинной стороне.
export async function toSticker(photo: Blob, max = 360): Promise<Blob> {
  const bmp = await createImageBitmap(photo);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', 0.8));
}

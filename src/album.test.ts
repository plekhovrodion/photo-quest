import { describe, expect, it } from 'vitest';
import { MemoryAlbum, SafeAlbum, type AlbumStore } from './album';

const blob = () => new Blob(['x']);

describe('альбом', () => {
  it('сохраняет, заменяет и удаляет наклейки', async () => {
    const a = new MemoryAlbum();
    await a.put({ id: 'object-spoon', blob: blob(), ts: 1 });
    await a.put({ id: 'object-spoon', blob: blob(), ts: 2 });
    await a.put({ id: 'color-red', blob: blob(), ts: 3 });
    expect((await a.all()).map((s) => s.id).sort()).toEqual(['color-red', 'object-spoon']);
    expect((await a.all()).find((s) => s.id === 'object-spoon')!.ts).toBe(2);
    await a.remove('color-red');
    expect(await a.all()).toHaveLength(1);
    await a.clear();
    expect(await a.all()).toHaveLength(0);
  });

  it('при сбое основного хранилища работает через память', async () => {
    const broken: AlbumStore = {
      all: async () => { throw new Error('x'); }, put: async () => { throw new Error('x'); },
      remove: async () => { throw new Error('x'); }, clear: async () => { throw new Error('x'); },
    };
    const a = new SafeAlbum(broken);
    await a.put({ id: 'a', blob: blob(), ts: 1 });
    expect(await a.all()).toHaveLength(1);
  });
});

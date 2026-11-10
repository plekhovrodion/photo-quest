// Модели распознавания большие и редко меняются. CacheStorage сохраняет их
// между перезагрузками и позволяет запускать уже скачанные модели без сети.
const CACHE_NAME = 'photo-quest-models-v4';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('photo-quest-models-') && key !== CACHE_NAME).map((key) => caches.delete(key)));
    } catch {
      // Недоступный кэш не должен мешать обновить Service Worker.
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.includes('/models/')) return;

  event.respondWith((async () => {
    let cache;
    try {
      cache = await caches.open(CACHE_NAME);
      const saved = await cache.match(request);
      if (saved) return saved;
    } catch {
      // Приватный режим, переполненное или недоступное хранилище Safari.
      // Распознавание должно запускаться и без постоянного кэша.
    }

    const response = await fetch(request);
    if (response.ok && cache) event.waitUntil(cache.put(request, response.clone()).catch(() => undefined));
    return response;
  })());
});

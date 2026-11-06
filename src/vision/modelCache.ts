const BASE = import.meta.env.BASE_URL ?? '/';

let ready: Promise<void> | null = null;

// Дожидаемся активации Service Worker, чтобы загрузка моделей сразу попадала
// в постоянный CacheStorage и переживала перезагрузку страницы.
export function prepareModelCache(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    if (!('serviceWorker' in navigator) || !('caches' in window)) return;
    try {
      await navigator.serviceWorker.register(`${BASE}model-cache-sw.js`, { scope: BASE });
      await navigator.serviceWorker.ready;
      // MobileCLIP-S0 весит около 23 МБ; просим браузер сохранять его между сессиями.
      await navigator.storage?.persist?.().catch(() => false);
    } catch {
      // Без Service Worker модели всё равно загружаются обычным fetch.
    }
  })();
  return ready;
}

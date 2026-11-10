const BASE = import.meta.env.BASE_URL ?? '/';

let ready: Promise<void> | null = null;

// Даём Service Worker время активироваться. Блокировка кэша в Safari
// не должна задерживать обычное скачивание модели.
export function prepareModelCache(): Promise<void> {
  if (ready) return ready;
  if (typeof navigator === 'undefined' || typeof window === 'undefined'
    || !('serviceWorker' in navigator) || !('caches' in window)) return Promise.resolve();
  let timer: ReturnType<typeof setTimeout>;
  ready = Promise.race([
    (async () => {
      const registration = await navigator.serviceWorker.register(`${BASE}model-cache-sw.js`, { scope: BASE });
      const worker = registration.installing ?? registration.waiting;
      if (worker && worker.state !== 'activated' && worker.state !== 'redundant') {
        await new Promise<void>((resolve) => {
          const changed = () => {
            if (worker.state !== 'activated' && worker.state !== 'redundant') return;
            worker.removeEventListener('statechange', changed);
            resolve();
          };
          worker.addEventListener('statechange', changed);
          changed();
        });
      }
      await navigator.serviceWorker.ready;
      // MobileCLIP-S0 весит около 23 МБ; просим браузер сохранять его между сессиями.
      void navigator.storage?.persist?.().catch(() => false);
    })(),
    new Promise<void>((resolve) => { timer = setTimeout(resolve, 2000); }),
  ]).catch(() => {
    // Без Service Worker модели всё равно загружаются обычным fetch.
  }).finally(() => clearTimeout(timer));
  return ready;
}

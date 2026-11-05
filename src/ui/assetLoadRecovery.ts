// Повторный запрос и состояние загрузки ресурсов для мобильных сетей.
const watched = new WeakSet<HTMLImageElement>();
const groups = new WeakSet<HTMLElement>();
const imageWaits = new WeakMap<HTMLImageElement, Promise<void>>();
const backgroundWaits = new Map<string, Promise<void>>();
const groupTimeouts = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
const GROUP_LOAD_TIMEOUT_MS = 4_000;

function settle(image: HTMLImageElement, state: 'loaded' | 'failed') {
  image.dataset.assetState = state;
  image.dispatchEvent(new Event('asset-settled', { bubbles: true }));
}

function retry(image: HTMLImageElement) {
  if (image.dataset.assetRetried) { settle(image, 'failed'); return; }
  image.dataset.assetRetried = 'true';
  image.dataset.assetState = 'pending';
  const url = new URL(image.src, document.baseURI);
  url.searchParams.set('asset-retry', '1');
  image.addEventListener('load', () => settle(image, 'loaded'), { once: true });
  image.addEventListener('error', () => settle(image, 'failed'), { once: true });
  image.src = url.href;
}

function watchImage(image: HTMLImageElement) {
  if (watched.has(image) || !image.getAttribute('src')) return;
  watched.add(image);
  if (image.complete) {
    if (image.naturalWidth) settle(image, 'loaded');
    else retry(image);
    return;
  }
  image.dataset.assetState = 'pending';
  image.addEventListener('load', () => settle(image, 'loaded'), { once: true });
  image.addEventListener('error', () => retry(image), { once: true });
}

function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.dataset.assetState === 'loaded' || image.dataset.assetState === 'failed') return Promise.resolve();
  let wait = imageWaits.get(image);
  if (!wait) {
    wait = new Promise((resolve) => {
      const done = () => resolve();
      image.addEventListener('asset-settled', done, { once: true });
      if (image.dataset.assetState === 'loaded' || image.dataset.assetState === 'failed') resolve();
    });
    imageWaits.set(image, wait);
  }
  return wait;
}

function waitForBackground(url: string): Promise<void> {
  let wait = backgroundWaits.get(url);
  if (!wait) {
    wait = new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => resolve();
      image.src = url;
      if (image.complete) resolve();
    });
    backgroundWaits.set(url, wait);
  }
  return wait;
}

function backgroundUrls(host: HTMLElement): string[] {
  const urls = new Set<string>();
  host.querySelectorAll<HTMLElement>('*').forEach((el) => {
    const value = getComputedStyle(el).backgroundImage;
    for (const match of value.matchAll(/url\(["']?(.*?)["']?\)/g)) if (match[1]) urls.add(match[1]);
  });
  return [...urls];
}

function watchAssetGroup(host: HTMLElement) {
  if (groups.has(host)) return;
  groups.add(host);
  const check = () => {
    if (!host.isConnected) return;
    if (!host.classList.contains('asset-pending')) {
      const timeout = groupTimeouts.get(host);
      if (timeout) clearTimeout(timeout);
      groupTimeouts.delete(host);
      return;
    }
    if (!groupTimeouts.has(host)) {
      const timeout = setTimeout(() => {
        groupTimeouts.delete(host);
        if (!host.isConnected || !host.classList.contains('asset-pending')) return;
        // Some mobile browsers never fire load/error for a stalled resource.
        // Reveal the card after a bounded wait instead of leaving its skeleton forever.
        host.classList.remove('asset-pending');
        host.classList.add('asset-ready');
      }, GROUP_LOAD_TIMEOUT_MS);
      groupTimeouts.set(host, timeout);
    }
    const images = Array.from(host.querySelectorAll<HTMLImageElement>('img:not(.loc-check):not(.mp-check)'));
    images.forEach(watchImage);
    const urls = backgroundUrls(host);
    void Promise.all([...images.map(waitForImage), ...urls.map(waitForBackground)]).then(() => {
      if (!host.isConnected) return;
      const imagesReady = Array.from(host.querySelectorAll<HTMLImageElement>('img:not(.loc-check):not(.mp-check)'))
        .every((img) => img.dataset.assetState === 'loaded' || img.dataset.assetState === 'failed');
      const backgroundsReady = backgroundUrls(host).every((url) => backgroundWaits.has(url));
      const pet = host.dataset.assetWaitPet === 'true' ? host.querySelector<HTMLElement>('.pet[data-pet]') : null;
      const petReady = !pet || pet.classList.contains('pet-assets-ready');
      if (imagesReady && backgroundsReady && petReady) {
        host.classList.remove('asset-pending');
        host.classList.add('asset-ready');
        const timeout = groupTimeouts.get(host);
        if (timeout) clearTimeout(timeout);
        groupTimeouts.delete(host);
      }
    });
  };
  host.addEventListener('asset-settled', check);
  host.addEventListener('pet-assets-ready', check);
  new MutationObserver(check).observe(host, { childList: true, subtree: true });
  check();
}

function watchTree(node: Node) {
  if (!(node instanceof Element)) return;
  if (node instanceof HTMLElement && node.matches('[data-asset-group]')) watchAssetGroup(node);
  node.querySelectorAll<HTMLElement>('[data-asset-group]').forEach(watchAssetGroup);
  if (node instanceof HTMLImageElement) watchImage(node);
  node.querySelectorAll<HTMLImageElement>('img[src]').forEach(watchImage);
}

document.querySelectorAll<HTMLImageElement>('img[src]').forEach(watchImage);
new MutationObserver((records) => {
  for (const record of records) record.addedNodes.forEach(watchTree);
}).observe(document.documentElement, { childList: true, subtree: true });

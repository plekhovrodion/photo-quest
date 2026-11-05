// Единое состояние загрузки для изображений, которые появляются при переходах между экранами.
const watched = new WeakSet<HTMLImageElement>();

function settle(image: HTMLImageElement, failed = false) {
  image.classList.remove('asset-loading');
  image.classList.toggle('asset-error', failed);
}

function watchImage(image: HTMLImageElement) {
  // Полноэкранный фон карты не должен переливаться: это воспринимается как движение самого пейзажа.
  if (watched.has(image) || image.classList.contains('mp-bg') || !image.getAttribute('src')) return;
  watched.add(image);
  if (image.complete) {
    settle(image, image.naturalWidth === 0);
    return;
  }
  image.classList.add('asset-loading');
  image.addEventListener('load', () => settle(image), { once: true });
  image.addEventListener('error', () => {
    // На мобильной сети отдельные SVG иногда отваливаются при первом запросе.
    // Повторяем один раз с новым URL, чтобы браузер не отдал закешированную ошибку.
    if (!image.dataset.assetRetried) {
      image.dataset.assetRetried = 'true';
      const retry = new URL(image.src, document.baseURI);
      retry.searchParams.set('asset-retry', '1');
      image.src = retry.href;
      image.addEventListener('load', () => settle(image), { once: true });
      image.addEventListener('error', () => settle(image, true), { once: true });
      return;
    }
    settle(image, true);
  }, { once: true });
}

function watchTree(node: Node) {
  if (!(node instanceof Element)) return;
  if (node instanceof HTMLImageElement) watchImage(node);
  node.querySelectorAll<HTMLImageElement>('img[src]').forEach(watchImage);
}

document.querySelectorAll<HTMLImageElement>('img[src]').forEach(watchImage);
new MutationObserver((records) => {
  for (const record of records) record.addedNodes.forEach(watchTree);
}).observe(document.documentElement, { childList: true, subtree: true });

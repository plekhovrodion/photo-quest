// Экран «Загружаем игру»: нейросети тяжёлые (~100 МБ), и при первом запуске ребёнок ждёт. Показываем полноэкранную заставку с полоской, как на экране места.
// Если всё грузится быстро (меньше 0,4 секунды) или уже загружено, экран не мигает.
import { modelsReady, whenModelsReady } from '../vision/models';

const SHOW_AFTER_MS = 400;

export async function ensureModelsLoaded(): Promise<void> {
  if (modelsReady()) return;
  let el: HTMLElement | null = null;
  let fill: HTMLElement | null = null, bar: HTMLElement | null = null;
  let last = 0;
  const paint = () => {
    if (!fill || !bar) return;
    const v = Math.round(last * 100);
    fill.style.setProperty('--w', `${v}%`);
    bar.setAttribute('aria-valuenow', String(v));
  };
  const timer = setTimeout(() => {
    el = document.createElement('div');
    el.className = 'loading-screen';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Загрузка');
    el.innerHTML = `<div class="loc-progress" role="progressbar" aria-label="Загрузка" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="loc-track"><div class="loc-fill" style="background-image:url(${import.meta.env.BASE_URL}art/loc/stripe-a.svg)"></div></div></div>`;
    fill = el.querySelector('.loc-fill');
    bar = el.querySelector('.loc-progress');
    document.body.appendChild(el);
    paint();
  }, SHOW_AFTER_MS);
  await whenModelsReady((p) => { last = p; paint(); });
  clearTimeout(timer);
  last = 1; paint();
  (el as HTMLElement | null)?.remove();
}

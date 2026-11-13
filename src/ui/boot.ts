// Загрузка игры по ступеням: сначала шрифты, затем экран, потом звуки и модели.
// Изображения запрашивает сам браузер при показе экрана, без повторного fetch здесь.
import { mark, saveReport, showStatsOverlay } from './loadstats';

const FONTS = ['400 16px "Factor A"', '700 16px "Factor A"', '800 16px "Factor A"'];
const MIN_SHOW_MS = 900; // не мелькаем на быстрой сети, но не удерживаем готовую игру несколько секунд
const GIVE_UP_MS = 4000; // если сеть медленная, показываем карту, а ресурсы догружаются по мере надобности

function overlay(): { paint(p: number): void; remove(): void } {
  const splash = document.querySelector<HTMLElement>('.pre-splash');
  const el = splash ?? document.createElement('div');
  // Keep the critical pre-splash sizing rules after JS takes over, so the bar
  // doesn't jump while the app stylesheet is loading.
  el.className = splash ? 'loading-screen model-loading-screen pre-splash' : 'loading-screen model-loading-screen';
  if (!splash) {
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Загрузка');
    el.innerHTML = `<div class="loc-progress" role="progressbar" aria-label="Загрузка" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="loc-track"><div class="loc-fill" style="background-image:url('${import.meta.env.BASE_URL}art/loc/stripe-a.svg')"></div></div></div>`;
    document.body.appendChild(el);
  }
  const fill = el.querySelector<HTMLElement>('.loc-fill')!;
  const bar = el.querySelector<HTMLElement>('.loc-progress')!;
  return {
    paint: (p) => { const v = Math.round(p * 100); fill.style.setProperty('--w', `${v}%`); bar.setAttribute('aria-valuenow', String(v)); },
    remove: () => el.remove(),
  };
}

let secondDone: Promise<void> | null = null;
export const whenBootDone = (): Promise<void> => secondDone ?? Promise.resolve();

// Первая ступень: заставка без текста, не меньше MIN_SHOW_MS; полоска идёт по меньшему из «реально загружено» и «прошло времени».
export async function bootFirstStep(ready: Promise<unknown> = Promise.resolve()): Promise<void> {
  mark('старт');
  const total = FONTS.length;
  const t0 = performance.now();
  let done = 0;
  const screen = overlay();
  const paint = () => screen.paint(Math.max(0.25, Math.min(done / total, (performance.now() - t0) / MIN_SHOW_MS)));
  const tick = () => { done++; paint(); };
  const timer = setInterval(paint, 100);
  const fonts = Promise.all(FONTS.map((f) => document.fonts?.load(f).catch(() => []).finally(tick)));
  try {
    await Promise.all([ready, Promise.race([
      Promise.all([fonts, new Promise((ok) => setTimeout(ok, MIN_SHOW_MS))]),
      new Promise((ok) => setTimeout(ok, GIVE_UP_MS)),
    ])]);
  } finally {
    clearInterval(timer);
  }
  screen.paint(1);
  await new Promise((ok) => setTimeout(ok, 250)); // полоска успевает дойти до края
  screen.remove();
  mark('главный экран');
  showStatsOverlay();
}

// Вторая ступень: идёт в простое после первого экрана; потом вызывается `then` (запуск звуков и моделей).
export function bootSecondStep(then: () => void): void {
  const idle = (fn: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 300));
  // Питомцам на главном экране нужна пара секунд, чтобы скачать свои анимации: вторую ступень начинаем чуть позже.
  secondDone = new Promise<void>((resolve) => setTimeout(() => idle(() => {
    mark('основа догружена'); resolve(); then(); setTimeout(() => { mark('отчёт'); saveReport(); }, 6000);
  }), 2000));
}

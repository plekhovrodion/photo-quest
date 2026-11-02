// Загрузка игры по ступеням, чтобы на слабом мобильном интернете главный экран открывался быстро:
// 1) основа (шрифты и картинки главного экрана, около 110 КБ): показываем заставку «Загружаем игру» с полоской, пока она не загрузится;
// 2) после первого экрана, в простое: спрайт иконок, звуки, музыка (по несколько файлов за раз, чтобы не забивать канал);
// 3) модели распознавания (десятки МБ) стартуют только после второй ступени (см. main.ts).
import { mark, saveReport, showStatsOverlay } from './loadstats';

const BASE = import.meta.env.BASE_URL;
const FIRST_SCREEN = [
  'art/map/header.svg', 'art/map/wide/cloud-a.svg', 'art/map/wide/cloud-b.svg', 'art/map/wide/cloud-c.svg',
  'art/map/wide/hills-a.svg', 'art/map/wide/hills-b.svg', 'art/map/wide/hills-c.svg',
  'art/rooms/head-colors-bare.svg', 'art/rooms/head-room-bare.svg', 'art/rooms/head-kitchen-bare.svg', 'art/rooms/head-school-bare.svg',
  'art/rooms/head-food-bare.svg', 'art/rooms/head-bath-bare.svg', 'art/rooms/head-hall-bare.svg', 'art/rooms/head-outdoor-bare.svg',
  'art/loc/back.svg', 'art/loc/fullscreen.svg', 'art/loc/sound.svg', 'art/loc/play.svg', 'art/loc/onboarding-play.svg', 'art/loc/stripe-a.svg',
];
// Иконки комнаты, задания и результата запрашиваются браузером при переходе на эти экраны.
// Не скачиваем их вместе с картой: это лишние запросы до первого действия игрока.
const REQUIRED = FIRST_SCREEN;
const FONTS = ['400 16px "Factor A"', '700 16px "Factor A"', '800 16px "Factor A"'];
const MIN_SHOW_MS = 900; // не мелькаем на быстрой сети, но не удерживаем готовую игру несколько секунд
const GIVE_UP_MS = 4000; // если сеть медленная, показываем карту, а ресурсы догружаются по мере надобности

export const LOW: RequestInit = { priority: 'low' } as RequestInit; // подсказка браузеру: файл не срочный, не отнимай канал у главного экрана

async function fetchAll(urls: string[], onEach: () => void, parallel = 4, init?: RequestInit): Promise<void> {
  const queue = [...urls];
  const worker = async () => {
    for (let u = queue.shift(); u; u = queue.shift()) {
      try { await (await fetch(BASE + u, init)).arrayBuffer(); } catch { /* файла нет или нет сети: игра подгрузит его сама */ }
      onEach();
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallel, urls.length) }, worker));
}

function overlay(): { paint(p: number): void; remove(): void } {
  const el = document.createElement('div');
  el.className = 'loading-screen';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Загрузка');
  el.innerHTML = `<div class="loc-progress" role="progressbar" aria-label="Загрузка" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="loc-track"><div class="loc-fill"></div></div></div>`;
  const fill = el.querySelector<HTMLElement>('.loc-fill')!;
  const bar = el.querySelector<HTMLElement>('.loc-progress')!;
  fill.style.backgroundImage = `url(${BASE}art/loc/stripe-a.svg)`;
  document.body.appendChild(el);
  return {
    paint: (p) => { const v = Math.round(p * 100); fill.style.setProperty('--w', `${v}%`); bar.setAttribute('aria-valuenow', String(v)); },
    remove: () => el.remove(),
  };
}

let secondDone: Promise<void> | null = null;
export const whenBootDone = (): Promise<void> => secondDone ?? Promise.resolve();

// Первая ступень: заставка без текста, не меньше MIN_SHOW_MS; полоска идёт по меньшему из «реально загружено» и «прошло времени».
export async function bootFirstStep(): Promise<void> {
  mark('старт');
  const total = REQUIRED.length + FONTS.length;
  const t0 = performance.now();
  let done = 0;
  const screen = overlay();
  const paint = () => screen.paint(Math.min(done / total, (performance.now() - t0) / MIN_SHOW_MS));
  const tick = () => { done++; paint(); };
  const timer = setInterval(paint, 100);
  const fonts = Promise.all(FONTS.map((f) => document.fonts?.load(f).catch(() => []).finally(tick)));
  await Promise.race([
    Promise.all([fetchAll(REQUIRED, tick, 8), fonts, new Promise((ok) => setTimeout(ok, MIN_SHOW_MS))]),
    new Promise((ok) => setTimeout(ok, GIVE_UP_MS)),
  ]);
  clearInterval(timer);
  screen.paint(1);
  await new Promise((ok) => setTimeout(ok, 250)); // полоска успевает дойти до края
  screen.remove();
  document.querySelector('.pre-splash')?.remove();
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

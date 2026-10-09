import './style.css';
import { LEVELS, type Level, type Task } from './data/tasks';
import { createGame, currentTask, canSkip, reduce, starsFor, MAX_ATTEMPTS, type Action, type GameState } from './game/state';
import { takePhoto, compressPhoto } from './camera/capture';
import { verifyPhoto } from './api/verify';
import { COLOR_RU } from './vision/names';
import { preloadModel } from './vision/local';
import { confetti } from './fx/confetti';
import { typeText, stopTyping } from './fx/typewriter';
import { setBackground } from './fx/background';
import { playSuccess, playTryAgain, speak } from './audio/sounds';
import { SLIDES, isOnboarded, markOnboarded } from './onboarding';
import { loadProgress, recordTask, buy, canBuy, SHOP, CURRENCY, LEVEL_BONUS, type Progress } from './progress';

import { createStore } from './storage/store';
import { isoPath, project, TW, TH, NODE_H, ROAD_H, WORLD, worldLayout } from './map/iso';

type Palette = { top: string; left: string; right: string };

const root = document.getElementById('app')!;
const store = createStore();
let progress: Progress = loadProgress();
let level: Level | null = null;
let state: GameState | null = null;
let notice = '';
let photoUrl = '';
let lastLabel: string | null = null;
let lastFound: string | null = null;
let shownFlashes = progress.flashes;

function dispatch(a: Action) {
  state = reduce(state!, a);
  render();
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Реплика заврика: для экранного диктора лежит целиком, на экране печатается по буквам.
const bubble = (text: string) =>
  `<div class="bubble" data-say="${esc(text)}"><span class="sr-only">${esc(text)}</span><span class="typed" aria-hidden="true"></span></div>`;

// Направление перехода: вперёд (по умолчанию) или назад (кнопки «назад», «закрыть»).
let navDir: 'fwd' | 'back' = 'fwd';
const goBack = () => { navDir = 'back'; };
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function show(html: string, cls = '') {
  stopTyping();
  setBackground(level?.id ?? null); // у главной и у каждой категории свой фон
  const dir = navDir;
  navDir = 'fwd';
  document.querySelectorAll('.ghost').forEach((g) => g.remove());
  // Старый экран остаётся поверх копией и уезжает в сторону, пока новый въезжает с другой.
  if (!reduceMotion() && root.firstElementChild) {
    const ghost = document.createElement('div');
    ghost.className = `ghost out-${dir}`;
    ghost.setAttribute('aria-hidden', 'true');
    ghost.innerHTML = root.innerHTML;
    document.body.appendChild(ghost);
    setTimeout(() => ghost.remove(), 520);
  }
  root.className = `${cls} go-${dir}`.trim();
  root.innerHTML = html;
  setTimeout(() => root.classList.remove('go-fwd', 'go-back'), 650);
  const b = root.querySelector<HTMLElement>('.bubble[data-say]');
  const typed = b?.querySelector<HTMLElement>('.typed');
  if (b && typed) typeText(typed, b.dataset.say ?? '', root.querySelector('.char'));
  // кошелёк «подпрыгивает», когда число вспышек изменилось
  if (progress.flashes !== shownFlashes) {
    root.querySelector('.chip.coin')?.classList.add('bump');
    shownFlashes = progress.flashes;
  }
}

function on(id: string, fn: () => void) {
  root.querySelector(`#${id}`)?.addEventListener('click', fn);
}

function startLevel(l: Level) {
  level = l;
  state = null;
  render();
}

function startTask(task: Task) {
  if (task.local?.kind === 'labels' || task.local?.kind === 'and' || task.local?.kind === 'any') preloadModel();
  state = createGame([task]);
  render();
}

// Сохраняет награду за найденное задание; возвращает, закрыта ли категория целиком.
function finishTask(): boolean {
  const s = state!;
  if (s.score === 0) return false;
  const res = recordTask(progress, level!, s.tasks[0].id, s.stars);
  progress = res.progress;
  void store.save(progress);
  return res.levelDone;
}

async function capture() {
  const task = currentTask(state!)!;
  dispatch({ type: 'start-camera' });
  const raw = await takePhoto();
  if (!raw) return dispatch({ type: 'cancel-camera' });
  try {
    const photo = await compressPhoto(raw);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = URL.createObjectURL(photo);
    dispatch({ type: 'photo-taken' });
    const { match, label, found } = await verifyPhoto(photo, task);
    lastLabel = label ?? null;
    lastFound = found ?? null;
    dispatch({ type: 'verified', match });
    (match ? playSuccess : playTryAgain)();
  } catch {
    notice = 'Что-то пошло не так. Давай попробуем ещё раз!';
    if (state!.phase === 'camera') dispatch({ type: 'cancel-camera' });
    else dispatch({ type: 'check-failed' });
  }
}


// Картинки заврёнков Гриши и Сони (Figma «Иллюстрации. Гриша и Соня. Заврики»).
const art = (name: string, cls = '') => `<img class="char ${cls}" src="/art/${name}.svg" alt="" aria-hidden="true">`;

const starRow = (n: number) =>
  `<div class="stars" role="img" aria-label="Звёзд: ${n} из 3">${[1, 2, 3]
    .map((i) => `<span class="star ${i <= n ? 'on' : ''}" style="--d:${i * 0.25}s">★</span>`).join('')}</div>`;

// Соня называет найденное: цвет для заданий на цвет, иначе предмет, который узнала модель.
function sonyaSays(task: Task): string {
  if (task.local?.kind === 'color') return `Это ${COLOR_RU[task.local.color]} цвет!`;
  return lastLabel ? `Это ${lastLabel}!` : 'Ты нашёл нужный предмет!';
}

// «Найди предмет с красным цветом!» -> «предмет с красным цветом»
const goalOf = (task: Task) => task.prompt.replace(/^Найди\s+/, '').replace(/[!.]$/, '');

// Гриша объясняет, что нашёл ребёнок и что нужно искать.
function grishaExplains(task: Task): string {
  const seen = lastFound ? `${lastFound}.` : 'Это не похоже на то, что мы ищем.';
  return `${seen} Мы ищем: ${goalOf(task)}.`;
}

const wallet = () => `<span class="chip coin" role="img" aria-label="Вспышек: ${progress.flashes}">${CURRENCY.emoji} ${progress.flashes}</span>`;

function hud(left: string, mid = '', label = '', right = '') {
  const aria = label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"';
  return `<div class="hud">${left}<div class="pips"${aria}>${mid}</div><div class="hud-right">${right}${wallet()}</div></div>`;
}

function renderOnboarding(i = 0) {
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;
  const dots = SLIDES.map((_, j) => `<span class="dot ${j === i ? 'on' : ''}"></span>`).join('');
  show(`${art(slide.art, 'talking')}<div class="who">${slide.who}</div>${bubble(slide.text)}
    <div class="dots">${dots}</div>
    <button id="onext" class="green">${last ? 'Поехали!' : 'Дальше'}</button>
    ${last ? '' : '<button id="oskip" class="secondary">Пропустить</button>'}`);
  speak(slide.text);
  const done = () => { markOnboarded(); speechSynthesis?.cancel(); renderLevels(); };
  on('onext', () => (last ? done() : renderOnboarding(i + 1)));
  on('oskip', done);
}

// Цвета граней кубов по категориям: верх светлее, левая грань средняя, правая тёмная.
const CUBE_COLORS: Palette[] = [
  { top: '#fda4af', left: '#e11d48', right: '#9f1239' }, // цвета
  { top: '#7dd3fc', left: '#0284c7', right: '#075985' }, // формы
  { top: '#fcd34d', left: '#d97706', right: '#92400e' }, // свойства
  { top: '#86efac', left: '#16a34a', right: '#166534' }, // что для чего
  { top: '#c4b5fd', left: '#7c3aed', right: '#4c1d95' }, // сочетания
  { top: '#f9a8d4', left: '#db2777', right: '#9d174d' }, // счёт
];

// Куб 160x80 (ромб) и толщина 40: верхняя грань — ромб, две боковые — параллелограммы; под ним тень.
function cubeSvg(c: Palette): string {
  return `<svg viewBox="0 0 160 136" aria-hidden="true">
    <ellipse cx="80" cy="124" rx="58" ry="10" fill="rgba(10,5,40,.35)"/>
    <polygon points="0,40 80,80 80,120 0,80" fill="${c.left}"/>
    <polygon points="160,40 80,80 80,120 160,80" fill="${c.right}"/>
    <polygon points="80,0 160,40 80,80 0,40" fill="${c.top}"/>
  </svg>`;
}

function renderLevels() {
  const { W, H, items } = worldLayout(LEVELS.length);
  const cubes = LEVELS.map((l, i) => {
    const p = progress.levels[l.id];
    const it = items[i];
    return `<button class="cube-btn ${p?.passed ? 'done' : ''}" data-i="${i}" aria-label="${l.title}"
      style="left:${(it.cx / W) * 100}%;top:${(it.top / H) * 100}%;width:${(WORLD.CUBE_W / W) * 100}%;--i:${i};--ph:${(i * 0.7).toFixed(1)}s">
      ${cubeSvg(CUBE_COLORS[i % CUBE_COLORS.length])}
      <span class="cube-icon" aria-hidden="true">${l.emoji}</span>
      ${p?.passed ? '<span class="cube-badge" aria-hidden="true">✓</span>' : ''}
      <span class="cube-label">${l.title}</span>
    </button>`;
  }).join('');
  show(`${hud('<button id="howto" class="secondary small" aria-label="Как играть">❓</button>', '', '',
      '<button id="shop" class="secondary small" aria-label="Магазин">🛍</button>')}
    ${art('ship')}<h1>Покажи нам мир!</h1><p>Выбери, что показать Грише и Соне</p>
    <div class="world" style="aspect-ratio:${W} / ${H.toFixed(0)}">${cubes}</div>`, 'screen-menu');
  root.querySelectorAll<HTMLButtonElement>('.cube-btn').forEach((b) =>
    b.addEventListener('click', () => startLevel(LEVELS[Number(b.dataset.i)])),
  );
  on('shop', renderShop);
  on('howto', () => renderOnboarding());
}

function renderShop() {
  const items = SHOP.map((it) => {
    const owned = progress.owned.includes(it.id);
    const label = owned ? 'Твой!' : `${CURRENCY.emoji} ${it.price}`;
    const dis = owned || !canBuy(progress, it);
    return `<button class="level ${owned ? 'owned' : ''}" data-id="${it.id}" ${dis ? 'disabled' : ''} style="--i:${SHOP.indexOf(it)}">
      <span class="emoji-s" aria-hidden="true">${it.emoji}</span><span>${it.name}</span><small>${label}</small></button>`;
  }).join('');
  show(`${hud('<button id="back" class="secondary small" aria-label="Назад">←</button>')}
    <h1>Магазин</h1><p>Трать ${CURRENCY.name} на друзей</p><div class="levels">${items}</div>`);
  root.querySelectorAll<HTMLButtonElement>('.level[data-id]').forEach((b) =>
    b.addEventListener('click', () => {
      const item = SHOP.find((x) => x.id === b.dataset.id)!;
      progress = buy(progress, item);
      void store.save(progress);
      playSuccess();
      confetti(900);
      renderShop();
    }),
  );
  on('back', () => { goBack(); renderLevels(); });
}

const toMenu = () => { goBack(); state = null; level = null; render(); };
const toMap = () => { goBack(); state = null; render(); };

// Изометрическая карта: плитки-кубики по ромбовой сетке 2:1, путь зигзагом вниз (геометрия в map/iso.ts).
const PAL = {
  road: { top: '#a78bfa', left: '#6d28d9', right: '#4c1d95' },
  todo: { top: '#ddd6fe', left: '#8b5cf6', right: '#5b21b6' },
  next: { top: '#fde68a', left: '#f59e0b', right: '#b45309' },
  done: { top: '#86efac', left: '#16a34a', right: '#166534' },
} satisfies Record<string, Palette>;

function tileSvg(sx: number, sy: number, h: number, c: Palette, cls: string, i: number): string {
  const x0 = sx - TW / 2, x1 = sx + TW / 2, ty = sy - h;
  return `<g class="tile ${cls}" style="--i:${i}">
    <polygon points="${x0},${ty} ${sx},${ty + TH / 2} ${sx},${sy + TH / 2} ${x0},${sy}" fill="${c.left}"/>
    <polygon points="${x1},${ty} ${sx},${ty + TH / 2} ${sx},${sy + TH / 2} ${x1},${sy}" fill="${c.right}"/>
    <polygon points="${sx},${ty - TH / 2} ${x1},${ty} ${sx},${ty + TH / 2} ${x0},${ty}" fill="${c.top}"/>
  </g>`;
}

function renderMap(l: Level) {
  const n = l.tasks.length;
  const cells = isoPath(n);
  const pos = cells.map((c) => ({ ...c, ...project(c.gx, c.gy) }));
  const PAD = 12;
  const minX = Math.min(...pos.map((p) => p.sx)) - TW / 2 - PAD;
  const maxX = Math.max(...pos.map((p) => p.sx)) + TW / 2 + PAD;
  const minY = Math.min(...pos.map((p) => p.sy)) - NODE_H - TH / 2 - PAD - 70; // место под Соню
  const maxY = Math.max(...pos.map((p) => p.sy)) + TH / 2 + PAD;
  const W = maxX - minX, H = maxY - minY;
  const next = l.tasks.findIndex((t) => progress.found[t.id] === undefined);
  const stateOf = (i: number) => (progress.found[l.tasks[i].id] !== undefined ? 'done' : i === next ? 'next' : 'todo');

  // порядок отрисовки «от дальнего к ближнему», чтобы кубики перекрывали друг друга правильно
  const order = pos.map((p, idx) => ({ p, idx })).sort((a, b) => a.p.gx + a.p.gy - (b.p.gx + b.p.gy) || a.p.gx - b.p.gx);
  const tiles = order.map(({ p, idx }) => {
    const st = p.node === null ? 'road' : stateOf(p.node);
    return tileSvg(p.sx - minX, p.sy - minY, p.node === null ? ROAD_H : NODE_H, PAL[st], st, idx);
  }).join('');

  const nodes = l.tasks.map((t, i) => {
    const p = pos.find((q) => q.node === i)!;
    const st = stateOf(i);
    const done = st === 'done';
    return `<button class="stop ${st}" data-i="${i}" aria-label="Задание ${i + 1}${done ? ', найдено' : ''}"
      style="left:${((p.sx - minX) / W) * 100}%;top:${((p.sy - NODE_H - minY) / H) * 100}%;--i:${i}">${done ? '✓' : i + 1}</button>`;
  }).join('');

  const np = pos.find((q) => q.node === (next < 0 ? 0 : next))!;
  const guide = next >= 0
    ? `<img class="map-char ${np.sx - minX < W / 2 ? 'at-left' : 'at-right'}" src="/art/sonya-walk.svg" alt="" aria-hidden="true"
        style="left:${((np.sx - minX) / W) * 100}%;top:${((np.sy - NODE_H - minY) / H) * 100}%">` : '';

  const found = l.tasks.filter((t) => progress.found[t.id] !== undefined).length;
  show(`${hud('<button id="back" class="secondary small" aria-label="Назад">←</button>')}
    <h1>${l.title}</h1><p>Найдено: ${found} из ${n}</p>
    <div class="map" style="aspect-ratio:${W.toFixed(1)} / ${H.toFixed(1)};--w:${W.toFixed(0)}">
      <svg viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" aria-hidden="true">${tiles}</svg>${guide}${nodes}
    </div>`, 'screen-map');
  root.querySelectorAll<HTMLButtonElement>('.stop').forEach((b) =>
    b.addEventListener('click', () => startTask(l.tasks[Number(b.dataset.i)])),
  );
  on('back', toMenu);
}

function renderLevelDone() {
  show(`${hud('')}<div class="duo">${art('grisha-cheer', 'cheer')}${art('sonya-cheer', 'cheer')}</div><h1>Все найдено!</h1>
    <p>Ты справился со всей категорией «${level!.title}»</p>
    <div class="reward">${CURRENCY.emoji} бонус +${LEVEL_BONUS}</div>
    <button id="map" class="green">К заданиям</button>`);
  confetti(2200);
  on('map', toMap);
}

function render() {
  if (!level) return isOnboarded() ? renderLevels() : renderOnboarding();
  if (!state) return renderMap(level);
  const s = state;
  const task = currentTask(s);
  const bar = hud('<button id="menu" class="secondary small" aria-label="К заданиям">✕</button>');
  switch (s.phase) {
    case 'task':
    case 'camera': {
      const hint = s.attempts > 0 && task!.hint ? `<div class="hint">💡 ${task!.hint}</div>` : '';
      show(`${bar}${art('grisha-happy', 'talking')}
        ${bubble(task!.prompt)}${hint}
        ${notice ? `<div class="notice">${notice}</div>` : ''}
        <button id="shoot" class="breathe">📷 Сфотографировать</button>
        <button id="say" class="secondary">🔊 Повторить</button>`);
      on('shoot', capture);
      on('say', () => speak(task!.prompt));
      on('menu', toMap);
      if (!notice) speak(task!.prompt);
      notice = '';
      break;
    }
    case 'checking':
      show(`${bar}<img class="preview" src="${photoUrl}" alt=""><div class="spinner"></div><p>Смотрю, что ты нашёл…</p>`);
      on('menu', toMap);
      break;
    case 'result': {
      if (s.lastMatch) {
        const got = starsFor(s.attempts);
        const again = progress.found[task!.id] !== undefined;
        const says = sonyaSays(task!);
        show(`${bar}${art('sonya-cheer', 'cheer talking')}${bubble(says)}
          ${starRow(got)}
          ${again ? '' : `<div class="reward">${CURRENCY.emoji} +${got}</div>`}
          <button id="next" class="green">Дальше</button>`, 'ok');
        confetti();
        speak(`${says} Молодец!`);
      } else if (canSkip(s)) {
        show(`${bar}${art('sonya-sad', 'sad shake talking')}<div class="banner no">Это сложное задание</div>
          ${photoUrl ? `<img class="preview mini" src="${photoUrl}" alt="">` : ''}
          ${bubble(`${grishaExplains(task!)} Давай попробуем другое!`)}<button id="next">Дальше</button>`);
        speak(grishaExplains(task!));
      } else {
        const left = MAX_ATTEMPTS - s.attempts;
        show(`${bar}${art('sonya-sad', 'sad shake talking')}<div class="banner no">Пока не то</div>
          ${photoUrl ? `<img class="preview mini" src="${photoUrl}" alt="">` : ''}
          ${bubble(grishaExplains(task!))}
          <p>Осталось попыток: ${left}</p><button id="next">Искать снова</button>`);
        speak(grishaExplains(task!));
      }
      on('next', () => dispatch({ type: 'next' }));
      on('menu', toMap);
      break;
    }
    case 'finish': {
      const levelDone = finishTask();
      state = null;
      if (levelDone) renderLevelDone();
      else renderMap(level);
      break;
    }
  }
}

render();

// Подтягиваем прогресс с сервера (если он настроен) и перерисовываем, не прерывая задание.
store.load().then((p) => {
  progress = p;
  // Перерисовываем только карту и меню: онбординг, магазин и игру не сбрасываем.
  if (!state && /screen-(menu|map)/.test(root.className)) render();
});

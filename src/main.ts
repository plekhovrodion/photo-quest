import './style.css';
import { LEVELS, type Level, type Task } from './data/tasks';
import { createGame, currentTask, canSkip, reduce, starsFor, MAX_ATTEMPTS, type Action, type GameState } from './game/state';
import { takePhoto, compressPhoto } from './camera/capture';
import { verifyPhoto } from './api/verify';
import { COLOR_RU } from './vision/names';
import { preloadModel } from './vision/local';
import { confetti } from './fx/confetti';
import { typeText, stopTyping } from './fx/typewriter';
import { playSuccess, playTryAgain, speak } from './audio/sounds';
import { SLIDES, isOnboarded, markOnboarded } from './onboarding';
import { loadProgress, recordTask, buy, canBuy, SHOP, CURRENCY, LEVEL_BONUS, type Progress } from './progress';

import { createStore } from './storage/store';

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

function show(html: string, cls = '') {
  stopTyping();
  root.className = cls;
  root.innerHTML = html;
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
    ${last ? '' : '<button id="oskip" class="secondary small">Пропустить</button>'}`);
  speak(slide.text);
  const done = () => { markOnboarded(); speechSynthesis?.cancel(); renderLevels(); };
  on('onext', () => (last ? done() : renderOnboarding(i + 1)));
  on('oskip', done);
}

function renderLevels() {
  const cards = LEVELS.map((l, i) => {
    const p = progress.levels[l.id];
    return `<button class="level ${p?.passed ? 'done' : ''}" data-i="${i}" style="--i:${i}">
      <span class="emoji-s" aria-hidden="true">${p?.passed ? '🏅' : l.emoji}</span>
      <span>${l.title}</span>
    </button>`;
  }).join('');
  show(`${hud('<button id="howto" class="secondary small" aria-label="Как играть">❓</button>', '', '',
      '<button id="shop" class="secondary small" aria-label="Магазин">🛍</button>')}
    ${art('ship')}<h1>Покажи нам мир!</h1><p>Гриша и Соня прилетели с далёкой планеты. Помоги им узнать наш мир!</p>
    <div class="levels">${cards}</div>`, 'screen-menu');
  root.querySelectorAll<HTMLButtonElement>('.level').forEach((b) =>
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
  show(`${hud('<button id="back" class="secondary small">← Назад</button>')}
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
  on('back', renderLevels);
}

const toMenu = () => { state = null; level = null; render(); };
const toMap = () => { state = null; render(); };

const MAP_W = 320;
const ROW = 96;

function renderMap(l: Level) {
  const n = l.tasks.length;
  const H = n * ROW + 20;
  const pts = l.tasks.map((_, i) => ({ x: MAP_W / 2 + 90 * Math.sin(i * 1.05), y: 52 + i * ROW }));
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y}`;
  for (let i = 1; i < n; i++) {
    const a = pts[i - 1], b = pts[i], my = (a.y + b.y) / 2;
    d += ` C ${a.x.toFixed(1)} ${my} ${b.x.toFixed(1)} ${my} ${b.x.toFixed(1)} ${b.y}`;
  }
  const next = l.tasks.findIndex((t) => progress.found[t.id] === undefined);
  const nodes = l.tasks.map((t, i) => {
    const got = progress.found[t.id];
    const cls = got !== undefined ? 'done' : i === next ? 'next' : '';
    return `<button class="stop ${cls}" data-i="${i}" aria-label="Задание ${i + 1}${got !== undefined ? ', найдено' : ''}"
      style="left:${(pts[i].x / MAP_W) * 100}%;top:${(pts[i].y / H) * 100}%;--i:${i}">${got !== undefined ? '✓' : i + 1}</button>`;
  }).join('');
  const found = l.tasks.filter((t) => progress.found[t.id] !== undefined).length;
  show(`${hud('<button id="back" class="secondary small" aria-label="Назад">←</button>')}
    ${art('sonya-wave', 'small')}<h1>${l.title}</h1><p>Найдено: ${found} из ${n}</p>
    <div class="map" style="aspect-ratio:${MAP_W} / ${H}">
      <svg viewBox="0 0 ${MAP_W} ${H}" aria-hidden="true"><path d="${d}"/></svg>${nodes}
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
        <button id="say" class="secondary small">🔊 Повторить</button>`);
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

import './style.css';
import { LEVELS, type Level, type Task } from './data/tasks';
import { createGame, currentTask, canSkip, reduce, starsFor, MAX_ATTEMPTS, type Action, type GameState } from './game/state';
import { takePhoto, compressPhoto } from './camera/capture';
import { verifyPhoto } from './api/verify';
import { preloadModel } from './vision/local';
import { confetti } from './fx/confetti';
import { playSuccess, playTryAgain, speak } from './audio/sounds';
import { SLIDES, isOnboarded, markOnboarded } from './onboarding';
import { loadProgress, saveProgress, recordTask, buy, canBuy, SHOP, CURRENCY, LEVEL_BONUS, type Progress } from './progress';

const root = document.getElementById('app')!;
let progress: Progress = loadProgress();
let level: Level | null = null;
let state: GameState | null = null;
let notice = '';
let photoUrl = '';

function dispatch(a: Action) {
  state = reduce(state!, a);
  render();
}

function show(html: string, cls = '') {
  root.className = cls;
  root.innerHTML = html;
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
  saveProgress(progress);
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
    const { match } = await verifyPhoto(photo, task);
    dispatch({ type: 'verified', match });
    (match ? playSuccess : playTryAgain)();
  } catch {
    notice = 'Что-то пошло не так. Давай попробуем ещё раз!';
    if (state!.phase === 'camera') dispatch({ type: 'cancel-camera' });
    else dispatch({ type: 'check-failed' });
  }
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
  show(`<div aria-hidden="true" class="mascot">${slide.emoji}</div><div class="bubble">${slide.title}</div><p>${slide.text}</p>
    <div class="dots">${dots}</div>
    <button id="onext" class="green">${last ? 'Поехали!' : 'Дальше'}</button>
    ${last ? '' : '<button id="oskip" class="secondary small">Пропустить</button>'}`);
  speak(`${slide.title}. ${slide.text}`);
  const done = () => { markOnboarded(); speechSynthesis?.cancel(); renderLevels(); };
  on('onext', () => (last ? done() : renderOnboarding(i + 1)));
  on('oskip', done);
}

function renderLevels() {
  const cards = LEVELS.map((l, i) => {
    const p = progress.levels[l.id];
    return `<button class="level ${p?.passed ? 'done' : ''}" data-i="${i}">
      <span class="emoji-s" aria-hidden="true">${p?.passed ? '🏅' : l.emoji}</span>
      <span>${l.title}</span>
    </button>`;
  }).join('');
  show(`${hud('<button id="howto" class="secondary small" aria-label="Как играть">❓</button>', '', '',
      '<button id="shop" class="secondary small" aria-label="Магазин">🛍</button>')}
    <div aria-hidden="true" class="mascot">📸</div><h1>ФотоКвест</h1><p>Выбери приключение!</p>
    <div class="levels">${cards}</div>`);
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
    return `<button class="level ${owned ? 'owned' : ''}" data-id="${it.id}" ${dis ? 'disabled' : ''}>
      <span class="emoji-s" aria-hidden="true">${it.emoji}</span><span>${it.name}</span><small>${label}</small></button>`;
  }).join('');
  show(`${hud('<button id="back" class="secondary small">← Назад</button>')}
    <h1>Магазин</h1><p>Трать ${CURRENCY.name} на друзей</p><div class="levels">${items}</div>`);
  root.querySelectorAll<HTMLButtonElement>('.level[data-id]').forEach((b) =>
    b.addEventListener('click', () => {
      const item = SHOP.find((x) => x.id === b.dataset.id)!;
      progress = buy(progress, item);
      saveProgress(progress);
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
      style="left:${(pts[i].x / MAP_W) * 100}%;top:${(pts[i].y / H) * 100}%">${got !== undefined ? '✓' : i + 1}</button>`;
  }).join('');
  const found = l.tasks.filter((t) => progress.found[t.id] !== undefined).length;
  show(`${hud('<button id="back" class="secondary small" aria-label="Назад">←</button>')}
    <div aria-hidden="true" class="mascot">${l.emoji}</div><h1>${l.title}</h1><p>Найдено: ${found} из ${n}</p>
    <div class="map" style="aspect-ratio:${MAP_W} / ${H}">
      <svg viewBox="0 0 ${MAP_W} ${H}" aria-hidden="true"><path d="${d}"/></svg>${nodes}
    </div>`);
  root.querySelectorAll<HTMLButtonElement>('.stop').forEach((b) =>
    b.addEventListener('click', () => startTask(l.tasks[Number(b.dataset.i)])),
  );
  on('back', toMenu);
}

function renderLevelDone() {
  show(`${hud('')}<div aria-hidden="true" class="mascot cheer">🏆</div><h1>Все найдено!</h1>
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
      show(`${bar}<div aria-hidden="true" class="mascot">${level.emoji}</div>
        <div class="bubble">${task!.prompt}</div>${hint}
        ${notice ? `<div class="notice">${notice}</div>` : ''}
        <button id="shoot">📷 Сфотографировать</button>`);
      on('shoot', capture);
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
        show(`${bar}<div aria-hidden="true" class="mascot cheer">🎉</div><div class="banner ok">Верно! Молодец!</div>
          ${again ? '' : `<div class="reward">${CURRENCY.emoji} +${got}</div>`}
          <button id="next" class="green">Дальше</button>`, 'ok');
        confetti();
        speak('Верно! Молодец!');
      } else if (canSkip(s)) {
        show(`${bar}<div aria-hidden="true" class="mascot sad">🤔</div><div class="banner no">Это сложное задание</div>
          <p>Давай попробуем другое!</p><button id="next">Дальше</button>`);
      } else {
        const left = MAX_ATTEMPTS - s.attempts;
        show(`${bar}<div aria-hidden="true" class="mascot sad">🔍</div><div class="banner no">Пока не то</div>
          <p>Попробуй ещё! Осталось попыток: ${left}</p><button id="next">Искать снова</button>`);
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

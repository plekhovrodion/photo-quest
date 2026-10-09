import './style.css';
import { LEVELS, PASS_RATIO, type Level } from './data/tasks';
import { createGame, currentTask, canSkip, reduce, MAX_ATTEMPTS, type Action, type GameState } from './game/state';
import { takePhoto, compressPhoto } from './camera/capture';
import { verifyPhoto } from './api/verify';
import { playSuccess, playTryAgain, speak } from './audio/sounds';
import { loadProgress, saveProgress, recordResult, isPassed, buy, canBuy, SHOP, CURRENCY, LEVEL_BONUS, type Progress } from './progress';

const root = document.getElementById('app')!;
let progress: Progress = loadProgress();
let level: Level | null = null;
let state: GameState | null = null;
let notice = '';
let rewarded = false;
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
  state = createGame(l.tasks);
  rewarded = false;
  render();
}

// Начисляет награду один раз за прохождение, даже если экран перерисуется.
function finishLevel() {
  const s = state!;
  const passed = isPassed(s.score, s.tasks.length);
  const firstPass = passed && !progress.levels[level!.id]?.passed;
  if (!rewarded) {
    progress = recordResult(progress, level!.id, s.stars, passed);
    saveProgress(progress);
    rewarded = true;
  }
  return { passed, firstPass };
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

const maxStars = (l: Level) => l.tasks.length * 3;

function wallet() {
  return `<div class="wallet">${CURRENCY.emoji} ${progress.flashes}</div>`;
}

function renderLevels() {
  const cards = LEVELS.map((l, i) => {
    const p = progress.levels[l.id];
    return `<button class="level" data-i="${i}">
      <span class="emoji-s">${l.emoji}</span>
      <span>${l.title}</span>
      <small>${p ? `${CURRENCY.emoji} ${p.stars}/${maxStars(l)}${p.passed ? ' ✓' : ''}` : `${l.tasks.length} заданий`}</small>
    </button>`;
  }).join('');
  show(`${wallet()}<h1>ФотоКвест</h1><p>Выбери любой уровень</p><div class="levels">${cards}</div>
    <button id="shop" class="secondary">🛍 Магазин</button>`);
  root.querySelectorAll<HTMLButtonElement>('.level').forEach((b) =>
    b.addEventListener('click', () => startLevel(LEVELS[Number(b.dataset.i)])),
  );
  on('shop', renderShop);
}

function renderShop() {
  const items = SHOP.map((it) => {
    const owned = progress.owned.includes(it.id);
    const label = owned ? 'Твой!' : `${CURRENCY.emoji} ${it.price}`;
    const dis = owned || !canBuy(progress, it);
    return `<button class="level ${owned ? 'owned' : ''}" data-id="${it.id}" ${dis ? 'disabled' : ''}>
      <span class="emoji-s">${it.emoji}</span><span>${it.name}</span><small>${label}</small></button>`;
  }).join('');
  show(`${wallet()}<h1>Магазин</h1><p>Трать ${CURRENCY.name} на друзей</p><div class="levels">${items}</div>
    <button id="back" class="secondary">Назад</button>`);
  root.querySelectorAll<HTMLButtonElement>('.level[data-id]').forEach((b) =>
    b.addEventListener('click', () => {
      const item = SHOP.find((x) => x.id === b.dataset.id)!;
      progress = buy(progress, item);
      saveProgress(progress);
      playSuccess();
      renderShop();
    }),
  );
  on('back', renderLevels);
}

function render() {
  if (!state || !level) return renderLevels();
  const s = state;
  const task = currentTask(s);
  const progressBar = `<div class="progress">${level.emoji} ${level.title} · задание ${Math.min(s.index + 1, s.tasks.length)} из ${s.tasks.length} · ${CURRENCY.emoji} ${s.stars}</div>`;
  switch (s.phase) {
    case 'task':
    case 'camera': {
      const hint = s.attempts > 0 && task!.hint ? `<p>💡 Подсказка: ${task!.hint}</p>` : '';
      show(`${progressBar}<div class="emoji">📷</div><h1>${task!.prompt}</h1>${hint}
        ${notice ? `<p>${notice}</p>` : ''}
        <button id="shoot">Сфотографировать</button>
        <button id="say" class="secondary">🔊 Повторить</button>
        <button id="menu" class="secondary">К уровням</button>`);
      on('shoot', capture);
      on('say', () => speak(task!.prompt));
      on('menu', () => { state = null; level = null; render(); });
      if (!notice) speak(task!.prompt);
      notice = '';
      break;
    }
    case 'checking':
      show(`<img class="preview" src="${photoUrl}" alt=""><div class="spinner"></div><p>Смотрю, что ты нашёл…</p>`);
      break;
    case 'result': {
      if (s.lastMatch) {
        show(`<div class="emoji">🎉</div><h1>Верно! Молодец!</h1><button id="next">Дальше</button>`, 'ok');
        speak('Верно! Молодец!');
      } else if (canSkip(s)) {
        show(`<div class="emoji">🤔</div><h1>Это сложное задание</h1><p>Давай попробуем другое!</p><button id="next">Дальше</button>`);
      } else {
        const left = MAX_ATTEMPTS - s.attempts;
        show(`<div class="emoji">🔍</div><h1>Пока не то</h1><p>Попробуй ещё! Осталось попыток: ${left}</p><button id="next">Искать снова</button>`);
      }
      on('next', () => dispatch({ type: 'next' }));
      break;
    }
    case 'finish': {
      const { passed, firstPass } = finishLevel();
      const idx = LEVELS.indexOf(level);
      const next = LEVELS[idx + 1];
      show(`<div class="emoji">${passed ? '🏆' : '💪'}</div>
        <h1>${passed ? 'Уровень пройден!' : 'Почти получилось!'}</h1>
        <p>Найдено: ${s.score} из ${s.tasks.length}</p>
        <p>${CURRENCY.emoji} +${s.stars}${firstPass ? ` и бонус +${LEVEL_BONUS} за уровень!` : ''}</p>
        ${!passed ? `<p>Нужно найти хотя бы ${Math.ceil(s.tasks.length * PASS_RATIO)}, чтобы получить бонус за уровень.</p>` : ''}
        ${next ? `<button id="nextlevel" class="${passed ? '' : 'secondary'}">Следующий уровень</button>` : ''}
        <button id="again" class="${passed && next ? 'secondary' : ''}">Сыграть ещё раз</button>
        <button id="menu" class="secondary">К уровням</button>`);
      speak(passed ? 'Уровень пройден!' : 'Почти получилось!');
      on('nextlevel', () => startLevel(next));
      on('again', () => startLevel(level!));
      on('menu', () => { state = null; level = null; render(); });
      break;
    }
  }
}

render();

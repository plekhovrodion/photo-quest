import './style.css';
import { LEVELS, PASS_RATIO, type Level } from './data/tasks';
import { createGame, currentTask, canSkip, reduce, MAX_ATTEMPTS, type Action, type GameState } from './game/state';
import { takePhoto, compressPhoto } from './camera/capture';
import { verifyPhoto } from './api/verify';
import { playSuccess, playTryAgain, speak } from './audio/sounds';
import { loadProgress, saveProgress, recordResult, isUnlocked, isPassed, type Progress } from './progress';

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
  state = createGame(l.tasks);
  render();
}

function finishLevel() {
  const s = state!;
  const passed = isPassed(s.score, s.tasks.length);
  progress = recordResult(progress, level!.id, s.stars, passed);
  saveProgress(progress);
  return passed;
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

function renderLevels() {
  const cards = LEVELS.map((l, i) => {
    const open = isUnlocked(progress, i);
    const p = progress[l.id];
    return `<button class="level ${open ? '' : 'locked'}" data-i="${i}" ${open ? '' : 'disabled'}>
      <span class="emoji-s">${open ? l.emoji : '🔒'}</span>
      <span>${l.title}</span>
      <small>${p ? `⭐ ${p.stars}/${maxStars(l)}${p.passed ? ' ✓' : ''}` : `${l.tasks.length} заданий`}</small>
    </button>`;
  }).join('');
  show(`<h1>ФотоКвест</h1><p>Выбери уровень</p><div class="levels">${cards}</div>`);
  root.querySelectorAll<HTMLButtonElement>('.level').forEach((b) =>
    b.addEventListener('click', () => startLevel(LEVELS[Number(b.dataset.i)])),
  );
}

function render() {
  if (!state || !level) return renderLevels();
  const s = state;
  const task = currentTask(s);
  const progressBar = `<div class="progress">${level.emoji} ${level.title} · задание ${Math.min(s.index + 1, s.tasks.length)} из ${s.tasks.length} · ⭐ ${s.stars}</div>`;
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
      const passed = finishLevel();
      const idx = LEVELS.indexOf(level);
      const next = LEVELS[idx + 1];
      show(`<div class="emoji">${passed ? '🏆' : '💪'}</div>
        <h1>${passed ? 'Уровень пройден!' : 'Почти получилось!'}</h1>
        <p>Найдено: ${s.score} из ${s.tasks.length} · ⭐ ${s.stars}</p>
        ${!passed ? `<p>Нужно найти хотя бы ${Math.ceil(s.tasks.length * PASS_RATIO)}, чтобы открыть дальше.</p>` : ''}
        ${passed && next ? '<button id="nextlevel">Следующий уровень</button>' : ''}
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

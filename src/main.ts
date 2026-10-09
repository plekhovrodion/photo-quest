import './style.css';
import { TASKS } from './data/tasks';
import { createGame, currentTask, canSkip, reduce, MAX_ATTEMPTS, type Action, type GameState } from './game/state';
import { takePhoto, compressPhoto } from './camera/capture';
import { verifyPhoto } from './api/verify';
import { playSuccess, playTryAgain, speak } from './audio/sounds';

const root = document.getElementById('app')!;
let state: GameState = createGame(TASKS);
let notice = '';
let photoUrl = '';

function dispatch(a: Action) {
  state = reduce(state, a);
  render();
}

function show(html: string, cls = '') {
  root.className = cls;
  root.innerHTML = html;
}

function on(id: string, fn: () => void) {
  root.querySelector(`#${id}`)?.addEventListener('click', fn);
}

async function capture() {
  const task = currentTask(state)!;
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
    if (state.phase === 'camera') dispatch({ type: 'cancel-camera' });
    else dispatch({ type: 'check-failed' });
  }
}

function render() {
  const task = currentTask(state);
  const progress = `<div class="progress">Задание ${Math.min(state.index + 1, state.tasks.length)} из ${state.tasks.length}</div>`;
  switch (state.phase) {
    case 'task':
    case 'camera':
      show(`${progress}<div class="emoji">📷</div><h1>${task!.prompt}</h1>
        ${notice ? `<p>${notice}</p>` : ''}
        <button id="shoot">Сфотографировать</button>
        <button id="say" class="secondary">🔊 Повторить</button>`);
      on('shoot', capture);
      on('say', () => speak(task!.prompt));
      if (!notice) speak(task!.prompt);
      notice = '';
      break;
    case 'checking':
      show(`<img class="preview" src="${photoUrl}" alt=""><div class="spinner"></div><p>Смотрю, что ты нашёл…</p>`);
      break;
    case 'result': {
      if (state.lastMatch) {
        show(`<div class="emoji">🎉</div><h1>Верно! Молодец!</h1><button id="next">Дальше</button>`, 'ok');
        speak('Верно! Молодец!');
      } else if (canSkip(state)) {
        show(`<div class="emoji">🤔</div><h1>Это сложное задание</h1><p>Давай попробуем другое!</p><button id="next">Дальше</button>`);
      } else {
        const left = MAX_ATTEMPTS - state.attempts;
        show(`<div class="emoji">🔍</div><h1>Пока не то</h1><p>Попробуй ещё! Осталось попыток: ${left}</p><button id="next">Искать снова</button>`);
      }
      on('next', () => dispatch({ type: 'next' }));
      break;
    }
    case 'finish':
      show(`<div class="emoji">🏆</div><h1>Ты справился!</h1><p>Найдено: ${state.score} из ${state.tasks.length}</p><button id="again">Играть ещё</button>`);
      speak('Ты справился!');
      on('again', () => { state = createGame(TASKS); render(); });
      break;
  }
}

render();

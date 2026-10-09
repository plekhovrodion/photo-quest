import { TASKS } from './data/tasks';
import { createGame, currentTask, reduce, type Action, type GameState } from './game/state';

const root = document.getElementById('app')!;
let state: GameState = createGame(TASKS);

function dispatch(a: Action) {
  state = reduce(state, a);
  render();
}

// Временная заглушка: камера и AI-проверка появятся в следующих шагах плана.
function render() {
  const task = currentTask(state);
  if (state.phase === 'finish') {
    root.innerHTML = `<h1>Молодец!</h1><p>Найдено: ${state.score} из ${state.tasks.length}</p>`;
    return;
  }
  if (state.phase === 'task') {
    root.innerHTML = `<h1>${task!.prompt}</h1><button id="go">Сфотографировать</button>`;
    root.querySelector('#go')!.addEventListener('click', () => {
      dispatch({ type: 'start-camera' });
    });
  } else if (state.phase === 'camera') {
    root.innerHTML = `<h1>${task!.prompt}</h1>
      <button id="yes">Заглушка: верно</button> <button id="no">Заглушка: неверно</button>`;
    const fake = (match: boolean) => {
      dispatch({ type: 'photo-taken' });
      dispatch({ type: 'verified', match });
    };
    root.querySelector('#yes')!.addEventListener('click', () => fake(true));
    root.querySelector('#no')!.addEventListener('click', () => fake(false));
  } else if (state.phase === 'result') {
    root.innerHTML = `<h1>${state.lastMatch ? 'Верно! 🎉' : 'Не получилось, попробуй ещё'}</h1><button id="next">Дальше</button>`;
    root.querySelector('#next')!.addEventListener('click', () => dispatch({ type: 'next' }));
  }
}

render();

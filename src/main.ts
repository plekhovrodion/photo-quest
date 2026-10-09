import './style.css';
import { LEVELS, PASS_RATIO, type Level } from './data/tasks';
import { createGame, currentTask, canSkip, reduce, starsFor, MAX_ATTEMPTS, type Action, type GameState } from './game/state';
import { takePhoto, compressPhoto } from './camera/capture';
import { verifyPhoto } from './api/verify';
import { confetti } from './fx/confetti';
import { playSuccess, playTryAgain, speak } from './audio/sounds';
import { PREMISE, FINALE, CHAPTERS, chapterFor } from './data/story';
import { SLIDES, isOnboarded, markOnboarded } from './onboarding';
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
  state = null;
  const ch = chapterFor(l.id);
  show(`${hud('<button id="back" class="secondary small">← Назад</button>')}
    <div aria-hidden="true" class="mascot">🗺️</div><h1>${ch.place}</h1>
    <div class="bubble">${ch.intro}</div>
    <button id="go" class="green">Поехали!</button>`);
  speak(ch.intro);
  on('go', () => { state = createGame(l.tasks); rewarded = false; render(); });
  on('back', toMenu);
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

const wallet = () => `<span class="chip coin" role="img" aria-label="Вспышек: ${progress.flashes}">${CURRENCY.emoji} ${progress.flashes}</span>`;

function hud(left: string, mid = '', label = '') {
  const aria = label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"';
  return `<div class="hud">${left}<div class="pips"${aria}>${mid}</div>${wallet()}</div>`;
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

const rainbow = () =>
  `<div class="rainbow" role="img" aria-label="Кусочков радуги: ${piecesFound()} из ${CHAPTERS.length}">${CHAPTERS.map((c) =>
    `<span class="stripe ${progress.levels[c.levelId]?.passed ? 'on' : ''}" style="--c:${c.color}"></span>`).join('')}</div>`;

const piecesFound = () => CHAPTERS.filter((c) => progress.levels[c.levelId]?.passed).length;

function renderLevels() {
  const next = LEVELS.findIndex((l) => !progress.levels[l.id]?.passed);
  const nodes = LEVELS.map((l, i) => {
    const p = progress.levels[l.id];
    const ch = chapterFor(l.id);
    const cls = [p?.passed ? 'done' : '', i === next ? 'next' : '', i % 2 ? 'right' : 'left'].join(' ');
    return `<button class="node ${cls}" data-i="${i}" style="--c:${ch.color}">
      <span aria-hidden="true" class="emoji-s">${p?.passed ? '🏅' : l.emoji}</span>
      <span class="node-text"><b>${ch.place}</b><small>${l.title} · ${
        p ? `${CURRENCY.emoji} ${p.stars}/${maxStars(l)}` : `${l.tasks.length} заданий`}</small></span>
    </button>`;
  }).join('');
  show(`${hud('<button id="howto" class="secondary small" aria-label="Как играть">❓</button>')}
    <div aria-hidden="true" class="mascot">📸</div><h1>ФотоКвест</h1>
    <p class="premise">${progress.levels && piecesFound() === 0 ? PREMISE : 'Собери все кусочки радуги!'}</p>
    ${rainbow()}
    <div class="path">${nodes}</div>
    <button id="shop" class="secondary">🛍 Магазин</button>`);
  root.querySelectorAll<HTMLButtonElement>('.node').forEach((b) =>
    b.addEventListener('click', () => startLevel(LEVELS[Number(b.dataset.i)])),
  );
  on('shop', renderShop);
  on('howto', () => renderOnboarding());
}

function renderFinale() {
  show(`${hud('')}<div aria-hidden="true" class="mascot cheer">🌈</div><h1>Радуга собрана!</h1>
    <div class="bubble">${FINALE}</div>${rainbow()}
    <button id="menu" class="green">К приключениям</button>`);
  confetti(3000);
  speak(FINALE);
  on('menu', toMenu);
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

function pips(s: GameState): string {
  return s.tasks.map((_, i) => {
    const cls = i < s.results.length ? (s.results[i] ? 'done' : 'fail') : i === s.index ? 'now' : '';
    return `<span class="pip ${cls}"></span>`;
  }).join('');
}

function render() {
  if (!state || !level) return isOnboarded() ? renderLevels() : renderOnboarding();
  const s = state;
  const task = currentTask(s);
  const bar = hud('<button id="menu" class="secondary small" aria-label="К приключениям">✕</button>', pips(s),
    `Задание ${Math.min(s.index + 1, s.tasks.length)} из ${s.tasks.length}`);
  switch (s.phase) {
    case 'task':
    case 'camera': {
      const hint = s.attempts > 0 && task!.hint ? `<div class="hint">💡 ${task!.hint}</div>` : '';
      show(`${bar}<div aria-hidden="true" class="mascot">${level.emoji}</div>
        <div class="bubble">${task!.prompt}</div>${hint}
        ${notice ? `<div class="notice">${notice}</div>` : ''}
        <button id="shoot">📷 Сфотографировать</button>
        <button id="say" class="secondary small">🔊 Повторить</button>`);
      on('shoot', capture);
      on('say', () => speak(task!.prompt));
      on('menu', toMenu);
      if (!notice) speak(task!.prompt);
      notice = '';
      break;
    }
    case 'checking':
      show(`${bar}<img class="preview" src="${photoUrl}" alt=""><div class="spinner"></div><p>Смотрю, что ты нашёл…</p>`);
      on('menu', toMenu);
      break;
    case 'result': {
      if (s.lastMatch) {
        const got = starsFor(s.attempts);
        show(`${bar}<div aria-hidden="true" class="mascot cheer">🎉</div><div class="banner ok">Верно! Молодец!</div>
          <div class="reward">${CURRENCY.emoji} +${got}</div>
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
      on('menu', toMenu);
      break;
    }
    case 'finish': {
      const wasAll = piecesFound() === CHAPTERS.length;
      const { passed, firstPass } = finishLevel();
      const next = LEVELS[LEVELS.indexOf(level) + 1];
      const ch = chapterFor(level.id);
      const finale = firstPass && !wasAll && piecesFound() === CHAPTERS.length;
      show(`${hud('', pips(s))}<div aria-hidden="true" class="mascot cheer">${passed ? '🏆' : '💪'}</div>
        <h1>${passed ? 'Уровень пройден!' : 'Почти получилось!'}</h1>
        <p>Найдено: ${s.score} из ${s.tasks.length}</p>
        ${passed ? `<div class="piece" style="--c:${ch.color}">🌈 ${ch.outro}</div>` : ''}
        <div class="reward">${CURRENCY.emoji} +${s.stars}${firstPass ? ` + бонус ${LEVEL_BONUS}` : ''}</div>
        ${!passed ? `<p>Найди хотя бы ${Math.ceil(s.tasks.length * PASS_RATIO)}, чтобы получить бонус за уровень.</p>` : ''}
        ${finale ? '<button id="finale" class="green">🌈 Что дальше?</button>' : ''}
        ${next && !finale ? `<button id="nextlevel" class="${passed ? 'green' : 'secondary'}">Следующий уровень</button>` : ''}
        <button id="again" class="${next ? 'secondary' : ''}">Сыграть ещё раз</button>
        <button id="menu" class="secondary small">К приключениям</button>`);
      if (passed) confetti(2200);
      speak(passed ? ch.outro : 'Почти получилось!');
      on('nextlevel', () => startLevel(next));
      on('finale', renderFinale);
      on('again', () => startLevel(level!));
      on('menu', toMenu);
      break;
    }
  }
}

render();

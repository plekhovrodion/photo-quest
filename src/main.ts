import './style.css';
import { LEVELS, type Level, type Task } from './data/tasks';
import { createGame, currentTask, canSkip, reduce, starsFor, MAX_ATTEMPTS, type Action, type GameState } from './game/state';
import { takePhoto, compressPhoto } from './camera/capture';
import { cropPhoto } from './camera/crop';
import { targetOf } from './camera/target';
import { verifyPhoto } from './api/verify';
import { explainObject } from './api/explain';
import { COLOR_RU } from './vision/names';
import { preloadModels } from './vision/models';
import { confetti } from './fx/confetti';
import { typeText, stopTyping } from './fx/typewriter';
import { setBackground } from './fx/background';
import { playSuccess, playTryAgain, speak } from './audio/sounds';
import { SLIDES, isOnboarded, markOnboarded } from './onboarding';
import { album, toSticker, type Sticker } from './album';
import { CLIP_OBJECTS } from './data/clip';
import { loadProgress, recordTask, isUnlocked, canUnlock, unlockLevel, priceOf, CURRENCY, LEVEL_BONUS, type Progress } from './progress';

import { createStore } from './storage/store';
import { flashIcon, cameraIcon, speakerIcon, bulbIcon, lockIcon, starIcon, checkIcon, closeIcon, backIcon, albumIcon } from './ui/icons';
import { isoPath, project, TW, TH, NODE_H, ROAD_H, WORLD, worldLayout } from './map/iso';
import { placeSvg } from './map/places';

type Palette = { top: string; left: string; right: string };

const root = document.getElementById('app')!;
const store = createStore();
let progress: Progress = loadProgress();
let level: Level | null = null;
let state: GameState | null = null;
let notice = '';
let view: 'album' | null = null;
const stickers = new Map<string, Sticker>();
let stickerNew: boolean | null = null; // null — наклейки нет, true — новая, false — фото обновлено
void album.all().then((all) => all.forEach((x) => stickers.set(x.id, x)));
let photoUrl = '';
let lastLabel: string | null = null;
let lastFound: string | null = null;
let lastFoundLabel: string | null = null;
let explainToken = 0;
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
  explainToken++; // ответ ИИ для прошлого экрана уже не нужен
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
  if (!isUnlocked(progress, l.id)) return showUnlock(l);
  preloadModels();
  level = l;
  state = null;
  render();
}

function startTask(task: Task) {
  preloadModels();
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
  const cap = await takePhoto(targetOf(task));
  if (!cap) return dispatch({ type: 'cancel-camera' });
  // живая камера уже вырезала предмет; иначе даём обрезать вручную или взять весь кадр
  const framed = cap.cropped ? cap.blob : await cropPhoto(cap.blob);
  if (!framed) return dispatch({ type: 'cancel-camera' });
  const wasCropped = cap.cropped || framed !== cap.blob; // вырезано автоматически или вручную
  try {
    const photo = await compressPhoto(framed);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = URL.createObjectURL(photo);
    dispatch({ type: 'photo-taken' });
    const verdict = await verifyPhoto(photo, task, { cropped: wasCropped, liveClass: cap.liveClass });
    const { found, foundLabel } = verdict;
    let match = verdict.match;
    lastLabel = verdict.label ?? null;
    // Не уверены: не говорим «не то», а спрашиваем ребёнка. Лишнее «засчитано» лучше ложного отказа.
    if (!match && verdict.maybe) {
      const answer = await askConfirm(task);
      if (answer === 'closer') {
        notice = 'Покажи ещё раз, поближе!';
        return dispatch({ type: 'check-failed' });
      }
      if (answer === 'yes') {
        match = true;
        lastLabel = taskName(task);
      }
    }
    lastFound = found ?? null;
    lastFoundLabel = foundLabel ?? null;
    stickerNew = null;
    if (match) {
      try {
        const sticker: Sticker = { id: task.id, blob: await toSticker(photo), ts: Date.now() };
        stickerNew = !stickers.has(task.id);
        stickers.set(task.id, sticker);
        void album.put(sticker);
      } catch { /* без наклейки игра продолжается */ }
    }
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
    .map((i) => `<span class="star ${i <= n ? 'on' : ''}" style="--d:${i * 0.25}s">${starIcon()}</span>`).join('')}</div>`;

// Соня называет найденное: цвет для заданий на цвет, иначе предмет, который узнала модель.
function sonyaSays(task: Task): string {
  if (task.local?.kind === 'color') return `Это ${COLOR_RU[task.local.color]} цвет!`;
  return lastLabel ? `Это ${lastLabel}!` : 'Ты нашёл нужный предмет!';
}

// Соня рассказывает про предмет голосом ИИ: в запрос уходит только название, фото никуда не отправляется.
// Текст появляется под репликой, когда ответ готов; если сервер не ответил — блока просто нет.
function attachExplain(label: string | null) {
  const el = root.querySelector<HTMLElement>('#explain');
  if (!el) return;
  if (!label) { el.remove(); return; }
  const token = ++explainToken;
  el.hidden = false;
  el.innerHTML = '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="sr-only">Соня думает</span>';
  void explainObject(label).then((text) => {
    if (token !== explainToken || !el.isConnected) return; // экран уже сменился
    if (!text) { el.remove(); return; }
    el.textContent = text;
    el.classList.add('ready');
    speak(text, true, 'sonya');
  });
}

// «Найди предмет с красным цветом!» -> «предмет с красным цветом»
const goalOf = (task: Task) => task.prompt.replace(/^Найди\s+/, '').replace(/[!.]$/, '');

// Гриша объясняет, что нашёл ребёнок и что нужно искать.
function grishaExplains(task: Task): string {
  const seen = lastFound ? `${lastFound}.` : 'Это не похоже на то, что мы ищем.';
  return `${seen} Мы ищем: ${goalOf(task)}.`;
}

const wallet = () =>
  `<span class="chip coin" role="button" tabindex="0" aria-label="Вспышек: ${progress.flashes}. Нажми, чтобы узнать, что это такое">${flashIcon()}${progress.flashes}</span>`;

// Окно «Что такое вспышки?»: открывается по нажатию на счётчик на любом экране.
function showFlashInfo() {
  if (document.querySelector('.modal-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'fh-title');
  overlay.innerHTML = `<div class="modal">
    ${art('sonya-cheer', 'small')}
    <h2 id="fh-title">Что такое вспышки?</h2>
    <p class="fh-balance">${flashIcon()}У тебя ${progress.flashes}</p>
    <ul class="fh-list">
      <li>Вспышки — награда за каждый найденный предмет.</li>
      <li>Нашёл с первой попытки — 3 вспышки, со второй — 2, с третьей — 1.</li>
      <li>Нашёл всё в категории — ещё ${LEVEL_BONUS} вспышек в подарок.</li>
      <li>На вспышки открываются новые места: кухня, комната, школа и другие.</li>
    </ul>
    <button class="fh-ok secondary" type="button">Понятно</button>
  </div>`;
  document.body.appendChild(overlay);
  const close = () => { overlay.remove(); removeEventListener('keydown', onKey); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', onKey);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.fh-ok')!.addEventListener('click', close);
  overlay.querySelector<HTMLElement>('.fh-ok')!.focus();
}
document.addEventListener('click', (e) => { if ((e.target as Element).closest('.chip.coin')) showFlashInfo(); });
document.addEventListener('keydown', (e) => {
  const t = e.target as Element;
  if ((e.key === 'Enter' || e.key === ' ') && t.matches?.('.chip.coin')) { e.preventDefault(); showFlashInfo(); }
});

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
  speak(slide.text, false, slide.who === 'Соня' ? 'sonya' : 'grisha');
  const done = () => { markOnboarded(); speechSynthesis?.cancel(); renderLevels(); };
  on('onext', () => (last ? done() : renderOnboarding(i + 1)));
  on('oskip', done);
}

// Круглый прогресс места: сколько заданий найдено; когда все — зелёный круг с галочкой.
function progressRing(l: Level): string {
  const total = l.tasks.length;
  const found = l.tasks.filter((t) => progress.found[t.id] !== undefined).length;
  if (found === 0) return `<span class="cube-ring" aria-hidden="true"><svg viewBox="0 0 44 44"><circle class="ring-track" cx="22" cy="22" r="17"/></svg><b>0/${total}</b></span>`;
  const full = found >= total;
  const pct = Math.round((found / total) * 100);
  return `<span class="cube-ring ${full ? 'full' : ''}" aria-hidden="true">
    <svg viewBox="0 0 44 44"><circle class="ring-track" cx="22" cy="22" r="17"/>
    <circle class="ring-arc" cx="22" cy="22" r="17" pathLength="100" style="--pct:${pct}" transform="rotate(-90 22 22)"/></svg>
    ${full ? checkIcon() : `<b>${found}/${total}</b>`}</span>`;
}

function renderLevels() {
  const { W, H, items } = worldLayout(LEVELS.length);
  const cubes = LEVELS.map((l, i) => {
    const p = progress.levels[l.id];
    const it = items[i];
    const locked = !isUnlocked(progress, l.id);
    const badge = locked
      ? `<span class="cube-lock" aria-hidden="true">${lockIcon()}</span><span class="cube-price" aria-hidden="true">${flashIcon()}${priceOf(l.id)}</span>`
      : progressRing(l);
    return `<button class="cube-btn ${p?.passed ? 'done' : ''} ${locked ? 'locked' : ''}" data-i="${i}"
      aria-label="${l.title}${locked ? `, закрыто, стоит ${priceOf(l.id)} вспышек` : `, найдено ${l.tasks.filter((t) => progress.found[t.id] !== undefined).length} из ${l.tasks.length}`}"
      style="left:${(it.cx / W) * 100}%;top:${(it.top / H) * 100}%;width:${(WORLD.CUBE_W / W) * 100}%;--i:${i};--ph:${(i * 0.7).toFixed(1)}s">
      <span class="cube-in"><span class="cube-float">${placeSvg(l.id)}${badge}
      <span class="cube-label">${l.title}</span></span></span>
    </button>`;
  }).join('');
  show(`${hud('<button id="howto" class="secondary small" aria-label="Как играть">?</button>', '', '', `<button id="album" class="secondary small" aria-label="Мои находки">${albumIcon()}</button>`)}
    ${art('jet-1')}<h1>Покажи нам мир!</h1><p>Выбери, что показать Грише и Соне</p>
    <div class="world" style="aspect-ratio:${W} / ${H.toFixed(0)}">${cubes}</div>`, 'screen-menu');
  root.querySelectorAll<HTMLButtonElement>('.cube-btn').forEach((b) =>
    b.addEventListener('click', () => startLevel(LEVELS[Number(b.dataset.i)])),
  );
  on('howto', () => renderOnboarding());
  on('album', openAlbum);
}


// Экран «не уверен»: фото почти подошло, спрашиваем ребёнка. «Нет» — обычный отказ, «ближе» — снять ещё раз без штрафа.
function askConfirm(task: Task): Promise<'yes' | 'no' | 'closer'> {
  return new Promise((resolve) => {
    const q = `Это правда ${taskName(task)}?`;
    show(`${hud(`<button id="menu" class="secondary small" aria-label="К заданиям">${closeIcon()}</button>`)}
      ${art('sonya-wave', 'talking')}${bubble(q)}
      <img class="preview mini" src="${photoUrl}" alt="">
      <button id="cf-yes" class="green">Да</button>
      <button id="cf-no" class="secondary">Нет</button>
      <button id="cf-closer" class="secondary">${cameraIcon()}Снять ближе</button>`);
    speak(q, false, 'sonya');
    on('cf-yes', () => resolve('yes'));
    on('cf-no', () => resolve('no'));
    on('cf-closer', () => resolve('closer'));
    on('menu', toMap);
  });
}

// Название предмета задания в именительном падеже для подписи наклейки.
function taskName(t: Task): string {
  if (t.local?.kind === 'color') return `${COLOR_RU[t.local.color]} цвет`;
  if (t.local?.kind === 'labels' && t.local.clip) return CLIP_OBJECTS[t.local.clip] ?? goalOf(t);
  return goalOf(t);
}

const openAlbum = () => { view = 'album'; render(); };
const closeAlbum = () => { goBack(); view = null; render(); };

let albumUrls = new Map<string, string>();

async function renderAlbum() {
  const all = await album.all().catch(() => [] as Sticker[]);
  all.forEach((x) => stickers.set(x.id, x));
  albumUrls.forEach((u) => URL.revokeObjectURL(u));
  const urls = new Map<string, string>();
  albumUrls = urls;
  const total = LEVELS.reduce((n, l) => n + l.tasks.length, 0);
  const have = LEVELS.reduce((n, l) => n + l.tasks.filter((t) => stickers.has(t.id)).length, 0);
  let k = 0;
  const sections = LEVELS.map((l) => {
    const cards = l.tasks.map((t) => {
      const st = stickers.get(t.id);
      const tilt = (((k++ * 37) % 7) - 3) * 1.1;
      if (!st) return `<div class="sticker empty" style="--tilt:${tilt}deg"><span class="q">?</span><small>${esc(taskName(t))}</small></div>`;
      const url = URL.createObjectURL(st.blob);
      urls.set(t.id, url);
      return `<button class="sticker" data-t="${t.id}" style="--tilt:${tilt}deg;--i:${k}" aria-label="${esc(taskName(t))}"><img src="${url}" alt=""><small>${esc(taskName(t))}</small></button>`;
    }).join('');
    const got = l.tasks.filter((t) => stickers.has(t.id)).length;
    return `<section class="album-sec"><h2>${l.title}<span>${got}/${l.tasks.length}</span></h2><div class="album-grid">${cards}</div></section>`;
  }).join('');
  show(`${hud(`<button id="back" class="secondary small" aria-label="Назад">${backIcon()}</button>`)}
    <h1>Мои находки</h1><p>Найдено ${have} из ${total}</p>
    <div class="album">${have === 0 ? '<p class="album-empty">Находи предметы, и они появятся здесь!</p>' : ''}${sections}
    <p class="album-note">Фото хранятся только на этом устройстве.</p></div>`, 'screen-album');
  on('back', closeAlbum);
  root.querySelectorAll<HTMLButtonElement>('.sticker[data-t]').forEach((b) =>
    b.addEventListener('click', () => {
      const t = LEVELS.flatMap((l) => l.tasks).find((x) => x.id === b.dataset.t)!;
      showSticker(t, urls.get(t.id)!);
    }),
  );
}

// Крупная наклейка: фото, название, звёзды; фото можно удалить.
function showSticker(t: Task, url: string) {
  if (document.querySelector('.modal-overlay')) return;
  const stars = progress.found[t.id] ?? 0;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', taskName(t));
  overlay.innerHTML = `<div class="modal sticker-modal">
    <img class="sticker-big" src="${url}" alt="">
    <h2>${esc(taskName(t))}</h2>
    ${stars ? starRow(stars) : ''}
    <button class="st-ok" type="button">Закрыть</button>
    <button class="st-del secondary" type="button">Удалить фото</button>
  </div>`;
  document.body.appendChild(overlay);
  const close = () => { overlay.remove(); removeEventListener('keydown', onKey); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', onKey);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.st-ok')!.addEventListener('click', close);
  overlay.querySelector('.st-del')!.addEventListener('click', async () => {
    stickers.delete(t.id);
    await album.remove(t.id).catch(() => {});
    close();
    render();
  });
  overlay.querySelector<HTMLElement>('.st-ok')!.focus();
}

// Окно покупки места: открыть за вспышки или подсказать, сколько не хватает.
function showUnlock(l: Level) {
  if (document.querySelector('.modal-overlay')) return;
  const price = priceOf(l.id);
  const ok = canUnlock(progress, l.id);
  const missing = price - progress.flashes;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'ul-title');
  overlay.innerHTML = `<div class="modal">
    <div class="modal-place">${placeSvg(l.id)}</div>
    <h2 id="ul-title">${ok ? `Открыть «${l.title}»?` : `«${l.title}» пока закрыто`}</h2>
    <p class="fh-balance">${flashIcon()}У тебя ${progress.flashes}, нужно ${price}</p>
    <p class="modal-text">${ok
      ? `Это место стоит ${price} вспышек. Там ${l.tasks.length} новых заданий.`
      : `Не хватает ${missing} вспышек. Находи предметы в открытых местах, и вспышки накопятся!`}</p>
    ${ok ? `<button class="ul-buy" type="button">${flashIcon()}Открыть за ${price}</button>` : ''}
    <button class="ul-cancel secondary" type="button">${ok ? 'Не сейчас' : 'Понятно'}</button>
  </div>`;
  document.body.appendChild(overlay);
  const close = () => { overlay.remove(); removeEventListener('keydown', onKey); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', onKey);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.ul-cancel')!.addEventListener('click', close);
  overlay.querySelector('.ul-buy')?.addEventListener('click', () => {
    progress = unlockLevel(progress, l.id);
    void store.save(progress);
    close();
    playSuccess();
    confetti(1400);
    startLevel(l);
  });
  overlay.querySelector<HTMLElement>(ok ? '.ul-buy' : '.ul-cancel')!.focus();
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
      style="left:${((p.sx - minX) / W) * 100}%;top:${((p.sy - NODE_H - minY) / H) * 100}%;--i:${i}">${done ? checkIcon() : i + 1}</button>`;
  }).join('');

  const np = pos.find((q) => q.node === (next < 0 ? 0 : next))!;
  const found = l.tasks.filter((t) => progress.found[t.id] !== undefined).length;
  show(`${hud(`<button id="back" class="secondary small" aria-label="Назад">${backIcon()}</button>`)}
    <h1>${l.title}</h1><p>Найдено: ${found} из ${n}</p>
    <div class="map" style="aspect-ratio:${W.toFixed(1)} / ${H.toFixed(1)};--w:${W.toFixed(0)}">
      <svg viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" aria-hidden="true">${tiles}</svg>${nodes}
    </div>`, 'screen-map');
  root.querySelectorAll<HTMLButtonElement>('.stop').forEach((b) =>
    b.addEventListener('click', () => startTask(l.tasks[Number(b.dataset.i)])),
  );
  on('back', toMenu);
}

function renderLevelDone() {
  show(`${hud('')}<div class="duo">${art('grisha-cheer', 'cheer')}${art('sonya-cheer', 'cheer')}</div><h1>Все найдено!</h1>
    <p>Ты справился со всей категорией «${level!.title}»</p>
    <div class="reward">${flashIcon()}бонус +${LEVEL_BONUS}</div>
    <button id="map" class="green">К заданиям</button>`);
  confetti(2200);
  on('map', toMap);
}

function render() {
  if (view === 'album') return renderAlbum();
  if (!level) return isOnboarded() ? renderLevels() : renderOnboarding();
  if (!state) return renderMap(level);
  const s = state;
  const task = currentTask(s);
  const bar = hud(`<button id="menu" class="secondary small" aria-label="К заданиям">${closeIcon()}</button>`);
  switch (s.phase) {
    case 'task':
    case 'camera': {
      const hint = s.attempts > 0 && task!.hint ? `<div class="hint">${bulbIcon()}<span>${task!.hint}</span></div>` : '';
      show(`${bar}${art('grisha-cheer', 'talking')}
        ${bubble(task!.prompt)}${hint}
        ${notice ? `<div class="notice">${notice}</div>` : ''}
        <button id="shoot" class="breathe">${cameraIcon()}Сфотографировать</button>
        <button id="say" class="secondary">${speakerIcon()}Повторить</button>`);
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
          <div class="explain" id="explain" hidden></div>
          ${starRow(got)}
          ${again ? '' : `<div class="reward">${flashIcon()}+${got}</div>`}
          ${stickerNew === null ? '' : `<div class="sticker-new"><img src="${photoUrl}" alt=""><span>${stickerNew ? 'Новая наклейка в альбоме!' : 'Фото в альбоме обновлено'}</span></div>`}
          <button id="next" class="green">Дальше</button>`, 'ok');
        confetti();
        speak(`${says} Молодец!`, false, 'sonya');
        attachExplain(task!.local?.kind === 'color' ? `${COLOR_RU[task!.local.color]} цвет` : lastLabel);
      } else if (canSkip(s)) {
        show(`${bar}${art('sonya-sad', 'sad shake talking')}<div class="banner no">Это сложное задание</div>
          ${photoUrl ? `<img class="preview mini" src="${photoUrl}" alt="">` : ''}
          ${bubble(`${grishaExplains(task!)} Давай попробуем другое!`)}
          <div class="explain" id="explain" hidden></div><button id="next">Дальше</button>`);
        speak(grishaExplains(task!));
        attachExplain(lastFoundLabel);
      } else {
        const left = MAX_ATTEMPTS - s.attempts;
        show(`${bar}${art('sonya-sad', 'sad shake talking')}<div class="banner no">Пока не то</div>
          ${photoUrl ? `<img class="preview mini" src="${photoUrl}" alt="">` : ''}
          ${bubble(grishaExplains(task!))}
          <div class="explain" id="explain" hidden></div>
          <p>Осталось попыток: ${left}</p><button id="next">Искать снова</button>`);
        speak(grishaExplains(task!));
        attachExplain(lastFoundLabel);
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
  // Перерисовываем только карту и меню: онбординг и игру не сбрасываем.
  if (!state && /screen-(menu|map)/.test(root.className)) render();
});

// Готовим умное зрение заранее, пока ребёнок смотрит главный экран: к камере модели уже загружены.
setTimeout(preloadModels, 600);

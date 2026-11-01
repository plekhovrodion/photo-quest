import './style.css';
import { LEVELS, ICON_INDEX, ICON_ABS, type Level, type Task } from './data/tasks';
import { createGame, currentTask, reduce, STARS_PER_TASK, type Action, type GameState } from './game/state';
import { PRAISE, INTRO_EN, TRY_AGAIN, TROUBLE, LEVEL_DONE, LOCKED_HINT, TASK_LOCKED, TASK_AIM, NEXT_HINT, levelUpText, type Phrase, HINT_PLACE, HINT_ITEM, HINT_COLOR, pickPhrase } from './data/phrases';
import { takePhoto, compressPhoto, stopCamera, type Captured } from './camera/capture';
import { onCameraPromptClosed } from './camera/prepermission';
import { targetOf } from './camera/target';
import { ensureModelsLoaded } from './ui/loading';
import { verifyPhoto } from './api/verify';
import { COLOR_RU } from './vision/names';
import { englishFor } from './data/english';
import { preloadModels, heavyModelsAllowed } from './vision/models';
import { confetti, confettiBehind } from './fx/confetti';
import { typeText, stopTyping } from './fx/typewriter';
import { speak, speakEnglish, stopSpeech, isMuted, setMuted } from './audio/sounds';
import { hasRoom, roomHtml, mountPets, unmountPets, type Mood } from './ui/pets';
import { canAfford, claimFound, getBeads } from './api/economy';
import { showNotice } from './ui/notice';
import { locPattern } from './ui/locPattern';
import { showPaywall } from './ui/paywall';
import { paywallUrl } from './api/paywall';
import { playSfx, wireSfx, startSfxLoad } from './audio/sfx';
import { wireMusic, startMusicLoad } from './audio/music';
import { bootFirstStep, bootSecondStep } from './ui/boot';
import { SLIDES, isOnboarded, markOnboarded } from './onboarding';
import { feed, setLook, stageOf, fedOf, lookOf, ZAVRIKS, ZAVRIK_NAME, HUES, HATS, BADGES, UNLOCK_STAGE, UNLOCK_ALL, MAX_STAGE, zavrikOfArt, type ZavrikId } from './zavrik';
import { hatSvg, badgeSvg } from './ui/accessories';
import { objectSvg, colorBallSvg, fitObject } from './map/objects';
import { album, toSticker, type Sticker } from './album';
import { CLIP_OBJECTS } from './data/clip';
import { loadProgress, recordTask, LEVEL_BONUS, type Progress } from './progress';
import { createStore } from './storage/store';
import { flashIcon, lockIcon, checkIcon, backIcon } from './ui/icons';
import { placeSvg } from './map/places';
import { mapDecor } from './ui/mapDecor';

const root = document.getElementById('app')!;
const store = createStore();
let progress: Progress = loadProgress();
let level: Level | null = null;
let state: GameState | null = null;
let notice = '';
let view: 'album' | 'zavrik' | null = null;
let zv: ZavrikId = 'sonya';
const stickers = new Map<string, Sticker>();
void album.all().then((all) => all.forEach((x) => stickers.set(x.id, x)));
let photoUrl = '';
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

// Знакомство с завриками пока выключено: сразу открывается главная. Включить: true.
const ONBOARDING = false;
// Цвет «рамки» браузера: статус-бар сверху и область под панелью снизу окрашиваем под экран.
// Сверху цвет шапки места, снизу цвет фона под карточками; фон страницы делится пополам, чтобы совпало и при оттяжке.
function setChrome(cls: string) {
  let top = '#471fb0', bottom = '#471fb0';
  if (cls.includes('screen-loc') && level) { const c = LOC_COLORS[level.id] ?? LOC_COLORS.kitchen; top = c.head; bottom = c.bg; }
  else if (cls.includes('screen-map')) { top = '#d9c8ff'; bottom = '#8a5eff'; }
  const bg = `linear-gradient(${top} 50%, ${bottom} 50%)`;
  document.documentElement.style.background = bg;
  document.body.style.background = bg;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', top);
}

let quietNext = false;
let lastShown = ''; // что нарисовано сейчас: если экран перерисовывается тем же (например, возврат с камеры), он не листается заново
let screenSeq = 0;
function show(html: string, cls = '') {
  stopCamera(); // экран перерисовывается: живая камера прежнего экрана закрывается
  stopTyping();
  const dir = navDir;
  navDir = 'fwd';
  const quiet = quietNext; // перерисовка внутри экрана без перелистывания
  quietNext = false;
  const same = lastShown === `${cls}|${html}`;
  if (!quiet && !same) { screenSeq++; stopSpeech(); } // новый экран: прежняя озвучка и её отложенные запуски не должны накладываться
  lastShown = `${cls}|${html}`;
  root.className = quiet || same ? `${cls} quiet` : `${cls} go-${dir}`.trim(); // тот же экран заново (возврат с камеры) не листается
  setChrome(cls);
  unmountPets();
  root.innerHTML = html;
  mountPets(root);
  setTimeout(() => root.classList.remove('go-fwd', 'go-back'), 800);
  root.querySelectorAll<SVGSVGElement>('svg.obj3d').forEach(fitObject);
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
  if (!isUnlocked(l)) return; // закрытое место не открываем даже напрямую
  setTimeout(() => preloadModels(), 900); // тяжёлые модели грузим после перехода, чтобы экран открывался сразу
  level = l;
  state = null;
  render();
}

// Следующее ненайденное задание места после текущего (по кругу); null, если найдено всё.
function nextTaskAfter(l: Level, cur: Task): Task | null {
  const i = l.tasks.indexOf(cur), n = l.tasks.length;
  for (let k = 1; k < n; k++) { const t = l.tasks[(i + k) % n]; if (progress.found[t.id] === undefined) return t; }
  return null;
}

let promptSpoken: string | null = null;
function startTask(task: Task) {
  if (!canAfford(progress.found[task.id] !== undefined)) { void showNoBeads(); return; }
  promptSpoken = null;
  recorded = null; // новое прохождение задания: прежний итог не переиспользуем
  setTimeout(() => preloadModels(), 900);
  state = createGame([task]);
  render();
}

// Бусины закончились: новое задание не открыть, найденные доступны. Если подключён пейвол, предлагаем полный доступ.
async function showNoBeads(): Promise<void> {
  const text = 'Найденные ты можешь пройти снова.';
  if (!paywallUrl()) { await showNotice({ title: 'Бусины закончились', text, button: 'Понятно' }); return; }
  const answer = await showNotice({ title: 'Бусины закончились', text, button: 'Открыть полный доступ', second: 'Понятно' });
  if (answer === 'main') await showPaywall();
}

// Сохраняет награду за найденное задание; возвращает, закрыта ли категория целиком.
// Вызывается сразу, как только показан успех (иначе находка терялась, если уйти стрелкой «назад»),
// повторный вызов для того же задания ничего не меняет и отдаёт прежний результат.
let recorded: { id: string; levelDone: boolean } | null = null;
function finishTask(): boolean {
  const s = state!;
  if (s.score === 0) return false;
  const id = s.tasks[0].id;
  if (recorded?.id === id) return recorded.levelDone;
  const res = recordTask(progress, level!, id, s.stars);
  progress = res.progress;
  void store.save(progress);
  recorded = { id, levelDone: res.levelDone };
  return res.levelDone;
}

// Живая камера открыта прямо на экране задания, кнопки нет: предмет узнан — камера снимает сама.
// Если камеру не включили (отказ, нет https), возвращаем к заданиям места.
let camOn = false;
// Окно «Разреши доступ к камере» перебивает озвучку задания: после него говорим задание заново (если ребёнок всё ещё на этом экране).
let sayCurrentTask: (() => void) | null = null;
onCameraPromptClosed(() => { if (state?.phase === 'task') setTimeout(() => sayCurrentTask?.(), 250); });
async function openCamera(task: Task) {
  const host = root.querySelector<HTMLElement>('#tkcam');
  if (!host) return;
  camOn = true;
  const target = targetOf(task);
  // Нейросети (~100 МБ) могли не успеть загрузиться: показываем «Загружаем игру» с полоской и только потом включаем камеру
  if (target.words?.length || !target.color) await ensureModelsLoaded();
  if (!host.isConnected) { camOn = false; return; } // пока грузилось, ребёнок ушёл с экрана
  void takePhoto(target, host).then((cap) => {
    camOn = false;
    if (!cap) {
      if (!host.isConnected) return;
      toMap(); // камеры нет (отказ, нет https): играть нечем, возвращаем ребёнка к заданиям места
      return;
    }
    void processCapture(task, cap);
  });
}

async function processCapture(task: Task, cap: Captured) {
  dispatch({ type: 'start-camera' });
  // живая камера уже вырезала предмет или отдала целый кадр
  const wasCropped = cap.cropped;
  try {
    const photo = await compressPhoto(cap.blob);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = URL.createObjectURL(photo);
    dispatch({ type: 'photo-taken' });
    const verdict = await verifyPhoto(photo, task, { cropped: wasCropped, liveClass: cap.liveClass, liveClip: cap.liveClip });
    let match = verdict.match;
    // Почти подошло: не переспрашиваем ребёнка и не отказываем, а засчитываем и называем предмет по заданию.
    if (!match && verdict.maybe) {
      match = true;
    }
    if (match) {
      try {
        const sticker: Sticker = { id: task.id, blob: await toSticker(photo), ts: Date.now() };
        stickers.set(task.id, sticker);
        void album.put(sticker);
      } catch { /* без наклейки игра продолжается */ }
    }
    if (match) {
      // Находка засчитывается на сервере (там же списываются бусины): не хватило, значит задание не засчитано
      const claim = await claimFound(task.id, STARS_PER_TASK);
      if (claim === 'insufficient') {
        notice = 'no-beads'; // не повторяем озвучку задания при возврате на экран
        dispatch({ type: 'check-failed' });
        void showNoBeads();
        return;
      }
    }
    dispatch({ type: 'verified', match });
  } catch {
    const trouble = pickPhrase(TROUBLE);
    notice = trouble.text;
    speak(trouble.text, false, trouble.who);
    if (state!.phase === 'camera') dispatch({ type: 'cancel-camera' });
    else dispatch({ type: 'check-failed' });
  }
}


// Картинки заврёнков Гриши и Сони (Figma «Иллюстрации. Гриша и Соня. Заврики»).
const art = (name: string, cls = '') =>
  `<img class="char ${cls}" src="${import.meta.env.BASE_URL}art/${name}.svg" alt="" aria-hidden="true" style="--hue:${lookOf(progress, zavrikOfArt(name)).hue}deg">`;

// «Найди предмет с красным цветом» -> «предмет с красным цветом»
const goalOf = (task: Task) => task.prompt.replace(/^Найди\s+/, '').replace(/[!.]$/, '');

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
      <li>За каждый найденный предмет — 3 вспышки.</li>
      <li>Нашёл всё в категории — ещё ${LEVEL_BONUS} вспышек в подарок.</li>
      <li>Вспышками можно кормить Гришу и Соню: они растут, меняют цвет и получают шапки и значки.</li>
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
  const pic = slide.obj === 'ball-red' ? colorBallSvg(COLOR_CSS.red) : slide.obj ? objectSvg(slide.obj) : '';
  show(`${art(slide.art, 'talking')}${pic ? `<div class="task-card ob-card">${pic}</div>` : ''}<div class="who">${slide.who}</div>${bubble(slide.text)}
    <div class="dots">${dots}</div>
    <button id="onext" class="green">${last ? 'Поехали!' : 'Дальше'}</button>
    ${last ? '' : '<button id="oskip" class="secondary">Пропустить</button>'}`);
  speak(slide.text, false, slide.who === 'Соня' ? 'sonya' : 'grisha');
  const done = () => { markOnboarded(); stopSpeech(); renderLevels(); };
  on('onext', () => (last ? done() : renderOnboarding(i + 1)));
  on('oskip', done);
}

// Главная по макету: карта-дорожка из мест, плитки идут зигзагом, у каждой своя полоса прогресса; красная «Играть» прибита к низу.
// Закрыто: качаем плашку и подсказываем голосом, что сначала нужно пройти предыдущее.
function shakeLocked(b: HTMLElement, list: Phrase[]) {
  b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
  const line = pickPhrase(list);
  speak(line.text, false, line.who);
}
let targetPlace: Level | undefined; // место, которое пульсирует
function mapTile(l: Level, i: number): string {
  const total = l.tasks.length;
  const found = l.tasks.filter((t) => progress.found[t.id] !== undefined).length;
  const pct = total ? Math.round((found / total) * 100) : 0;
  const full = total > 0 && found >= total;
  const locked = !isUnlocked(l);
  const target = !locked && !full && l === targetPlace;
  return `<button class="mp-tile ${i % 2 ? 'right' : 'left'}${full ? ' done' : ''}${locked ? ' locked' : ''}${target ? ' pulse' : ''}" role="listitem" data-i="${i}" style="--i:${i}" ${locked ? 'aria-disabled="true"' : ''} aria-label="${l.title}: найдено ${found} из ${total}${full ? ', всё найдено' : ''}${locked ? ', закрыто: сначала пройди предыдущее место' : ''}">
    <span class="mp-win is-room">${roomHtml(l.id, true, 'head-', full ? 'happy-loop' : 'sad-loop')}</span>${full ? `<img class="loc-check mp-check" src="${LOC_BASE()}/check.svg" alt="">` : ''}
    <span class="mp-track" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${found}"><span class="loc-fill" style="--w:${pct}%;background-image:url(${LOC_BASE()}/stripe-a.svg)"></span></span></button>`;
}

// Дорожка между плитками: от центра плитки вниз, широкая плавная петля на другую сторону и вниз к следующей. Рисуется под плитками.
// При первом показе «прорисовывается» маской сверху вниз; пересчёт при смене размера анимацию не повторяет.
function drawRoad(road: HTMLElement) {
  const pts = Array.from(road.querySelectorAll<HTMLElement>('.mp-tile')).map((t) => [t.offsetLeft + t.offsetWidth / 2, t.offsetTop + t.offsetHeight / 2]);
  if (pts.length < 2) return;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1], [qx, qy] = pts[i], my = (py + qy) / 2;
    const r = Math.min(56, Math.abs(qx - px) / 2, (qy - py) / 2), dir = qx > px ? 1 : -1;
    d += `L${px} ${my - r}Q${px} ${my} ${px + dir * r} ${my}L${qx - dir * r} ${my}Q${qx} ${my} ${qx} ${my + r}L${qx} ${qy}`;
  }
  const animated = !road.dataset.drawn;
  road.dataset.drawn = '1';
  // Оформление: в пустой половине рядом с каждой плиткой, «стоит» на её нижней кромке
  road.querySelectorAll('.mp-decor').forEach((e) => e.remove());
  Array.from(road.querySelectorAll<HTMLElement>('.mp-tile')).forEach((t, i) => {
    const el = document.createElement('div');
    el.className = `mp-decor ${t.classList.contains('left') ? 'right' : 'left'}${animated ? '' : ' still'}`;
    el.style.cssText = `top:${t.offsetTop + t.offsetHeight}px;--i:${i}`;
    el.innerHTML = mapDecor(i);
    road.appendChild(el);
  });
  road.querySelector('.mp-path')?.remove();
  road.insertAdjacentHTML('afterbegin', `<svg class="mp-path${animated ? ' draw' : ''}" width="${road.offsetWidth}" height="${road.offsetHeight}" aria-hidden="true">
    <mask id="mp-reveal" maskUnits="userSpaceOnUse" x="-50" y="-50" width="${road.offsetWidth + 100}" height="${road.offsetHeight + 100}"><path d="${d}" class="mp-reveal" pathLength="1"/></mask>
    <g mask="url(#mp-reveal)"><path d="${d}" class="mp-lane"/><path d="${d}" class="mp-dash"/></g></svg>`);
}

// Счётчик бесплатных заданий и кнопка «Открыть доступ» на карте пока скрыты; включить: true
const SHOW_ACCESS_HUD = false;
const SHOW_BEADS_CHIP = false; // счётчик бусин в шапке карты скрыт (ограничение по бусинам при этом работает)

// Фон карты (макет Figma «01 / Кухня»): облака и холмы поверх светло-сиреневого, собираются из файлов art/map/wide.
// Две раскладки: широкая (экран от 900 px) и узкая для телефона; облака плавно плывут (класс cloud, см. style.css).
function mapBg(): string {
  const u = (n: string) => `${import.meta.env.BASE_URL}art/map/wide/${n}.svg`;
  const im = (n: string, x: number, y: number, w: number, h: number, extra = '') =>
    `<image href="${u(n)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none"${extra}/>`;
  const cloud = (n: string, x: number, y: number, w: number, h: number, k: number) => im(n, x, y, w, h, ` class="cloud" style="--k:${k}"`);
  const wide = `<svg class="mp-bg mp-bg-wide" viewBox="0 0 1438 869" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="1438" height="869" fill="#ebe0ff"/>
    ${cloud('cloud-a', 54, 36, 443.2, 230.9, 0)}${cloud('cloud-b', 794.1, 208, 178.7, 118.9, 1)}${cloud('cloud-c', 1162, 104, 218, 145, 2)}
    ${im('hills-a', -87, 404, 952.955, 675.284)}${im('hills-b', 719, 434, 824.911, 502.014)}
    ${im('hills-c', -216.24, 710.71, 1789.961, 405.527, ' transform="translate(678.74 913.47) scale(-1 1) translate(-678.74 -913.47)"')}</svg>`;
  const tall = `<svg class="mp-bg mp-bg-tall" viewBox="0 0 390 844" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><rect width="390" height="844" fill="#ebe0ff"/>
    ${cloud('cloud-a', -60, -6, 222, 116, 0)}${cloud('cloud-b', 250, 190, 107, 71, 1)}${cloud('cloud-c', 236, -10, 130, 87, 2)}
    ${im('hills-a', -140, 600, 560, 397)}${im('hills-b', 200, 640, 460, 280)}
    ${im('hills-c', -330, 770, 1050, 238, ' transform="translate(195 889) scale(-1 1) translate(-195 -889)"')}</svg>`;
  return wide + tall;
}

// Голосовая подсказка при входе на экран: говорим, только если ребёнок всё ещё на нём (sel есть на экране).
function sayHint(sel: string, list: Phrase[]) {
  const line = pickPhrase(list);
  const seq = screenSeq;
  setTimeout(() => { if (seq === screenSeq && root.querySelector(sel)) speak(line.text, false, line.who); }, 600);
}

function renderLevels() {
  const base = LOC_BASE();
  const b = getBeads();
  // Баланс бусин и сколько новых заданий ещё бесплатно: только если оплата включена и баланс известен (у премиума и без кошелька его нет)
  const paid = b.cost > 0 && b.remaining !== undefined;
  const free = paid ? Math.floor(b.remaining! / b.cost) : 0;
  const beadsChip = SHOW_BEADS_CHIP && paid
    ? (paywallUrl()
      ? `<button id="beads" class="mp-chip mp-beads" aria-label="Бусин: ${b.remaining}. Открыть доступ"><i class="bead" aria-hidden="true"></i><b>${b.remaining}</b></button>` // клик по бусинам открывает пейвол
      : `<div class="mp-chip mp-beads" role="status" aria-label="Бусин: ${b.remaining}"><i class="bead" aria-hidden="true"></i><b>${b.remaining}</b></div>`) : '';
  const freeChip = SHOW_ACCESS_HUD && paid
    ? `<div class="mp-chip mp-free" role="status" aria-label="Бесплатных заданий: ${free}"><b>${free}</b><span>бесплатных заданий</span></div>` : '';
  const accessBtn = SHOW_ACCESS_HUD && paywallUrl() ? '<button id="access" class="mp-access">Открыть доступ</button>' : '';
  const hud = `${beadsChip ? `<div class="mp-hud">${beadsChip}</div>` : ''}${freeChip || accessBtn ? `<div class="mp-hud mp-hud2">${freeChip}${accessBtn}</div>` : ''}`;
  const places = MAP_ORDER.map((id) => LEVELS.find((l) => l.id === id)).filter((l): l is Level => !!l);
  const next = places.find((l) => !levelFull(l)) ?? places[0]; // первое непройденное место: оно всегда открыто
  targetPlace = places.find((l) => !levelFull(l));
  const tool = (id: string, icon: string, label: string) => `<button id="${id}" class="loc-btn" aria-label="${label}"><i class="loc-i" style="--m:url(${base}/${icon}.svg)"></i></button>`;
  show(`<div class="loc mp">${mapBg()}<header class="mp-head"><div class="mp-strip" aria-hidden="true">${['mirror', '', 'mirror'].map((c) => `<img class="mp-art ${c}" src="${import.meta.env.BASE_URL}art/map/header.svg" alt="">`).join('')}</div>
      ${hud}
      <button id="back" class="loc-btn" aria-label="На главную Учи"><i class="loc-i" style="--m:url(${base}/back.svg)"></i></button>
      <div class="loc-tools">${tool('snd', 'sound', isMuted() ? 'Включить звук' : 'Выключить звук')}${tool('fs', 'fullscreen', 'На весь экран')}</div></header>
    <main class="loc-body"><div class="mp-road" role="list" aria-label="Места">${places.map(mapTile).join('')}</div></main>
    ${paywallUrl() ? '<button id="buy" class="mp-buy">Купить игру</button>' : ''}
    ${bigBtn('play', playIcon(), 'Играть', false)}</div>`, `screen-loc screen-map${isMuted() ? ' muted' : ''}`);
  root.querySelectorAll<HTMLButtonElement>('.mp-tile').forEach((b) => b.addEventListener('click', () => {
    const pl = places[Number(b.dataset.i)];
    if (isUnlocked(pl)) return startLevel(pl);
    shakeLocked(b, LOCKED_HINT);
  }));
  on('play', () => startLevel(next));
  sayHint('.mp-road', HINT_PLACE);
  on('access', () => { void showPaywall(); });
  on('buy', () => { void showPaywall(); });
  root.querySelector('#beads')?.addEventListener('click', () => { void showPaywall(); });
  on('back', () => location.assign('/')); // из игры на главную Учи (тот же хост, корень сайта)
  wireLocTools();
  const road = root.querySelector<HTMLElement>('.mp-road')!;
  drawRoad(road);
  // Перерисовка только при смене размера (первый вызов наблюдателя пропускаем, иначе он оборвёт анимацию)
  let w = road.offsetWidth, h = road.offsetHeight;
  new ResizeObserver(() => { if (road.offsetWidth !== w || road.offsetHeight !== h) { w = road.offsetWidth; h = road.offsetHeight; drawRoad(road); } }).observe(road);
}

// Экран «Заврики»: кормим вспышками, растим, одеваем.
const ZV_ART: Record<ZavrikId, string> = { grisha: 'jet-2', sonya: 'sonya-wave' };
const STAGE_TITLE = ['Малыш', 'Подросток', 'Смельчак', 'Герой', 'Легенда'];

function renderZavrik(quiet = false) {
  quietNext = quiet;
  const id = zv;
  const fed = fedOf(progress, id);
  const st = stageOf(fed);
  const stg = UNLOCK_ALL ? MAX_STAGE : st.stage; // для замков внешнего вида
  const look = lookOf(progress, id);
  const pct = st.need ? Math.round((st.into / st.need) * 100) : 100;
  const tabs = ZAVRIKS.map((z) => `<button class="zv-tab ${z === id ? 'on' : ''}" data-z="${z}" aria-pressed="${z === id}">${ZAVRIK_NAME[z]}<small>ур. ${stageOf(fedOf(progress, z)).stage}</small></button>`).join('');
  const lock = (need: number) => `<span class="zv-lock">${lockIcon()}ур. ${need}</span>`;
  const chip = (kind: string, val: string, on: boolean, ok: boolean, inner: string, label: string) =>
    `<button class="zv-chip ${on ? 'on' : ''}" data-k="${kind}" data-v="${val}" ${ok ? '' : 'disabled'} aria-label="${label}${ok ? '' : ', закрыто'}" aria-pressed="${on}">${inner}</button>`;
  const hues = HUES.map((h) => chip('hue', String(h), look.hue === h, stg >= UNLOCK_STAGE.color,
    `<span class="zv-dot" style="filter:hue-rotate(${h}deg)"></span>`, 'Цвет')).join('');
  const hats = [chip('hat', '', look.hat === null, true, '—', 'Без шапки'), ...HATS.map((h) =>
    chip('hat', h.id, look.hat === h.id, stg >= h.stage, hatSvg(h.id, 'zv-mini'), h.name))].join('');
  const badges = [chip('badge', '', look.badge === null, true, '—', 'Без значка'), ...BADGES.map((b) =>
    chip('badge', b.id, look.badge === b.id, stg >= b.stage, badgeSvg(b.id, 'zv-mini'), b.name))].join('');
  const next = st.need ? `${st.into} из ${st.need}` : 'самый большой';
  show(`${hud(`<button id="back" class="secondary small" aria-label="Назад">${backIcon()}</button>`)}
    <h1>Заврики</h1>
    <div class="zv-tabs">${tabs}</div>
    <div class="zv-stage s${st.stage}" style="--hue:${look.hue}deg;aspect-ratio:${id === 'grisha' ? '118 / 222' : '117 / 190'}">
      <img class="zv-char" src="${import.meta.env.BASE_URL}art/${ZV_ART[id]}.svg" alt="${ZAVRIK_NAME[id]}">
      ${look.hat ? hatSvg(look.hat, `acc-hat hat-${id}`) : ''}${look.badge ? badgeSvg(look.badge, `acc-badge badge-${id}`) : ''}
    </div>
    <div class="zv-info"><b>${ZAVRIK_NAME[id]}: ${STAGE_TITLE[st.stage - 1]}, уровень ${st.stage}</b>
      <div class="zv-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
      <small>${st.need ? `До следующего уровня: ${next}` : 'Выросли до самого большого уровня!'}</small></div>
    <button id="feed" class="breathe" ${progress.flashes < 1 ? 'disabled' : ''}>${flashIcon()}Покормить за 1 вспышку</button>
    <div class="zv-wardrobe">
      <div class="zv-row"><span>Цвет ${stg >= UNLOCK_STAGE.color ? '' : lock(UNLOCK_STAGE.color)}</span><div>${hues}</div></div>
      <div class="zv-row"><span>Шапка ${stg >= UNLOCK_STAGE.hat ? '' : lock(UNLOCK_STAGE.hat)}</span><div>${hats}</div></div>
      <div class="zv-row"><span>Значок ${stg >= UNLOCK_STAGE.badge ? '' : lock(UNLOCK_STAGE.badge)}</span><div>${badges}</div></div>
    </div>`, 'screen-zavrik');
  on('back', () => { goBack(); view = null; render(); });
  root.querySelectorAll<HTMLButtonElement>('.zv-tab').forEach((b) =>
    b.addEventListener('click', () => { zv = b.dataset.z as ZavrikId; renderZavrik(true); }));
  root.querySelectorAll<HTMLButtonElement>('.zv-chip:not([disabled])').forEach((b) =>
    b.addEventListener('click', () => {
      const v = b.dataset.v!;
      const patch = b.dataset.k === 'hue' ? { hue: Number(v) } : b.dataset.k === 'hat' ? { hat: v || null } : { badge: v || null };
      progress = setLook(progress, id, patch);
      void store.save(progress);
      renderZavrik(true);
    }));
  on('feed', () => {
    const res = feed(progress, id);
    if (res.progress === progress) return;
    progress = res.progress;
    void store.save(progress);
    if (res.levelUp) { confetti(1600); speak(levelUpText(ZAVRIK_NAME[id], res.levelUp), false, 'sonya'); }
    renderZavrik(true);
    const stage = root.querySelector('.zv-stage');
    stage?.classList.add('chomp');
    const spark = document.createElement('span');
    spark.className = 'zv-spark';
    spark.innerHTML = flashIcon();
    stage?.appendChild(spark);
    if (res.levelUp) {
      const t = document.createElement('div');
      t.className = 'zv-up';
      const unlock = res.levelUp === UNLOCK_STAGE.color ? 'Теперь можно менять цвет!' : res.levelUp === UNLOCK_STAGE.hat ? 'Открылись шапки!'
        : res.levelUp === UNLOCK_STAGE.badge ? 'Открылись значки!' : res.levelUp === MAX_STAGE ? 'Открылась корона!' : '';
      t.textContent = `Уровень ${res.levelUp}! ${unlock}`;
      root.appendChild(t);
      setTimeout(() => t.remove(), 3200);
    }
  });
}

// Картинка к заданию: цветное пятно для цвета, контурный значок для предмета (ребёнок, который не читает, поймёт без звука).
const COLOR_CSS: Record<string, string> = {
  red: '#e11d48', orange: '#f97316', yellow: '#facc15', green: '#22c55e', blue: '#2563eb',
  purple: '#9333ea', pink: '#ec4899', brown: '#92400e', white: '#ffffff', black: '#111827', gray: '#9ca3af',
};
function taskArt(t: Task, cls = 'obj3d'): string {
  if (t.local?.kind === 'color') return colorBallSvg(COLOR_CSS[t.local.color], cls);
  return objectSvg(t.id.replace(/^object-/, ''), cls);
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
      if (!st) return `<div class="sticker empty" style="--tilt:${tilt}deg"><span class="q">${taskArt(t, t.local?.kind === 'color' ? 'obj3d sil sil-color' : 'obj3d sil')}</span><small>${esc(taskName(t))}</small></div>`;
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
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', taskName(t));
  overlay.innerHTML = `<div class="modal sticker-modal">
    <img class="sticker-big" src="${url}" alt="">
    <h2>${esc(taskName(t))}</h2>
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

const toMenu = () => { goBack(); state = null; level = null; render(); };
const toMap = () => { goBack(); state = null; render(); };

// Экран места по макету: шапка с фоном места, полоса прогресса, сетка карточек с иконками и кнопка «играть».
// Иконки и шапки — спрайты из Figma (public/art/loc): порядок в спрайте — места по макету, внутри места — порядок заданий.
const LOC_ORDER = ['kitchen', 'colors', 'room', 'school', 'bath', 'hall', 'food', 'outdoor'];
// Порядок на главной и открытие по очереди: первым идут «Цвета», каждое следующее место открывается, когда найдено всё в предыдущем.
// (LOC_ORDER выше нельзя менять: по нему устроены спрайты иконок и шапок.)
const MAP_ORDER = ['colors', 'kitchen', 'room', 'school', 'bath', 'hall', 'food', 'outdoor'];
const levelFull = (l: Level) => l.tasks.length > 0 && l.tasks.every((t) => progress.found[t.id] !== undefined);
function isUnlocked(l: Level): boolean {
  if (UNLOCK_ALL) return true;
  const i = MAP_ORDER.indexOf(l.id);
  if (i <= 0) return true;
  const prev = LEVELS.find((x) => x.id === MAP_ORDER[i - 1]);
  return !prev || levelFull(prev);
}
// Задания, убранные из мест: в спрайте иконок их картинки остаются, поэтому индексы после них сдвигаем.
const LOC_COUNTS = [8, 10, 9, 7, 4, 5, 8, 10];
const LOC_COLORS: Record<string, { bg: string; head: string; fill: string; shadow: string; btn: string; btns: string }> = {
  kitchen: { bg: '#efe6ff', head: '#d9c8ff', fill: '#7a5ad0', shadow: '#cbb7ff', btn: '#7a5ad0', btns: '#977eda' },
  colors: { bg: '#fde9bd', head: '#ffd3e2', fill: '#ff8f0d', shadow: '#fbce6d', btn: '#ff8f0d', btns: '#ffa842' },
  room: { bg: '#ffdfc2', head: '#c3e4ff', fill: '#5779ff', shadow: '#ffb56f', btn: '#5779ff', btns: '#7c96ff' },
  school: { bg: '#ffd2b0', head: '#ffe59a', fill: '#2f6b57', shadow: '#ffa35d', btn: '#2f6b57', btns: '#5d8c7c' },
  bath: { bg: '#c7f4fd', head: '#b9ecf5', fill: '#82d0e6', shadow: '#77e4fa', btn: '#82d0e6', btns: '#9ddaeb' },
  hall: { bg: '#ffe2d8', head: '#ffc7bd', fill: '#ee7a6c', shadow: '#ffa485', btn: '#ee7a6c', btns: '#f2978c' },
  food: { bg: '#fff4d1', head: '#e6f5a6', fill: '#e069c1', shadow: '#ffe07e', btn: '#e069c1', btns: '#e78acf' },
  outdoor: { bg: '#fff1c9', head: '#c6efe6', fill: '#5fc9a8', shadow: '#ffdc76', btn: '#5fc9a8', btns: '#82d5bb' },
};

// Общая оболочка экранов места и заданий: переменные цветов места, шапка с фоном и кнопками, подключение «звука» и «на весь экран».
const LOC_BASE = () => `${import.meta.env.BASE_URL}art/loc`;
// Тот же тон, но темнее и насыщеннее: для узора фона и теней карточек
function deepen(hex: string): string {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const l = (mx + mn) / 2, sat = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return `hsl(${Math.round(h * 60)} ${Math.round(Math.min(1, sat * 1.3 + 0.1) * 100)}% ${Math.round(Math.max(0.55, l - 0.22) * 100)}%)`;
}
// Цвета стены и пола комнат из Figma: шапка места и фон под ней продолжают комнату
const ROOM_WALLS: Record<string, [string, string]> = {
  kitchen: ['#bbf0fc', '#fffbde'], colors: ['#fcf79a', '#d5ffda'], room: ['#d8dafc', '#cff1ff'], school: ['#ffd2f5', '#ffebcc'],
  bath: ['#96e6fc', '#cbffdf'], hall: ['#ffc0a5', '#ffe6aa'], food: ['#ffd97b', '#e1d7fd'], outdoor: ['#b7f5b3', '#f6eea4'],
};
function locVars(l: Level): string {
  const c = { ...(LOC_COLORS[l.id] ?? LOC_COLORS.kitchen) }, li = LOC_ORDER.indexOf(l.id);
  const rw = ROOM_WALLS[l.id];
  if (rw && hasRoom(l.id)) { c.head = rw[0]; c.bg = rw[1]; c.shadow = deepen(rw[1]); } // узор и тени карточек «тон в тон» с полом комнаты
  return `--lbg:${c.bg};--lhead:${c.head};--lfill:${c.fill};--lshadow:${c.shadow};--lbtn:${c.btn};--lbtns:${c.btns};--lpat:${locPattern(l.id, c.shadow)};--hy:${-Math.max(li, 0) * 216}px`;
}
// Частицы поверх фона места: у каждого места своя тема (пар, конфетти, звёзды, пузыри, облака).
const LOC_FX: Record<string, { kind: string; colors?: string[] }> = {
  kitchen: { kind: 'rise' }, colors: { kind: 'fall', colors: ['#ff647a', '#ffc65a', '#5ab2ff', '#7ed957', '#ff9fb8'] },
  room: { kind: 'twinkle' }, school: { kind: 'fall', colors: ['#ffffff', '#fff3b0', '#ffffff'] },
  bath: { kind: 'bubble' }, hall: { kind: 'drift' }, food: { kind: 'rise' }, outdoor: { kind: 'drift' },
};
function locFx(l: Level): string {
  const fx = LOC_FX[l.id]; if (!fx) return '';
  const n = fx.kind === 'drift' ? 4 : 9;
  const rnd = (i: number, k: number) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1; // детерминированный «случайный» разброс
  const bits = Array.from({ length: n }, (_, i) => {
    const s = fx.kind === 'drift' ? 10 + rnd(i, 1) * 10 : fx.kind === 'twinkle' ? 5 + rnd(i, 1) * 5 : 6 + rnd(i, 1) * 9;
    const c = fx.colors ? fx.colors[i % fx.colors.length] : '';
    return `<i style="--x:${(6 + (i + rnd(i, 2) * 0.8) * (88 / n)).toFixed(1)}%;--y:${(8 + rnd(i, 3) * 60).toFixed(0)}%;--s:${s.toFixed(0)}px;--t:${(fx.kind === 'drift' ? 18 + rnd(i, 4) * 12 : 3.4 + rnd(i, 4) * 3).toFixed(1)}s;--d:${(-rnd(i, 5) * 8).toFixed(1)}s;--dx:${((rnd(i, 6) - 0.5) * 40).toFixed(0)}px${c ? `;--c:${c}` : ''}"></i>`;
  }).join('');
  return `<div class="loc-fx fx-${fx.kind}" aria-hidden="true">${bits}</div>`;
}
function locHeader(l: Level, mood?: Mood): string {
  const base = LOC_BASE();
  const tool = (id: string, icon: string, label: string) => `<button id="${id}" class="loc-btn" aria-label="${label}"><i class="loc-i" style="--m:url(${base}/${icon}.svg)"></i></button>`;
  return `<header class="loc-head${hasRoom(l.id) ? ' has-room' : ''}">${hasRoom(l.id) ? `<div class="loc-art loc-room" aria-hidden="true"><img class="room-side" src="${import.meta.env.BASE_URL}art/rooms/hd-${l.id}-side.svg" alt=""><span class="room-mid">${roomHtml(l.id, true, 'hd-', mood)}</span><img class="room-side" src="${import.meta.env.BASE_URL}art/rooms/hd-${l.id}-side.svg" alt=""></div>` : `<div class="loc-art" style="background-image:url(${base}/headers.svg)" aria-hidden="true"></div>`}${locFx(l)}
    <button id="back" class="loc-btn" aria-label="Назад"><i class="loc-i" style="--m:url(${base}/back.svg)"></i></button>
    <div class="loc-tools">${tool('snd', 'sound', isMuted() ? 'Включить звук' : 'Выключить звук')}${tool('fs', 'fullscreen', 'На весь экран')}</div></header>`;
}
function wireLocTools() {
  on('snd', () => {
    setMuted(!isMuted());
    root.classList.toggle('muted', isMuted());
    root.querySelector('#snd')?.setAttribute('aria-label', isMuted() ? 'Включить звук' : 'Выключить звук');
  });
  on('fs', () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  });
}
// Иконка задания из спрайта макета (порядок: места как в LOC_ORDER, внутри — задания).
function taskIcon(l: Level, t: Task): string {
  const li = LOC_ORDER.indexOf(l.id);
  let i = l.tasks.indexOf(t);
  if (li < 0 || i < 0) return taskArt(t);
  i = ICON_INDEX[t.id] ?? i;
  const idx = ICON_ABS[t.id] ?? LOC_COUNTS.slice(0, li).reduce((a, b) => a + b, 0) + i, col = idx % 8, row = Math.floor(idx / 8);
  return `<span class="loc-ico" style="background-image:url(${LOC_BASE()}/icons.svg);background-position:${(col / 7) * 100}% ${(row / 11) * 100}%"></span>`;
}
// Экран задания: карточка + нижняя панель с одной большой кнопкой.
// Большая кнопка пульсирует: куда нажимать (на экране места не нужна, там сетка карточек).
const bigBtn = (id: string, inner: string, label: string, pulse = true) =>
  `<div class="loc-bar"><button id="${id}" class="loc-play${pulse ? ' pulse' : ''}" aria-label="${label}">${inner}</button></div>`;
function taskScreen(l: Level, card: string, extra: string, bar: string, cls: string) {
  show(`<div class="loc" style="${locVars(l)}">${locHeader(l, cls.includes('tk-bad') ? 'sad' : cls.includes('tk-ok') ? 'happy' : undefined)}<main class="loc-body tk-body"><div class="loc-box">${card}${extra}</div></main>${bar}</div>`, `screen-loc screen-tk ${cls}${isMuted() ? ' muted' : ''}`);
  wireLocTools();
  on('back', toMap);
}
const retryIcon = () => `<img src="${LOC_BASE()}/retry.svg" alt="">`;
const nextIcon = () => `<img src="${LOC_BASE()}/next.svg" alt="">`;
const playIcon = () => `<img src="${LOC_BASE()}/play.svg" alt="">`;

// Экран места по макету: шапка с фоном места, полоса прогресса, сетка карточек с иконками и кнопка «играть».
function renderMap(l: Level) {
  const base = LOC_BASE();
  const n = l.tasks.length;
  const found = l.tasks.filter((t) => progress.found[t.id] !== undefined).length;
  const nextI = l.tasks.findIndex((t) => progress.found[t.id] === undefined); // это задание пульсирует
  const cards = l.tasks.map((t, i) => {
    const done = progress.found[t.id] !== undefined;
    const locked = !UNLOCK_ALL && nextI >= 0 && i > nextI; // задания идут по порядку: следующее открывается, когда найдено предыдущее
    return `<button class="loc-card ${done ? 'done' : ''}${locked ? ' locked' : ''}${i === nextI ? ' pulse' : ''}" data-i="${i}" style="--i:${i}" ${locked ? 'aria-disabled="true"' : ''} aria-label="${taskName(t)}${done ? ', найдено' : ''}${locked ? ', закрыто: сначала найди предыдущее' : ''}">${taskIcon(l, t)}${done ? `<img class="loc-check" src="${base}/check.svg" alt="">` : ''}</button>`;
  }).join('');
  const pct = n ? Math.round((found / n) * 100) : 0;
  show(`<div class="loc" style="${locVars(l)}">${locHeader(l, n > 0 && found >= n ? 'happy-loop' : undefined)}
      <main class="loc-body"><div class="loc-box">
        <div class="loc-progress" role="progressbar" aria-label="Найдено" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${found}" aria-valuetext="${found} из ${n}"><div class="loc-track"><div class="loc-fill" style="--w:${pct}%;background-image:url(${base}/stripe-a.svg)"></div></div></div>
        <div class="loc-grid">${cards}</div>
      </div></main>
    </div>`, `screen-loc screen-places${isMuted() ? ' muted' : ''}`);
  root.querySelectorAll<HTMLButtonElement>('.loc-card').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.classList.contains('locked')) { shakeLocked(b, TASK_LOCKED); return; }
      startTask(l.tasks[Number(b.dataset.i)]);
    }),
  );
  on('back', toMenu);
  wireLocTools();
  if (found < n) sayHint('.loc-grid', l.id === 'colors' ? HINT_COLOR : HINT_ITEM); // у пройденного места подсказка не нужна
}

// Экран «Все найдено!» пока выключен: когда место пройдено, ребёнок возвращается к заданиям места и слышит только озвучку.
const SHOW_LEVEL_DONE_SCREEN = false;
function renderLevelDone() {
  playSfx('level-up');
  const doneLine = pickPhrase(LEVEL_DONE);
  if (!SHOW_LEVEL_DONE_SCREEN) {
    renderMap(level!);
    const seq = screenSeq;
    setTimeout(() => { if (seq === screenSeq) speak(doneLine.text, false, doneLine.who); }, 700); // после звука
    return;
  }
  // Комната места на весь экран, в центре большой радостный питомец; поверх заголовок и кнопки.
  const stage = hasRoom(level!.id)
    ? `<div class="done-stage">${roomHtml(level!.id, true, 'head-', 'happy-loop')}</div>`
    : `<div class="done-stage"><div class="duo">${art('grisha-cheer', 'cheer')}${art('sonya-cheer', 'cheer')}</div></div>`;
  show(`${stage}<div class="done-top"><h1>Все найдено!</h1><div class="reward">${flashIcon()}бонус +${LEVEL_BONUS}</div></div>
    <div class="done-btns"><button id="map" class="green">К заданиям</button><button id="home" class="secondary">На главную</button></div>`, 'screen-done');
  confetti(2200);
  const seq = screenSeq;
  setTimeout(() => { if (seq === screenSeq && root.querySelector('#map')) speak(doneLine.text, false, doneLine.who); }, 700); // озвучка после фанфар
  on('map', toMap);
  on('home', toMenu);
}

function render() {
  if (view === 'album') return renderAlbum();
  if (view === 'zavrik') return renderZavrik();
  if (!level) return !ONBOARDING || isOnboarded() ? renderLevels() : renderOnboarding();
  if (!state) return renderMap(level);
  const s = state;
  const task = currentTask(s);
  switch (s.phase) {
    case 'task':
    case 'camera': {
      const L = level!;
      taskScreen(L, `<section class="tk-card tk-live" id="tkcard"><div class="tk-head" id="tkhead"><span class="tk-ico">${taskIcon(L, task!)}</span><p class="tk-text">${task!.prompt}</p></div><div class="tk-cam" id="tkcam"></div></section>`,
        `${notice ? `<div class="notice">${notice}</div>` : ''}`, '', 'tk-task');
      if (s.phase === 'task') void openCamera(task!); // в фазе camera снимок уже сделан и обрабатывается
      const sayTask = () => { speak(task!.prompt); speak(TASK_AIM.text, true, TASK_AIM.who); }; // задание и следом «наведи камеру»
      sayCurrentTask = s.phase === 'task' ? sayTask : null;
      root.querySelector('#tkhead')?.addEventListener('click', sayTask); // нажатие на задание повторяет его
      if (!notice && promptSpoken !== task!.id) { promptSpoken = task!.id; sayTask(); } // не повторяем при открытии камеры и возврате
      notice = '';
      break;
    }
    case 'checking':
      taskScreen(level!, `<section class="tk-card tk-wait" id="tkcard" role="status" aria-label="Проверяю фото"><svg class="tk-spin" viewBox="0 0 48 48" aria-hidden="true"><circle class="tk-spin-track" cx="24" cy="24" r="19"/><circle class="tk-spin-arc" cx="24" cy="24" r="19"/></svg></section>`, '', '', 'tk-check');
      break;
    case 'result': {
      const L = level!;
      if (s.lastMatch) {
        finishTask(); // находка сохраняется сразу, не дожидаясь «Следующее»
        playSfx('correct'); setTimeout(() => playSfx('star'), 380);
        const word = englishFor(task!.id);
        taskScreen(L, `<section class="tk-card ok" id="tkcard" ${word ? 'role="button" tabindex="0" aria-label="Послушать слово ещё раз"' : ''}>
            <span class="tk-ico">${taskIcon(L, task!)}</span>
            <p class="tk-en">${word ? word.en : taskName(task!)}</p>${word ? `<p class="tk-ru">${word.ru}</p>` : ''}</section>`, '',
          bigBtn('next', nextIcon(), 'Следующее задание'), 'tk-ok');
        const card = root.querySelector<HTMLElement>('#tkcard')!;
        confettiBehind(root.querySelector<HTMLElement>('.loc')!, card);
        // Универсально: сначала похвала (записывается один раз), потом слово по-английски.
        const praise = pickPhrase(PRAISE);
        speak(praise.text, false, praise.who);
        if (word) {
          const intro = pickPhrase(INTRO_EN); // «Вот так это будет по-английски»
          speak(intro.text, true, intro.who);
          speakEnglish(word.en); speakEnglish(word.en);
          card.addEventListener('click', () => speakEnglish(word.en, false));
        }
        speak(NEXT_HINT.text, true, NEXT_HINT.who); // «нажми на кнопку внизу»
      } else {
        // Не то: коротко и по-доброму, без объяснений, что оказалось в кадре, и без счётчика попыток; карточка трясётся.
        const line = pickPhrase(TRY_AGAIN);
        taskScreen(L, `<section class="tk-card shake" id="tkcard"><img class="tk-try" src="${LOC_BASE()}/try-again.svg" alt=""><p class="tk-text">${line.text}</p></section>`,
          '', bigBtn('next', retryIcon(), 'Искать снова'), 'tk-bad');
        navigator.vibrate?.([60, 40, 60]);
        playSfx('wrong-soft');
        speak(line.text, false, line.who);
        root.querySelector('#tkcard')?.addEventListener('click', () => speak(line.text, false, line.who));
      }
      on('next', () => dispatch({ type: 'next' }));
      break;
    }
    case 'finish': {
      const last = s.tasks[0];
      const levelDone = finishTask();
      state = null;
      if (levelDone) renderLevelDone();
      else {
        const nxt = nextTaskAfter(level!, last);
        if (nxt) startTask(nxt); else renderMap(level!);
      }
      break;
    }
  }
}

wireSfx(); // звуки кликов и событий (файлы звуков грузятся после первого экрана)
wireMusic(); // фоновая музыка с первого касания

// Сначала основа главного экрана (заставка «Загружаем игру», если сеть медленная), потом всё остальное по ступеням.
void bootFirstStep().then(() => {
  render();

  // Подтягиваем прогресс с сервера (если он настроен) и перерисовываем, не прерывая задание.
  store.load().then((p) => {
    progress = p;
    // Перерисовываем только карту и меню: онбординг и игру не сбрасываем.
    if (!state && /screen-(menu|map)/.test(root.className)) render();
  });

  // Дальше в простое: иконки, звуки и музыка, и только потом умное зрение, чтобы к камере модели уже были загружены.
  // На главной лёгкие модели грузим только при хорошем соединении: на мобильном интернете они отнимают канал у игры.
  bootSecondStep(() => {
    startSfxLoad();
    startMusicLoad();
    if (heavyModelsAllowed()) setTimeout(() => preloadModels(false), 2500);
  });
});

// Записанная озвучка (ElevenLabs): текст -> файл в public/voice. Нет файла — молчим (голос браузера не используем).
// Список и файлы создаёт `node scripts/build-voice.mjs` (см. README), он же обновляет data/voice-manifest.json.
import manifest from '../data/voice-manifest.json';

const SAY = manifest.say as Record<string, string>;
const EN = manifest.en as Record<string, string>;

const urlOf = (file: string) => `${import.meta.env.BASE_URL}voice/${file}.mp3`;

// Русская фраза и английское слово лежат в разных таблицах: слово «red» не должно совпасть с фразой.
export function recordedFor(text: string, english = false): string | null {
  const file = (english ? EN : SAY)[text];
  return file ? urlOf(file) : null;
}

// url = null — тишина на ms миллисекунд (пауза, чтобы ребёнок успел повторить слово); onStart вызывается, когда очередь дошла до пункта.
interface Item { url: string | null; text: string; english: boolean; ms?: number; onStart?: () => void; onEnd?: () => void }
let queue: Item[] = [];
let player: HTMLAudioElement | null = null;
let current: HTMLAudioElement | null = null;
let currentItem: Item | null = null;
let playbackId = 0;
let pauseTimer: ReturnType<typeof setTimeout> | null = null;
let waitingForTouch = false;
const touchEvents = ['touchend', 'pointerup', 'click', 'keydown'] as const;

// complete завершает ожидание фраз при выключении звука, чтобы игра продолжилась.
export function stopRecorded(mode: 'cancel' | 'finish-current' | 'complete' = 'cancel') {
  const completedItems = mode === 'complete' ? [currentItem, ...queue] : [];
  queue = [];
  stopWaitingForTouch();
  if (pauseTimer) { clearTimeout(pauseTimer); pauseTimer = null; }
  if (mode === 'finish-current' && current) return;
  playbackId++;
  currentItem = null;
  if (current) {
    current.onended = null;
    current.onerror = null;
    current.onpause = null;
    current.pause();
    current = null;
  }
  completedItems.forEach((item) => item?.onEnd?.());
}

function next() {
  if (waitingForTouch) return;
  const id = ++playbackId;
  const item = queue.shift();
  currentItem = item ?? null;
  if (!item) { current = null; return; }
  if (item.url === null) {
    current = null;
    item.onStart?.();
    if (playbackId !== id) return;
    pauseTimer = setTimeout(() => {
      pauseTimer = null;
      currentItem = null;
      item.onEnd?.();
      if (playbackId === id) next();
    }, item.ms ?? 0);
    return;
  }
  // На iPhone разрешение на воспроизведение сохраняется у одного плеера
  // между русскими фразами и английскими словами.
  const a = player ??= new Audio();
  current = a;
  const finish = () => {
    if (current !== a || playbackId !== id) return;
    current = null;
    currentItem = null;
    item.onEnd?.();
    if (playbackId === id) next();
  };
  a.onended = finish;
  a.onerror = finish;
  a.onpause = () => {
    if (current === a && playbackId === id) resumeRecorded();
  };
  a.src = item.url;
  a.play().catch((e: unknown) => {
    // Отмена старой записи не должна затрагивать уже запущенную новую очередь.
    if (current !== a || playbackId !== id) return;
    current = null;
    currentItem = null;
    if ((e as { name?: string })?.name === 'NotAllowedError') {
      queue.unshift(item);
      waitForTouch();
      return;
    }
    // Если одна запись недоступна, продолжаем со следующего слова или фразы.
    item.onEnd?.();
    if (playbackId === id) next();
  });
}

// После системной паузы продолжаем запись с прежней позиции.
// Если Safari требует жест, повторяем play() при следующем касании.
function resumeRecorded() {
  if (!current || !current.paused || current.ended || document.hidden) return;
  void current.play().catch(() => {});
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', resumeRecorded);
  touchEvents.forEach((event) => document.addEventListener(event, resumeRecorded, true));
}

// iPhone и другие браузеры не дают играть звук без касания: подсказка при входе на страницу ждёт первого касания и звучит тогда.
// Смена экрана (stopRecorded) отменяет ожидание, чтобы старая фраза не прозвучала не к месту.
function stopWaitingForTouch() {
  if (!waitingForTouch) return;
  waitingForTouch = false;
  touchEvents.forEach((event) => document.removeEventListener(event, resumeOnTouch, true));
}

function resumeOnTouch() {
  stopWaitingForTouch();
  next();
}

function waitForTouch() {
  if (waitingForTouch) return;
  waitingForTouch = true;
  touchEvents.forEach((event) => document.addEventListener(event, resumeOnTouch, true));
}

// true — запись поставлена (или пошла); false — файла нет.
// queue = true: дождаться, пока договорит предыдущая запись.
export function playRecorded(text: string, queued = false, english = false, onEnd?: () => void): boolean {
  const url = recordedFor(text, english);
  if (!url) return false;
  if (!queued) stopRecorded();
  queue.push({ url, text, english, onEnd });
  if (!current && !pauseTimer) next();
  return true;
}

// Тишина в очереди голоса: после неё продолжится следующая запись. onStart/onEnd — начало и конец паузы (подсветка на экране).
export function pauseRecorded(ms: number, onStart?: () => void, onEnd?: () => void) {
  queue.push({ url: null, text: '', english: false, ms, onStart, onEnd });
  if (!current && !pauseTimer) next();
}


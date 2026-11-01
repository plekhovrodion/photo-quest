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

interface Item { url: string; text: string; english: boolean }
let queue: Item[] = [];
let current: HTMLAudioElement | null = null;

export function stopRecorded() {
  queue = [];
  waiting = null;
  if (!current) return;
  current.pause();
  current = null;
}

function next() {
  const item = queue.shift();
  if (!item) { current = null; return; }
  const a = new Audio(item.url);
  current = a;
  a.onended = () => { if (current === a) next(); };
  a.play().catch((e: unknown) => {
    if (current === a) current = null;
    if ((e as { name?: string })?.name === 'NotAllowedError') { waitForTouch([item, ...queue]); return; }
    // другая ошибка (файл не загрузился и т. п.): остаток очереди бросаем
    queue = [];
  });
}

// iPhone и другие браузеры не дают играть звук без касания: подсказка при входе на страницу ждёт первого касания и звучит тогда.
// Смена экрана (stopRecorded) отменяет ожидание, чтобы старая фраза не прозвучала не к месту.
let waiting: Item[] | null = null;
function waitForTouch(items: Item[]) {
  const had = !!waiting;
  queue = [];
  waiting = items;
  if (had) return;
  const events = ['touchend', 'pointerup', 'click', 'keydown'] as const;
  const go = () => {
    events.forEach((ev) => document.removeEventListener(ev, go, true));
    const w = waiting;
    waiting = null;
    if (w?.length) { queue = w; next(); }
  };
  events.forEach((ev) => document.addEventListener(ev, go, true));
}

// true — запись поставлена (или пошла); false — файла нет.
// queue = true: дождаться, пока договорит предыдущая запись.
export function playRecorded(text: string, queued = false, english = false): boolean {
  const url = recordedFor(text, english);
  if (!url) return false;
  if (!queued) stopRecorded();
  queue.push({ url, text, english });
  if (!current) next();
  return true;
}


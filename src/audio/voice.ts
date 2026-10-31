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
  a.play().catch(() => {
    // браузер не дал проиграть (например, нет жеста пользователя): остаток очереди бросаем
    if (current === a) { current = null; queue = []; }
  });
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


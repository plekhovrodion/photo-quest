// Записанная озвучка: фраза -> файл в public/voice. Нет файла — говорит голос браузера.
// Новые записи: положить mp3 в public/voice и добавить строку сюда (коды из voice-level1.txt).
export const RECORDED: Record<string, string> = {
  'Найди предмет с оранжевым цветом!': 'task-orange',
  'Найди предмет с фиолетовым цветом!': 'task-purple',
};

let current: HTMLAudioElement | null = null;

export function recordedFor(text: string): string | null {
  const id = RECORDED[text];
  return id ? `/voice/${id}.mp3` : null;
}

export function stopRecorded() {
  if (!current) return;
  current.pause();
  current = null;
}

// true — запись пошла; false — файла нет или браузер не дал проиграть (тогда нужен запасной голос).
export function playRecorded(text: string): boolean {
  stopRecorded();
  const url = recordedFor(text);
  if (!url) return false;
  const a = new Audio(url);
  current = a;
  a.play().catch(() => {
    if (current === a) current = null;
    fallback?.(text);
  });
  return true;
}

let fallback: ((t: string) => void) | null = null;
export const onRecordedFail = (fn: (t: string) => void) => { fallback = fn; };

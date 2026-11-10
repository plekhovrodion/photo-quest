import { playRecorded, pauseRecorded, stopRecorded } from './voice';
import { playSfx, setSfxGate } from './sfx';
import { setMusicEnabled } from './music';

// Звук можно выключить кнопкой на главной; выбор помнится в браузере.
let muted = false;
try { muted = localStorage.getItem('pq-muted') === '1'; } catch { /* без хранилища звук включён */ }
export const isMuted = () => muted;
setSfxGate(() => !muted);
setMusicEnabled(!muted);
export function setMuted(m: boolean) {
  if (m) playSfx('toggle-off'); // «выключил» слышно, пока звук ещё включён
  muted = m;
  setSfxGate(() => !muted);
  setMusicEnabled(!m);
  if (!m) playSfx('toggle-on');
  try { localStorage.setItem('pq-muted', m ? '1' : '0'); } catch { /* ignore */ }
  if (m) stopRecorded('complete');
}

// Озвучка только записанная (ElevenLabs, public/voice). Голос браузера («робот») не используем: если записи нет, фраза молчит.
export const VOICE_ENABLED = true;

export type Speaker = 'grisha' | 'sonya';

// queue = true: договорить предыдущую запись, а не обрывать её. Кто говорит, определяет сама запись.
export function speak(text: string, queue = false, _who: Speaker = 'grisha', onEnd?: () => void) {
  if (!VOICE_ENABLED || muted) { onEnd?.(); return; }
  if (!playRecorded(text, queue, false, onEnd)) onEnd?.();
}

// При автоматическом результате можно дать текущей фразе договорить.
export function stopSpeech(finishCurrent = false) {
  stopRecorded(finishCurrent ? 'finish-current' : 'cancel');
}

// Тишина в цепочке озвучки (ребёнок повторяет слово).
export function speakPause(ms: number, onStart?: () => void, onEnd?: () => void) {
  if (!VOICE_ENABLED || muted) return;
  pauseRecorded(ms, onStart, onEnd);
}

export function speakEnglish(word: string, queue = true) {
  if (!VOICE_ENABLED || muted) return;
  playRecorded(word, queue, true);
}

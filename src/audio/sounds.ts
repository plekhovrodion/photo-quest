import { playRecorded, onRecordedFail, stopRecorded } from './voice';
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
  if (m) { stopRecorded(); if ('speechSynthesis' in window) speechSynthesis.cancel(); }
}

// Озвучка заданий (Web Speech API); чтобы выключить, поставьте false.
export const VOICE_ENABLED = true;

export type Speaker = 'grisha' | 'sonya';

// Голоса браузера сильно различаются. Берём самый «живой» русский: нейросетевые («Natural», «Online»),
// потом улучшенные и известные (Milena, Yuri, Svetlana, Google), компактные и «робот» — в конец.
export function scoreVoice(v: Pick<SpeechSynthesisVoice, 'name' | 'lang' | 'localService'>): number {
  if (!v.lang.toLowerCase().startsWith('ru')) return -100;
  let sc = 0;
  if (/natural|neural/i.test(v.name)) sc += 60;
  if (/online/i.test(v.name)) sc += 20;
  if (/premium|enhanced|улучш/i.test(v.name)) sc += 40;
  if (/milena|yuri|svetlana|dariya|katya|alena|pavel|google|siri|милена|юрий|светлана|дарья|катя|алёна|павел/i.test(v.name)) sc += 30;
  if (/compact|espeak|robot/i.test(v.name)) sc -= 40;
  if (v.localService) sc += 2;
  return sc;
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  if (!('speechSynthesis' in window)) return undefined;
  const ranked = speechSynthesis.getVoices().map((v) => [v, scoreVoice(v)] as const).filter(([, sc]) => sc > -100);
  return ranked.sort((a, b) => b[1] - a[1])[0]?.[0];
}

// Гриша говорит ниже и спокойнее, Соня выше и бодрее: разные характеры на одном голосе.
const STYLE: Record<Speaker, { pitch: number; rate: number }> = {
  grisha: { pitch: 0.85, rate: 0.92 },
  sonya: { pitch: 1.2, rate: 0.96 },
};

// queue = true: договорить предыдущую фразу, а не обрывать её.
export function speak(text: string, queue = false, who: Speaker = 'grisha') {
  if (!VOICE_ENABLED || muted) return;
  if (!queue && 'speechSynthesis' in window) speechSynthesis.cancel();
  if (playRecorded(text, queue)) return;
  speakBrowser(text, who);
}

// Оборвать всю озвучку (запись, очередь и голос браузера): при смене экрана, чтобы фразы не накладывались.
export function stopSpeech() {
  stopRecorded();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

// Английские слова: голос en-US, медленнее обычного, чтобы ребёнок расслышал.
function pickEnglishVoice(): SpeechSynthesisVoice | undefined {
  if (!('speechSynthesis' in window)) return undefined;
  const sc = (v: SpeechSynthesisVoice) =>
    (/^en[-_]US/i.test(v.lang) ? 50 : /^en/i.test(v.lang) ? 20 : -100) +
    (/natural|neural|online/i.test(v.name) ? 40 : 0) + (/samantha|ava|allison|google|aria|jenny/i.test(v.name) ? 30 : 0) +
    (/compact|espeak|robot|novelty|bad news|bells|boing|cellos|zarvox|whisper/i.test(v.name) ? -80 : 0);
  return speechSynthesis.getVoices().map((v) => [v, sc(v)] as const).filter(([, s]) => s > -100).sort((a, b) => b[1] - a[1])[0]?.[0];
}

export function speakEnglish(word: string, queue = true) {
  if (!VOICE_ENABLED || muted) return;
  if (!queue && 'speechSynthesis' in window) speechSynthesis.cancel();
  if (playRecorded(word, queue, true)) return;
  speakEnglishBrowser(word);
}

function speakEnglishBrowser(word: string) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'en-US';
  const v = pickEnglishVoice();
  if (v) u.voice = v;
  u.rate = 0.75;
  u.pitch = 1.1;
  speechSynthesis.speak(u);
}

function speakBrowser(text: string, who: Speaker = 'grisha') {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ru-RU';
  const v = pickVoice();
  if (v) u.voice = v;
  u.pitch = STYLE[who].pitch;
  u.rate = STYLE[who].rate;
  speechSynthesis.speak(u);
}

// Список голосов в браузере подгружается не сразу.
if (typeof window !== 'undefined' && 'speechSynthesis' in window) speechSynthesis.addEventListener?.('voiceschanged', () => pickVoice());

onRecordedFail((t, english) => (english ? speakEnglishBrowser(t) : speakBrowser(t)));

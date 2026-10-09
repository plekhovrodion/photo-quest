import { playRecorded, onRecordedFail } from './voice';
let ctx: AudioContext | null = null;

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine') {
  ctx ??= new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = ctx.currentTime + start;
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur);
}

export function playSuccess() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25));
}

export function playTryAgain() {
  tone(330, 0, 0.2, 'triangle');
  tone(262, 0.18, 0.3, 'triangle');
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
  if (!VOICE_ENABLED) return;
  if (!queue) {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (playRecorded(text)) return;
  }
  speakBrowser(text, who);
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

onRecordedFail((t) => speakBrowser(t));

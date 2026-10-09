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

// queue = true: договорить предыдущую фразу, а не обрывать её.
export function speak(text: string, queue = false) {
  if (!VOICE_ENABLED) return;
  if (!queue) {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (playRecorded(text)) return;
  }
  speakBrowser(text, queue);
}

function speakBrowser(text: string, queue: boolean) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ru-RU';
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

onRecordedFail((t) => speakBrowser(t, false));

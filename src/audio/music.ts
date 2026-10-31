// Фоновая музыка: два спокойных инструментальных трека (public/music, сделаны в ElevenLabs Music) играют по кругу
// с плавным переходом друг в друга. Тихая, чтобы не перебивать озвучку; выключается тем же переключателем звука.
// Треки грузятся сразу при входе в игру, играть начинают с первого касания (браузеры не разрешают звук раньше).
// На паузу ставится, когда вкладка скрыта.

const TRACKS = ['theme-1', 'theme-2'];
const VOLUME = 0.16; // общая громкость музыки
const FADE = 3; // секунд на вход и выход трека: соседние треки накладываются, шва не слышно

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let started = false;
let order = 0;
let nextAt = Infinity; // время ctx, когда пора запускать следующий трек
const buffers: AudioBuffer[] = [];

const url = (name: string) => `${import.meta.env.BASE_URL}music/${name}.mp3`;

function playNext() {
  if (!ctx || !master || !buffers.length) return;
  const buf = buffers[order++ % buffers.length];
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(1, t + FADE);
  g.gain.setValueAtTime(1, t + buf.duration - FADE);
  g.gain.linearRampToValueAtTime(0, t + buf.duration);
  src.buffer = buf;
  src.connect(g).connect(master);
  src.start(t);
  nextAt = t + buf.duration - FADE;
}

function applyGate() {
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(enabled ? VOLUME : 0, ctx.currentTime, 0.4);
}

// Контекст и треки готовим сразу при входе в игру (звук ждёт разрешения браузера), играть начинаем с первого касания
let playing = false;
function begin() {
  if (playing || !ctx || !buffers.length || ctx.state !== 'running') return;
  playing = true;
  playNext();
  setInterval(() => { if (ctx && ctx.state === 'running' && ctx.currentTime >= nextAt) playNext(); }, 500);
}

async function preload() {
  if (started) return;
  started = true;
  try {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = enabled ? VOLUME : 0;
    master.connect(ctx.destination);
    const c = ctx;
    ctx.addEventListener('statechange', begin); // автоплей разрешён сразу: музыка пойдёт без касания
    for (const name of TRACKS) {
      try {
        const res = await fetch(url(name), { priority: 'low' } as RequestInit);
        if (!res.ok) continue;
        buffers.push(await c.decodeAudioData(await res.arrayBuffer()));
        begin(); // первый трек готов: если звук уже разрешён, начинаем
      } catch { /* нет файла или формат не поддержан: этого трека не будет */ }
    }
  } catch { /* без Web Audio музыки не будет */ }
}

// Включает и выключает музыку (общий переключатель звука)
export function setMusicEnabled(on: boolean) {
  enabled = on;
  applyGate();
}

// Файлы музыки грузятся после первого экрана (startMusicLoad), слушатели касаний ставятся сразу.
export const startMusicLoad = () => void preload();

export function wireMusic() {
  const go = () => {
    if (ctx && ctx.state === 'suspended' && !document.hidden) void ctx.resume().then(begin);
  };
  addEventListener('pointerdown', go, { capture: true, passive: true });
  // Пока вкладка скрыта, музыку не крутим: контекст на паузе, время в нём тоже стоит
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend(); else void ctx.resume();
  });
}

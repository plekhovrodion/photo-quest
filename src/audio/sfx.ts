// Звуки интерфейса: клики, переходы, успех и ошибка. Файлы из библиотеки Uchi Sound Lab лежат в public/sfx
// (скачиваются `node scripts/fetch-sfx.mjs`). Каждый нужный сигнал хранится в одном файле.
// Играем через Web Audio; после первого экрана заранее загружается только звук нажатия.

// название -> число файлов (имя файла: <название>-0.m4a)
export const SFX = {
  tap: 1,
  forward: 1,
  back: 1,
  'toggle-on': 1,
  'toggle-off': 1,
  'modal-open': 1,
  correct: 1,
  star: 1,
  'wrong-soft': 1,
  'level-up': 1,
} as const;
export type SfxName = keyof typeof SFX;

const VOLUME = 0.8;
let ctx: AudioContext | null = null;
let enabled = () => true;
const buffers = new Map<string, AudioBuffer>();
const pending = new Map<string, Promise<AudioBuffer | null>>();

// Выключатель звука (общий с озвучкой) подключается из sounds.ts, чтобы модули не зависели друг от друга
export const setSfxGate = (fn: () => boolean) => { enabled = fn; };

const url = (name: string, i: number) => `${import.meta.env.BASE_URL}sfx/${name}-${i}.m4a`;

// Звук нажатия готов сразу после главного экрана; остальные грузятся при первом использовании.
let allowed = false;

function loadVariant(name: SfxName, i: number): Promise<AudioBuffer | null> {
  const key = `${name}-${i}`;
  const cached = buffers.get(key);
  if (cached) return Promise.resolve(cached);
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  if (!ctx || !allowed) return Promise.resolve(null);
  const c = ctx;
  const request = (async () => {
    const res = await fetch(url(name, i), { priority: 'low' } as RequestInit);
    if (!res.ok) return null;
    const buffer = await c.decodeAudioData(await res.arrayBuffer());
    buffers.set(key, buffer);
    return buffer;
  })().catch(() => null).finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

// Разрешает загрузку звуков (после первого экрана).
export function startSfxLoad() {
  allowed = true;
  try { ctx ??= new AudioContext(); if (enabled()) void loadVariant('tap', 0); } catch { /* без Web Audio звуков не будет */ }
}

// Браузеры разрешают звук только после касания: на первом касании создаём контекст и грузим звуки
export function unlockSfx() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    if (allowed && enabled()) void loadVariant('tap', 0);
  } catch { /* без Web Audio звуков интерфейса не будет */ }
}

function playBuffer(name: SfxName, i: number, volume: number) {
  if (!ctx || !enabled()) return;
  const buf = buffers.get(`${name}-${i}`);
  if (!buf) return;
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = VOLUME * volume;
  src.buffer = buf;
  src.connect(gain).connect(ctx.destination);
  src.start();
}

export function playSfx(name: SfxName, volume = 1) {
  if (!ctx || !enabled()) return;
  if (buffers.has(`${name}-0`)) return playBuffer(name, 0, volume);
  if (!allowed) return;
  void loadVariant(name, 0).then((buffer) => {
    if (buffer && enabled()) playBuffer(name, 0, volume);
  });
}

// Клики по кнопкам тише остальных звуков (успех, ошибка, переключатель звука), чтобы не перебивали озвучку
const CLICK_VOLUME = 0.4;

// Звук по нажатию: какой звук у какой кнопки
const BY_SELECTOR: [string, SfxName][] = [
  ['.mp-tile, .loc-card', 'forward'],
  ['#back, .cam-back, .cp-back', 'back'],
  ['#fs, .loc-play, #play, #next, .cam-shoot', 'tap'],
];

// Минимальный вид элемента (так функцию можно проверить без DOM)
interface Clickable { closest(sel: string): { id: string; matches(sel: string): boolean } | null }
export function sfxForClick(target: Clickable | null): SfxName | null {
  const btn = target?.closest('button');
  if (!btn || btn.id === 'snd') return null; // у «звука» свои звуки (вкл/выкл)
  for (const [sel, name] of BY_SELECTOR) if (btn.matches(sel)) return name;
  return 'tap';
}

export function wireSfx(root: Document = document) {
  // Декодировать звуки можно и без касания (контекст проснётся позже): тогда уже первый клик со звуком
  try { ctx ??= new AudioContext(); } catch { /* без Web Audio звуков не будет */ }
  root.addEventListener('pointerdown', unlockSfx, { capture: true, passive: true });
  root.addEventListener('click', (e) => {
    const name = sfxForClick(e.target as Element | null);
    if (name) playSfx(name, CLICK_VOLUME);
  }, true);
}

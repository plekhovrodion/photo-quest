// Звуки интерфейса: клики, переходы, успех и ошибка. Файлы из библиотеки Uchi Sound Lab лежат в public/sfx
// (скачиваются `node scripts/fetch-sfx.mjs`). Вариантов у звука несколько, подряд один и тот же не играет.
// Играем через Web Audio: мало задержки, звук готов, когда ребёнок нажал. Загрузка начинается с первого касания.

// название -> число вариантов (имя файла: <название>-<номер>.m4a)
export const SFX = {
  tap: 6,
  'tap-soft': 4,
  'tap-heavy': 4,
  forward: 3,
  back: 3,
  'toggle-on': 3,
  'toggle-off': 3,
  'modal-open': 3,
  'modal-close': 3,
  correct: 3,
  'perfect-answer': 3,
  star: 3,
  'wrong-soft': 3,
  'level-up': 3,
  'unit-complete': 1,
} as const;
export type SfxName = keyof typeof SFX;

const VOLUME = 0.8;
let ctx: AudioContext | null = null;
let enabled = () => true;
const buffers = new Map<string, AudioBuffer>();
const pending = new Map<string, Promise<AudioBuffer | null>>();
const last = new Map<SfxName, number>();

// Выключатель звука (общий с озвучкой) подключается из sounds.ts, чтобы модули не зависели друг от друга
export const setSfxGate = (fn: () => boolean) => { enabled = fn; };

const url = (name: string, i: number) => `${import.meta.env.BASE_URL}sfx/${name}-${i}.m4a`;

// Частые звуки готовы сразу после главного экрана; остальные варианты грузятся при первом использовании.
let allowed = false;
const CORE: SfxName[] = ['tap', 'tap-soft', 'tap-heavy', 'forward', 'back', 'toggle-on', 'toggle-off', 'correct', 'wrong-soft', 'star', 'level-up'];
const PARALLEL = 3;
let coreLoading: Promise<void> | null = null;

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

function loadCore(): Promise<void> {
  if (!ctx || !allowed || !enabled()) return Promise.resolve();
  if (coreLoading) return coreLoading;
  const queue = CORE.map((name) => [name, 0] as const);
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) await loadVariant(item[0], item[1]);
  };
  coreLoading = Promise.all(Array.from({ length: PARALLEL }, worker)).then(() => {}).finally(() => { coreLoading = null; });
  return coreLoading;
}

// Разрешает загрузку звуков (после первого экрана).
export function startSfxLoad() {
  allowed = true;
  try { ctx ??= new AudioContext(); void loadCore(); } catch { /* без Web Audio звуков не будет */ }
}

// Браузеры разрешают звук только после касания: на первом касании создаём контекст и грузим звуки
export function unlockSfx() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    if (allowed) void loadCore();
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
  const n = SFX[name];
  const ready = Array.from({ length: n }, (_, i) => i).filter((i) => buffers.has(`${name}-${i}`));
  if (ready.length) {
    const choices = ready.length > 1 ? ready.filter((i) => i !== last.get(name)) : ready;
    const i = choices[Math.floor(Math.random() * choices.length)];
    last.set(name, i);
    playBuffer(name, i, volume);

    // Подгружаем не больше второго варианта для звуков, которые действительно используются.
    const hasPendingVariant = Array.from({ length: n }, (_, j) => pending.has(`${name}-${j}`)).some(Boolean);
    if (allowed && ready.length < Math.min(2, n) && !hasPendingVariant) {
      const next = Array.from({ length: n }, (_, j) => j).find((j) => !buffers.has(`${name}-${j}`) && !pending.has(`${name}-${j}`));
      if (next !== undefined) void loadVariant(name, next);
    }
    return;
  }

  const inFlightIndex = Array.from({ length: n }, (_, i) => i).find((i) => pending.has(`${name}-${i}`));
  if (inFlightIndex !== undefined) {
    void pending.get(`${name}-${inFlightIndex}`)!.then((buffer) => {
      if (!buffer || !enabled()) return;
      last.set(name, inFlightIndex);
      playBuffer(name, inFlightIndex, volume);
    });
    return;
  }

  // Редкий звук загружается только при первом вызове и играет после декодирования.
  if (!allowed) return;
  const i = Math.floor(Math.random() * n);
  void loadVariant(name, i).then((buffer) => {
    if (!buffer || !enabled()) return;
    last.set(name, i);
    playBuffer(name, i, volume);
    const hasPendingVariant = Array.from({ length: n }, (_, j) => pending.has(`${name}-${j}`)).some(Boolean);
    if (n > 1 && !hasPendingVariant) {
      const next = Array.from({ length: n }, (_, j) => j).find((j) => j !== i && !buffers.has(`${name}-${j}`) && !pending.has(`${name}-${j}`));
      if (next !== undefined) void loadVariant(name, next);
    }
  });
}

// Клики по кнопкам тише остальных звуков (успех, ошибка, переключатель звука), чтобы не перебивали озвучку
const CLICK_VOLUME = 0.4;

// Звук по нажатию: какой звук у какой кнопки
const BY_SELECTOR: [string, SfxName][] = [
  ['.mp-tile, .loc-card', 'forward'],
  ['#back, .cam-back, .cp-back', 'back'],
  ['#fs', 'tap-soft'],
  ['.loc-play, #play, #next, .cam-shoot', 'tap-heavy'],
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

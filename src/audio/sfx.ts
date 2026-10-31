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
const last = new Map<SfxName, number>();
let loading = false;

// Выключатель звука (общий с озвучкой) подключается из sounds.ts, чтобы модули не зависели друг от друга
export const setSfxGate = (fn: () => boolean) => { enabled = fn; };

const url = (name: string, i: number) => `${import.meta.env.BASE_URL}sfx/${name}-${i}.m4a`;

// Загружать звуки разрешено только после первого экрана (см. ui/boot.ts): иначе 48 файлов отнимают канал у главного экрана.
let allowed = false;
const PARALLEL = 4;

async function load() {
  if (loading || !ctx || !allowed) return;
  loading = true;
  const c = ctx;
  const queue = (Object.entries(SFX) as [SfxName, number][]).flatMap(([name, n]) => Array.from({ length: n }, (_, i) => [name, i] as const));
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const [name, i] = item;
      try {
        const res = await fetch(url(name, i), { priority: 'low' } as RequestInit);
        if (!res.ok) continue;
        buffers.set(`${name}-${i}`, await c.decodeAudioData(await res.arrayBuffer()));
      } catch { /* нет файла или формат не поддержан: этот звук просто промолчит */ }
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
}

// Разрешает загрузку звуков (после первого экрана).
export function startSfxLoad() {
  allowed = true;
  try { ctx ??= new AudioContext(); void load(); } catch { /* без Web Audio звуков не будет */ }
}

// Браузеры разрешают звук только после касания: на первом касании создаём контекст и грузим звуки
export function unlockSfx() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    void load();
  } catch { /* без Web Audio звуков интерфейса не будет */ }
}

export function playSfx(name: SfxName, volume = 1) {
  if (!ctx || !enabled()) return;
  const n = SFX[name];
  let i = Math.floor(Math.random() * n);
  if (n > 1 && i === last.get(name)) i = (i + 1) % n;
  last.set(name, i);
  const buf = buffers.get(`${name}-${i}`);
  if (!buf) return;
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = VOLUME * volume;
  src.buffer = buf;
  src.connect(gain).connect(ctx.destination);
  src.start();
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

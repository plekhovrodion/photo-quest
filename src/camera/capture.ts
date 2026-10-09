import { cameraIcon, imageIcon } from '../ui/icons';
import { BoxFollower, expandBox, type Box } from './box';
import { detectObject, lastPreds } from './detector';
import type { Target } from './target';
import { colorBlob } from '../vision/colorBlob';
import { colorShares, type ColorName } from '../vision/color';
import { COLOR_RU, ruName } from '../vision/names';
import { loadCoco, modelStatus, onModelStatus, preloadModels } from '../vision/models';
import { matchesLabels } from '../vision/labels';

const MAX_SIDE = 1024;
const QUALITY = 0.8;

// Сжимает фото с камеры до ~1024 px по длинной стороне в JPEG.
export async function compressPhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', QUALITY),
  );
}

// Системная камера через <input capture>: работает в мобильных браузерах без доп. разрешений.
export function pickPhotoFile(): Promise<Blob | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null));
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

// Снимок, признак «уже вырезан по предмету» и класс, который нашла живая камера (учитывается при проверке).
export interface Captured { blob: Blob; cropped: boolean; liveClass?: string }

// Живая камера в браузере нужна getUserMedia, а он работает только в безопасном контексте (https или localhost).
export function canUseLiveCamera(): boolean {
  return isSecureContext && !!navigator.mediaDevices?.getUserMedia;
}

function stop(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

const LOCK_MS = 450; // сколько рамка должна стоять почти на месте, чтобы стать зелёной
const LOCK_MATCH_MS = 250; // быстрее, если найден именно тот предмет, что в задании
const MARGIN = 0.12; // запас вокруг предмета при обрезке
const MIN_GAP_MS = 110; // не чаще ~9 раз в секунду ищем предмет нейросетью
const COLOR_GAP_MS = 50; // цветовое пятно считается за миллисекунды — можно чаще
const LOST_HINT_MS = 3000; // через сколько без рамки подсказываем, что делать
const SMALL = { w: 96, h: 72 };

interface Found { box: Box; label: string; className?: string; matches: boolean }

// Оверлей с живым видео. Два независимых цикла: поиск предмета (несколько раз в секунду) и отрисовка рамки
// (на каждом кадре экрана, плавно догоняет цель). «Снять» вырезает предмет по рамке.
function liveCamera(target: Target): Promise<Captured | null> {
  return new Promise((resolve) => {
    const debug = new URLSearchParams(location.search).has('debug');
    const overlay = document.createElement('div');
    overlay.className = 'cam-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Камера');
    overlay.innerHTML = `
      <div class="cam-stage"><video class="cam-video" autoplay playsinline muted></video><canvas class="cam-boxes"></canvas></div>
      <p class="cam-hint" aria-live="polite"></p>
      ${debug ? '<pre class="cam-debug"></pre><span class="dbg-copy" role="button" tabindex="0">Скопировать отчёт</span>' : ''}
      <p class="cam-msg" hidden></p>
      <div class="cam-actions">
        <button class="cam-shoot" type="button">${cameraIcon()}Снять</button>
        <button class="cam-file secondary" type="button" hidden>${imageIcon()}Выбрать файл</button>
        <button class="cam-cancel secondary" type="button">Отмена</button>
      </div>`;
    document.body.appendChild(overlay);

    const video = overlay.querySelector<HTMLVideoElement>('.cam-video')!;
    const canvas = overlay.querySelector<HTMLCanvasElement>('.cam-boxes')!;
    const hint = overlay.querySelector<HTMLElement>('.cam-hint')!;
    const msg = overlay.querySelector<HTMLElement>('.cam-msg')!;
    const shoot = overlay.querySelector<HTMLButtonElement>('.cam-shoot')!;
    const fileBtn = overlay.querySelector<HTMLButtonElement>('.cam-file')!;
    const dbgEl = overlay.querySelector<HTMLElement>('.cam-debug');
    let stream: MediaStream | null = null;
    let alive = true;
    let raf = 0;

    const done = (r: Captured | null) => {
      alive = false;
      cancelAnimationFrame(raf);
      unsub();
      stop(stream);
      overlay.remove();
      removeEventListener('keydown', onKey);
      resolve(r);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') done(null); };
    addEventListener('keydown', onKey);

    const fail = (text: string) => {
      alive = false;
      cancelAnimationFrame(raf);
      msg.textContent = text;
      msg.hidden = false;
      shoot.hidden = true;
      video.parentElement!.hidden = true;
      hint.hidden = true;
      fileBtn.hidden = false;
    };

    // «Снять» активна только когда пошло видео, иначе кадр будет пустым.
    shoot.disabled = true;
    video.addEventListener('loadeddata', () => { shoot.disabled = false; startedAt = performance.now(); }, { once: true });
    let startedAt = 0;

    // ---- состояние поиска ----
    const follower = new BoxFollower();
    const small = document.createElement('canvas');
    small.width = SMALL.w;
    small.height = SMALL.h;
    const sctx = small.getContext('2d', { willReadFrequently: true })!;
    const needDetector = !target.color || !!target.words?.length; // для чистых заданий на цвет нейросеть не нужна
    preloadModels();
    let detectorReady = !needDetector || modelStatus().coco >= 1;
    let modelPct = Math.round(modelStatus().coco * 100);
    const unsub = onModelStatus((s) => {
      modelPct = Math.round(s.coco * 100);
      if (s.coco >= 1) detectorReady = true;
    });
    if (needDetector) loadCoco().then(() => { detectorReady = true; }).catch(() => { detectorReady = false; });

    let current: { label: string; className?: string; matches: boolean } = { label: '', matches: false };
    let colorTop = '';
    const stats = { detMs: 0, detRuns: 0, detStart: performance.now(), frames: 0, fpsStart: performance.now(), fps: 0 };
    const log: Array<{ t: number; found: boolean; cls?: string; ms: number }> = [];

    async function findBox(): Promise<Found | null> {
      const vw = video.videoWidth, vh = video.videoHeight;
      if (!vw) return null;
      let colorFound: Found | null = null;
      if (target.color || debug) {
        sctx.drawImage(video, 0, 0, SMALL.w, SMALL.h);
        const data = sctx.getImageData(0, 0, SMALL.w, SMALL.h).data;
        if (target.color) {
          const b = colorBlob(data, SMALL.w, SMALL.h, target.color);
          if (b) {
            const kx = vw / SMALL.w, ky = vh / SMALL.h;
            colorFound = { box: { x: b.x * kx, y: b.y * ky, w: b.w * kx, h: b.h * ky }, label: `${COLOR_RU[target.color]} цвет`, matches: true };
          }
        }
        if (debug) {
          const sh = colorShares(data, SMALL.w, SMALL.h, 0);
          colorTop = (Object.entries(sh) as [ColorName, number][]).sort((a, b) => b[1] - a[1]).slice(0, 3)
            .map(([n, v]) => `${n} ${(v * 100).toFixed(0)}%`).join(', ');
        }
      }
      if (detectorReady && needDetector) {
        try {
          const d = await detectObject(video, target);
          if (d) {
            const matches = !!target.words?.length && matchesLabels([{ className: d.className, probability: 1 }], target.words);
            // для задания на предмет+цвет рамка по детектору, если он нашёл нужный класс; иначе цветовое пятно
            if (!(target.color && colorFound && !matches)) {
              return { box: d.box, label: ruName(d.className) ?? d.className, className: d.className, matches };
            }
          }
        } catch { /* детектор не сработал на этом кадре — берём цветовое пятно */ }
      }
      return colorFound;
    }

    let busy = false;
    let lastStart = 0;
    const baseGap = needDetector ? MIN_GAP_MS : COLOR_GAP_MS;
    let gap = baseGap;
    const detectLoop = async () => {
      if (!alive) return;
      const t = performance.now();
      if (!busy && video.readyState >= 2 && t - lastStart >= gap) {
        busy = true;
        lastStart = t;
        try {
          const f = await findBox();
          const now = performance.now();
          follower.observe(f?.box ?? null, now);
          if (f) current = { label: f.label, className: f.className, matches: f.matches };
          const ms = now - t;
          stats.detMs = stats.detMs ? stats.detMs * 0.8 + ms * 0.2 : ms;
          stats.detRuns++;
          gap = ms > 80 ? Math.min(400, ms * 1.5) : baseGap; // если телефон не успевает, ищем реже
          if (debug) { log.push({ t: Math.round(now), found: !!f, cls: f?.className ?? (f ? 'color' : undefined), ms: Math.round(ms) }); if (log.length > 30) log.shift(); }
        } catch { /* пропускаем кадр */ }
        busy = false;
      }
      setTimeout(detectLoop, 30);
    };
    video.addEventListener('loadeddata', detectLoop, { once: true });

    // ---- отрисовка ----
    let lastHintAt = 0;
    const setHint = (locked: boolean, hasBox: boolean, now: number) => {
      if (now - lastHintAt < 150) return;
      lastHintAt = now;
      hint.textContent = needDetector && !detectorReady
        ? `Загружаю умное зрение… ${modelPct}%`
        : locked ? 'Нашёл! Нажми «Снять»'
        : hasBox ? 'Держи ровно…'
        : startedAt && now - startedAt > LOST_HINT_MS ? 'Не вижу предмета. Держи его в рамке посередине или нажми «Снять» и обрежь сам'
        : 'Наведи камеру на предмет';
    };

    function brackets(ctx: CanvasRenderingContext2D, w: number, h: number) {
      // прицел: уголки по центру, куда нужно поместить предмет
      const bw = w * 0.42, bh = h * 0.42, x = (w - bw) / 2, y = (h - bh) / 2, l = Math.min(bw, bh) * 0.22;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (const [px, py, dx, dy] of [[x, y, 1, 1], [x + bw, y, -1, 1], [x, y + bh, 1, -1], [x + bw, y + bh, -1, -1]] as const) {
        ctx.moveTo(px, py + dy * l); ctx.lineTo(px, py); ctx.lineTo(px + dx * l, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    const render = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(render);
      const w = video.clientWidth, h = video.clientHeight;
      if (w && h) {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
        const ctx = canvas.getContext('2d')!;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const f = follower.frame(now);
        const lockNeeded = current.matches ? LOCK_MATCH_MS : LOCK_MS;
        const locked = !!f.box && f.stableMs >= lockNeeded && !f.ghost;
        if (!f.box) brackets(ctx, w, h);
        if (f.box && video.videoWidth) {
          const kx = w / video.videoWidth, ky = h / video.videoHeight;
          const x = f.box.x * kx, y = f.box.y * ky, bw = f.box.w * kx, bh = f.box.h * ky;
          ctx.globalAlpha = f.ghost ? 0.5 : 1;
          ctx.lineWidth = 5;
          ctx.strokeStyle = locked ? '#22c55e' : '#ffffff';
          ctx.setLineDash(locked ? [] : [14, 9]);
          ctx.beginPath();
          ctx.roundRect(x, y, bw, bh, 14);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = '800 22px "Factor A", system-ui, sans-serif';
          const tw = ctx.measureText(current.label).width + 24;
          const tx = Math.min(Math.max(4, x), w - tw - 4), ty = Math.max(4, y - 38);
          ctx.fillStyle = locked ? '#22c55e' : '#ffffff';
          ctx.beginPath();
          ctx.roundRect(tx, ty, tw, 32, 16);
          ctx.fill();
          ctx.fillStyle = locked ? '#ffffff' : '#1e1b4b';
          ctx.fillText(current.label, tx + 12, ty + 23);
          ctx.globalAlpha = 1;
        }
        setHint(locked, !!f.box, now);
      }
      stats.frames++;
      if (now - stats.fpsStart > 1000) { stats.fps = Math.round((stats.frames * 1000) / (now - stats.fpsStart)); stats.frames = 0; stats.fpsStart = now; }
      if (dbgEl && stats.frames % 15 === 0) dbgEl.textContent = debugText();
    };
    raf = requestAnimationFrame(render);

    // ---- отладочная панель (?debug=1) ----
    const report = () => {
      const f = follower.current();
      return {
        time: new Date().toISOString(), ua: navigator.userAgent, backend: modelStatus().backend,
        models: { coco: modelStatus().coco, mobilenet: modelStatus().mobilenet },
        target, video: { w: video.videoWidth, h: video.videoHeight },
        stats: { fps: stats.fps, detMs: Math.round(stats.detMs), detRuns: stats.detRuns },
        box: f, label: current.label, className: current.className,
        topPreds: lastPreds.slice(0, 5).map((p) => ({ cls: p.class, score: +p.score.toFixed(2) })),
        colors: colorTop, log,
      };
    };
    function debugText() {
      const r = report();
      return [`backend ${r.backend}  fps ${r.stats.fps}  поиск ${r.stats.detMs} мс  (${r.stats.detRuns})`,
        `модели: coco ${Math.round(r.models.coco * 100)}%  mobilenet ${Math.round(r.models.mobilenet * 100)}%`,
        `видео ${r.video.w}x${r.video.h}  цели: ${JSON.stringify(target)}`,
        `COCO: ${r.topPreds.map((p) => `${p.cls} ${p.score}`).join(', ') || '—'}`,
        r.colors ? `цвета: ${r.colors}` : ''].filter(Boolean).join('\n');
    }
    overlay.querySelector('.dbg-copy')?.addEventListener('click', () => {
      void navigator.clipboard?.writeText(JSON.stringify(report(), null, 2));
      const el = overlay.querySelector('.dbg-copy'); if (el) el.textContent = 'Скопировано';
    });

    overlay.querySelector('.cam-cancel')!.addEventListener('click', () => done(null));
    fileBtn.addEventListener('click', async () => {
      const f = await pickPhotoFile();
      done(f ? { blob: f, cropped: false } : null);
    });
    shoot.addEventListener('click', () => {
      const vw = video.videoWidth, vh = video.videoHeight;
      if (!vw) return;
      // если предмет найден — вырезаем его с запасом, иначе берём весь кадр (дальше будет ручная обрезка)
      const box = follower.current();
      const crop = box ? expandBox(box, MARGIN, { w: vw, h: vh }) : null;
      const c = document.createElement('canvas');
      const r = crop ?? { x: 0, y: 0, w: vw, h: vh };
      c.width = Math.round(r.w);
      c.height = Math.round(r.h);
      c.getContext('2d')!.drawImage(video, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
      c.toBlob((b) => done(b ? { blob: b, cropped: !!crop, liveClass: crop ? current.className : undefined } : null), 'image/jpeg', 0.92);
    });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then((s) => {
        stream = s;
        video.srcObject = s;
      })
      .catch((err: DOMException) =>
        fail(err.name === 'NotAllowedError'
          ? 'Нет доступа к камере. Разреши её в настройках браузера или выбери фото из файла.'
          : 'Камера не найдена. Можно выбрать фото из файла.'),
      );
  });
}

// Если браузер разрешает живую камеру (https или localhost) — используем её везде, в том числе на телефоне:
// так можно искать предмет в реальном времени. Иначе — системная камера и ручная обрезка.
export async function takePhoto(target: Target = {}): Promise<Captured | null> {
  if (canUseLiveCamera()) return liveCamera(target);
  const f = await pickPhotoFile();
  return f ? { blob: f, cropped: false } : null;
}

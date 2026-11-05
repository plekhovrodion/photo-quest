import { classifyCameraError, showCameraProblem, unavailableReason } from './problems';
import { withCameraPrompt } from './prepermission';
import { BoxFollower, expandBox, type Box } from './box';
import { detectObject, lastPreds } from './detector';
import type { Target } from './target';
import { colorBlob } from '../vision/colorBlob';
import { colorShares, type ColorName } from '../vision/color';
import { COLOR_RU, ruName } from '../vision/names';
import { loadDetectorModel, modelStatus, onModelStatus } from '../vision/models';
import { matchesLabels } from '../vision/labels';
import { playSfx } from '../audio/sfx';

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

// Снимок, признак «уже вырезан по предмету» и класс, который нашла живая камера (учитывается при проверке).
// skipCrop — кадр уже целиком годится, ручная обрезка не нужна.
export interface Captured { blob: Blob; cropped: boolean; liveClass?: string; skipCrop?: boolean }

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
const DETECTOR_MAX_SIDE = 640;
const AUTO_LOCK_MS = 650; // то же для рамки детектора или цветового пятна, уже ставшей зелёной
const FOUND_ANIM_MS = 1000; // сколько показываем зелёную подсветку, прежде чем отдать снимок

interface Found { box: Box; label: string; className?: string; matches: boolean }

// Живая камера прямо на экране задания: видео в карточке `host`. Кнопки нет: когда предмет узнан, камера снимает сама.
// Два независимых цикла: поиск предмета (несколько раз в секунду) и отрисовка рамки
// (на каждом кадре экрана, плавно догоняет цель). «Снять» вырезает предмет по рамке.
// stopLive() закрывает камеру снаружи (уход с экрана); тогда промис завершается null.
let stopLive: (() => void) | null = null;
export const stopCamera = () => stopLive?.();

function liveCamera(target: Target, host: HTMLElement): Promise<Captured | null> {
  return new Promise((resolve) => {
    const debug = new URLSearchParams(location.search).has('debug');
    const overlay = host;
    overlay.innerHTML = `
      <video class="cam-video" autoplay playsinline muted></video><canvas class="cam-boxes"></canvas>
      <p class="cam-hint" aria-live="polite"></p><button class="cam-model-retry" type="button" hidden>Повторить загрузку распознавания</button>
      ${debug ? '<pre class="cam-debug"></pre><span class="dbg-copy" role="button" tabindex="0">Скопировать отчёт</span>' : ''}`;

    const video = overlay.querySelector<HTMLVideoElement>('.cam-video')!;
    const canvas = overlay.querySelector<HTMLCanvasElement>('.cam-boxes')!;
    const hint = overlay.querySelector<HTMLElement>('.cam-hint')!;
    const dbgEl = overlay.querySelector<HTMLElement>('.cam-debug');
    let stream: MediaStream | null = null;
    let alive = true;
    let raf = 0;
    let visibilityHandler: (() => void) | null = null;
    let progressScreen: HTMLDivElement | null = null;

    const done = (r: Captured | null) => {
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(raf);
      if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
      unsub();
      progressScreen?.remove();
      stop(stream);
      if (stopLive === stopThis) stopLive = null;
      resolve(r);
    };
    const stopThis = () => done(null);
    stopLive?.();
    stopLive = stopThis;

    let startedAt = 0;
    video.addEventListener('loadeddata', () => { startedAt = performance.now(); }, { once: true });

    // ---- состояние поиска ----
    const follower = new BoxFollower();
    const small = document.createElement('canvas');
    small.width = SMALL.w;
    small.height = SMALL.h;
    const sctx = small.getContext('2d', { willReadFrequently: true })!;
    const detectorFrame = document.createElement('canvas');
    const detectorCtx = detectorFrame.getContext('2d')!;
    const needDetector = !target.color || !!target.words?.length; // для чистых заданий на цвет нейросеть не нужна
    let detectorReady = !needDetector || modelStatus().detector >= 1;
    let modelState = modelStatus();
    const retryModels = overlay.querySelector<HTMLButtonElement>('.cam-model-retry')!;
    let progressFill: HTMLElement | null = null;
    let progressBar: HTMLElement | null = null;
    let progressTitle: HTMLElement | null = null;
    if (needDetector && !detectorReady && !modelState.detectorError) {
      progressScreen = document.createElement('div');
      progressScreen.className = 'loading-screen model-loading-screen';
      progressScreen.setAttribute('role', 'status');
      progressScreen.setAttribute('aria-live', 'polite');
      progressScreen.innerHTML = `<h2>Загружаем распознавание…</h2><div class="loc-progress" role="progressbar" aria-label="Загрузка модели распознавания" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="loc-track"><div class="loc-fill" style="--w:0%"></div></div></div>`;
      progressTitle = progressScreen.querySelector('h2');
      progressFill = progressScreen.querySelector('.loc-fill');
      progressBar = progressScreen.querySelector('.loc-progress');
      document.body.append(progressScreen);
    }
    const syncStatus = (s: ReturnType<typeof modelStatus>) => {
      modelState = s;
      detectorReady = !needDetector || s.detector >= 1;
      retryModels.hidden = !s.detectorError;
      if (progressScreen) {
        progressScreen.hidden = detectorReady || !!s.detectorError;
        const percent = Math.round(s.progress * 100);
        if (progressFill) progressFill.style.setProperty('--w', `${percent}%`);
        progressBar?.setAttribute('aria-valuenow', String(percent));
        if (progressTitle) progressTitle.textContent = percent ? `Загружаем распознавание… ${percent}%` : 'Загружаем распознавание…';
      }
    };
    const unsub = onModelStatus((s) => {
      syncStatus(s);
    });
    retryModels.addEventListener('click', () => {
      if (needDetector && !detectorReady) void loadDetectorModel().catch(() => {});
    });
    if (needDetector) loadDetectorModel().then(() => { detectorReady = true; }).catch(() => { detectorReady = false; });

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
          const scale = Math.min(1, DETECTOR_MAX_SIDE / Math.max(vw, vh));
          const dw = Math.max(1, Math.round(vw * scale)), dh = Math.max(1, Math.round(vh * scale));
          if (detectorFrame.width !== dw || detectorFrame.height !== dh) {
            detectorFrame.width = dw;
            detectorFrame.height = dh;
          }
          detectorCtx.drawImage(video, 0, 0, dw, dh);
          const d = await detectObject(detectorFrame, target);
          if (d) {
            d.box.x /= scale; d.box.y /= scale; d.box.w /= scale; d.box.h /= scale;
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
      if (!document.hidden && !busy && video.readyState >= 2 && t - lastStart >= gap) {
        busy = true;
        lastStart = t;
        try {
          const f = await findBox();
          if (!alive) return;
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
    // На мобильных браузерах loadeddata может не прийти: ждём готовый кадр в самом цикле.
    void detectLoop();

    // ---- отрисовка ----
    let lastHintAt = 0;
    let foundAt = 0; // когда предмет узнан (0 — ещё ищем)
    let okSince = 0; // с какого момента узнавание не прерывалось
    const setHint = (locked: boolean, hasBox: boolean, now: number) => {
      if (now - lastHintAt < 150) return;
      lastHintAt = now;
      const failed = needDetector && modelState.detectorError;
      retryModels.hidden = !failed;
      const ready = (needDetector && detectorReady) || !needDetector;
      hint.classList.remove('quiet');
      hint.textContent = !ready
        ? failed ? 'Не удалось загрузить распознавание. Попробуй ещё раз'
          : `Загружаем распознавание…`
        : foundAt ? 'Нашёл!'
        : locked ? 'Нашёл! Держи ровно…'
        : hasBox ? 'Держи ровно…'
        : startedAt && now - startedAt > LOST_HINT_MS ? 'Пока не вижу. Наведи камеру прямо на него'
        : 'Наведи камеру';
    };

    const render = (now: number) => {
      if (!alive) return;
      if (!document.hidden) raf = requestAnimationFrame(render);
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
        if (!foundAt) {
          const sure = locked && current.matches;
          if (!sure) okSince = 0;
          else {
            okSince ||= now;
            if (now - okSince >= AUTO_LOCK_MS && video.videoWidth) void found();
          }
        }
        if (f.box && video.videoWidth) {
          // видео заполняет экран с обрезкой (object-fit: cover): масштаб один на обе оси, плюс сдвиг по центру
          const sc = Math.max(w / video.videoWidth, h / video.videoHeight);
          const offX = (w - video.videoWidth * sc) / 2, offY = (h - video.videoHeight * sc) / 2;
          const x = f.box.x * sc + offX, y = f.box.y * sc + offY, bw = f.box.w * sc, bh = f.box.h * sc;
          ctx.globalAlpha = f.ghost && !foundAt ? 0.5 : 1;
          const green = locked || !!foundAt;
          ctx.lineWidth = foundAt ? 8 + 3 * Math.sin((now - foundAt) / 90) : 5; // найденный предмет пульсирует
          ctx.strokeStyle = green ? '#22c55e' : '#ffffff';
          ctx.setLineDash(green ? [] : [14, 9]);
          ctx.beginPath();
          ctx.roundRect(x, y, bw, bh, 14);
          if (foundAt) { ctx.fillStyle = `rgba(34, 197, 94, ${Math.min(0.38, (now - foundAt) / 600 * 0.38)})`; ctx.fill(); } // зелёная заливка нарастает
          ctx.stroke();
          ctx.setLineDash([]);
          // Название предмета на экране не показываем: ребёнок ищет сам, подсказкой остаётся только цвет рамки.
          ctx.globalAlpha = 1;
        }
        setHint(locked, !!f.box, now);
      }
      stats.frames++;
      if (now - stats.fpsStart > 1000) { stats.fps = Math.round((stats.frames * 1000) / (now - stats.fpsStart)); stats.frames = 0; stats.fpsStart = now; }
      if (dbgEl && stats.frames % 15 === 0) dbgEl.textContent = debugText();
    };
    raf = requestAnimationFrame(render);
    visibilityHandler = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        video.pause();
      } else {
        void video.play().catch(() => {});
        raf = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    // ---- отладочная панель (?debug=1) ----
    const report = () => {
      const f = follower.current();
      return {
        time: new Date().toISOString(), ua: navigator.userAgent, backend: modelStatus().backend,
        models: { detector: modelStatus().detector },
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
        `YOLO ${Math.round(r.models.detector * 100)}%`,
        `видео ${r.video.w}x${r.video.h}  цели: ${JSON.stringify(target)}`,
        `YOLO: ${r.topPreds.map((p) => `${p.cls} ${p.score}`).join(', ') || '—'}`,
        r.colors ? `цвета: ${r.colors}` : ''].filter(Boolean).join('\n');
    }
    overlay.querySelector('.dbg-copy')?.addEventListener('click', () => {
      void navigator.clipboard?.writeText(JSON.stringify(report(), null, 2));
      const el = overlay.querySelector('.dbg-copy'); if (el) el.textContent = 'Скопировано';
    });

    // Снимок для проверки: предмет по рамке или целый кадр.
    const grab = (): Promise<Captured | null> => new Promise((res) => {
      const vw = video.videoWidth, vh = video.videoHeight;
      if (!vw) return res(null);
      // Предмет найден рамкой — вырезаем его с запасом
      const box = follower.current();
      const crop = box ? expandBox(box, MARGIN, { w: vw, h: vh }) : null;
      const c = document.createElement('canvas');
      const r = crop ?? { x: 0, y: 0, w: vw, h: vh };
      c.width = Math.round(r.w);
      c.height = Math.round(r.h);
      c.getContext('2d')!.drawImage(video, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
      // 3) иначе целый кадр без ручной обрезки: прицел по центру подсказал, куда ставить предмет
      c.toBlob((b) => res(b ? { blob: b, cropped: !!crop, skipCrop: !crop, liveClass: crop ? current.className : undefined } : null), 'image/jpeg', 0.92);
    });
    // Предмет узнан: подсвечиваем зелёным с анимацией, потом отдаём снимок на проверку; кнопку нажимать не нужно.
    const found = async () => {
      if (foundAt || !alive) return;
      foundAt = performance.now();
      host.classList.add('found');
      playSfx('star');
      const shot = await grab();
      setTimeout(() => { if (alive) done(shot); }, Math.max(0, FOUND_ANIM_MS - (performance.now() - foundAt)));
    };

    // Запуск камеры; при отказе или ошибке показываем экран с причиной, оттуда можно попробовать снова.
    const start = async () => {
      try {
        const s = await withCameraPrompt(() => navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }));
        if (!alive) { stop(s); return; }
        stream = s;
        video.srcObject = s;
      } catch (err) {
        if (!alive) return;
        const act = await showCameraProblem(classifyCameraError(err));
        if (!alive) return;
        if (act === 'retry') void start(); else done(null);
      }
    };
    void start();
  });
}

// Только живая камера (нужен https или localhost). Если её нельзя включить, показываем экран с причиной; null — камеры нет или закрыли.
export async function takePhoto(target: Target, host: HTMLElement): Promise<Captured | null> {
  while (!canUseLiveCamera()) {
    const act = await showCameraProblem(unavailableReason());
    if (act !== 'retry') return null;
  }
  return liveCamera(target, host);
}

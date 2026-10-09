import { cameraIcon, imageIcon } from '../ui/icons';
import { BoxTracker, expandBox, type Box } from './box';
import { detectObject, loadDetector } from './detector';
import type { Target } from './target';
import { colorBlob } from '../vision/colorBlob';
import { COLOR_RU, ruName } from '../vision/names';

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

// Снимок и признак того, что он уже обрезан по найденному предмету (тогда ручная обрезка не нужна).
export interface Captured { blob: Blob; cropped: boolean }

// Живая камера в браузере нужна getUserMedia, а он работает только в безопасном контексте (https или localhost).
export function canUseLiveCamera(): boolean {
  return isSecureContext && !!navigator.mediaDevices?.getUserMedia;
}

function stop(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

const LOCK_MS = 500; // сколько рамка должна стоять почти на месте, чтобы стать зелёной
const TICK_MS = 200; // как часто ищем предмет
const MARGIN = 0.12; // запас вокруг предмета при обрезке

// Оверлей с живым видео: ищет предмет, рисует рамку и подпись. «Снять» вырезает предмет по рамке.
// При ошибке доступа предлагаем выбрать файл (диалог можно открыть только по отдельному клику).
function liveCamera(target: Target): Promise<Captured | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'cam-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Камера');
    overlay.innerHTML = `
      <div class="cam-stage"><video class="cam-video" autoplay playsinline muted></video><canvas class="cam-boxes"></canvas></div>
      <p class="cam-hint" aria-live="polite"></p>
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
    let stream: MediaStream | null = null;
    let alive = true;

    const done = (r: Captured | null) => {
      alive = false;
      stop(stream);
      overlay.remove();
      removeEventListener('keydown', onKey);
      resolve(r);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') done(null); };
    addEventListener('keydown', onKey);

    const fail = (text: string) => {
      alive = false;
      msg.textContent = text;
      msg.hidden = false;
      shoot.hidden = true;
      video.parentElement!.hidden = true;
      hint.hidden = true;
      fileBtn.hidden = false;
    };

    // «Снять» активна только когда пошло видео, иначе кадр будет пустым.
    shoot.disabled = true;
    video.addEventListener('loadeddata', () => { shoot.disabled = false; }, { once: true });

    // ---- поиск предмета в реальном времени ----
    const tracker = new BoxTracker();
    const small = document.createElement('canvas');
    small.width = 96;
    small.height = 72;
    const sctx = small.getContext('2d', { willReadFrequently: true })!;
    const needDetector = !target.color || !!target.words?.length; // для чистых заданий на цвет нейросеть не нужна
    let modelReady = !needDetector;
    if (needDetector) loadDetector().then(() => { modelReady = true; }).catch(() => { modelReady = false; });

    async function findBox(): Promise<{ box: Box; label: string } | null> {
      const vw = video.videoWidth, vh = video.videoHeight;
      if (!vw) return null;
      let color: { box: Box; label: string } | null = null;
      if (target.color) {
        sctx.drawImage(video, 0, 0, small.width, small.height);
        const b = colorBlob(sctx.getImageData(0, 0, small.width, small.height).data, small.width, small.height, target.color);
        if (b) {
          const kx = vw / small.width, ky = vh / small.height;
          color = { box: { x: b.x * kx, y: b.y * ky, w: b.w * kx, h: b.h * ky }, label: `${COLOR_RU[target.color]} цвет` };
        }
      }
      if (modelReady && needDetector) {
        try {
          const d = await detectObject(video, target);
          if (d) return { box: d.box, label: ruName(d.className) ?? d.className };
        } catch { /* детектор не сработал на этом кадре — берём цветовое пятно */ }
      }
      return color;
    }

    let current: { box: Box | null; label: string; stableMs: number } = { box: null, label: '', stableMs: 0 };

    function draw() {
      const w = video.clientWidth, h = video.clientHeight;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, w, h);
      const b = current.box;
      if (!b || !video.videoWidth) return;
      const kx = w / video.videoWidth, ky = h / video.videoHeight;
      const x = b.x * kx, y = b.y * ky, bw = b.w * kx, bh = b.h * ky;
      const locked = current.stableMs >= LOCK_MS;
      ctx.lineWidth = 5;
      ctx.strokeStyle = locked ? '#22c55e' : '#ffffff';
      ctx.setLineDash(locked ? [] : [14, 9]);
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, 14);
      ctx.stroke();
      ctx.setLineDash([]);
      // подпись над рамкой
      ctx.font = '800 22px "Factor A", system-ui, sans-serif';
      const text = current.label;
      const tw = ctx.measureText(text).width + 24;
      const ty = Math.max(4, y - 38);
      ctx.fillStyle = locked ? '#22c55e' : '#ffffff';
      ctx.beginPath();
      ctx.roundRect(Math.min(Math.max(4, x), w - tw - 4), ty, tw, 32, 16);
      ctx.fill();
      ctx.fillStyle = locked ? '#ffffff' : '#1e1b4b';
      ctx.fillText(text, Math.min(Math.max(4, x), w - tw - 4) + 12, ty + 23);
    }

    function setHint() {
      hint.textContent = !modelReady
        ? 'Включаю умное зрение…'
        : !current.box ? 'Наведи камеру на предмет'
        : current.stableMs >= LOCK_MS ? 'Нашёл! Нажми «Снять»' : 'Держи ровно…';
    }

    let busy = false;
    const tick = async () => {
      if (!alive) return;
      if (!busy && video.readyState >= 2) {
        busy = true;
        try {
          const f = await findBox();
          const t = tracker.update(f?.box ?? null, performance.now());
          current = { box: t.box, label: f?.label ?? current.label, stableMs: t.stableMs };
        } catch { /* пропускаем кадр */ }
        busy = false;
        if (alive) { draw(); setHint(); }
      }
      setTimeout(tick, TICK_MS);
    };
    setHint();
    video.addEventListener('loadeddata', tick, { once: true });

    overlay.querySelector('.cam-cancel')!.addEventListener('click', () => done(null));
    fileBtn.addEventListener('click', async () => {
      const f = await pickPhotoFile();
      done(f ? { blob: f, cropped: false } : null);
    });
    shoot.addEventListener('click', () => {
      const vw = video.videoWidth, vh = video.videoHeight;
      if (!vw) return;
      // если предмет найден — вырезаем его с запасом, иначе берём весь кадр (дальше будет ручная обрезка)
      const crop = current.box ? expandBox(current.box, MARGIN, { w: vw, h: vh }) : null;
      const c = document.createElement('canvas');
      const r = crop ?? { x: 0, y: 0, w: vw, h: vh };
      c.width = Math.round(r.w);
      c.height = Math.round(r.h);
      c.getContext('2d')!.drawImage(video, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
      c.toBlob((b) => done(b ? { blob: b, cropped: !!crop } : null), 'image/jpeg', 0.92);
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

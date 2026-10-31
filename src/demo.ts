// Техническая страница для проверки распознавания: живая камера или фото, результаты всех моделей игры рядом.
// Не часть игры: открывается по адресу /demo.html.
import { loadCoco, onModelStatus, heavyModelsAllowed, type ModelStatus } from './vision/models';
import { loadClip, rankObjects, clipProb, CLIP_ACCEPT, type ClipRank } from './vision/clip';
import { colorShares, COLOR_SHARE_MIN } from './vision/color';
import { detectYolox, loadYolox } from './vision/yolox';
import { pickDetection } from './camera/detector';
import { CLIP_OBJECTS } from './data/clip';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const LIVE_OK = 0.04;
const CLIP_EVERY_MS = 450;
const COLOR_HEX: Record<string, string> = {
  red: '#e53935', orange: '#fb8c00', yellow: '#fdd835', green: '#43a047', blue: '#1e88e5', purple: '#8e24aa',
  pink: '#ec407a', brown: '#795548', white: '#f5f5f5', black: '#212121', gray: '#9e9e9e',
};

const stage = $('stage');
const video = document.createElement('video');
video.playsInline = true;
video.muted = true;
const still = document.createElement('canvas');
const overlay = document.createElement('canvas');
stage.append(video, still, overlay);
video.hidden = still.hidden = true;

type Src = HTMLVideoElement | HTMLCanvasElement;
let mode: 'none' | 'cam' | 'img' = 'none';
let stream: MediaStream | null = null;
let facing: 'environment' | 'user' = 'environment';
let paused = false;

const targetSel = $<HTMLSelectElement>('target');
targetSel.innerHTML = '<option value="">Цель CLIP: не выбрана</option>' +
  Object.entries(CLIP_OBJECTS).sort((a, b) => a[1].localeCompare(b[1], 'ru')).map(([en, ru]) => `<option value="${en}">${ru} (${en})</option>`).join('');

const on = (id: string) => $<HTMLInputElement>(id).checked;
const ms = (n: number | undefined) => (n === undefined ? '—' : `${Math.round(n)} мс`);
const pct = (p: number) => `${(p * 100).toFixed(p < 0.1 ? 1 : 0)}%`;
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

let mstat: ModelStatus = { coco: 0, clip: 0, backend: '' };
let clipState = heavyModelsAllowed() ? 'загрузка…' : 'отключён (слабое соединение/память)';
const t: Record<string, number> = {};
let fps = 0;
let frames = 0, fpsT = performance.now();

function renderStats() {
  const load = (v: number) => (v >= 1 ? 'готова' : v > 0 ? `${Math.round(v * 100)}%` : 'ожидание');
  const res = mode === 'cam' ? `${video.videoWidth}×${video.videoHeight}` : mode === 'img' ? `${still.width}×${still.height}` : '—';
  $('stats').innerHTML = [
    ['COCO', load(mstat.coco)], ['CLIP', clipState],
    ['backend', mstat.backend || '—'], ['кадр', res], ['циклов/с', fps.toFixed(1)],
  ].map(([k, v]) => `<div><span>${k}:</span> ${v}</div>`).join('');
  $('tCoco').textContent = t.coco !== undefined ? ms(t.coco) : '';
  $('tYolo').textContent = t.yolo !== undefined ? ms(t.yolo) : '';
  $('tClip').textContent = t.clip !== undefined ? ms(t.clip) : '';
}
onModelStatus((s) => { mstat = s; renderStats(); });

const source = (): Src | null => (mode === 'cam' && video.videoWidth ? video : mode === 'img' ? still : null);
const dims = (s: Src) => (s instanceof HTMLVideoElement ? { w: s.videoWidth, h: s.videoHeight } : { w: s.width, h: s.height });

function sizeStage(w: number, h: number) {
  stage.style.aspectRatio = `${w} / ${h}`;
  overlay.width = w;
  overlay.height = h;
}

async function startCam() {
  stopCam();
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  } catch (e) {
    $('empty').textContent = `Камера недоступна: ${(e as Error).message}`;
    return;
  }
  video.srcObject = stream;
  await video.play();
  mode = 'cam';
  video.hidden = false;
  still.hidden = true;
  $('empty').hidden = true;
  $<HTMLButtonElement>('flip').disabled = $<HTMLButtonElement>('pause').disabled = false;
  $('cam').textContent = 'Выключить камеру';
  sizeStage(video.videoWidth || 640, video.videoHeight || 480);
}
function stopCam() {
  stream?.getTracks().forEach((tr) => tr.stop());
  stream = null;
  video.srcObject = null;
  if (mode === 'cam') mode = 'none';
  video.hidden = true;
  $('cam').textContent = 'Включить камеру';
  $<HTMLButtonElement>('flip').disabled = true;
}

$('cam').addEventListener('click', () => { if (stream) { stopCam(); $('empty').hidden = false; } else void startCam(); });
$('flip').addEventListener('click', () => { facing = facing === 'environment' ? 'user' : 'environment'; void startCam(); });
$('pause').addEventListener('click', () => {
  paused = !paused;
  $('pause').textContent = paused ? 'Продолжить' : 'Пауза';
  if (mode === 'cam') { if (paused) video.pause(); else void video.play(); }
});
$('file').addEventListener('change', async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  stopCam();
  const bmp = await createImageBitmap(f);
  const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  still.width = Math.round(bmp.width * k);
  still.height = Math.round(bmp.height * k);
  still.getContext('2d')!.drawImage(bmp, 0, 0, still.width, still.height);
  mode = 'img';
  still.hidden = false;
  $('empty').hidden = true;
  $<HTMLButtonElement>('pause').disabled = true;
  sizeStage(still.width, still.height);
  lastClipAt = 0;
  imgDirty = true;
});

// ---- результаты ----
let clipRanks: ClipRank[] = [];
let lastClipAt = 0;
let imgDirty = false;
let clipBusy = false;

function bars(rows: Array<{ label: string; p: number; ok?: boolean; marks?: number[] }>) {
  return rows.map((r) => `<div class="row"><b title="${esc(r.label)}">${esc(r.label)}</b><div class="bar"><i class="${r.ok ? 'ok' : ''}" style="width:${Math.min(100, r.p * 100)}%"></i>${(r.marks ?? []).map((m) => `<u style="left:${m * 100}%"></u>`).join('')}</div><span>${pct(r.p)}</span></div>`).join('');
}

type Preds = Array<{ bbox: number[]; class: string; score: number }>;
const boxSets: { coco: Preds; yolo: Preds; picked: ReturnType<typeof pickDetection> } = { coco: [], yolo: [], picked: null };

function drawBoxes() {
  const g = overlay.getContext('2d')!;
  g.clearRect(0, 0, overlay.width, overlay.height);
  const lw = Math.max(2, overlay.width / 300);
  const fs = Math.max(12, overlay.width / 40);
  g.font = `${fs}px system-ui, sans-serif`;
  g.textBaseline = 'top';
  const draw = (preds: Preds, kind: 'coco' | 'yolo') => {
    for (const p of preds) {
      const [x, y, w, h] = p.bbox;
      const picked = boxSets.picked;
      const sel = kind === 'coco' && picked && Math.abs(picked.box.x - x) < 0.5 && Math.abs(picked.box.y - y) < 0.5;
      const col = kind === 'yolo' ? '#ff9800' : sel ? '#2ecc71' : '#ffffffaa';
      g.lineWidth = sel ? lw * 1.6 : lw;
      g.strokeStyle = col;
      g.setLineDash(kind === 'yolo' ? [lw * 3, lw * 2] : []);
      g.strokeRect(x, y, w, h);
      g.setLineDash([]);
      const txt = `${kind === 'yolo' ? 'Y ' : ''}${p.class} ${(p.score * 100).toFixed(0)}%`;
      const tw = g.measureText(txt).width + 8;
      const th = fs + 6;
      const ty = kind === 'yolo' ? Math.min(overlay.height - th, y + h) : Math.max(0, y - th); // подписи не слипаются: COCO над рамкой, YOLOX под ней
      g.fillStyle = kind === 'yolo' ? '#ff9800' : sel ? '#2ecc71' : '#000a';
      g.fillRect(x, ty, tw, th);
      g.fillStyle = kind === 'yolo' || sel ? '#000' : '#fff';
      g.fillText(txt, x + 4, ty + 3);
    }
  };
  draw(boxSets.coco, 'coco');
  draw(boxSets.yolo, 'yolo');
  // прицел — центр кадра, по нему игра выбирает рамку
  g.strokeStyle = '#ffffff88';
  g.lineWidth = lw;
  const cx = overlay.width / 2, cy = overlay.height / 2, a = overlay.width / 40;
  g.beginPath(); g.moveTo(cx - a, cy); g.lineTo(cx + a, cy); g.moveTo(cx, cy - a); g.lineTo(cx, cy + a); g.stroke();
}

function renderClip() {
  if (!clipRanks.length) return;
  const target = targetSel.value;
  const rows = clipRanks.slice(0, 8).map((r) => ({ label: r.bg ? `фон: ${r.ru}` : `${r.ru} (${r.en})`, p: clipProb(clipRanks, r.en), ok: !r.bg && clipProb(clipRanks, r.en) >= LIVE_OK, marks: [CLIP_ACCEPT, LIVE_OK] }));
  let extra = '';
  if (target) {
    const p = clipProb(clipRanks, target);
    const rank = clipRanks.findIndex((r) => r.en === target) + 1;
    extra = `<div class="row"><b>▶ цель: ${esc(CLIP_OBJECTS[target] ?? target)} · место ${rank}</b><div class="bar"><i class="${p >= LIVE_OK ? 'ok' : ''}" style="width:${Math.min(100, p * 100)}%"></i><u style="left:${CLIP_ACCEPT * 100}%"></u><u style="left:${LIVE_OK * 100}%"></u></div><span>${pct(p)}</span></div>
      <div class="hint">${p >= LIVE_OK ? '✅ живая камера подсветила бы зелёным' : p >= CLIP_ACCEPT ? '🟡 при проверке фото засчитали бы, живая камера ещё нет' : '❌ не засчитали бы'}</div><hr style="border:0;border-top:1px solid var(--line)">`;
  }
  $('clip').innerHTML = extra + bars(rows);
  $('clip').classList.remove('none');
}
targetSel.addEventListener('change', renderClip);

function renderColors(src: Src) {
  const { w, h } = dims(src);
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(src, 0, 0, w, h, 0, 0, 64, 64);
  const shares = colorShares(g.getImageData(0, 0, 64, 64).data, 64, 64, 0.2);
  const rows = Object.entries(shares).filter(([, v]) => v > 0.005).sort((a, b) => b[1] - a[1]).slice(0, 6);
  $('col').innerHTML = rows.length
    ? rows.map(([k, v]) => `<div class="row"><b><span class="sw" style="background:${COLOR_HEX[k] ?? '#888'}"></span>${k}</b><div class="bar"><i class="${v >= COLOR_SHARE_MIN ? 'ok' : ''}" style="width:${v * 100}%"></i><u style="left:${COLOR_SHARE_MIN * 100}%"></u></div><span>${pct(v)}</span></div>`).join('')
    : 'нет выраженных цветов';
  $('col').classList.remove('none');
}

async function tick() {
  const src = source();
  if (src && !paused && (mode === 'cam' || imgDirty)) {
    const { w, h } = dims(src);
    if (overlay.width !== w || overlay.height !== h) sizeStage(w, h);
    if (on('mCoco')) {
      try {
        const m = await loadCoco();
        const t0 = performance.now();
        const preds = await m.detect(src, 8, 0.25);
        t.coco = performance.now() - t0;
        const picked = pickDetection(preds, { w, h }, {});
        boxSets.coco = preds;
        boxSets.picked = picked;
        drawBoxes();
        $('coco').innerHTML = preds.length
          ? bars(preds.map((p) => ({ label: p.class, p: p.score, ok: picked?.className === p.class && Math.abs(picked.score - p.score) < 1e-6, marks: [0.45] })))
          : 'ничего не найдено (порог показа 0,25)';
        $('coco').classList.toggle('none', !preds.length);
      } catch (e) { $('coco').textContent = `ошибка: ${(e as Error).message}`; }
    } else { boxSets.coco = []; boxSets.picked = null; drawBoxes(); }

    if (on('mYolo')) {
      try {
        await loadYolox();
        const t0 = performance.now();
        const preds = await detectYolox(src, w, h);
        t.yolo = performance.now() - t0;
        boxSets.yolo = preds;
        drawBoxes();
        $('yolo').innerHTML = preds.length ? bars(preds.map((p) => ({ label: p.class, p: p.score, marks: [0.25] }))) : 'ничего не найдено (порог показа 0,25)';
        $('yolo').classList.toggle('none', !preds.length);
      } catch (e) { $('yolo').textContent = `ошибка: ${(e as Error).message}`; }
    } else { boxSets.yolo = []; drawBoxes(); }

    const now = performance.now();

    if (on('mClip') && !clipBusy && (mode === 'img' ? imgDirty : now - lastClipAt > CLIP_EVERY_MS)) {
      clipBusy = true;
      lastClipAt = now;
      void (async () => {
        try {
          await loadClip();
          clipState = 'готов';
          const t0 = performance.now();
          clipRanks = await rankObjects(src, w, h);
          t.clip = performance.now() - t0;
          renderClip();
        } catch (e) {
          clipState = (e as Error).message;
          $('clip').textContent = `недоступен: ${(e as Error).message}`;
        } finally { clipBusy = false; renderStats(); }
      })();
    }
    renderColors(src);
    imgDirty = false;
    frames++;
  }
  const n = performance.now();
  if (n - fpsT > 1000) { fps = (frames * 1000) / (n - fpsT); frames = 0; fpsT = n; renderStats(); }
  setTimeout(tick, mode === 'cam' && !paused ? 0 : 200);
}

renderStats();
void tick();
for (const id of ['mCoco', 'mYolo', 'mClip']) $(id).addEventListener('change', () => { imgDirty = true; lastClipAt = 0; });

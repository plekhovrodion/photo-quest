// YOLOX-s (COCO, 80 классов) на onnxruntime-web. Пока только для демо-страницы: сравнить с COCO-SSD.
// Вход: BGR 0–255 без нормализации, 640×640 с серыми полями (114); выход [1, 8400, 85] — рамки, «предмет» и 80 классов.
import * as ort from 'onnxruntime-web/wasm';
import wasmUrl from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url';

export const YOLOX_URL = `${import.meta.env.BASE_URL}models/yolox/yolox_s.onnx`;
const SIZE = 640;
const STRIDES = [8, 16, 32];

const NAMES = ['person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'];

export interface YoloDet { bbox: number[]; class: string; score: number }

let sessionP: Promise<ort.InferenceSession> | null = null;
export const loadYolox = () => (sessionP ??= (async () => {
  ort.env.wasm.wasmPaths = { wasm: wasmUrl };
  const bytes = await fetch(YOLOX_URL).then((r) => r.arrayBuffer());
  const s = await ort.InferenceSession.create(new Uint8Array(bytes), { executionProviders: ['wasm'] });
  await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', new Float32Array(3 * SIZE * SIZE), [1, 3, SIZE, SIZE]) }); // прогрев
  return s;
})());

let work: HTMLCanvasElement | null = null;
function preprocess(src: CanvasImageSource, w: number, h: number): { data: Float32Array; ratio: number } {
  work ??= Object.assign(document.createElement('canvas'), { width: SIZE, height: SIZE });
  const ctx = work.getContext('2d', { willReadFrequently: true })!;
  const ratio = Math.min(SIZE / w, SIZE / h);
  ctx.fillStyle = 'rgb(114,114,114)';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.drawImage(src, 0, 0, w, h, 0, 0, Math.round(w * ratio), Math.round(h * ratio)); // слева сверху, как в оригинальном YOLOX
  const px = ctx.getImageData(0, 0, SIZE, SIZE).data;
  const n = SIZE * SIZE;
  const data = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) { // BGR, плоскостями
    data[i] = px[i * 4 + 2];
    data[n + i] = px[i * 4 + 1];
    data[2 * n + i] = px[i * 4];
  }
  return { data, ratio };
}

const iou = (a: number[], b: number[]) => {
  const x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]), y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return inter / (a[2] * a[3] + b[2] * b[3] - inter || 1);
};

export async function detectYolox(src: CanvasImageSource, w: number, h: number, minScore = 0.25, maxBoxes = 8): Promise<YoloDet[]> {
  const s = await loadYolox();
  const { data, ratio } = preprocess(src, w, h);
  const out = (await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', data, [1, 3, SIZE, SIZE]) }))[s.outputNames[0]].data as Float32Array;
  const total = out.length / 85;
  // Экспорт без декодирования: рамки заданы смещениями от узлов сетки. Если координаты уже в пикселях, оставляем как есть.
  let decoded = false;
  for (let i = 0; i < total; i += 97) if (out[i * 85] > 20) { decoded = true; break; }
  const cand: YoloDet[] = [];
  let idx = 0;
  const push = (i: number, gx: number, gy: number, stride: number) => {
    const o = i * 85;
    const obj = out[o + 4];
    if (obj < minScore) return;
    let best = 0, bc = 0;
    for (let c = 0; c < 80; c++) if (out[o + 5 + c] > best) { best = out[o + 5 + c]; bc = c; }
    const score = obj * best;
    if (score < minScore) return;
    const cx = decoded ? out[o] : (out[o] + gx) * stride, cy = decoded ? out[o + 1] : (out[o + 1] + gy) * stride;
    const bw = decoded ? out[o + 2] : Math.exp(out[o + 2]) * stride, bh = decoded ? out[o + 3] : Math.exp(out[o + 3]) * stride;
    const x = Math.max(0, (cx - bw / 2) / ratio), y = Math.max(0, (cy - bh / 2) / ratio);
    cand.push({ bbox: [x, y, Math.min(w - x, bw / ratio), Math.min(h - y, bh / ratio)], class: NAMES[bc], score });
  };
  for (const stride of STRIDES) {
    const g = SIZE / stride;
    for (let gy = 0; gy < g; gy++) for (let gx = 0; gx < g; gx++) push(idx++, gx, gy, stride);
  }
  cand.sort((a, b) => b.score - a.score);
  const keep: YoloDet[] = [];
  for (const c of cand) {
    if (keep.every((k) => k.class !== c.class || iou(k.bbox, c.bbox) < 0.45)) keep.push(c);
    if (keep.length >= maxBoxes) break;
  }
  return keep;
}

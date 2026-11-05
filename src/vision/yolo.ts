import * as ort from 'onnxruntime-web';
import wasmMjs from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs?url';
import wasmFile from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url';

const BASE = import.meta.env.BASE_URL ?? '/';
export const YOLO_URL = `${BASE}models/yolov10s.onnx`;
const SIZE = 640;

// COCO class order used by the standard Ultralytics YOLOv10 export.
export const YOLO_CLASSES = 'person,bicycle,car,motorcycle,airplane,bus,train,truck,boat,traffic light,fire hydrant,stop sign,parking meter,bench,bird,cat,dog,horse,sheep,cow,elephant,bear,zebra,giraffe,backpack,umbrella,handbag,tie,suitcase,frisbee,skis,snowboard,sports ball,kite,baseball bat,baseball glove,skateboard,surfboard,tennis racket,bottle,wine glass,cup,fork,knife,spoon,bowl,banana,apple,sandwich,orange,broccoli,carrot,hot dog,pizza,donut,cake,chair,couch,potted plant,bed,dining table,toilet,tv,laptop,mouse,remote,keyboard,cell phone,microwave,oven,toaster,sink,refrigerator,book,clock,vase,scissors,teddy bear,hair drier,toothbrush'.split(',');

export interface YoloPrediction { bbox: number[]; class: string; score: number }
export interface YoloModel { detect(img: HTMLVideoElement | HTMLCanvasElement, maxBoxes?: number, minScore?: number): Promise<YoloPrediction[]> }

let sessionPromise: Promise<ort.InferenceSession> | null = null;
let inputName = '';
let outputName = '';

async function createSession(onProgress?: (progress: number) => void): Promise<ort.InferenceSession> {
  const response = await fetch(YOLO_URL);
  if (!response.ok) throw new Error(`YOLO model: ${response.status}`);
  const reader = response.body?.getReader();
  const total = Number(response.headers.get('content-length')) || 0;
  let buffer: ArrayBuffer;
  if (!reader) { buffer = await response.arrayBuffer(); onProgress?.(0.95); }
  else {
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); received += value.byteLength;
      onProgress?.(total ? Math.min(0.95, received / total * 0.95) : 0);
    }
    const bytes = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    buffer = bytes.buffer;
    onProgress?.(0.95);
  }
  // Prefer WebGPU, keeping a WASM fallback for browsers/devices without WebGPU.
  if ('gpu' in navigator) {
    try {
      const gpu = await ort.InferenceSession.create(new Uint8Array(buffer), { executionProviders: ['webgpu'] });
      inputName = gpu.inputNames[0]; outputName = gpu.outputNames[0];
      return gpu;
    } catch { /* use WASM below */ }
  }
  ort.env.wasm.wasmPaths = { wasm: wasmFile, mjs: wasmMjs };
  ort.env.wasm.numThreads = 1;
  const wasm = await ort.InferenceSession.create(new Uint8Array(buffer), { executionProviders: ['wasm'] });
  inputName = wasm.inputNames[0]; outputName = wasm.outputNames[0];
  return wasm;
}

export function loadYolo(onProgress?: (progress: number) => void): Promise<YoloModel> {
  sessionPromise ??= createSession(onProgress);
  const attempt = sessionPromise;
  return attempt.then((session) => ({
    async detect(img, maxBoxes = 8, minScore = 0.25) {
      const w = img instanceof HTMLVideoElement ? img.videoWidth : img.width;
      const h = img instanceof HTMLVideoElement ? img.videoHeight : img.height;
      if (!w || !h) return [];
      const canvas = document.createElement('canvas'); canvas.width = SIZE; canvas.height = SIZE;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      // Model export uses 640x640 input. Stretching is compatible with the common ONNX export.
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      const pixels = ctx.getImageData(0, 0, SIZE, SIZE).data;
      const plane = SIZE * SIZE, input = new Float32Array(3 * plane);
      for (let i = 0; i < plane; i++) {
        input[i] = pixels[i * 4] / 255;
        input[plane + i] = pixels[i * 4 + 1] / 255;
        input[2 * plane + i] = pixels[i * 4 + 2] / 255;
      }
      const tensor = new ort.Tensor('float32', input, [1, 3, SIZE, SIZE]);
      let result: ort.Tensor;
      try { result = (await session.run({ [inputName]: tensor }))[outputName]; }
      finally { tensor.dispose(); }
      try {
        const data = result.data as Float32Array;
        const dims = result.dims;
        const rows = dims[dims.length - 2], cols = dims[dims.length - 1];
        const transposed = rows > cols; // standard YOLOv8 [1,84,8400]; YOLOv10 end-to-end [1,300,6]
        const count = transposed ? cols : rows, width = transposed ? rows : cols;
        const at = (r: number, c: number) => transposed ? data[c * rows + r] : data[r * cols + c];
        const preds: YoloPrediction[] = [];
        for (let r = 0; r < count; r++) {
          if (width < 6) continue;
          const endToEnd = width === 6;
          let score: number, cls: number, cx: number, cy: number, bw: number, bh: number;
          if (endToEnd) {
            cx = at(r, 0); cy = at(r, 1); bw = at(r, 2) - cx; bh = at(r, 3) - cy;
            score = at(r, 4); cls = Math.round(at(r, 5));
          } else {
            cx = at(r, 0); cy = at(r, 1); bw = at(r, 2); bh = at(r, 3);
            score = 0; cls = 0;
            for (let c = 4; c < width; c++) if (at(r, c) > score) { score = at(r, c); cls = c - 4; }
          }
          if (score < minScore || !YOLO_CLASSES[cls]) continue;
          const scaleX = w / SIZE, scaleY = h / SIZE;
          preds.push({ bbox: [(cx - bw / 2) * scaleX, (cy - bh / 2) * scaleY, bw * scaleX, bh * scaleY], class: YOLO_CLASSES[cls], score });
        }
        return preds.sort((a, b) => b.score - a.score).slice(0, maxBoxes);
      } finally { result.dispose(); }
    },
  }), (error) => { if (sessionPromise === attempt) sessionPromise = null; throw error; });
}

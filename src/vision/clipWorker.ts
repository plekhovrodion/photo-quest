// CLIP в отдельном потоке: расчёт картинки занимает 0,2–1 секунду, и на основном потоке экран и камера замирали бы.
import * as ort from 'onnxruntime-web/wasm';
import mjsUrl from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs?url';
import wasmUrl from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url';

const SIZE = 224;
let session: ort.InferenceSession | null = null;

const normalize = (v: Float32Array): Float32Array => {
  let s = 0;
  for (const x of v) s += x * x;
  const n = Math.sqrt(s) || 1;
  return v.map((x) => x / n);
};

const handleMessage = async (e: MessageEvent<{ type: 'init'; bytes: ArrayBuffer } | { type: 'run'; id: number; pixels: Float32Array }>) => {
  const m = e.data;
  try {
    if (m.type === 'init') {
      ort.env.wasm.wasmPaths = { wasm: wasmUrl, mjs: mjsUrl };
      ort.env.wasm.numThreads = 1;
      session = await ort.InferenceSession.create(new Uint8Array(m.bytes), { executionProviders: ['wasm'] });
      const input = new ort.Tensor('float32', new Float32Array(3 * SIZE * SIZE), [1, 3, SIZE, SIZE]);
      try {
        const out = await session.run({ pixel_values: input });
        Object.values(out).forEach((tensor) => tensor.dispose());
      } finally { input.dispose(); }
      (self as unknown as Worker).postMessage({ type: 'ready' });
    } else if (session) {
      const input = new ort.Tensor('float32', m.pixels, [1, 3, SIZE, SIZE]);
      let emb: Float32Array;
      try {
        const out = await session.run({ pixel_values: input });
        try { emb = normalize(out.image_embeds.data as Float32Array); }
        finally { Object.values(out).forEach((tensor) => tensor.dispose()); }
      } finally { input.dispose(); }
      (self as unknown as Worker).postMessage({ type: 'result', id: m.id, emb }, [emb.buffer]);
    } else {
      throw new Error('CLIP session is not initialized');
    }
  } catch (err) {
    (self as unknown as Worker).postMessage({ type: 'error', id: (m as { id?: number }).id, message: String(err) });
  }
};

// Один общий сеанс используется и при быстрых переходах между заданиями.
// Сообщения async onmessage сами по себе не сериализуются.
let queue = Promise.resolve();
self.onmessage = (event) => { queue = queue.then(() => handleMessage(event)); };

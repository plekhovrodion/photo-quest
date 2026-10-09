// CLIP в отдельном потоке: расчёт картинки занимает 0,2–1 секунду, и на основном потоке экран и камера замирали бы.
import * as ort from 'onnxruntime-web/wasm';
import wasmUrl from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url';

const SIZE = 224;
let session: ort.InferenceSession | null = null;

const normalize = (v: Float32Array): Float32Array => {
  let s = 0;
  for (const x of v) s += x * x;
  const n = Math.sqrt(s) || 1;
  return v.map((x) => x / n);
};

self.onmessage = async (e: MessageEvent<{ type: 'init'; modelUrl: string } | { type: 'run'; id: number; pixels: Float32Array }>) => {
  const m = e.data;
  try {
    if (m.type === 'init') {
      ort.env.wasm.wasmPaths = { wasm: wasmUrl };
      ort.env.wasm.numThreads = 1;
      const bytes = await fetch(m.modelUrl).then((r) => r.arrayBuffer());
      session = await ort.InferenceSession.create(new Uint8Array(bytes), { executionProviders: ['wasm'] });
      await session.run({ pixel_values: new ort.Tensor('float32', new Float32Array(3 * SIZE * SIZE), [1, 3, SIZE, SIZE]) }); // прогрев
      (self as unknown as Worker).postMessage({ type: 'ready' });
    } else if (session) {
      const out = await session.run({ pixel_values: new ort.Tensor('float32', m.pixels, [1, 3, SIZE, SIZE]) });
      const emb = normalize(out.image_embeds.data as Float32Array);
      (self as unknown as Worker).postMessage({ type: 'result', id: m.id, emb }, [emb.buffer]);
    }
  } catch (err) {
    (self as unknown as Worker).postMessage({ type: 'error', id: (m as { id?: number }).id, message: String(err) });
  }
};

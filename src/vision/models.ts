// Runtime status and loading helpers for the single recognition model: CLIP.
import { prepareModelCache } from './modelCache';

export type ClipStage = 'idle' | 'download' | 'initialize' | 'warmup' | 'ready';
export interface ModelStatus { clip: number; clipStage: ClipStage; clipError?: string }
const status: ModelStatus = { clip: 0, clipStage: 'idle' };
const listeners = new Set<(s: ModelStatus) => void>();
const emit = () => listeners.forEach((listener) => listener({ ...status }));

export const modelStatus = (): ModelStatus => ({ ...status });
export function onModelStatus(cb: (s: ModelStatus) => void): () => void {
  listeners.add(cb);
  cb({ ...status });
  return () => { listeners.delete(cb); };
}

// Download CLIP weights with byte-level progress and return their bytes.
export async function fetchWithProgress(url: string, _key: 'clip', signal?: AbortSignal): Promise<ArrayBuffer> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body?.getReader();
  if (!reader) return res.arrayBuffer();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    if (total) { status.clip = Math.min(0.95, got / total); emit(); }
  }
  const out = new Uint8Array(got);
  let at = 0;
  for (const chunk of chunks) { out.set(chunk, at); at += chunk.length; }
  return out.buffer;
}

export function setClipReady(): void { status.clip = 1; status.clipStage = 'ready'; status.clipError = undefined; emit(); }
export function setClipLoading(): void { status.clip = 0; status.clipStage = 'download'; status.clipError = undefined; emit(); }
export function setClipStage(stage: ClipStage): void { status.clipStage = stage; emit(); }
export function setClipError(error: unknown): void { status.clip = 0; status.clipError = String(error); emit(); }

// Start loading CLIP in the background; task entry can await the same in-flight promise.
export function preloadModels(): void {
  void prepareModelCache()
    .then(() => import('./clip'))
    .then((clip) => clip.loadClip())
    .catch(() => {});
}

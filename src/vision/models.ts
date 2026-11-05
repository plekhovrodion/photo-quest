import { loadYolo, type YoloModel } from './yolo';

export type DetectorModel = YoloModel;
export interface ModelStatus { detector: number; progress: number; backend: string; detectorError?: string }
const status: ModelStatus = { detector: 0, progress: 0, backend: '' };
const listeners = new Set<(s: ModelStatus) => void>();
const emit = () => listeners.forEach((listener) => listener({ ...status }));

export const modelStatus = (): ModelStatus => ({ ...status });
export function onModelStatus(callback: (s: ModelStatus) => void): () => void {
  listeners.add(callback);
  callback({ ...status });
  return () => { listeners.delete(callback); };
}

let detectorPromise: Promise<DetectorModel> | null = null;
export function loadDetectorModel(): Promise<DetectorModel> {
  if (!detectorPromise) {
    status.progress = 0; status.detectorError = undefined; emit();
    detectorPromise = loadYolo((progress) => { status.progress = progress; emit(); }).then((model) => {
      status.backend = 'onnxruntime-web'; status.detector = 1; status.progress = 1; status.detectorError = undefined; emit();
      return model;
    });
  }
  detectorPromise.catch((error) => {
    if (detectorPromise) detectorPromise = null;
    status.detector = 0; status.detectorError = String(error); emit();
  });
  return detectorPromise;
}

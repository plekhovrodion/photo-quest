import type { Box } from './box';
import type { Target } from './target';
import { matchesLabels } from '../vision/labels';

// COCO-SSD (80 классов) грузится лениво и только когда открыта живая камера.
type Coco = { detect(img: HTMLVideoElement, maxBoxes?: number, minScore?: number): Promise<Array<{ bbox: number[]; class: string; score: number }>> };
let modelPromise: Promise<Coco> | null = null;

export function loadDetector(): Promise<Coco> {
  modelPromise ??= (async () => {
    const [tf, coco] = await Promise.all([import('@tensorflow/tfjs'), import('@tensorflow-models/coco-ssd')]);
    await tf.ready();
    return coco.load({ base: 'lite_mobilenet_v2' }) as unknown as Coco;
  })();
  modelPromise.catch(() => { modelPromise = null; });
  return modelPromise;
}

export interface Detection { box: Box; className: string; score: number }

const MIN_SCORE = 0.45;

// Людей не подсвечиваем и не вырезаем: это детская игра, в рамке должны быть только предметы.
const IGNORED = new Set(['person']);

// Выбор лучшей рамки: предпочитаем класс, подходящий под задание, затем крупный предмет ближе к центру.
export function pickDetection(
  preds: Array<{ bbox: number[]; class: string; score: number }>,
  frame: { w: number; h: number },
  target: Target,
): Detection | null {
  let best: { d: Detection; rank: number } | null = null;
  for (const p of preds) {
    if (IGNORED.has(p.class) || p.score < MIN_SCORE) continue;
    const [x, y, w, h] = p.bbox;
    const cx = x + w / 2, cy = y + h / 2;
    const dist = Math.hypot((cx - frame.w / 2) / frame.w, (cy - frame.h / 2) / frame.h); // 0 в центре
    const size = (w * h) / (frame.w * frame.h);
    const matches = target.words?.length && matchesLabels([{ className: p.class, probability: 1 }], target.words) ? 1 : 0;
    const rank = matches * 2 + p.score + Math.min(size, 0.5) - dist;
    if (!best || rank > best.rank) best = { d: { box: { x, y, w, h }, className: p.class, score: p.score }, rank };
  }
  return best?.d ?? null;
}

export async function detectObject(video: HTMLVideoElement, target: Target): Promise<Detection | null> {
  const model = await loadDetector();
  const preds = await model.detect(video, 6, MIN_SCORE);
  return pickDetection(preds, { w: video.videoWidth, h: video.videoHeight }, target);
}

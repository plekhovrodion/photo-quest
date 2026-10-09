import type { Box } from './box';
import type { Target } from './target';
import { matchesLabels } from '../vision/labels';

import { loadCoco, type CocoModel } from '../vision/models';

export const loadDetector = (): Promise<CocoModel> => loadCoco();

export interface Detection { box: Box; className: string; score: number }

const MIN_SCORE = 0.45;

// Людей не подсвечиваем и не вырезаем: это детская игра, в рамке должны быть только предметы.
const IGNORED = new Set(['person']);

// Выбор лучшей рамки по прицелу: предмет должен быть у центра кадра (там ребёнок держит находку).
// Класс из задания важнее положения; всё далеко от центра отбрасываем.
export const MAX_CENTER_DIST = 0.4; // доля диагонали кадра

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
    const dist = Math.hypot((cx - frame.w / 2) / frame.w, (cy - frame.h / 2) / frame.h);
    const holdsCenter = frame.w / 2 >= x && frame.w / 2 <= x + w && frame.h / 2 >= y && frame.h / 2 <= y + h;
    const matches = target.words?.length && matchesLabels([{ className: p.class, probability: 1 }], target.words) ? 1 : 0;
    if (!matches && !holdsCenter && dist > MAX_CENTER_DIST) continue; // далеко от прицела и не из задания
    const size = Math.min((w * h) / (frame.w * frame.h), 0.5);
    const rank = matches * 2 + (holdsCenter ? 0.8 : 0) + p.score + size * 0.5 - dist * 1.5;
    if (!best || rank > best.rank) best = { d: { box: { x, y, w, h }, className: p.class, score: p.score }, rank };
  }
  return best?.d ?? null;
}

// Последние «сырые» предсказания детектора — для отладочной панели (?debug=1).
export let lastPreds: Array<{ bbox: number[]; class: string; score: number }> = [];

export async function detectObject(video: HTMLVideoElement, target: Target): Promise<Detection | null> {
  const model = await loadDetector();
  const preds = await model.detect(video, 8, 0.25);
  lastPreds = preds;
  return pickDetection(preds, { w: video.videoWidth, h: video.videoHeight }, target);
}

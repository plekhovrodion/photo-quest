export interface Box { x: number; y: number; w: number; h: number }

const area = (b: Box) => b.w * b.h;

// Пересечение рамок / объединение: 1 — совпадают, 0 — не пересекаются.
export function iou(a: Box, b: Box): number {
  const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  const union = area(a) + area(b) - inter;
  return union > 0 ? inter / union : 0;
}

// Рамка вокруг предмета с запасом по краям (доля от размера), не выходящая за кадр.
export function expandBox(b: Box, margin: number, frame: { w: number; h: number }, minSide = 64): Box {
  const mx = b.w * margin, my = b.h * margin;
  let x0 = Math.max(0, b.x - mx), y0 = Math.max(0, b.y - my);
  let x1 = Math.min(frame.w, b.x + b.w + mx), y1 = Math.min(frame.h, b.y + b.h + my);
  // слишком маленькую рамку растягиваем до минимума вокруг её центра
  if (x1 - x0 < minSide) { const c = (x0 + x1) / 2; x0 = Math.max(0, c - minSide / 2); x1 = Math.min(frame.w, x0 + minSide); }
  if (y1 - y0 < minSide) { const c = (y0 + y1) / 2; y0 = Math.max(0, c - minSide / 2); y1 = Math.min(frame.h, y0 + minSide); }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export const centerBox = (frame: { w: number; h: number }, share = 0.6): Box => {
  const w = frame.w * share, h = frame.h * share;
  return { x: (frame.w - w) / 2, y: (frame.h - h) / 2, w, h };
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpBox = (a: Box, b: Box, t: number): Box => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) });

// Сглаживает дрожание рамки между кадрами и считает, как долго она стоит почти на месте («захват» цели).
export class BoxTracker {
  private cur: Box | null = null;
  private since = 0;

  constructor(private alpha = 0.35, private jumpIou = 0.3, private calmIou = 0.8) {}

  update(next: Box | null, now: number): { box: Box | null; stableMs: number } {
    if (!next) {
      this.cur = null;
      return { box: null, stableMs: 0 };
    }
    // новая цель или резкий скачок — начинаем заново
    if (!this.cur || iou(this.cur, next) < this.jumpIou) {
      this.cur = next;
      this.since = now;
      return { box: next, stableMs: 0 };
    }
    if (iou(this.cur, next) < this.calmIou) this.since = now; // рамка заметно двигается
    this.cur = lerpBox(this.cur, next, this.alpha);
    return { box: this.cur, stableMs: now - this.since };
  }

  reset() { this.cur = null; this.since = 0; }
}

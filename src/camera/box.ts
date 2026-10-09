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

// Следит за найденной рамкой: детектор присылает её несколько раз в секунду, а на экране рамка плавно
// «догоняет» цель на каждом кадре отрисовки. Пропуски детектора (до ghostMs) не сбрасывают рамку,
// а время, пока цель почти не двигается, показывает, что предмет «захвачен».
export class BoxFollower {
  private target: Box | null = null;
  private shown: Box | null = null;
  private lastSeen = 0;
  private since = 0;
  private lastFrame: number | null = null;

  constructor(private tauMs = 90, private ghostMs = 450, private jumpIou = 0.25, private calmIou = 0.8) {}

  // Результат детектора: рамка предмета или null, если в этот раз ничего не найдено.
  observe(box: Box | null, now: number): void {
    if (box) {
      if (!this.target || iou(this.target, box) < this.jumpIou) {
        this.target = box; // новая цель: рамка плавно переедет на неё
        this.since = now;
      } else {
        if (iou(this.target, box) < this.calmIou) this.since = now; // цель заметно двигается
        this.target = lerpBox(this.target, box, 0.5);
      }
      this.lastSeen = now;
    } else if (this.target && now - this.lastSeen > this.ghostMs) {
      this.target = null;
    }
  }

  // Кадр отрисовки: плавное приближение к цели (зависит от времени, а не от числа кадров).
  frame(now: number): { box: Box | null; stableMs: number; ghost: boolean } {
    if (!this.target) {
      this.shown = null;
      this.lastFrame = now;
      return { box: null, stableMs: 0, ghost: false };
    }
    const dt = this.lastFrame === null ? 0 : Math.max(0, now - this.lastFrame);
    this.lastFrame = now;
    this.shown = this.shown ? lerpBox(this.shown, this.target, 1 - Math.exp(-dt / this.tauMs)) : this.target;
    return { box: this.shown, stableMs: now - this.since, ghost: now - this.lastSeen > 120 };
  }

  // Текущая рамка (для обрезки по кнопке «Снять»).
  current(): Box | null { return this.shown ?? this.target; }

  reset(): void { this.target = null; this.shown = null; this.since = 0; this.lastSeen = 0; }
}

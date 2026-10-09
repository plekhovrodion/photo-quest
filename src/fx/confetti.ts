const COLORS = ['#ff5a5f', '#ffb400', '#2eb872', '#3b82f6', '#a855f7', '#ff7a1a'];

// Короткий салют из конфетти поверх экрана; сам убирает canvas по окончании.
export function confetti(durationMs = 1600): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  const parts = Array.from({ length: 90 }, () => ({
    x: canvas.width / 2, y: canvas.height * 0.4,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
    s: 6 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
    c: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));
  const start = performance.now();
  const frame = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of parts) {
      p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.max(0, 1 - t / durationMs);
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    if (t < durationMs) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

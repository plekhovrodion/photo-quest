import { backgroundFor } from '../data/backgrounds';

// Два слоя, которые плавно перекрывают друг друга при смене фона.
let layers: HTMLElement[] = [];
let active = -1;
let current = '';

function ensure(): HTMLElement[] {
  if (layers.length) return layers;
  const wrap = document.createElement('div');
  wrap.id = 'bg';
  wrap.setAttribute('aria-hidden', 'true');
  layers = [0, 1].map(() => {
    const l = document.createElement('div');
    l.className = 'bg-layer';
    wrap.appendChild(l);
    return l;
  });
  document.body.prepend(wrap);
  return layers;
}

export function setBackground(levelId: string | null): void {
  const bg = backgroundFor(levelId);
  // На экранах категорий фон крупнее и «шумнее» (в нём есть персонажи), поэтому затемняем его под интерфейс.
  ensure()[0].parentElement?.classList.toggle('dim', levelId !== null);
  const key = `${bg.file}|${bg.pos}|${bg.filter ?? ''}`;
  if (key === current) return;
  current = key;
  const [a, b] = ensure();
  const next = active === 0 ? b : a;
  const prev = active === 0 ? a : b;
  next.style.backgroundImage = `url('/art/${bg.file}')`;
  next.style.backgroundPosition = bg.pos;
  next.style.filter = bg.filter ?? 'none';
  next.classList.add('on');
  prev.classList.remove('on');
  active = active === 0 ? 1 : 0;
}

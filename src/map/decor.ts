// Декор для пустых мест экрана: планеты, кометы, звёзды. Плоская графика в цветах игры.
let uid = 0;

export function planetSvg(c1: string, c2: string, opts: { ring?: string; spots?: boolean; cls?: string } = {}): string {
  const id = `pl${++uid}`;
  const ring = opts.ring
    ? `<ellipse cx="100" cy="100" rx="96" ry="22" fill="none" stroke="${opts.ring}" stroke-width="8" opacity=".85" transform="rotate(-18 100 100)"/>`
    : '';
  const ringFront = opts.ring
    ? `<path d="M6 107A96 22 0 0 0 194 93" fill="none" stroke="${opts.ring}" stroke-width="8" opacity=".95" transform="rotate(-18 100 100)"/>`
    : '';
  const spots = opts.spots
    ? `<ellipse cx="78" cy="86" rx="14" ry="9" fill="#000" opacity=".12"/><ellipse cx="118" cy="122" rx="18" ry="11" fill="#000" opacity=".12"/><ellipse cx="124" cy="78" rx="8" ry="5" fill="#000" opacity=".12"/>`
    : '';
  return `<svg class="${opts.cls ?? 'deco-svg'}" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
    <defs><radialGradient id="${id}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs>
    ${opts.ring ? ring : ''}<circle cx="100" cy="100" r="62" fill="url(#${id})"/>${spots}
    <ellipse cx="82" cy="74" rx="16" ry="9" fill="#fff" opacity=".28" transform="rotate(-30 82 74)"/>${ringFront}</svg>`;
}

export const cometSvg = (cls = 'deco-svg') => `<svg class="${cls}" viewBox="0 0 200 80" aria-hidden="true" focusable="false">
  <defs><linearGradient id="cmt${++uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fde68a" stop-opacity=".95"/></linearGradient></defs>
  <path d="M0 40 L150 28 L150 52 Z" fill="url(#cmt${uid})"/><circle cx="160" cy="40" r="20" fill="#fde68a"/><circle cx="154" cy="34" r="7" fill="#fff" opacity=".6"/></svg>`;

export const sparkSvg = (cls = 'deco-svg') => `<svg class="${cls}" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
  <path d="M20 0l4.500 15.500L40 20l-15.500 4.500L20 40l-4.500-15.500L0 20l15.500-4.500z" fill="#fff" opacity=".85"/></svg>`;

// Набор декора для главной: слева и справа в пустых полях.
export function menuDecor(): string {
  return `<div class="deco" aria-hidden="true">
    <span class="d d1">${planetSvg('#fbcfe8', '#db2777', { ring: '#fde68a', spots: false })}</span>
    <span class="d d2">${planetSvg('#a7f3d0', '#047857', { spots: true })}</span>
    <span class="d d3">${planetSvg('#bfdbfe', '#2563eb', { ring: '#c4b5fd', spots: true })}</span>
    <span class="d d4">${cometSvg()}</span>
    <span class="d d5">${sparkSvg()}</span><span class="d d6">${sparkSvg()}</span><span class="d d7">${sparkSvg()}</span>
  </div>`;
}

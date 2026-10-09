// Шапки и значки для завриков: плоские яркие картинки, рисуются поверх персонажа.
const svg = (inner: string, cls: string) => `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${inner}</svg>`;

const HATS: Record<string, string> = {
  party: `<path d="M50 6L82 88H18z" fill="#f59e0b" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
    <path d="M36 52l28 0M30 70l40 0" stroke="#fff" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="8" r="8" fill="#ec4899" stroke="#fff" stroke-width="3"/>`,
  cap: `<path d="M16 70c0-30 20-48 44-48s28 18 28 48z" fill="#2563eb" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
    <path d="M8 70h92c0 8-10 12-30 12H20c-8 0-12-5-12-12z" fill="#1e40af" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><circle cx="52" cy="22" r="5" fill="#fff"/>`,
  crown: `<path d="M12 80V30l22 20 16-34 16 34 22-20v50z" fill="#fbbf24" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="34" cy="64" r="5" fill="#ef4444"/><circle cx="50" cy="64" r="5" fill="#3b82f6"/><circle cx="66" cy="64" r="5" fill="#22c55e"/>`,
};

const BADGES: Record<string, string> = {
  star: `<circle cx="50" cy="50" r="44" fill="#7c3aed" stroke="#fff" stroke-width="6"/><path d="M50 20l8 19 21 2-16 14 5 20-18-11-18 11 5-20-16-14 21-2z" fill="#fde047"/>`,
  bolt: `<circle cx="50" cy="50" r="44" fill="#db2777" stroke="#fff" stroke-width="6"/><path d="M56 16L30 54h18l-6 30 28-42H52z" fill="#fff"/>`,
  heart: `<circle cx="50" cy="50" r="44" fill="#16a34a" stroke="#fff" stroke-width="6"/><path d="M50 74C26 58 24 40 36 32c7-4 12 0 14 5 2-5 7-9 14-5 12 8 10 26-14 42z" fill="#fff"/>`,
};

export const hatSvg = (id: string, cls = 'acc-hat') => (HATS[id] ? svg(HATS[id], cls) : '');
export const badgeSvg = (id: string, cls = 'acc-badge') => (BADGES[id] ? svg(BADGES[id], cls) : '');

// Фоновый узор места: кружки, квадраты, треугольники, плюсы и кольца, немного фигур в плитке 320×320.
// Цвет берём из тона фона места (shadow), чтобы узор был «тон в тон», а карточки оставались главными.
type Shape = 'dot' | 'square' | 'tri' | 'plus' | 'ring' | 'wave';

const SLOTS: Array<[number, number]> = [ // x, y: от краёв плитки не ближе 24, чтобы фигуры не обрезались при повторе
  [40, 40], [128, 56], [84, 98], [36, 136], [136, 138],
];

const SETS: Record<string, Shape[]> = {
  kitchen: ['dot', 'square', 'ring', 'plus', 'dot', 'tri', 'square', 'ring', 'plus'],
  colors: ['ring', 'dot', 'tri', 'dot', 'square', 'plus', 'ring', 'dot', 'tri'],
  room: ['square', 'plus', 'dot', 'ring', 'tri', 'dot', 'square', 'wave', 'ring'],
  school: ['tri', 'dot', 'plus', 'square', 'ring', 'dot', 'wave', 'tri', 'square'],
  bath: ['ring', 'dot', 'wave', 'dot', 'ring', 'dot', 'ring', 'wave', 'dot'],
  hall: ['plus', 'square', 'dot', 'tri', 'ring', 'square', 'dot', 'plus', 'tri'],
  food: ['dot', 'ring', 'square', 'dot', 'wave', 'plus', 'dot', 'tri', 'ring'],
  outdoor: ['tri', 'dot', 'ring', 'plus', 'dot', 'wave', 'tri', 'dot', 'square'],
};

function shape(kind: Shape, x: number, y: number): string {
  const at = `transform="translate(${x} ${y}) scale(1.5)"`;
  switch (kind) {
    case 'dot': return `<circle ${at} r="7"/>`;
    case 'ring': return `<circle ${at} r="9" fill="none" stroke-width="4"/>`;
    case 'square': return `<rect ${at} x="-8" y="-8" width="16" height="16" rx="3"/>`;
    case 'tri': return `<path ${at} d="M0 -10 L10 8 L-10 8 Z" stroke-linejoin="round"/>`;
    case 'plus': return `<path ${at} d="M0 -10 V10 M-10 0 H10" fill="none" stroke-width="4" stroke-linecap="round"/>`;
    case 'wave': return `<path ${at} d="M-12 0 Q-6 -8 0 0 T12 0" fill="none" stroke-width="4" stroke-linecap="round"/>`;
  }
}

// Насыщенный жёлтый фон «Еды» даёт слишком яркий узор: там он вдвое бледнее.
const OPACITY: Record<string, number> = { food: 0.1 };

// CSS-значение для background-image (url с inline-SVG)
export function locPattern(id: string, color: string): string {
  const set = SETS[id] ?? SETS.kitchen;
  const body = SLOTS.map(([x, y], i) => shape(set[i % set.length], x, y)).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 180 180"><g fill="${color}" stroke="${color}" opacity="${OPACITY[id] ?? 0.2}">${body}</g></svg>`;
  return `url('data:image/svg+xml,${encodeURIComponent(svg)}')`;
}

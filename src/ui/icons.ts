// Собственные иконки вместо эмодзи: одинаково выглядят на любых устройствах и в любой теме.
const svg = (inner: string, vb = '0 0 24 24', cls = 'ico') =>
  `<svg class="${cls}" viewBox="${vb}" aria-hidden="true" focusable="false">${inner}</svg>`;

const INK = '#1e1b4b';

// Вспышка — внутренняя валюта
export const flashIcon = () =>
  svg(`<path d="M13.6 1.5 4.4 13.4h6.1l-1.7 9.1 9.3-12.1h-6.1z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>`, '0 0 24 24', 'ico ico-flash');

export const cameraIcon = () =>
  svg(`<path d="M4 8h3l1.6-2.4h6.8L17 8h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 20H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 8z" fill="currentColor"/>
    <circle cx="12" cy="13.5" r="3.9" fill="#ede9fe"/><circle cx="12" cy="13.5" r="2" fill="currentColor"/>`);

export const speakerIcon = () =>
  svg(`<path d="M3 9.5h3.6L11.5 5v14l-4.9-4.5H3z" fill="currentColor"/>
    <path d="M15 8.6a5 5 0 0 1 0 6.8M17.6 6a8.6 8.6 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`);

export const bulbIcon = () =>
  svg(`<path d="M12 2.5a6.5 6.5 0 0 0-3.7 11.8c.7.5 1.2 1.3 1.2 2.2v.5h5v-.5c0-.9.5-1.7 1.2-2.2A6.5 6.5 0 0 0 12 2.5z" fill="currentColor"/>
    <path d="M9.5 19.5h5M10.3 21.7h3.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`);

export const imageIcon = () =>
  svg(`<rect x="3" y="4.5" width="18" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/>
    <circle cx="9" cy="10" r="1.7" fill="currentColor"/><path d="M4 18l5-5 3 3 3.5-4L20 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`);

export const shopIcon = () =>
  svg(`<path d="M5 8.5h14l-1.1 11a1.5 1.5 0 0 1-1.5 1.4H7.6a1.5 1.5 0 0 1-1.5-1.4z" fill="currentColor"/>
    <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`);

// Иконки категорий на верхней грани куба (viewBox 64x64): однотонные, цвет задаёт CSS (currentColor).
const cat = (inner: string) => svg(inner, '0 0 64 64', 'ico ico-cat');
const L = 'fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"';
const LEVEL_ICONS: Record<string, string> = {
  // три пересекающихся круга — смешение цветов
  colors: cat(`<circle cx="24" cy="26" r="15" ${L}/><circle cx="40" cy="26" r="15" ${L}/><circle cx="32" cy="41" r="15" ${L}/>`),
  // треугольник, квадрат, круг
  shapes: cat(`<polygon points="32,7 45,29 19,29" ${L}/><rect x="9" y="36" width="20" height="20" rx="3" ${L}/><circle cx="46" cy="46" r="10" ${L}/>`),
  // блеск — свойства предметов
  properties: cat(`<path d="M30 5l5.5 17.5L53 28l-17.5 5.5L30 51l-5.5-17.5L7 28l17.5-5.5z" fill="currentColor"/>
    <path d="M50 38l2.4 7.1 7.1 2.4-7.1 2.4L50 57l-2.4-7.1-7.1-2.4 7.1-2.4z" fill="currentColor"/>`),
  // карандаш — предметы и их назначение
  functions: cat(`<path d="M11 53l4-13L42 13a5 5 0 0 1 7 0l2 2a5 5 0 0 1 0 7L24 49z" fill="currentColor"/><path d="M12 53l10-3-7-7z" fill="currentColor" opacity=".55"/>`),
  // два соединённых элемента — сочетания
  combos: cat(`<rect x="7" y="9" width="30" height="30" rx="6" ${L}/><rect x="27" y="25" width="30" height="30" rx="6" ${L}/>`),
  // цифры — счёт
  counting: cat(`<text x="32" y="42" text-anchor="middle" font-size="28" font-weight="900" fill="currentColor" font-family="'Factor A', system-ui, sans-serif">123</text>`),
};

export const levelIcon = (id: string): string => LEVEL_ICONS[id] ?? '';

export const starIcon = () =>
  svg(`<path d="M12 2.2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.8l1.4-6.8L2.2 9.3l6.9-.8z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>`);

export const checkIcon = () =>
  svg(`<path d="M4.5 12.8l5 5 10-11" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`);

export const closeIcon = () =>
  svg(`<path d="M5.5 5.5l13 13M18.5 5.5l-13 13" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>`);

export const backIcon = () =>
  svg(`<path d="M20 12H5M11.5 5.5L5 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`);

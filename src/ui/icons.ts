// Собственные иконки вместо эмодзи: одинаково выглядят на любых устройствах и в любой теме.
const svg = (inner: string, vb = '0 0 24 24', cls = 'ico') =>
  `<svg class="${cls}" viewBox="${vb}" aria-hidden="true" focusable="false">${inner}</svg>`;

const INK = '#1e1b4b';

// Вспышка — внутренняя валюта
export const flashIcon = () =>
  svg(`<path d="M13.5 1.5 4.5 13.2h6l-1.6 9.3 9.4-12.3h-6.2z" fill="#fbbf24" stroke="#b45309" stroke-width="1.6" stroke-linejoin="round"/>`, '0 0 24 24', 'ico ico-flash');

export const cameraIcon = () =>
  svg(`<path d="M4 8h3l1.6-2.4h6.8L17 8h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 20H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 8z" fill="currentColor"/>
    <circle cx="12" cy="13.5" r="3.9" fill="#ede9fe"/><circle cx="12" cy="13.5" r="2" fill="currentColor"/>`);

export const speakerIcon = () =>
  svg(`<path d="M3 9.5h3.6L11.5 5v14l-4.9-4.5H3z" fill="currentColor"/>
    <path d="M15 8.6a5 5 0 0 1 0 6.8M17.6 6a8.6 8.6 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`);

export const bulbIcon = () =>
  svg(`<path d="M12 2.5a6.5 6.5 0 0 0-3.7 11.8c.7.5 1.2 1.3 1.2 2.2v.5h5v-.5c0-.9.5-1.7 1.2-2.2A6.5 6.5 0 0 0 12 2.5z" fill="#fde68a" stroke="#b45309" stroke-width="1.5"/>
    <path d="M9.5 19.5h5M10.3 21.7h3.4" stroke="#b45309" stroke-width="1.6" stroke-linecap="round"/>`);

export const imageIcon = () =>
  svg(`<rect x="3" y="4.5" width="18" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/>
    <circle cx="9" cy="10" r="1.7" fill="currentColor"/><path d="M4 18l5-5 3 3 3.5-4L20 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`);

export const shopIcon = () =>
  svg(`<path d="M5 8.5h14l-1.1 11a1.5 1.5 0 0 1-1.5 1.4H7.6a1.5 1.5 0 0 1-1.5-1.4z" fill="currentColor"/>
    <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`);

// Иконки категорий на верхней грани куба (viewBox 64x64)
const cat = (inner: string) => svg(inner, '0 0 64 64', 'ico ico-cat');
const O = `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;
const LEVEL_ICONS: Record<string, string> = {
  // три пересекающихся круга — смешение цветов
  colors: cat(`<circle cx="24" cy="26" r="15" fill="#ef4444" ${O}/><circle cx="40" cy="26" r="15" fill="#facc15" ${O} opacity=".92"/>
    <circle cx="32" cy="41" r="15" fill="#3b82f6" ${O} opacity=".92"/>`),
  // круг, квадрат, треугольник
  shapes: cat(`<polygon points="32,6 46,30 18,30" fill="#fb7185" ${O}/><rect x="8" y="34" width="22" height="22" rx="3" fill="#38bdf8" ${O}/>
    <circle cx="46" cy="45" r="11" fill="#facc15" ${O}/>`),
  // блеск — свойства предметов
  properties: cat(`<path d="M30 4l5.5 17.5L53 27l-17.5 5.5L30 50l-5.5-17.5L7 27l17.5-5.5z" fill="#fde68a" ${O}/>
    <path d="M50 38l2.4 7.1 7.1 2.4-7.1 2.4L50 57l-2.4-7.1-7.1-2.4 7.1-2.4z" fill="#fff" ${O} stroke-width="2.4"/>`),
  // карандаш — предметы и их назначение
  functions: cat(`<path d="M10 54l4-14 30-30a5 5 0 0 1 7 0l3 3a5 5 0 0 1 0 7L24 50z" fill="#facc15" ${O}/>
    <path d="M10 54l4-14 10 10z" fill="#fecdd3" ${O}/><path d="M44 10l10 10" ${O} fill="none"/>`),
  // два соединённых элемента — сочетания
  combos: cat(`<rect x="6" y="10" width="30" height="30" rx="6" fill="#a78bfa" ${O}/><rect x="28" y="24" width="30" height="30" rx="6" fill="#f472b6" ${O}/>
    <path d="M32 30h8M36 26v8" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`),
  // цифры — счёт
  counting: cat(`<rect x="4" y="12" width="56" height="40" rx="9" fill="#fff" ${O}/>
    <text x="32" y="43" text-anchor="middle" font-size="26" font-weight="900" fill="${INK}" font-family="'Factor A', system-ui, sans-serif">123</text>`),
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

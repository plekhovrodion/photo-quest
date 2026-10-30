// Собственные иконки вместо эмодзи: одинаково выглядят на любых устройствах и в любой теме.
const svg = (inner: string, vb = '0 0 24 24', cls = 'ico') =>
  `<svg class="${cls}" viewBox="${vb}" aria-hidden="true" focusable="false">${inner}</svg>`;

// Вспышка — внутренняя валюта: аккуратная молния со скруглёнными углами, цвет задаёт CSS (currentColor)
export const flashIcon = () =>
  svg(`<path d="M13.4 2.2c.5-.6 1.5-.1 1.3.7l-1.3 6.6h4.6c.8 0 1.2.9.7 1.5l-8.5 10.9c-.5.6-1.5.1-1.3-.7l1.4-7H5.7c-.8 0-1.2-.9-.7-1.5z" fill="currentColor"/>`, '0 0 24 24', 'ico ico-flash');

export const starIcon = () =>
  svg(`<path d="M12 2.2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.8l1.4-6.8L2.2 9.3l6.9-.8z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>`);

export const checkIcon = () =>
  svg(`<path class="tick" pathLength="1" d="M4.5 12.8l5 5 10-11" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`);

export const backIcon = () =>
  svg(`<path d="M20 12H5M11.5 5.5L5 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`);

export const lockIcon = () =>
  svg(`<rect x="4.5" y="10.5" width="15" height="11" rx="2.6" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>`);


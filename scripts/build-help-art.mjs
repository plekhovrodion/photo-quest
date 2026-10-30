// Рисует анимированные подсказки «как включить камеру» для каждого браузера: public/art/help/camera-<ключ>.svg
// Запуск: node scripts/build-help-art.mjs
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

// SVG в <img> не видит шрифты страницы, поэтому Factor A вшиваем прямо в файл
const font = (w) => readFileSync(`public/fonts/FactorA-${w}.woff2`).toString('base64');
const FONT_CSS = `@font-face{font-family:'Factor A';font-weight:400;src:url(data:font/woff2;base64,${font('Regular')}) format('woff2')}@font-face{font-family:'Factor A';font-weight:700;src:url(data:font/woff2;base64,${font('Bold')}) format('woff2')}text{font-family:'Factor A',system-ui,sans-serif}`;

const OUT = 'public/art/help';
const DUR = 7;
const frames = (a) => a.join(';');

// glyph: что рисуем в иконке слева от адреса
const GLYPH = {
  tune: (x, y) => `<g stroke="#4a5070" stroke-width="1.6" stroke-linecap="round"><path d="M${x - 5} ${y - 3}h10M${x - 5} ${y + 3}h10"/></g><circle cx="${x + 2}" cy="${y - 3}" r="2" fill="#4a5070"/><circle cx="${x - 2}" cy="${y + 3}" r="2" fill="#4a5070"/>`,
  lock: (x, y) => `<rect x="${x - 4}" y="${y - 1}" width="8" height="6" rx="1.5" fill="#4a5070"/><path d="M${x - 2.5} ${y - 1}v-2a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="#4a5070" stroke-width="1.5"/>`,
  aa: (x, y) => `<text x="${x}" y="${y + 3.5}" text-anchor="middle" font-size="10" font-weight="700" fill="#4a5070">Aa</text>`,
};

const SCENES = {
  chrome:  { w: 320, h: 200, bar: [0, 0, 320, 28], icon: [20, 14], glyph: 'tune', host: 'Сайт', menu: [10, 34, 190, 70], ctrl: 'toggle', title: 'Настройки сайта' },
  yandex:  { w: 320, h: 200, bar: [0, 0, 320, 28], icon: [20, 14], glyph: 'lock', host: 'Сайт', menu: [10, 34, 190, 70], ctrl: 'toggle', title: 'Защищённое соединение' },
  firefox: { w: 320, h: 200, bar: [0, 0, 320, 28], icon: [20, 14], glyph: 'lock', host: 'Сайт', menu: [10, 34, 190, 70], ctrl: 'pill', title: 'Разрешения сайта' },
  safari:  { w: 320, h: 200, bar: [0, 0, 320, 28], icon: [20, 14], glyph: 'aa', host: 'Сайт', menu: [10, 34, 190, 70], ctrl: 'pill', title: 'Настройки веб-сайта' },
  android: { w: 320, h: 200, phone: [105, 4, 110, 192], bar: [105, 10, 110, 24], icon: [118, 22], glyph: 'tune', host: 'Сайт', menu: [111, 40, 98, 66], ctrl: 'toggle', title: 'Разрешения', small: true },
  ios:     { w: 320, h: 200, phone: [105, 4, 110, 192], bar: [105, 166, 110, 24], icon: [120, 178], glyph: 'aa', host: 'Сайт', menu: [111, 96, 98, 66], ctrl: 'pill', title: 'Настройки сайта', small: true },
};

function scene(s) {
  const [bx, by, bw, bh] = s.bar;
  const [ix, iy] = s.icon;
  const [mx, my, mw, mh] = s.menu;
  const ctrlX = mx + mw - 30; // правый край контрола
  const rowY = my + mh - 24;   // строка «Камера»
  const t = (k) => `keyTimes="${k}" dur="${DUR}s" repeatCount="indefinite"`;
  const fs = s.small ? 8 : 10;
  const phone = s.phone
    ? `<rect x="${s.phone[0]}" y="${s.phone[1]}" width="${s.phone[2]}" height="${s.phone[3]}" rx="14" fill="#0f1b4d" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>` : '';
  const addr = s.phone
    ? `<rect x="${ix + 14}" y="${by + 4}" width="${bw - 40}" height="${bh - 8}" rx="6" fill="#fff"/><text x="${ix + 22}" y="${by + bh / 2 + 3}" font-size="7" fill="#3b4259">${s.host}</text>`
    : `<rect x="40" y="4" width="220" height="20" rx="10" fill="#fff"/><text x="54" y="18" font-size="10" fill="#3b4259">${s.host}</text><circle cx="290" cy="14" r="5" fill="none" stroke="#6b7490" stroke-width="1.6"/>`;
  const barFill = `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" ${s.phone ? 'rx="8"' : ''} fill="#e8ecf7"/>`;
  const control = s.ctrl === 'toggle'
    ? `<rect x="${ctrlX}" y="${rowY - 7}" width="24" height="14" rx="7"><animate attributeName="fill" values="${frames(['#b8bfd6', '#b8bfd6', '#34c759', '#34c759', '#b8bfd6'])}" ${t('0;0.52;0.58;0.92;1')}/></rect>
       <circle cy="${rowY}" r="5.5" fill="#fff"><animate attributeName="cx" values="${frames([ctrlX + 7, ctrlX + 7, ctrlX + 17, ctrlX + 17, ctrlX + 7])}" ${t('0;0.52;0.58;0.92;1')}/></circle>`
    : `<rect x="${ctrlX - 18}" y="${rowY - 8}" width="42" height="16" rx="8" fill="#eef0fa"/>
       <text x="${ctrlX + 3}" y="${rowY + 3}" text-anchor="middle" font-size="${fs - 1}" font-weight="700" fill="#4a5070"><animate attributeName="opacity" values="1;1;0;0;1" ${t('0;0.52;0.57;0.92;1')}/>Блок</text>
       <text x="${ctrlX + 3}" y="${rowY + 3}" text-anchor="middle" font-size="${fs - 1}" font-weight="700" fill="#2a9d4c"><animate attributeName="opacity" values="0;0;1;1;0" ${t('0;0.52;0.57;0.92;1')}/>Да</text>`;
  // курсор: стартует справа, идёт к иконке, клик, идёт к контролю в меню, клик
  const cx0 = s.phone ? ix + 70 : 200, cy0 = s.phone ? iy - 40 : 120;
  const tx = ctrlX + 10, ty = rowY + 2;
  const cursorPath = [[cx0, cy0], [cx0, cy0], [ix + 2, iy + 2], [ix + 2, iy + 2], [ix + 20, my + 30], [tx, ty], [tx, ty], [tx, ty], [cx0, cy0]];
  const cursorKeys = '0;0.08;0.2;0.27;0.4;0.5;0.58;0.92;1';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s.w} ${s.h}" width="${s.w}" height="${s.h}">
<defs><style>${FONT_CSS}</style><radialGradient id="g" cx="30%" cy="20%" r="110%"><stop offset="0" stop-color="#3556b8"/><stop offset=".7" stop-color="#1c2f78"/></radialGradient></defs>
<rect width="${s.w}" height="${s.h}" fill="url(#g)"/>
${phone}${barFill}${addr}
<rect x="${ix - 12}" y="${iy - 9}" width="24" height="18" rx="9" fill="#d6dbf0"/>
${GLYPH[s.glyph](ix, iy)}
<circle cx="${ix}" cy="${iy}" r="3" fill="#8a5eff" opacity="0"><animate attributeName="r" values="3;3;16;16" ${t('0;0.26;0.34;1')}/><animate attributeName="opacity" values="0;0;.5;0;0" ${t('0;0.26;0.3;0.38;1')}/></circle>
<g opacity="0"><animate attributeName="opacity" values="0;0;1;1;0;0" ${t('0;0.28;0.34;0.94;0.98;1')}/>
<rect x="${mx}" y="${my}" width="${mw}" height="${mh}" rx="10" fill="#fff"/>
<text x="${mx + 10}" y="${my + 16}" font-size="${fs}" font-weight="700" fill="#221c5f">${s.title}</text>
<path d="M${mx + 10} ${my + 24}h${mw - 20}" stroke="#e3e6f3"/>
<text x="${mx + 10}" y="${rowY + 3.5}" font-size="${fs}" fill="#221c5f">Камера</text>
${control}</g>
<g><animateTransform attributeName="transform" type="translate" values="${cursorPath.map((p) => p.join(' ')).join(';')}" ${t(cursorKeys)}/>
<path transform="translate(-4 -1)" d="M8 1.5a1.6 1.6 0 0 1 3.2 0V8l1.1-.5a1.5 1.5 0 0 1 1.900.5l.4-.1a1.500 1.500 0 0 1 1.900 1l.3-.1a1.500 1.500 0 0 1 1.700 1.500V15c0 3-1.800 5.500-5 5.500H11c-2 0-3.200-1-4.200-2.600l-2.600-4.200a1.400 1.400 0 0 1 2-1.800L8 13.200z" fill="#fff" stroke="#221c5f" stroke-width="1.2" stroke-linejoin="round"/></g>
</svg>
`;
}

mkdirSync(OUT, { recursive: true });
for (const [key, s] of Object.entries(SCENES)) writeFileSync(`${OUT}/camera-${key}.svg`, scene(s));
console.log('ok:', Object.keys(SCENES).join(', '));

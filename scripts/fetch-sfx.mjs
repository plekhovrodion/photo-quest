// Скачивает звуки интерфейса из библиотеки Uchi Sound Lab (m4a/AAC: играет и в Safari на iPhone) в public/sfx.
// Список и число вариантов — в src/audio/sfx.ts (SFX). Запуск: node scripts/fetch-sfx.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'https://uchi-sounds.art-iskandirov.chatgpt.site/audio';
const src = (await import('node:fs')).readFileSync('src/audio/sfx.ts', 'utf8');
const table = src.match(/export const SFX = \{([\s\S]*?)\} as const/)[1];
const list = [...table.matchAll(/'?([a-z-]+)'?:\s*(\d+)/g)].map((m) => [m[1], Number(m[2])]);

mkdirSync('public/sfx', { recursive: true });
let ok = 0;
for (const [name, n] of list) {
  for (let i = 0; i < n; i++) {
    const res = await fetch(`${BASE}/${name}-${i}.m4a`);
    if (!res.ok) { console.error(`✗ ${name}-${i}.m4a ${res.status}`); continue; }
    writeFileSync(`public/sfx/${name}-${i}.m4a`, Buffer.from(await res.arrayBuffer()));
    ok++;
  }
}
console.log(`Скачано файлов: ${ok}`);

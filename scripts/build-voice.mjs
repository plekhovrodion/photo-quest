// Озвучка через ElevenLabs: генерирует mp3 для всех фраз игры в public/voice и обновляет src/data/voice-manifest.json.
// Нужен Node 22.18+ (читает .ts напрямую) и ключ ElevenLabs в окружении (в чат и в git его не кладём):
//
//   ELEVENLABS_API_KEY=sk_... ELEVENLABS_VOICE_ID=<id голоса Гриши> node scripts/build-voice.mjs [--dry] [--force] [--only=praise,word-]
//
// Всё озвучивает один голос (Гриша), в том числе фразы Сони и английские слова: модель eleven_multilingual_v2 читает оба языка.
//
// --dry    только показать, что и сколько знаков будет озвучено (ключ не нужен)
// --force  перезаписать уже существующие файлы (по умолчанию готовые пропускаются)
// --limit=N озвучить только первые N новых записей (для пробы)
// Ключ и голос можно положить в файл .env.voice рядом с package.json (он в .gitignore), тогда в командной строке их писать не нужно:
//   ELEVENLABS_API_KEY=sk_...
//   ELEVENLABS_VOICE_ID=...
// --only   озвучить только файлы, имя которых начинается с одной из приставок
// Что озвучивается: фразы (data/phrases.ts), задания (data/tasks.ts), английские слова (data/english.ts).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

// .env.voice: простые строки KEY=VALUE, уже заданные в окружении переменные не перезаписываются
if (existsSync('.env.voice')) {
  for (const line of readFileSync('.env.voice', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const OUT = 'public/voice';
const MANIFEST = 'src/data/voice-manifest.json';
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const EN_MODEL = process.env.ELEVENLABS_EN_MODEL || 'eleven_turbo_v2_5';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const force = args.includes('--force');
const limit = Number((args.find((a) => a.startsWith('--limit=')) ?? '').slice(8)) || Infinity;
const only = (args.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);

const { ALL_PHRASES } = await import('../src/data/phrases.ts');
const { SLIDES } = await import('../src/onboarding.ts');
const { LEVELS } = await import('../src/data/tasks.ts');
const { ENGLISH } = await import('../src/data/english.ts');

// Старые записи (task-red.mp3, task-blue.mp3) оставляем под прежними именами
const LEGACY = { 'color-red': 'task-red', 'color-blue': 'task-blue' };

const items = [];
for (const p of ALL_PHRASES) items.push({ file: p.id, text: p.text, voice: p.who, table: 'say' });
SLIDES.forEach((sl, i) => items.push({ file: `onboard-${i + 1}`, text: sl.text, voice: sl.who === 'Соня' ? 'sonya' : 'grisha', table: 'say' }));
for (const l of LEVELS) for (const t of l.tasks) items.push({ file: LEGACY[t.id] ?? `task-${t.id}`, text: t.prompt, voice: 'grisha', table: 'say' });
for (const [id, w] of Object.entries(ENGLISH)) items.push({ file: `word-${id.replace(/^(color|object)-/, '')}`, text: w.en, voice: 'en', table: 'en' });

// Один текст — одна запись (одинаковые задания в разных местах)
const seen = new Map();
const unique = items.filter((i) => {
  const key = `${i.table}|${i.text}`;
  if (seen.has(key)) return false;
  seen.set(key, i.file);
  return true;
});

const todo = unique.filter((i) => !only.length || only.some((o) => i.file.startsWith(o)));
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

const pending = todo.filter((i) => force || !existsSync(`${OUT}/${i.file}.mp3`)).slice(0, limit);
const chars = pending.reduce((n, i) => n + i.text.length, 0);
console.log(`Всего записей: ${unique.length}, к озвучке: ${pending.length} (${chars} знаков), готовых пропущено: ${todo.length - pending.length}`);
if (dry) {
  for (const i of pending) console.log(`  ${i.file}.mp3 ${i.text}`);
  process.exit(0);
}

const key = process.env.ELEVENLABS_API_KEY;
if (!key) { console.error('Задайте ELEVENLABS_API_KEY'); process.exit(1); }
if (!VOICE_ID) { console.error('Задайте ELEVENLABS_VOICE_ID (id голоса Гриши)'); process.exit(1); }

mkdirSync(OUT, { recursive: true });
let failed = 0;
for (const i of pending) {
  // Часть моделей принимает не все voice_settings (например, только готовые значения stability): при отказе повторяем без них
  const request = (withSettings) => fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: i.text,
      // английские слова: модель с жёсткой привязкой к языку, иначе короткое слово (cup) голос читает с русским акцентом («цап»)
      model_id: i.voice === 'en' ? EN_MODEL : MODEL,
      ...(i.voice === 'en' && { language_code: 'en' }),
      ...(withSettings && {
        // английские слова: стабильнее и медленнее, чтобы ребёнок расслышал
        voice_settings: i.voice === 'en' ? { stability: 0.7, similarity_boost: 0.8, style: 0.1 } : { stability: 0.45, similarity_boost: 0.8, style: 0.35 },
      }),
    }),
  });
  let res = await request(true);
  if (res.status === 400 || res.status === 422) {
    const detail = await res.clone().text();
    if (/voice_settings|stability|similarity|style/i.test(detail)) { console.log(`  (модель ${MODEL} не принимает настройки голоса, повторяю без них)`); res = await request(false); }
  }
  if (!res.ok) {
    failed++;
    const body = (await res.text()).slice(0, 300);
    console.error(`✗ ${i.file}: ${res.status} ${body}`);
    if (res.status === 401 || res.status === 402 || /authentication|quota|payment/i.test(body)) break; // ключ или лимит: дальше нет смысла
    continue;
  }
  const type = res.headers.get('content-type') ?? '';
  const bytes = Buffer.from(await res.arrayBuffer());
  if (!type.startsWith('audio/')) {
    // например страница «Access restricted»: ElevenLabs не принимает соединения из ряда стран, включая Россию
    console.error(`✗ ${i.file}: пришло не аудио (${type || 'без типа'}): ${bytes.toString('utf8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 160)}`);
    failed++;
    break;
  }
  writeFileSync(`${OUT}/${i.file}.mp3`, bytes);
  console.log(`✓ ${i.file}.mp3  ${i.text}`);
}

// Манифест: что реально лежит в public/voice
const manifest = { say: {}, en: {} };
for (const i of unique) if (existsSync(`${OUT}/${i.file}.mp3`)) manifest[i.table][i.text] = i.file;
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Манифест обновлён: ${Object.keys(manifest.say).length} фраз, ${Object.keys(manifest.en).length} слов.${failed ? ` Ошибок: ${failed}.` : ''}`);

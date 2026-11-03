import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'vite';

const args = process.argv.slice(2);
const value = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const port = Number(value('--port', '4179')) || 4179;
const limit = Math.max(0, Number(value('--limit', '0')) || 0);
const dataRoot = resolve(process.cwd(), '.eval-data');
const reportPath = resolve(dataRoot, 'open-images/report.json');
const chromePath = value('--chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
if (!existsSync(chromePath)) throw new Error(`Chrome не найден: ${chromePath}. Передайте путь через --chrome`);
mkdirSync(resolve(dataRoot, 'open-images'), { recursive: true });

let finish;
const completed = new Promise((resolvePromise) => { finish = resolvePromise; });
const mime = { '.jpg': 'image/jpeg', '.jsonl': 'application/x-ndjson', '.json': 'application/json', '.csv': 'text/csv' };
const benchmarkPlugin = {
  name: 'photo-quest-benchmark',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.method === 'POST' && req.url === '/eval-result') {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          writeFileSync(reportPath, `${JSON.stringify(JSON.parse(body), null, 2)}\n`);
          res.statusCode = 204; res.end(); finish();
        });
        return;
      }
      if (!req.url?.startsWith('/eval-data/')) { next(); return; }
      const relative = decodeURIComponent(req.url.slice('/eval-data/'.length).split('?')[0]);
      const path = resolve(dataRoot, relative);
      if (!path.startsWith(`${dataRoot}/`) || !existsSync(path)) { res.statusCode = 404; res.end('not found'); return; }
      res.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream');
      createReadStream(path).pipe(res);
    });
  },
};

const server = await createServer({ server: { host: '127.0.0.1', port, strictPort: true }, plugins: [benchmarkPlugin] });
await server.listen();
const url = `http://127.0.0.1:${port}/photo_quest/eval.html?manifest=${encodeURIComponent('/eval-data/open-images/manifest.jsonl')}&limit=${limit}`;
console.log(`Benchmark: ${url}`);
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu-sandbox', '--enable-webgl', '--use-gl=swiftshader',
  `--user-data-dir=/private/tmp/photo-quest-eval-${process.pid}`, url,
], { stdio: ['ignore', 'ignore', 'pipe'] });
chrome.stderr.on('data', (data) => {
  const line = String(data);
  if (/ERROR|FATAL/.test(line) && !/bus.cc|policy_logger/.test(line)) process.stderr.write(line);
});

const timeout = setTimeout(() => finish(), 30 * 60 * 1000);
await completed;
clearTimeout(timeout);
chrome.kill('SIGTERM');
await server.close();
if (!existsSync(reportPath)) throw new Error('Benchmark завершился без отчёта');
const report = JSON.parse(await import('node:fs').then((m) => m.readFileSync(reportPath, 'utf8')));
if (report.fatal) throw new Error(report.fatal);
console.log(`Готово: ${report.total} примеров; COCO ${Math.round(report.overall.coco * 100)}%; CLIP кадр ${Math.round(report.overall.clipFull * 100)}%; CLIP объект ${Math.round(report.overall.clipCrop * 100)}%; игра ${Math.round(report.overall.gameFull * 100)}%`);
console.log(`Отчёт: ${reportPath}`);

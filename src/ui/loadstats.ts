// Данные о загрузке игры: сколько и чего скачано, сколько ждали, на каком соединении и устройстве.
// Смотреть: консоль (таблица после загрузки), адрес с ?stats (плашка поверх игры), localStorage `pq-load-log` (последние 20 запусков).
export interface LoadReport {
  at: string;
  marks: Record<string, number>; // метки времени, мс от начала навигации
  bytes: Record<string, { n: number; kb: number }>; // скачано по типам файлов
  totalKb: number;
  requests: number;
  net: { type?: string; downlinkMbps?: number; rttMs?: number; saveData?: boolean };
  device: { memoryGb?: number; cores?: number; ua: string; viewport: string };
}

const marks: Record<string, number> = {};
export const mark = (name: string) => { marks[name] = Math.round(performance.now()); };

const kindOf = (name: string): string => {
  if (/\/models\//.test(name)) return 'модели';
  if (/\/voice\//.test(name)) return 'голос';
  if (/\/(sfx|music)\//.test(name)) return 'звуки и музыка';
  if (/\.(js|wasm)(\?|$)/.test(name)) return /\.wasm/.test(name) ? 'wasm' : 'js';
  if (/\.css/.test(name)) return 'css';
  if (/\.(woff2?|ttf)/.test(name)) return 'шрифты';
  if (/\.(svg|png|jpe?g|webp)/.test(name)) return 'картинки';
  return 'прочее';
};

export function loadReport(): LoadReport {
  const bytes: LoadReport['bytes'] = {};
  let total = 0;
  const rs = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  for (const r of rs) {
    const k = kindOf(r.name);
    const kb = Math.round((r.transferSize || r.encodedBodySize || 0) / 1024);
    (bytes[k] ??= { n: 0, kb: 0 }).n++;
    bytes[k].kb += kb;
    total += kb;
  }
  const c = (navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean }; deviceMemory?: number }).connection;
  return {
    at: new Date().toISOString(),
    marks: { ...marks },
    bytes, totalKb: total, requests: rs.length,
    net: { type: c?.effectiveType, downlinkMbps: c?.downlink, rttMs: c?.rtt, saveData: c?.saveData },
    device: {
      memoryGb: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
      cores: navigator.hardwareConcurrency,
      ua: navigator.userAgent, viewport: `${innerWidth}×${innerHeight}@${devicePixelRatio}`,
    },
  };
}

export function saveReport(): LoadReport {
  const r = loadReport();
  try {
    const log = JSON.parse(localStorage.getItem('pq-load-log') ?? '[]') as LoadReport[];
    log.push(r);
    localStorage.setItem('pq-load-log', JSON.stringify(log.slice(-20)));
  } catch { /* хранилище недоступно: просто не сохраняем */ }
  console.info('[загрузка]', r.marks, `${r.totalKb} КБ, ${r.requests} запросов`);
  console.table(r.bytes);
  (window as unknown as { __loadReport?: () => LoadReport }).__loadReport = loadReport;
  return r;
}

// Плашка со статистикой: открывается по ?stats и обновляется, пока идёт фоновая загрузка.
export function showStatsOverlay(): void {
  if (!/[?&]stats\b/.test(location.search)) return;
  const el = document.createElement('pre');
  el.style.cssText = 'position:fixed;left:4px;right:4px;bottom:4px;z-index:200;margin:0;padding:8px;max-height:46vh;overflow:auto;border-radius:10px;background:rgba(20,16,50,.88);color:#fff;font:11px/14px ui-monospace,monospace;white-space:pre-wrap';
  const paint = () => {
    const r = loadReport();
    const rows = Object.entries(r.bytes).sort((a, b) => b[1].kb - a[1].kb).map(([k, v]) => `${k.padEnd(16)} ${String(v.n).padStart(3)} шт ${String(v.kb).padStart(6)} КБ`);
    el.textContent = [
      Object.entries(r.marks).map(([k, v]) => `${k}: ${(v / 1000).toFixed(2)} с`).join('  '),
      `${r.requests} запросов, ${(r.totalKb / 1024).toFixed(1)} МБ`, ...rows,
      `сеть: ${r.net.type ?? '?'} ${r.net.downlinkMbps ?? '?'} Мбит/с, rtt ${r.net.rttMs ?? '?'} мс${r.net.saveData ? ', экономия трафика' : ''}`,
      `устройство: ${r.device.memoryGb ?? '?'} ГБ, ${r.device.cores ?? '?'} ядер, ${r.device.viewport}`,
    ].join('\n');
  };
  paint();
  setInterval(paint, 1000);
  document.body.appendChild(el);
}

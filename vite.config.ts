import { defineConfig, loadEnv } from 'vite';

// Туннели вроде trycloudflare.com приходят с чужим Host; .local — имя Mac в домашней сети (Bonjour).
// Без allowedHosts Vite такие запросы блокирует.
const allowedHosts = ['.trycloudflare.com', '.local'];

export default defineConfig(({ mode }) => {
    const envs = Object.assign(process.env, loadEnv(mode, process.cwd()));
    return {
      base: `${(envs.VITE_BASE_PATH || '/photo_quest').replace(/\/+$/, '')}/`,
      server: {
        host: true,
        port: 5173,
        allowedHosts,
        // Телефон ходит только на Vite; запросы к API проксируются на бэкенд photo-quest-api (как шлюз Учи: префикс /photo_quest срезается).
        proxy: { '/photo_quest/api': { target: process.env.API_PROXY_TARGET || 'http://localhost:8081', rewrite: (p: string) => p.replace(/^\/photo_quest/, '') } },
      },
      build: { rollupOptions: { input: { main: 'index.html', demo: 'demo.html' } } },
      preview: { host: true, port: 4173, allowedHosts },
    }
});

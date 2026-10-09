import { defineConfig } from 'vite';

// Туннели вроде trycloudflare.com приходят с чужим Host; без allowedHosts Vite их блокирует.
const allowedHosts = ['.trycloudflare.com'];

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    allowedHosts,
    // Телефон ходит только на Vite; запросы к API проксируются на бэкенд.
    proxy: { '/photo-quests/api': 'http://localhost:3001' },
  },
  preview: { host: true, port: 4173, allowedHosts },
});

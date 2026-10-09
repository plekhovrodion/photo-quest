import { defineConfig } from 'vite';

// Туннели вроде trycloudflare.com приходят с чужим Host; .local — имя Mac в домашней сети (Bonjour).
// Без allowedHosts Vite такие запросы блокирует.
const allowedHosts = ['.trycloudflare.com', '.local'];

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

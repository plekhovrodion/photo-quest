import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    // Телефон ходит только на Vite; запросы к API проксируются на бэкенд.
    proxy: { '/photo-quests/api': 'http://localhost:3001' },
  },
});

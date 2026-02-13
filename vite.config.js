import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/Claude-code/',
  server: {
    port: 3000,
  },
});

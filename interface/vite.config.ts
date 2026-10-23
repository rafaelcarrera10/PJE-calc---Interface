import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Em desenvolvimento a interface roda na 5173 e repassa /v1 para a API local (8080).
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: { '/v1': { target: 'http://127.0.0.1:8080', changeOrigin: true } },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});

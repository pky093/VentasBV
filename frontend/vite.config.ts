import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@ventasbv/contracts': path.resolve(__dirname, './src/contracts/index.ts'),
      '@ventasbv/ui': path.resolve(__dirname, './src/components/ui/index.tsx')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api/dni': {
        target: 'https://api.apis.net.pe/v1/dni',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dni/, ''),
      },
      '/api/ruc': {
        target: 'https://api.apis.net.pe/v1/ruc',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ruc/, ''),
      },
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
});

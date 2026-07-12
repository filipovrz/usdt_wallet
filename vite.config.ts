import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'electron-html',
      transformIndexHtml(html) {
        // file:// in Electron cannot load crossorigin assets
        return html.replace(/\s+crossorigin(="[^"]*")?/g, '');
      },
    },
  ],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    modulePreload: false,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});

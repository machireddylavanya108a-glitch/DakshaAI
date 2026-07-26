import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 14173,
    strictPort: false,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('pdfjs-dist')) {
            return 'pdfjs';
          }
          if (id.includes('mammoth') || id.includes('jszip')) {
            return 'doc-parsers';
          }
          if (id.includes('three') || id.includes('@react-three')) {
            return 'three-core';
          }
          if (id.includes('openai')) {
            return 'ai-core';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
})

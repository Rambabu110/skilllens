import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/positions': 'http://127.0.0.1:8000',
      '/auth': 'http://127.0.0.1:8000',
      '/competency': 'http://127.0.0.1:8000',
      '/gaps': 'http://127.0.0.1:8000',
      '/recommendations': 'http://127.0.0.1:8000',
      '/quiz': 'http://127.0.0.1:8000',
      '/viva': 'http://127.0.0.1:8000',
      '/mock-igot': 'http://127.0.0.1:8000',
      '/admin': 'http://127.0.0.1:8000',
      '/export': 'http://127.0.0.1:8000',
      '/learning-path': 'http://127.0.0.1:8000',
      '/gamification': 'http://127.0.0.1:8000',
      '/notifications': 'http://127.0.0.1:8000',
      '/certificate': 'http://127.0.0.1:8000',
      '/verify': 'http://127.0.0.1:8000',
      '/diagnostic': 'http://127.0.0.1:8000',
      '/readiness': 'http://127.0.0.1:8000',
    },
  },
  build: {
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split vendor libraries using function syntax (required by rolldown/vite 8)
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'firebase-vendor'
            if (id.includes('recharts') || id.includes('d3-')) return 'chart-vendor'
            if (id.includes('react-dom') || id.includes('react-router')) return 'react-vendor'
            if (id.includes('lucide')) return 'icons-vendor'
            return 'vendor'
          }
        },
      },
    },
  },
})

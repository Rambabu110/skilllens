import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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

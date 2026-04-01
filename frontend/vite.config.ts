import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 56000,
    proxy: {
      '/api': {
        target: 'http://localhost:55999',
        changeOrigin: true,
      },
    },
  },
})

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5174,
    allowedHosts: ['superinnocent-violeta-laggingly.ngrok-free.dev'],
    headers: { 'ngrok-skip-browser-warning': 'true' },
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
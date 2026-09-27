import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Бэкенд из docker compose слушает 8000; при запуске uvicorn на хосте задайте
  // API_PROXY_TARGET=http://127.0.0.1:8001 в frontend/.env.local
  const apiTarget = env.API_PROXY_TARGET || 'http://127.0.0.1:8000'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      // Для браузера фронт и API живут на одном адресе: не нужен CORS,
      // а refresh-cookie с Path=/api/v1/auth работает без настроек
      proxy: {
        '/api': apiTarget,
        '/health': apiTarget,
        '/ready': apiTarget,
      },
    },
  }
})

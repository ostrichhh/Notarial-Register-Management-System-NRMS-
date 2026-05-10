import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const djangoProxy = {
  '/django': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
    /** Forward /django/auth/… → Django /auth/… (same browser origin as Vite; avoids CORS & host mismatches). */
    rewrite: (path) => path.replace(/^\/django/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: djangoProxy,
  },
  preview: {
    proxy: djangoProxy,
  },
})

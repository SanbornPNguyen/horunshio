import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Fallback: proxy /api to vercel dev running on port 3000
      // Use this if `vercel dev` has issues: run `vercel dev --listen 3000`
      // in one terminal, then `npm run dev` in another.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'

export default defineConfig({
  server: {
    headers:{
      "content-security-policy": "default-src 'none'; manifest-src 'self'; connect-src 'self'; media-src 'self'; img-src 'self' https://ik.imagekit.io/olibos/; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-ancestors 'none';",
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build:{
    assetsInlineLimit(filePath){
      try {
        const stats = fs.statSync(filePath);
        if (stats.size > 4096) return false;
      } catch (e) { }
      
      return !filePath.includes('/track/');
    }
  },
  plugins: [react()],
})

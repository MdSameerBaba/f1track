import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy OpenF1 API requests to bypass CORS (no Access-Control-Allow-Origin)
      '/api/openf1': {
        target: 'https://api.openf1.org',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/openf1/, '/v1'),
        configure: (proxy) => {
          proxy.on('error', (err, req) => {
            console.log('[PROXY openf1] ERROR', req.url, err.message);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('[PROXY openf1]', proxyRes.statusCode, req.url);
          });
        },
      },
      // Proxy Jolpica API requests to bypass CORS
      '/api/jolpica': {
        target: 'https://api.jolpi.ca',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/jolpica/, '/ergast/f1'),
        configure: (proxy) => {
          proxy.on('error', (err, req) => {
            console.log('[PROXY jolpica] ERROR', req.url, err.message);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('[PROXY jolpica]', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
});

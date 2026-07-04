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
      // Proxy F1 livetiming CDN for team radio audio files.
      // The browser cannot directly play livetiming.formula1.com audio (no CORS headers).
      // We tunnel via /api/f1audio so the audio loads server-side then streams to the client.
      '/api/f1audio': {
        target: 'https://livetiming.formula1.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/f1audio/, ''),
        configure: (proxy) => {
          proxy.on('error', (err, req) => {
            console.log('[PROXY f1audio] ERROR', req.url, err.message);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('[PROXY f1audio]', proxyRes.statusCode, req.url);
          });
        },
      },
      // Proxy F1 News RSS feed to bypass CORS and Cloudflare blocks
      '/api/rss/f1': {
        target: 'https://www.formula1.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/rss\/f1/, '/en/latest/all.xml'),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/xml, application/xml, text/html'
        }
      },
      // Proxy Sky Sports F1 RSS feed to bypass CORS and Cloudflare blocks
      '/api/rss/sky': {
        target: 'https://www.skysports.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/rss\/sky/, '/rss/12433'),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/xml, application/xml, text/html'
        }
      },
    },
  },
});

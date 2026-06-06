import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5000,
        host: '0.0.0.0',
        allowedHosts: true,
        proxy: {
          '/api': {
            target: 'http://127.0.0.1:3001',
            changeOrigin: true,
            secure: false,
          },
          '/v1': {
            target: 'http://127.0.0.1:3001',
            changeOrigin: true,
            secure: false,
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.REACT_APP_ADMIN_USER': JSON.stringify(env.REACT_APP_ADMIN_USER),
        'process.env.REACT_APP_ADMIN_PASSWORD': JSON.stringify(env.REACT_APP_ADMIN_PASSWORD)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

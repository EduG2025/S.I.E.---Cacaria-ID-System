import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
    define: {
      // Polyfill process.env for the Google GenAI SDK usage in browser
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    server: {
      port: 3000,
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000, // Aumenta limite de aviso para 1MB
      rollupOptions: {
        output: {
          // Separa bibliotecas em arquivos diferentes para cache eficiente
          manualChunks: {
            vendor: ['react', 'react-dom', 'lucide-react'],
            ai: ['@google/genai'],
            utils: ['html2canvas']
          }
        }
      }
    }
  };
});
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';
import {hydrogen} from '@shopify/hydrogen/vite';
import {oxygen} from '@shopify/mini-oxygen/vite';
import {reactRouter} from '@react-router/dev/vite';

export default defineConfig(({isSsrBuild}) => ({
  // Mini Oxygen replaces the SSR entry with its worker object. Vercel needs
  // the Fetch handler in server.vercel.ts instead.
  plugins: [hydrogen(), ...(process.env.VERCEL ? [] : [oxygen()]), reactRouter()],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
    },
    tsconfigPaths: true,
  },
  build: {
    assetsInlineLimit: 0,
    rollupOptions:
      process.env.VERCEL && isSsrBuild
        ? {input: './server.vercel.ts'}
        : undefined,
  },
  ssr: {
    optimizeDeps: {
      include: [
        'react-router > set-cookie-parser',
        'react-router > cookie',
        'react-router',
      ],
    },
  },
  server: {
    allowedHosts: ['.tryhydrogen.dev'],
  },
}));

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * Emits sw.js with the list of built files and a content hash. Only woff2 fonts are precached: every
 * supported browser uses them, and the woff fallbacks would double the font weight of the cache.
 */
function serviceWorker(): Plugin {
  return {
    name: 'planwright-service-worker',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle)
        .filter((f) => !f.endsWith('.woff') && !f.endsWith('.map'))
        .sort();
      const urls = [...built.map((f) => `/${f}`), '/favicon.svg', '/manifest.webmanifest'];
      const hash = createHash('sha256');
      for (const f of built) {
        const item = bundle[f]!;
        hash.update(f);
        hash.update(
          item.type === 'chunk'
            ? item.code
            : typeof item.source === 'string'
              ? item.source
              : Buffer.from(item.source),
        );
      }
      const template = readFileSync(fileURLToPath(new URL('./src/sw/sw.js', import.meta.url)), 'utf8');
      const source = template
        .replace('__VERSION__', hash.digest('hex').slice(0, 16))
        .replace('__PRECACHE__', JSON.stringify(urls));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorker()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 0,
    target: 'es2022',
    rollupOptions: {
      output: {
        // Libraries change less often than the app: separate chunks keep their cache entries across releases
        // and make the size budget per library visible (scripts/check-bundle.mjs).
        manualChunks(id: string) {
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
          if (/node_modules[\\/]react-router[\\/]/.test(id)) return 'router';
          if (/node_modules[\\/]zod[\\/]/.test(id)) return 'zod';
          return undefined;
        },
      },
    },
  },
  server: { host: '127.0.0.1', port: 5184, strictPort: true },
  preview: { host: '127.0.0.1', port: 4184, strictPort: true },
});

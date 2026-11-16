import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/** Adresse du Worker (synchro, aperçus de liens), ajoutée à la CSP à partir du jalon 3. */
const WORKER = process.env.VITE_WORKER_URL ?? '';

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${WORKER ? ` ${WORKER}` : ''}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'none'",
  "object-src 'none'",
].join('; ');

/** CSP en balise meta : GitHub Pages ne permet pas d'en-têtes personnalisés. Build uniquement (Vite dev injecte des scripts en ligne). */
function csp(): Plugin {
  return {
    name: 'isoligne-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<!-- csp -->',
        `<meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="no-referrer" />`,
      );
    },
  };
}

export default defineConfig({
  base: '/isoligne/',
  define: { __VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0') },
  plugins: [
    react(),
    csp(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Isoligne',
        short_name: 'Isoligne',
        description: 'Projets personnels, en plan.',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0F2D52',
        theme_color: '#0F2D52',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone-masquable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Polices : seuls les jeux latin et latin étendu servent au français.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
        navigateFallback: 'index.html',
        // Notifications (push, toucher, pastille) : script autonome dans public/.
        importScripts: ['sw-push.js'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: { target: 'es2022', sourcemap: false },
});

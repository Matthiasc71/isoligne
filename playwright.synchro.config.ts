import { defineConfig } from '@playwright/test';

/** E2E synchro : vraie app (build avec l'adresse du Worker) contre un `wrangler dev` local. */
export default defineConfig({
  testDir: 'tests/e2e-synchro',
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 90_000,
  use: { baseURL: 'http://localhost:4174/isoligne/', trace: 'off', locale: 'fr-FR', timezoneId: 'Europe/Paris' },
  webServer: [
    { command: './worker/scripts-e2e.sh', url: 'http://127.0.0.1:8789/', reuseExistingServer: false, timeout: 120_000 },
    {
      command: 'VITE_WORKER_URL=http://127.0.0.1:8789 npx vite build --outDir dist-synchro && npx vite preview --outDir dist-synchro --port 4174 --strictPort',
      url: 'http://localhost:4174/isoligne/',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});

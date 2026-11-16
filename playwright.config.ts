import { defineConfig } from '@playwright/test';

const iphone = {
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  locale: 'fr-FR',
  timezoneId: 'Europe/Paris',
};
const ordinateur = {
  viewport: { width: 1440, height: 900 },
  locale: 'fr-FR',
  timezoneId: 'Europe/Paris',
};

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/isoligne/',
    trace: 'off',
  },
  webServer: {
    command: 'npx vite build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/isoligne/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'iphone-chromium', use: { browserName: 'chromium', ...iphone } },
    { name: 'ordinateur-chromium', use: { browserName: 'chromium', ...ordinateur } },
    // WebKit (moteur de Safari) : installé dans la CI, absent de certains environnements locaux.
    ...(process.env.CI || process.env.WEBKIT
      ? [{ name: 'iphone-webkit', use: { browserName: 'webkit' as const, ...iphone } }]
      : []),
  ],
});

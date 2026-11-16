// Génère les icônes PNG de la PWA à partir de scripts/icone.svg (Playwright).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('./icone.svg', import.meta.url), 'utf8');
const tailles = [
  ['public/icone-192.png', 192, 0],
  ['public/icone-512.png', 512, 0],
  ['public/icone-masquable-512.png', 512, 0.1],
  ['public/apple-touch-icon.png', 180, 0],
];
const navigateur = await chromium.launch();
const page = await navigateur.newPage();
for (const [fichier, t, marge] of tailles) {
  await page.setViewportSize({ width: t, height: t });
  const m = Math.round(t * marge);
  await page.setContent(`<html><body style="margin:0;background:#0F2D52"><div style="padding:${m}px;width:${t}px;height:${t}px;box-sizing:border-box">${svg.replace('<svg ', `<svg width="${t - 2 * m}" height="${t - 2 * m}" `)}</div></body></html>`);
  await page.screenshot({ path: fichier, omitBackground: false });
  console.log(fichier);
}
await navigateur.close();

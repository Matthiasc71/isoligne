// Captures clair / sombre des écrans, avec les données de démonstration.
// Usage : npx vite --port 5173 (dans un autre terminal), puis
//         node scripts/captures.mjs design/rapports/jalon-1
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const dossier = process.argv[2] ?? 'design/rapports/captures';
const base = process.env.URL ?? 'http://localhost:5173/isoligne/';
mkdirSync(dossier, { recursive: true });

const navigateur = await chromium.launch();
const formats = {
  iphone: { viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  ordinateur: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
for (const [format, options] of Object.entries(formats)) {
  for (const [mode, nomMode] of [['dark', 'sombre'], ['light', 'clair']]) {
    const ctx = await navigateur.newContext({ ...options, colorScheme: mode, reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris' });
    const page = await ctx.newPage();
    const nom = (ecran) => `${dossier}/${format}-${ecran}-${nomMode}.png`;
    await page.goto(`${base}?demo#/`);
    await page.getByRole('link', { name: /Marée basse/ }).first().waitFor();
    await page.waitForTimeout(500);
    if (format === 'iphone') await page.screenshot({ path: nom('accueil') });
    await page.getByRole('link', { name: /Marée basse/ }).first().click();
    await page.locator('.projet-titre').waitFor();
    await page.waitForTimeout(format === 'ordinateur' ? 1500 : 400);
    await page.screenshot({ path: nom('projet') });
    if (format === 'iphone') {
      await page.locator('.projet-titre').click();
      await page.screenshot({ path: nom('cartouche') });
      await page.locator('.projet-titre').click();
      await page.getByRole('button', { name: /^2\.1\b/ }).click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: nom('panneau') });
      await page.getByRole('dialog').getByRole('button', { name: 'Ouvrir' }).click();
      await page.waitForTimeout(300);
      await page.goto(`${base}#/`);
      await page.getByRole('link', { name: /Marée basse/ }).first().click();
      await page.getByRole('button', { name: /^2\b/ }).first().click();
      await page.getByRole('dialog').getByRole('button', { name: 'Ouvrir' }).click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: nom('branche') });
      // Graphe : quatre dispositions et sélection.
      await page.goto(`${base}#/`);
      await page.getByRole('link', { name: /Marée basse/ }).first().click();
      await page.getByRole('tab', { name: 'Graphe' }).click();
      for (const d of ['Radial', 'Arbre', 'Libre', 'Frise']) {
        await page.getByRole('tab', { name: d }).click();
        await page.waitForTimeout(d === 'Libre' ? 1500 : 700);
        await page.screenshot({ path: nom(`graphe-${d.toLowerCase()}`) });
      }
      await page.getByRole('tab', { name: 'Radial' }).click();
      await page.waitForTimeout(700);
      await page.locator('.react-flow__node', { hasText: /^Repérages/ }).click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: nom('graphe-selection') });
      await page.goto(`${base}#/`);
      await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
      await page.getByRole('button', { name: 'Nouveau projet' }).click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: nom('nouveau-projet') });
    }
    console.log(format, nomMode);
    await ctx.close();
  }
}
await navigateur.close();

import { expect, test, type Page } from '@playwright/test';
import { creerProjet } from './aide';

async function tracer(page: Page, points: [number, number][]) {
  const b = (await page.locator('.planche-toile').boundingBox())!;
  const ecran = ([x, y]: [number, number]) => [b.x + x * b.width, b.y + y * b.height] as const;
  await page.mouse.move(...ecran(points[0]!));
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(...ecran(p), { steps: 8 });
  await page.mouse.up();
}

test('croquis : dessiner, légender, annuler, gommer, mettre en couverture', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await creerProjet(page, 'Repérages');
  await page.getByRole('button', { name: 'Ajouter un bloc' }).click();
  await page.getByRole('button', { name: 'Croquis' }).click();
  const planche = page.getByRole('dialog', { name: /Planche, FIG\. 1/ });
  await expect(planche).toBeVisible();

  await tracer(page, [[0.1, 0.5], [0.5, 0.45], [0.9, 0.5]]);
  await tracer(page, [[0.2, 0.8], [0.6, 0.85]]);
  await expect(page.locator('.planche-toile path')).toHaveCount(2);
  await planche.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.locator('.planche-toile path')).toHaveCount(1);
  await planche.getByRole('button', { name: 'Rétablir' }).click();
  await expect(page.locator('.planche-toile path')).toHaveCount(2);

  // Gomme : un passage sur le second trait l'efface.
  await planche.getByRole('button', { name: 'Gomme' }).click();
  await tracer(page, [[0.4, 0.78], [0.4, 0.88]]);
  await expect(page.locator('.planche-toile path')).toHaveCount(1);

  await planche.getByLabel('Légende').fill('Plage au petit matin');
  await planche.getByRole('button', { name: 'Options du croquis' }).click();
  await page.getByRole('dialog', { name: 'FIG. 1' }).getByRole('checkbox', { name: 'En couverture' }).click();
  await planche.getByRole('button', { name: 'Terminé' }).click();
  await expect(planche).toHaveCount(0);

  // La figure est passée sous l'en-tête (couverture), avec sa légende.
  const figure = page.locator('.couverture .figure');
  await expect(figure).toContainText('FIG. 1 — Plage au petit matin');
  await expect(figure.getByRole('button', { name: /FIG\. 1, Plage au petit matin, 1 trait/ })).toBeVisible();

  // Persistance.
  await page.reload();
  await expect(page.locator('.couverture .figure svg path')).toHaveCount(1);
});

test('lien : adresse normalisée, refus des adresses invalides, détail', async ({ page }) => {
  await page.goto('./');
  await creerProjet(page, 'Veille');
  await page.getByRole('button', { name: 'Ajouter un bloc' }).click();
  await page.getByRole('button', { name: 'Lien', exact: true }).click();
  const adresse = page.getByLabel('Adresse');
  await adresse.fill('pas une adresse');
  await adresse.press('Enter');
  await expect(page.getByRole('alert')).toHaveText('Adresse invalide');
  await adresse.fill('www.exemple.fr/page');
  await adresse.press('Enter');
  // Sans Worker (tests), le lien reste utilisable : adresse et site.
  const carte = page.locator('.lien-carte');
  await expect(carte).toContainText('www.exemple.fr/page');
  await expect(carte).toContainText('exemple.fr');
  await expect(carte).toHaveAttribute('href', 'https://www.exemple.fr/page');
  await expect(carte).toHaveAttribute('rel', /noopener/);
  await page.getByRole('button', { name: 'Détails du lien' }).click();
  await expect(page.getByRole('dialog')).toContainText('https://www.exemple.fr/page');
});

test('ordinateur : coller une adresse propose de l’ajouter à un projet', async ({ page, isMobile }) => {
  test.skip(isMobile, 'coller au clavier : ordinateur');
  await page.goto('./');
  await creerProjet(page, 'Lectures');
  await page.goto('./#/');
  await page.evaluate(() => {
    const d = new DataTransfer();
    d.setData('text/plain', 'https://exemple.org/article');
    document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: d, bubbles: true }));
  });
  const feuille = page.getByRole('dialog', { name: 'Lien' });
  await expect(feuille.getByLabel('Adresse')).toHaveValue('https://exemple.org/article');
  await feuille.getByLabel('Adresse').press('Enter');
  await page.getByRole('link', { name: /Lectures/ }).first().click();
  await expect(page.locator('.lien-carte')).toHaveAttribute('href', 'https://exemple.org/article');
});

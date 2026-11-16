import { expect, test, type Page } from '@playwright/test';
import { creerProjet, dans } from './aide';

/** Arborescence de départ : Écriture > Synopsis ; Tournage ; Montage. */
async function preparer(page: Page, titre: string) {
  // Sans animations : positions stables pour les glisser.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await creerProjet(page, titre);
  const premiere = page.getByLabel('Première idée');
  await premiere.fill('Écriture');
  await premiere.press('Enter');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Synopsis');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.type('Tournage');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Montage');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tree').getByRole('treeitem')).toHaveCount(4);
}

const noeud = (page: Page, texte: string) => page.locator('.react-flow__node', { hasText: new RegExp(`^${texte}`, 'i') });

async function glisser(page: Page, de: { x: number; y: number }, vers: { x: number; y: number }, attente = 0) {
  await page.mouse.move(de.x, de.y);
  await page.mouse.down();
  await page.mouse.move(de.x + 10, de.y + 10, { steps: 3 });
  await page.mouse.move(vers.x, vers.y, { steps: 12 });
  if (attente) await page.waitForTimeout(attente);
  await page.mouse.move(vers.x + 1, vers.y + 1);
  await page.mouse.up();
}

async function centre(page: Page, texte: string) {
  const b = (await noeud(page, texte).boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

test.describe('graphe (ordinateur)', () => {
  test.skip(({ isMobile }) => isMobile, 'souris : ordinateur');

  test('liste ↔ graphe : ajouter, renommer et rattacher par glisser', async ({ page }) => {
    await preparer(page, 'Court-métrage');
    // La liste alimente le graphe.
    await expect(page.locator('.react-flow__node')).toHaveCount(5);

    // Ajouter depuis le graphe (enfant du nœud sélectionné), renommer sur place.
    await noeud(page, 'Tournage').click();
    await expect(page.getByRole('region', { name: 'Sélection' })).toContainText('Tournage');
    await page.getByRole('toolbar', { name: 'Outils du graphe' }).getByRole('button', { name: 'Ajouter' }).click();
    const renommer = page.getByLabel('Renommer');
    await renommer.fill('Repérages');
    await renommer.press('Enter');
    await expect(page.getByRole('tree').getByLabel('2.1 Repérages')).toBeVisible();

    // Glisser « Montage » sur « Tournage » : il y est rattaché, la liste suit.
    await page.getByRole('tab', { name: 'Arbre' }).click();
    await page.waitForTimeout(500);
    await glisser(page, await centre(page, 'Montage'), await centre(page, 'Tournage'), 500);
    await expect(page.getByRole('tree').getByLabel('2.2 Montage')).toBeVisible();
    await page.waitForTimeout(300);

    // Glisser dans le vide : le nœud est épinglé, « Réorganiser » apparaît.
    const r = await centre(page, 'Synopsis');
    await glisser(page, r, { x: r.x + 80, y: r.y + 120 });
    const reorganiser = page.getByRole('button', { name: 'Réorganiser' });
    await expect(reorganiser).toBeVisible();
    await reorganiser.click();
    await expect(reorganiser).toHaveCount(0);
  });

  test('frise : glisser change la date', async ({ page }) => {
    await preparer(page, 'Mémoire');
    await page.getByRole('tree').getByRole('button', { name: /^2\b/ }).click();
    await page.getByRole('dialog').getByLabel('Date').fill(dans(10));
    await page.getByRole('dialog').getByRole('button', { name: 'Fermer' }).click();
    await page.getByRole('tab', { name: 'Frise' }).click();
    await page.waitForTimeout(600);
    const avant = await page.getByRole('tree').getByRole('treeitem', { name: 'Tournage' }).locator('.ligne-date').textContent();
    const c = await centre(page, 'Tournage');
    await glisser(page, c, { x: c.x + 160, y: c.y + 40 });
    await expect(page.getByRole('tree').getByRole('treeitem', { name: 'Tournage' }).locator('.ligne-date')).not.toHaveText(avant!);
  });

  test('relier deux nœuds, puis exporter en SVG', async ({ page }) => {
    await preparer(page, 'Liens');
    const outils = page.getByRole('toolbar', { name: 'Outils du graphe' });
    await outils.getByRole('button', { name: 'Relier' }).click();
    await noeud(page, 'Synopsis').click();
    await noeud(page, 'Montage').click();
    const feuille = page.getByRole('dialog', { name: 'Lien' });
    await feuille.getByLabel('Libellé du lien').fill('rythme');
    await feuille.getByRole('button', { name: 'Fermer' }).click();
    await expect(page.locator('.lien-libre')).toHaveCount(1);
    await expect(page.locator('.lien-texte')).toHaveText('rythme');

    await outils.getByRole('button', { name: 'Exporter' }).click();
    const telechargement = page.waitForEvent('download');
    await page.getByRole('dialog', { name: 'Exporter' }).getByRole('button', { name: 'SVG' }).click();
    const fichier = await telechargement;
    expect(fichier.suggestedFilename()).toBe('liens-radial.svg');
    const contenu = await (await fichier.createReadStream()).toArray();
    const svg = Buffer.concat(contenu).toString('utf8');
    expect(svg).toContain('<svg');
    expect(svg).toContain('rythme');
    expect(svg).toContain('@font-face');

    await outils.getByRole('button', { name: 'Exporter' }).click();
    const png = page.waitForEvent('download');
    await page.getByRole('dialog', { name: 'Exporter' }).getByRole('button', { name: 'PNG' }).click();
    const image = Buffer.concat(await (await (await png).createReadStream()).toArray());
    expect([...image.subarray(1, 4)].map((c) => String.fromCharCode(c)).join('')).toBe('PNG');
    expect(image.length).toBeGreaterThan(10_000);
  });
});

test('iPhone : graphe plein écran, sélection et panneau', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('iphone'), 'iPhone');
  await page.goto('./');
  await creerProjet(page, 'Jardin');
  await page.getByRole('button', { name: 'Ajouter un bloc' }).click();
  await page.getByRole('button', { name: 'Branche' }).click();
  await expect(page.getByRole('toolbar', { name: "Outils de l'élément" })).toBeVisible();
  await page.keyboard.type('Semis');
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Graphe' }).click();
  await expect(page.getByRole('tablist', { name: 'Disposition' })).toBeVisible();
  await noeud(page, 'Semis').tap();
  const selection = page.getByRole('region', { name: 'Sélection' });
  await expect(selection).toContainText('Semis');
  await selection.getByRole('button', { name: 'Détails' }).tap();
  await expect(page.getByRole('dialog')).toContainText('SEMIS', { ignoreCase: true });
  await page.getByRole('dialog').getByRole('button', { name: 'Fermer' }).tap();
  await page.getByRole('button', { name: 'Retour à la page' }).tap();
  await expect(page.getByRole('tree')).toBeVisible();
});

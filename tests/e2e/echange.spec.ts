import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { creerProjet } from './aide';

test('export Markdown puis import ; sauvegarde puis restauration', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await creerProjet(page, 'Marée basse');
  const premiere = page.getByLabel('Première idée');
  await premiere.fill('Repérages');
  await premiere.press('Enter');
  await page.getByRole('tree', { name: 'Arborescence' }).getByLabel(/^1 Repérages/).focus();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Tournage');
  await page.keyboard.press('Escape');

  // Exporter en Markdown (« ··· » du projet).
  await page.getByRole('button', { name: 'Options du projet' }).click();
  const [md] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exporter en Markdown' }).click()]);
  expect(md.suggestedFilename()).toBe('maree-basse.md');
  const texte = await readFile((await md.path())!, 'utf8');
  expect(texte).toContain('# Marée basse');
  expect(texte).toContain('- Repérages\n- Tournage');

  // Sauvegarder tout.
  await page.goto('./#/reglages');
  await expect(page.getByText('Aucune sauvegarde')).toBeVisible();
  const [zip] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Sauvegarder tout' }).click()]);
  expect(zip.suggestedFilename()).toMatch(/^isoligne-\d{4}-\d{2}-\d{2}\.zip$/);
  await expect(page.getByText('1 projet sauvegardé.')).toBeVisible();
  await expect(page.getByText('Dernière sauvegarde aujourd’hui')).toBeVisible();

  // Importer le Markdown : un second projet, identique.
  const choix = page.locator('input[type="file"]');
  await page.getByRole('button', { name: 'Importer un fichier' }).click();
  await choix.setInputFiles({ name: 'maree-basse.md', mimeType: 'text/markdown', buffer: Buffer.from(texte) });
  await expect(page.getByText('« Marée basse » importé.')).toBeVisible();
  await page.getByRole('button', { name: 'Ouvrir' }).click();
  await expect(page.getByRole('tree', { name: 'Arborescence' }).getByRole('treeitem')).toHaveCount(2);

  // Un format inconnu est refusé clairement.
  await page.goto('./#/reglages');
  await page.getByRole('button', { name: 'Importer un fichier' }).click();
  await choix.setInputFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8]) });
  await expect(page.getByRole('alert')).toHaveText(/Format non pris en charge/);

  // Restaurer la sauvegarde dans un navigateur vierge.
  if (info.project.name.startsWith('iphone')) return;
  const vierge = await page.context().browser()!.newContext({ baseURL: info.project.use.baseURL });
  const p2 = await vierge.newPage();
  await p2.goto('./#/reglages');
  await p2.getByRole('button', { name: 'Restaurer une sauvegarde' }).click();
  await p2.locator('input[type="file"]').setInputFiles({ name: zip.suggestedFilename(), mimeType: 'application/zip', buffer: await readFile((await zip.path())!) });
  await expect(p2.getByText(/1 projet restauré/)).toBeVisible();
  await p2.goto('./');
  await expect(p2.getByRole('link', { name: /Marée basse/ })).toBeVisible();
  await vierge.close();
});

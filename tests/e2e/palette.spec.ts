import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { creerProjet } from './aide';

test('palette Cmd+K : faute légère, clavier, modèle de départ, aide', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'palette : ordinateur');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible();
  await page.keyboard.press('ControlOrMeta+k');
  const champ = page.getByRole('combobox', { name: 'Commande ou projet' });
  await expect(champ).toBeFocused();
  for (const mode of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme: mode, reducedMotion: 'reduce' });
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(r.violations.map((v) => `${mode} · ${v.id}`)).toEqual([]);
  }

  // Une faute légère, puis Entrée.
  await champ.fill('calendir');
  await expect(page.getByRole('option')).toHaveText(['Calendrier']);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/calendrier/);

  // Nouveau projet depuis la palette, avec un modèle : le type suit le modèle.
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByRole('combobox').fill('nouveau proj');
  await page.keyboard.press('Enter');
  await page.getByLabel('Titre', { exact: true }).fill('Marée basse');
  await page.getByLabel('Modèle').selectOption('court-metrage');
  await expect(page.getByRole('radio', { name: 'Créatif' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Créer' }).click();
  const arbre = page.getByRole('tree', { name: 'Arborescence' });
  await expect(arbre.getByRole('treeitem').first()).toContainText('Écriture');
  await expect(arbre.getByRole('treeitem', { name: /Synopsis/ })).toBeVisible();

  // « Ce projet » : commandes du projet ouvert ; aide par la palette.
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByRole('combobox').fill('graphe');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('option', { name: /Ouvrir le graphe/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('combobox').fill('gestes');
  await page.keyboard.press('Enter');
  const aide = page.getByRole('dialog', { name: 'Gestes et raccourcis' });
  await expect(aide).toContainText('Palette de commandes');
  await expect(aide).toContainText('Appui long sur le numéro');
});

test('indice au premier usage (écran tactile) : une fois, puis plus jamais', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('iphone'), 'écran tactile');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await creerProjet(page, 'Courses');
  const premiere = page.getByLabel('Première idée');
  await premiere.fill('Pain');
  await premiere.press('Enter');
  await page.keyboard.press('Escape');
  const indice = page.getByRole('note').filter({ hasText: 'Balayez une ligne' });
  await expect(indice).toBeVisible();
  await indice.getByRole('button', { name: 'Compris' }).click();
  await expect(indice).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('tree', { name: 'Arborescence' })).toBeVisible();
  await expect(page.getByRole('note').filter({ hasText: 'Balayez une ligne' })).toHaveCount(0);
});

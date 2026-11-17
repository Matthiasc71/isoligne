import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { creerProjet } from './aide';

test('recherche : accents, faute légère, filtres, extrait marqué, ouvre le nœud', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await creerProjet(page, 'Marée basse');
  const premiere = page.getByLabel('Première idée');
  await premiere.fill('Repérages sur la plage');
  await premiere.press('Enter');
  await page.keyboard.type('Écrire le scénario');
  await page.keyboard.press('Escape');

  await page.goto('./#/recherche');
  const champ = page.getByLabel('Rechercher');
  await champ.fill('reperage');
  await expect(page.getByRole('status')).toHaveText('1 résultat dans 1 projet');
  const groupe = page.getByRole('region', { name: 'Marée basse' });
  await expect(groupe.locator('mark')).toHaveText('Repérages');

  // Une faute légère, puis le filtre « Tâches » (aucune tâche ici).
  await champ.fill('scenarion');
  await expect(groupe.getByRole('link')).toContainText('scénario');
  await page.getByRole('checkbox', { name: 'Tâches' }).click();
  await expect(page.getByRole('status')).toHaveText('Aucun résultat');
  await page.getByRole('checkbox', { name: 'Tâches' }).click();

  for (const mode of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme: mode, reducedMotion: 'reduce' });
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(r.violations.map((v) => `${mode} · ${v.id} : ${v.nodes.map((n) => n.target.join(' ')).slice(0, 2).join(' | ')}`)).toEqual([]);
  }

  // Toucher le résultat : le nœud s'ouvre dans son projet ; la recherche est mémorisée.
  await groupe.getByRole('link').click();
  await expect(page.getByRole('dialog')).toContainText(/scénario/i);
  await page.goto('./#/recherche');
  await expect(page.getByRole('button', { name: 'scenarion' })).toBeVisible();
});

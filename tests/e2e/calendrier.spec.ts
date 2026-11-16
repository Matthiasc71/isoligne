import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ajouterJours } from '../../src/time/calendrier';
import { creerProjet, dans } from './aide';

/** Projet « Atelier » avec une branche « Maquette » à échéance dans 2 jours. Renvoie la date. */
async function preparer(page: Page): Promise<string> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await creerProjet(page, 'Atelier');
  const premiere = page.getByLabel('Première idée');
  await premiere.fill('Maquette');
  await premiere.press('Enter');
  await page.keyboard.press('Escape');
  const arbre = page.getByRole('tree', { name: 'Arborescence' });
  await arbre.getByRole('button', { name: /^1\b/ }).first().click();
  const panneau = page.getByRole('dialog');
  const j = dans(2);
  await panneau.getByLabel('Date', { exact: true }).fill(j);
  // Rappels par défaut d'une nouvelle échéance : J-7, J-1, jour J à 9 h ; « 1 h avant » seulement avec une heure.
  for (const r of ['J-7', 'J-1', 'Jour J, 9 h']) await expect(panneau.getByRole('checkbox', { name: r })).toHaveAttribute('aria-checked', 'true');
  await expect(panneau.getByRole('checkbox', { name: '1 h avant' })).toHaveCount(0);
  await panneau.getByRole('button', { name: 'Fermer' }).click();
  await page.goto('./#/calendrier');
  if (j.slice(0, 7) !== dans(0).slice(0, 7)) await page.getByRole('button', { name: 'Mois suivant' }).click();
  return j;
}

const cellule = (page: Page, j: string) => page.locator(`[data-jour="${j}"] button`);

test('calendrier : jour choisi, clavier, replanifier puis annuler, ouvrir le nœud', async ({ page }) => {
  const j = await preparer(page);
  await expect(cellule(page, j)).toHaveAccessibleName(/1 échéance : Maquette/);
  await cellule(page, j).click();
  const liste = page.getByRole('region', { name: /Échéances du/ });
  await expect(liste.getByRole('link', { name: /Maquette, Atelier/ })).toBeVisible();

  // Clavier : flèches dans la grille, le focus suit le jour choisi.
  await cellule(page, j).focus();
  await page.keyboard.press('ArrowDown');
  await expect(cellule(page, ajouterJours(j, 7))).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(cellule(page, j)).toBeFocused();

  // Replanifier sans geste : « ··· », puis une date ; « Annuler » rétablit.
  await liste.getByRole('button', { name: 'Actions : Maquette' }).click();
  await page.getByRole('button', { name: 'Replanifier' }).click();
  await page.getByLabel(/Nouvelle date/).fill(dans(5));
  await expect(page.getByRole('status').filter({ hasText: /Déplacée au/ })).toBeVisible();
  await expect(cellule(page, j)).not.toHaveAccessibleName(/Maquette/);
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(cellule(page, j)).toHaveAccessibleName(/Maquette/);

  // Toucher l'échéance : le projet s'ouvre sur le nœud, panneau ouvert.
  await cellule(page, j).click();
  await liste.getByRole('link', { name: /Maquette/ }).click();
  const panneau = page.getByRole('dialog');
  await expect(panneau.getByLabel('Date', { exact: true })).toHaveValue(j);
});

test('calendrier : glisser une échéance sur un autre jour (souris)', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'souris : ordinateur');
  const j = await preparer(page);
  await cellule(page, j).click();
  const ligne = page.getByRole('region', { name: /Échéances du/ }).getByRole('link', { name: /Maquette/ });
  const cible = (await cellule(page, ajouterJours(j, 7)).count()) ? ajouterJours(j, 7) : ajouterJours(j, -7);
  const a = (await ligne.boundingBox())!;
  const b = (await cellule(page, cible).boundingBox())!;
  await page.mouse.move(a.x + 40, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + 60, a.y + a.height / 2, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await expect(page.locator(`[data-jour="${cible}"].survol`)).toHaveCount(1);
  await page.mouse.up();
  await expect(page.getByRole('status').filter({ hasText: /Déplacée au/ })).toBeVisible();
  await expect(cellule(page, cible)).toHaveAccessibleName(/Maquette/);
  await expect(cellule(page, j)).not.toHaveAccessibleName(/Maquette/);
});

test('calendrier : semaine et agenda, vue mémorisée, accessibilité', async ({ page }) => {
  const j = await preparer(page);
  const verifier = async (ecran: string) => {
    for (const mode of ['dark', 'light'] as const) {
      await page.emulateMedia({ colorScheme: mode, reducedMotion: 'reduce' });
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(r.violations.map((v) => `${ecran} (${mode}) · ${v.id} : ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
    }
  };
  await verifier('mois');

  await page.getByRole('tab', { name: 'Semaine' }).click();
  if (j > ajouterJours(dans(0), 6 - ((new Date(`${dans(0)}T12:00:00Z`).getUTCDay() + 6) % 7))) {
    await page.getByRole('button', { name: 'Semaine suivante' }).click();
  }
  await expect(page.locator(`li[data-jour="${j}"]`).getByRole('link', { name: /Maquette/ })).toBeVisible();
  await verifier('semaine');

  await page.getByRole('tab', { name: 'Agenda' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: /Maquette, Atelier/ })).toBeVisible();
  await verifier('agenda');
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Agenda' })).toHaveAttribute('aria-selected', 'true');
});

test('calendrier : appui long puis glisser au doigt (iPhone)', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('iphone-chromium'), 'événements tactiles via CDP : Chromium iPhone');
  const j = await preparer(page);
  await cellule(page, j).click();
  const ligne = page.getByRole('region', { name: /Échéances du/ }).getByRole('link', { name: /Maquette/ });
  await ligne.scrollIntoViewIfNeeded();
  const cible = (await cellule(page, ajouterJours(j, 7)).count()) ? ajouterJours(j, 7) : ajouterJours(j, -7);
  const a = (await ligne.boundingBox())!;
  const b = (await cellule(page, cible).boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const toucher = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const x0 = a.x + 40;
  const y0 = a.y + a.height / 2;
  await toucher('touchStart', x0, y0);
  await page.waitForTimeout(550); // appui long
  for (let i = 1; i <= 12; i++) await toucher('touchMove', x0 + ((b.x + b.width / 2 - x0) * i) / 12, y0 + ((b.y + b.height / 2 - y0) * i) / 12);
  await expect(page.locator(`[data-jour="${cible}"].survol`)).toHaveCount(1);
  await toucher('touchEnd', 0, 0);
  await expect(page.getByRole('status').filter({ hasText: /Déplacée au/ })).toBeVisible();
  await expect(cellule(page, cible)).toHaveAccessibleName(/Maquette/);
});

import { expect, type Page } from '@playwright/test';

/** Crée un projet depuis le bouton + et attend la page projet. */
export async function creerProjet(page: Page, titre: string): Promise<void> {
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  const champ = page.getByLabel('Titre', { exact: true });
  const menu = page.getByRole('button', { name: 'Nouveau projet' });
  await expect(champ.or(menu)).toBeVisible();
  if (await menu.isVisible()) await menu.click();
  await page.getByLabel('Titre', { exact: true }).fill(titre);
  await page.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(new RegExp(titre, 'i'));
}

/** Date AAAA-MM-JJ dans `j` jours (heure de Paris). */
export function dans(j: number): string {
  const d = new Date(Date.now() + j * 86_400_000);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(d);
}

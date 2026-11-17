import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { creerProjet } from '../e2e/aide';

const CAPTURES = Boolean(process.env.CAPTURES);

test('partage en lecture seule : créer, ouvrir ailleurs, révoquer', async ({ browser }) => {
  const mac = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })).newPage();
  await mac.goto('./#/reglages');
  await mac.getByRole('button', { name: 'Activer la synchro' }).click();
  await mac.getByRole('button', { name: 'Activer', exact: true }).click();
  await mac.getByRole('button', { name: 'Je l’ai notée' }).click();

  await mac.goto('./');
  await creerProjet(mac, 'Marée basse');
  const premiere = mac.getByLabel('Première idée');
  await premiere.fill('Repérages');
  await premiere.press('Enter');
  await mac.keyboard.press('Escape');

  await mac.getByRole('button', { name: 'Options du projet' }).click();
  await mac.getByRole('button', { name: 'Partager en lecture seule' }).click();
  const feuille = mac.getByRole('dialog', { name: 'Partager en lecture seule' });
  await expect(feuille).toContainText('Le serveur ne peut pas le lire.');
  await expect(feuille.getByRole('radio', { name: '30 j' })).toHaveAttribute('aria-checked', 'true');
  await feuille.getByRole('button', { name: 'Créer le lien' }).click();
  const url = (await feuille.getByLabel('Lien de partage').textContent())!;
  expect(url).toMatch(/#\/s\/[A-Za-z0-9_-]{43}\/[A-Za-z0-9_-]{43}$/);
  await expect(feuille).toContainText(/expire le/);

  // Destinataire : un autre navigateur, sans compte ni appairage.
  const invite = await (await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, deviceScaleFactor: CAPTURES ? 2 : 1, reducedMotion: 'reduce' })).newPage();
  await invite.goto(url);
  await expect(invite.getByText(/Instantané du .* · lecture seule/)).toBeVisible();
  await expect(invite.getByRole('heading', { level: 1 })).toHaveText('Marée basse');
  await expect(invite.getByText('Repérages')).toBeVisible();
  await expect(invite.getByRole('navigation', { name: 'Navigation principale' })).toHaveCount(0);
  await expect(invite.getByRole('textbox')).toHaveCount(0);
  for (const mode of ['dark', 'light'] as const) {
    await invite.emulateMedia({ colorScheme: mode, reducedMotion: 'reduce' });
    const r = await new AxeBuilder({ page: invite }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(r.violations.map((v) => `${mode} · ${v.id}`)).toEqual([]);
    if (CAPTURES) await invite.screenshot({ path: `design/rapports/jalon-6/iphone-partage-page-${mode === 'dark' ? 'nuit' : 'jour'}.png` });
  }
  await invite.getByRole('tab', { name: 'Graphe' }).click();
  await expect(invite.getByRole('img', { name: 'Graphe radial de Marée basse' })).toBeVisible();
  if (CAPTURES) await invite.screenshot({ path: 'design/rapports/jalon-6/iphone-partage-graphe-jour.png' });

  // Révoquer depuis les Réglages : le lien s'éteint.
  await mac.keyboard.press('Escape');
  await mac.goto('./#/reglages');
  const liste = mac.getByRole('list', { name: 'Liens partagés' });
  await expect(liste).toContainText('Marée basse');
  await liste.getByRole('button', { name: 'Révoquer' }).click();
  await mac.getByRole('dialog', { name: 'Révoquer le lien' }).getByRole('button', { name: 'Révoquer' }).click();
  await expect(mac.getByText('Aucun lien actif.')).toBeVisible();
  await invite.reload();
  await expect(invite.getByRole('alert')).toHaveText('Ce lien n’est plus valable.');
});

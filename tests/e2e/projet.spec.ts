import { expect, test } from '@playwright/test';
import { creerProjet, dans } from './aide';

test.describe('page projet', () => {
  test('arborescence au clavier, tâche, échéance, persistance', async ({ page }, info) => {
    test.skip(info.project.name.startsWith('iphone'), 'parcours clavier : ordinateur');
    await page.goto('./');
    await creerProjet(page, 'Court-métrage');

    // Première idée, puis Entrée = nouvel élément, Tab = indenter.
    const premiere = page.getByLabel('Première idée');
    await premiere.fill('Écriture');
    await premiere.press('Enter');
    const arbre = page.getByRole('tree', { name: 'Arborescence' });
    await expect(arbre.getByRole('treeitem')).toHaveCount(1);
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Synopsis');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Scénario');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Découpage');

    const items = arbre.getByRole('treeitem');
    await expect(items).toHaveCount(4);
    await expect(arbre.getByRole('button', { name: /^1\.2\b/ })).toBeVisible();
    await expect(arbre.getByRole('button', { name: /^1\.3\b/ })).toBeVisible();

    // Cmd/Ctrl+Entrée : un premier appui fait une tâche, le second la coche ; la tâche faite se replie.
    await arbre.getByLabel('1.2 Scénario').focus();
    await page.keyboard.press('ControlOrMeta+Enter');
    await expect(arbre.getByRole('checkbox', { name: /Scénario/ })).toHaveAttribute('aria-checked', 'false');
    await page.keyboard.press('ControlOrMeta+Enter');
    await expect(arbre.getByRole('button', { name: /\+ 1 faite/ })).toBeVisible();
    await expect(arbre.getByLabel('1.2 Scénario')).toHaveCount(0);

    // Échéance depuis le panneau du nœud (toucher le numéro).
    await arbre.getByRole('button', { name: /^1\.3\b/ }).click();
    const panneau = page.getByRole('dialog');
    await panneau.getByLabel('Date').fill(dans(3));
    await panneau.getByRole('button', { name: 'Fermer' }).click();
    await expect(arbre.locator('.nuage')).toBeVisible();

    // Persistance : rechargement.
    await page.reload();
    await expect(page.getByRole('tree', { name: 'Arborescence' }).getByRole('treeitem')).toHaveCount(3);

    // Accueil : la prochaine échéance en grand.
    await page.goto('./#/');
    await expect(page.locator('.colonne-projets .prochaine-compte')).toHaveText('J-3');
  });

  test('poupée russe : ouvrir une branche puis remonter', async ({ page }, info) => {
    test.skip(info.project.name.startsWith('iphone'), 'parcours clavier : ordinateur');
    await page.goto('./');
    await creerProjet(page, 'Mémoire');
    const premiere = page.getByLabel('Première idée');
    await premiere.fill('Rédaction');
    await premiere.press('Enter');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Chapitre 1');
    await page.keyboard.press('Tab');
    await page.getByLabel('1 Rédaction').focus();
    await page.keyboard.press('ControlOrMeta+ArrowRight');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^rédaction$/i);
    await expect(page.getByRole('navigation', { name: "Fil d'Ariane" })).toContainText('Mémoire');
    await expect(page.getByLabel('1.1 Chapitre 1')).toBeVisible();
    await page.getByRole('navigation', { name: "Fil d'Ariane" }).getByRole('button', { name: 'Mémoire' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/mémoire/i);
  });

  test('iPhone : ajout de branche, panneau et alternatives aux gestes', async ({ page }, info) => {
    test.skip(!info.project.name.startsWith('iphone'), 'iPhone');
    await page.goto('./');
    await creerProjet(page, 'Déménagement');
    await page.getByRole('button', { name: 'Ajouter un bloc' }).click();
    await page.getByRole('button', { name: 'Branche' }).click();
    await page.keyboard.type('Cartons');
    // La barre d'outils du clavier est visible pendant l'édition.
    await expect(page.getByRole('toolbar', { name: "Outils de l'élément" })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Ajouter un bloc' }).click();
    await page.getByRole('button', { name: 'Branche' }).click();
    await page.keyboard.type('Cuisine');
    await page.keyboard.press('Escape');
    const arbre = page.getByRole('tree', { name: 'Arborescence' });
    await expect(arbre.getByRole('treeitem')).toHaveCount(2);

    // Indenter « Cuisine » sans glisser, depuis le panneau.
    await arbre.getByRole('button', { name: /^2\b/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Indenter' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Fermer' }).click();
    await expect(arbre.getByRole('button', { name: /^1\.1\b/ })).toBeVisible();

    // Supprimer puis annuler.
    await arbre.getByRole('button', { name: /^1\.1\b/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
    await expect(arbre.getByRole('treeitem')).toHaveCount(1);
    await page.getByRole('button', { name: 'Annuler' }).click();
    await expect(arbre.getByRole('treeitem')).toHaveCount(2);
  });
});

test('hors ligne : l’app s’ouvre sans réseau', async ({ page, context }) => {
  await page.goto('./');
  await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === 'activated');
  await creerProjet(page, 'Sans réseau');
  await context.setOffline(true);
  await page.goto('./#/');
  await expect(page.getByRole('link', { name: /Sans réseau/ }).first()).toBeVisible();
  await context.setOffline(false);
});

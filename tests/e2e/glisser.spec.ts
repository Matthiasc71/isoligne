import { expect, test, type Page } from '@playwright/test';
import { creerProjet } from './aide';

/** Trois lignes : Un, Deux, Trois. */
async function troisLignes(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await creerProjet(page, 'Ordre');
  const premiere = page.getByLabel('Première idée');
  await premiere.fill('Un');
  await premiere.press('Enter');
  const arbre = page.getByRole('tree', { name: 'Arborescence' });
  for (const [n, t] of [['1 Un', 'Deux'], ['2 Deux', 'Trois']] as const) {
    await arbre.getByLabel(new RegExp(`^${n}`)).focus();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(page.locator('textarea.ligne-texte:focus')).toHaveValue('');
    await page.keyboard.type(t, { delay: 30 });
  }
  await page.keyboard.press('Escape');
  await expect(arbre.getByRole('treeitem')).toHaveCount(3);
  return arbre;
}

const ordre = async (page: Page) => page.locator('textarea.ligne-texte').evaluateAll((l) => (l as HTMLTextAreaElement[]).map((t) => t.value));

test('glisser le numéro vers le haut, au doigt, sans appui long', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('iphone-chromium'), 'événements tactiles via CDP : Chromium iPhone');
  const arbre = await troisLignes(page);
  const num = (await arbre.getByRole('button', { name: /^3\b/ }).boundingBox())!;
  const cible = (await arbre.getByRole('button', { name: /^1\b/ }).boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const toucher = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const x = num.x + num.width / 2;
  await toucher('touchStart', x, num.y + num.height / 2);
  for (let i = 1; i <= 10; i++) await toucher('touchMove', x, num.y + num.height / 2 + ((cible.y + 4 - num.y - num.height / 2) * i) / 10);
  await toucher('touchEnd', 0, 0);
  await expect.poll(() => ordre(page)).toEqual(['Trois', 'Un', 'Deux']);
});

test('glisser le numéro vers le bas, à la souris', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'souris : ordinateur');
  const arbre = await troisLignes(page);
  const num = (await arbre.getByRole('button', { name: /^1\b/ }).boundingBox())!;
  const fin = (await arbre.getByRole('button', { name: /^3\b/ }).boundingBox())!;
  await page.mouse.move(num.x + num.width / 2, num.y + num.height / 2);
  await page.mouse.down();
  await page.mouse.move(num.x + num.width / 2, num.y + num.height / 2 + 14, { steps: 3 });
  await page.mouse.move(num.x + num.width / 2, fin.y + fin.height - 2, { steps: 10 });
  await page.mouse.up();
  await expect.poll(() => ordre(page)).toEqual(['Deux', 'Trois', 'Un']);
});

test('un sous-point est décalé, numéro compris (2.1 sous 2)', async ({ page }) => {
  const arbre = await troisLignes(page);
  await arbre.getByLabel(/^3 Trois/).focus();
  await page.keyboard.press('Tab');
  const deux = (await arbre.getByRole('button', { name: /^2(,|$)/ }).boundingBox())!;
  const sous = (await arbre.getByRole('button', { name: /^2\.1(,|$)/ }).boundingBox())!;
  expect(sous.x - deux.x).toBeGreaterThanOrEqual(18);
  expect(sous.x - deux.x).toBeLessThanOrEqual(22);
});

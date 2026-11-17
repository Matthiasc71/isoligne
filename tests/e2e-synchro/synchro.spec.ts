import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { creerProjet } from '../e2e/aide';

const CAPTURES = Boolean(process.env.CAPTURES);
const echelle = CAPTURES ? 2 : 1;
const iphone = { viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, deviceScaleFactor: echelle };
const ordinateur = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: echelle };

/** Captures du rapport de jalon (CAPTURES=1), en mode sombre puis clair. */
async function capture(page: Page, nom: string) {
  if (!CAPTURES) return;
  for (const mode of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme: mode, reducedMotion: 'reduce' });
    await page.screenshot({ path: `design/rapports/jalon-4/${nom}-${mode === 'dark' ? 'nuit' : 'jour'}.png` });
  }
}

/** WCAG 2.2 AA (axe) dans les deux thèmes, et cibles tactiles ≥ 44 px sur iPhone. */
async function verifier(page: Page, ecran: string, mobile = false) {
  for (const mode of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme: mode, reducedMotion: 'reduce' });
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(r.violations.map((v) => `${ecran} (${mode}) · ${v.id} : ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
  }
  if (!mobile) return;
  const petites = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('button, a[href]')]
    .filter((el) => el.offsetParent !== null && !el.closest('.visuellement-cache'))
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && (r.height < 44 || r.width < 44))
    .map(({ el, r }) => `"${el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 20)}" ${Math.round(r.width)}×${Math.round(r.height)}`));
  expect(petites, `${ecran} : cibles trop petites`).toEqual([]);
}

async function reglages(page: Page) {
  await page.goto('./#/reglages');
  await expect(page.getByRole('heading', { name: 'Synchro' })).toBeVisible();
}

test('appairage par code, synchro dans les deux sens, révocation, restauration', async ({ browser }) => {
  const mac = await (await browser.newContext({ ...ordinateur, reducedMotion: 'reduce' })).newPage();
  const tel = await (await browser.newContext({ ...iphone, reducedMotion: 'reduce' })).newPage();

  // ── Mac : un projet, puis création de l'espace.
  await mac.goto('./');
  await creerProjet(mac, 'Atelier');
  await reglages(mac);
  await expect(mac.getByText('Les projets restent sur cet appareil.')).toBeVisible();
  await verifier(mac, 'synchro non configurée');
  await capture(mac, 'mac-1-sans-synchro');
  await mac.getByRole('button', { name: 'Activer la synchro' }).click();
  await mac.getByLabel('Nom de cet appareil').fill('Mac');
  await mac.getByRole('button', { name: 'Activer', exact: true }).click();

  // Clé de secours affichée tout de suite : 13 groupes de 4 caractères.
  const cle = mac.getByLabel('Clé de secours', { exact: true });
  await expect(cle.locator('span:not(.cle-cartouche)')).toHaveCount(13);
  const groupes = await cle.locator('span:not(.cle-cartouche)').allTextContents();
  expect(groupes.every((g) => /^[0-9A-Z]{4}$/.test(g))).toBe(true);
  await verifier(mac, 'clé de secours');
  await capture(mac, 'mac-2-cle-de-secours');
  if (CAPTURES) await mac.pdf({ path: 'test-results/impression-cle.pdf', format: 'A4' });
  await mac.getByRole('button', { name: 'Je l’ai notée' }).click();
  await expect(mac.getByRole('status').filter({ hasText: /À jour/ })).toBeVisible();
  await expect(mac.getByRole('list', { name: 'Appareils' })).toContainText('cet appareil');

  // ── Mac : ajouter un appareil → code à 8 caractères.
  await mac.getByRole('button', { name: 'Ajouter un appareil' }).click();
  const code = mac.locator('.code-appairage');
  await expect(code).toHaveText(/^[0-9A-Z]{4} [0-9A-Z]{4}$/);
  const texteCode = (await code.textContent())!;
  await verifier(mac, 'code d’appairage');
  await capture(mac, 'mac-3-code');

  // ── iPhone : rejoindre (minuscules et tiret tolérés).
  await reglages(tel);
  await tel.getByRole('button', { name: 'Rejoindre un espace' }).click();
  await tel.getByLabel('Code à 8 caractères').fill(texteCode.toLowerCase().replace(' ', '-'));
  await tel.getByLabel('Nom de cet appareil').fill('iPhone');
  await tel.getByRole('button', { name: 'Continuer' }).click();
  const empreinteTel = tel.locator('.empreinte');
  await expect(empreinteTel).toHaveText(/^\d{3} \d{3}$/);
  await expect(tel.getByText('En attente de confirmation sur l’autre appareil.')).toBeVisible();
  await verifier(tel, 'empreinte (iPhone)', true);
  await capture(tel, 'iphone-1-empreinte');

  // ── Mac : même empreinte, confirmation.
  await expect(mac.getByText('« iPhone » demande à rejoindre', { exact: false })).toBeVisible({ timeout: 10_000 });
  await expect(mac.locator('.empreinte')).toHaveText((await empreinteTel.textContent())!);
  await verifier(mac, 'demande d’appairage');
  await capture(mac, 'mac-4-demande');
  await mac.getByRole('button', { name: 'Identiques' }).click();
  await expect(mac.getByText('Appareil ajouté.', { exact: false })).toBeVisible();

  // ── iPhone : appairé, le projet du Mac arrive.
  await expect(tel.getByRole('status').filter({ hasText: /À jour/ })).toBeVisible({ timeout: 15_000 });
  await expect(tel.getByRole('list', { name: 'Appareils' })).toContainText('Mac');
  await verifier(tel, 'synchro active (iPhone)', true);
  await capture(tel, 'iphone-2-synchro-active');
  await tel.goto('./');
  await expect(tel.getByRole('link', { name: /Atelier/ })).toBeVisible({ timeout: 15_000 });

  // ── iPhone → Mac : un nouveau projet remonte (le Mac synchronise à l'ouverture).
  await creerProjet(tel, 'Chantier');
  await tel.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect.poll(async () => {
    await mac.goto('./');
    return mac.getByRole('link', { name: /Chantier/ }).count();
  }, { timeout: 20_000, intervals: [1000, 2000, 3000] }).toBeGreaterThan(0);

  // ── Mac : révoquer l'iPhone (confirmé).
  await reglages(mac);
  const ligneTel = mac.getByRole('listitem').filter({ hasText: 'iPhone' });
  await ligneTel.getByRole('button', { name: 'Révoquer' }).click();
  await mac.getByRole('dialog', { name: 'Révoquer' }).getByRole('button', { name: 'Révoquer' }).click();
  await expect(mac.getByRole('list', { name: 'Appareils' })).not.toContainText('iPhone');

  // ── iPhone : révoqué au cycle suivant, témoin redline sur l'accueil, données locales intactes.
  await tel.goto('./');
  await expect(tel.getByRole('button', { name: /synchro à vérifier/ })).toBeVisible({ timeout: 15_000 });
  await capture(tel, 'iphone-3-temoin');
  await expect(tel.getByRole('link', { name: /Atelier/ })).toBeVisible();
  await reglages(tel);
  await expect(tel.getByText('Cet appareil a été révoqué', { exact: false })).toBeVisible();
  await verifier(tel, 'appareil révoqué', true);
  await capture(tel, 'iphone-4-revoque');
  // Quitter l'espace : projets conservés, l'appareil peut rejoindre de nouveau.
  await tel.getByRole('button', { name: 'Quitter l’espace' }).click();
  await expect(tel.getByRole('button', { name: 'Rejoindre un espace' })).toBeVisible();
  await tel.goto('./');
  await expect(tel.getByRole('link', { name: /Atelier/ })).toBeVisible();
  await expect(tel.getByRole('button', { name: 'Tri, filtres et réglages', exact: true })).toBeVisible();

  // ── Troisième appareil : restauration par la clé de secours.
  const neuf = await (await browser.newContext({ ...ordinateur, reducedMotion: 'reduce' })).newPage();
  await reglages(neuf);
  await neuf.getByRole('button', { name: 'Restaurer avec la clé de secours' }).click();
  await neuf.getByLabel('Clé de secours').fill(groupes.join(' ').toLowerCase());
  await neuf.getByRole('button', { name: 'Restaurer', exact: true }).click();
  await expect(neuf.getByRole('status').filter({ hasText: /À jour/ })).toBeVisible({ timeout: 15_000 });
  await neuf.goto('./');
  await expect(neuf.getByRole('link', { name: /Atelier/ })).toBeVisible({ timeout: 15_000 });
  await expect(neuf.getByRole('link', { name: /Chantier/ })).toBeVisible();
});

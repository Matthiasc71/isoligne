import { createServer, type Server } from 'node:http';
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { creerProjet, dans } from '../e2e/aide';
import { dechiffrerPush } from '../unit/aide-webpush';
import { depuisBase64Url } from '../../src/sync/crypto';

/**
 * Notifications de bout en bout, sauf le service de push du navigateur
 * (injoignable en test) : un faux abonnement pointe vers un serveur local
 * que le Worker autorise en développement (PUSH_TEST).
 */
const PORT = 8798;
const CAPTURES = Boolean(process.env.CAPTURES);
let serveur: Server;
const recus: Uint8Array[] = [];

test.beforeAll(async () => {
  serveur = createServer((req, res) => {
    const m: Buffer[] = [];
    req.on('data', (c: Buffer) => m.push(c));
    req.on('end', () => { recus.push(new Uint8Array(Buffer.concat(m))); res.statusCode = 201; res.end(); });
  });
  await new Promise<void>((r) => serveur.listen(PORT, '127.0.0.1', r));
});
test.afterAll(() => new Promise<void>((r) => serveur.close(() => r())));

/** Remplace l'abonnement du navigateur par un faux, dont le test garde la clé privée. */
async function fauxAbonnement(page: Page) {
  await page.addInitScript((port) => {
    const b64 = (o: Uint8Array) => btoa(String.fromCharCode(...o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    // Chromium sans interface refuse toujours les notifications : la permission est simulée aussi.
    Object.defineProperty(Notification, 'permission', { get: () => 'granted', configurable: true });
    Notification.requestPermission = async () => 'granted';
    PushManager.prototype.getSubscription = async () => null;
    PushManager.prototype.subscribe = async function () {
      const paire = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
      const p256dh = b64(new Uint8Array(await crypto.subtle.exportKey('raw', paire.publicKey)));
      const auth = b64(crypto.getRandomValues(new Uint8Array(16)));
      const endpoint = `http://127.0.0.1:${port}/push/appareil`;
      (window as unknown as { __abonnement: unknown }).__abonnement = { jwk: await crypto.subtle.exportKey('jwk', paire.privateKey), p256dh, auth };
      return { endpoint, toJSON: () => ({ endpoint, keys: { p256dh, auth } }), unsubscribe: async () => true } as unknown as PushSubscription;
    };
  }, PORT);
}

async function lireAbonnement(page: Page) {
  const a = await page.evaluate(() => (window as unknown as { __abonnement: { jwk: JsonWebKey; p256dh: string; auth: string } }).__abonnement);
  const privee = await crypto.subtle.importKey('jwk', a.jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  return { ...a, privee };
}

test('notifications : activer, essai reçu et déchiffré, planning chiffré d’une nouvelle échéance', async ({ browser }) => {
  const contexte = await browser.newContext({
    viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, deviceScaleFactor: CAPTURES ? 2 : 1, reducedMotion: 'reduce',
  });
  const page = await contexte.newPage();
  await fauxAbonnement(page);
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);

  // Sans synchro : on l'explique, rien à activer.
  await page.goto('./#/reglages');
  const section = page.getByRole('region', { name: 'Notifications' });
  await expect(section.getByRole('status').first()).toHaveText(/activez d’abord la synchro/);
  await page.getByRole('button', { name: 'Activer la synchro' }).click();
  await page.getByRole('button', { name: 'Activer', exact: true }).click();
  await page.getByRole('button', { name: 'Je l’ai notée' }).click();

  // Activer : la demande part du toucher ; l'état suit.
  await section.getByRole('button', { name: 'Activer les notifications' }).click();
  await expect(section.getByRole('status').first()).toHaveText('Activées sur cet appareil');
  const ab = await lireAbonnement(page);

  // Essai : le faux service de push reçoit un bloc que seul cet abonnement sait lire.
  const avant = recus.length;
  await section.getByRole('button', { name: 'Envoyer un essai' }).click();
  await expect(section.getByText('Essai envoyé', { exact: false })).toBeVisible();
  await expect.poll(() => recus.length).toBeGreaterThan(avant);
  const essai = JSON.parse(new TextDecoder().decode(await dechiffrerPush(ab.privee, ab.p256dh, ab.auth, recus.at(-1)!))) as { t: string; u: string };
  expect(essai).toMatchObject({ t: 'Essai', u: '#/reglages' });

  // Réglages partagés : résumé quotidien et rappels par défaut.
  await section.getByRole('checkbox', { name: 'Résumé quotidien' }).click();
  await expect(section.getByLabel('Heure du résumé')).toHaveValue('08:30');
  await section.getByRole('checkbox', { name: 'Résumé quotidien' }).click();
  for (const mode of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme: mode, reducedMotion: 'reduce' });
    const r = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(r.violations.map((v) => `${mode} · ${v.id}`)).toEqual([]);
  }
  if (CAPTURES) {
    await section.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'design/rapports/jalon-5/iphone-reglages-notifications-jour.png' });
  }

  // Nouvelle échéance dans 2 jours : le planning part chiffré, avec « J-1 » et « Aujourd'hui ».
  const planning = page.waitForRequest((r) => r.url().endsWith('/push/planning') && r.method() === 'POST' && (r.postData() ?? '').includes('"envois":[{'));
  await page.goto('./');
  await creerProjet(page, 'Atelier');
  const premiere = page.getByLabel('Première idée');
  await premiere.fill('Maquette');
  await premiere.press('Enter');
  await page.keyboard.press('Escape');
  await page.getByRole('tree', { name: 'Arborescence' }).getByRole('button', { name: /^1\b/ }).first().click();
  await page.getByRole('dialog').getByLabel('Date', { exact: true }).fill(dans(2));
  const corps = JSON.parse((await planning).postData()!) as { envois: { q: number; c: string }[] };
  const textes = await Promise.all(corps.envois.map(async (e) =>
    JSON.parse(new TextDecoder().decode(await dechiffrerPush(ab.privee, ab.p256dh, ab.auth, depuisBase64Url(e.c)))) as { t: string; b: string; u: string }));
  expect(textes.map((t) => t.t)).toEqual(['J-1 · Maquette', 'Aujourd’hui · Maquette']);
  expect(textes[0]!.b).toMatch(/^Atelier · /);
  expect(textes[0]!.u).toMatch(/^#\/p\/[^?]+\?noeud=/);
  expect(corps.envois.every((e) => e.q > Date.now())).toBe(true);
  // Le serveur ne reçoit aucun texte en clair.
  expect((await planning).postData()).not.toContain('Maquette');
  await contexte.close();
});

test('demande au bon moment : à la première échéance, une seule fois', async ({ browser }) => {
  const contexte = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await contexte.newPage();
  await page.goto('./');
  await creerProjet(page, 'Courses');
  const premiere = page.getByLabel('Première idée');
  await premiere.fill('Liste');
  await premiere.press('Enter');
  await page.keyboard.press('Escape');
  await page.getByRole('tree', { name: 'Arborescence' }).getByRole('button', { name: /^1\b/ }).first().click();
  await page.getByRole('dialog', { name: /Liste/ }).getByLabel('Date', { exact: true }).fill(dans(4));
  // Synchro non activée sur ce navigateur : la feuille l'explique et propose les Réglages.
  const demande = page.getByRole('dialog', { name: 'Rappels' });
  await expect(demande).toContainText('Activez d’abord la synchro');
  await demande.getByRole('button', { name: 'Plus tard' }).click();
  await expect(demande).toHaveCount(0);
  // Une seconde échéance ne redemande pas.
  await page.keyboard.press('Escape');
  const arbre = page.getByRole('tree', { name: 'Arborescence' });
  await arbre.getByLabel(/^1 Liste/).focus();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Pain');
  await page.keyboard.press('Escape');
  await arbre.getByRole('button', { name: /^2\b/ }).first().click();
  await page.getByRole('dialog', { name: /Pain/ }).getByLabel('Date', { exact: true }).fill(dans(5));
  await page.waitForTimeout(500);
  await expect(page.getByRole('dialog', { name: 'Rappels' })).toHaveCount(0);
  await contexte.close();
});

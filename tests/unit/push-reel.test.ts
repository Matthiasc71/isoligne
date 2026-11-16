import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chiffrerPush } from '../../src/notif/webpush';
import { depuisBase64Url, versBase64Url } from '../../src/sync/crypto';
import { dechiffrerPush } from './aide-webpush';

/**
 * Push de bout en bout contre `wrangler dev` (voir worker/scripts-integration.sh) :
 * un faux service de push local reçoit les messages ; on vérifie la signature VAPID
 * et on déchiffre le contenu avec la clé de l'abonnement. Ignoré sans WORKER_URL.
 */
const BASE = process.env.WORKER_URL ?? '';
const PORT = 8799;
const FAUX = `http://127.0.0.1:${PORT}`;

interface Recu { chemin: string; entetes: IncomingHttpHeaders; corps: Uint8Array }
const recus: Recu[] = [];
let serveur: Server;

const hex = (n: number) => [...crypto.getRandomValues(new Uint8Array(n))].map((x) => x.toString(16).padStart(2, '0')).join('');
const id = () => versBase64Url(crypto.getRandomValues(new Uint8Array(16)));

async function appel(chemin: string, o: { jeton?: string; corps?: unknown; methode?: string } = {}) {
  const h: Record<string, string> = {};
  if (o.jeton) h.authorization = `Bearer ${o.jeton}`;
  if (o.corps !== undefined) h['content-type'] = 'application/json';
  return fetch(`${BASE}${chemin}`, {
    method: o.methode ?? (o.corps !== undefined ? 'POST' : 'GET'),
    headers: h,
    body: o.corps !== undefined ? JSON.stringify(o.corps) : undefined,
  });
}

/** Abonnement simulé : la paire de clés et le secret que garderait le navigateur. */
async function abonnement() {
  const p = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  return {
    privee: p.privateKey,
    p256dh: versBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', p.publicKey))),
    auth: versBase64Url(crypto.getRandomValues(new Uint8Array(16))),
  };
}

async function attendre(n: number, ms = 8000) {
  const debut = Date.now();
  while (recus.length < n && Date.now() - debut < ms) await new Promise((r) => setTimeout(r, 100));
}

describe.skipIf(!BASE)('Push : du Worker au service de push', () => {
  let jeton = '';

  beforeAll(async () => {
    serveur = createServer((req, res) => {
      const morceaux: Buffer[] = [];
      req.on('data', (c: Buffer) => morceaux.push(c));
      req.on('end', () => {
        recus.push({ chemin: req.url ?? '', entetes: req.headers, corps: new Uint8Array(Buffer.concat(morceaux)) });
        res.statusCode = req.url?.startsWith('/disparu') ? 410 : 201;
        res.end();
      });
    });
    await new Promise<void>((r) => serveur.listen(PORT, '127.0.0.1', r));
    const r = await appel('/espace', { corps: { espace: hex(16), secours: hex(32), nom: 'Test push' } });
    expect(r.status).toBe(201);
    jeton = ((await r.json()) as { jeton: string }).jeton;
  });
  afterAll(() => new Promise<void>((r) => serveur.close(() => r())));

  it('refuse un service de push inconnu (pas de requête vers un hôte quelconque)', async () => {
    for (const endpoint of ['https://exemple.fr/push', 'http://127.0.0.1:8788/x', 'https://web.push.apple.com.evil.fr/x']) {
      expect((await appel('/push/abonnements', { jeton, corps: { id: id(), endpoint } })).status).toBe(400);
    }
  });

  it('essai : signature VAPID valide et contenu lisible par le seul abonnement', async () => {
    const ab = await abonnement();
    const a = id();
    expect((await appel('/push/abonnements', { jeton, corps: { id: a, endpoint: `${FAUX}/essai` } })).status).toBe(201);
    const cle = ((await (await appel('/push/cle')).json()) as { cle: string }).cle;
    const corps = await chiffrerPush(ab, new TextEncoder().encode('{"t":"Essai"}'));
    const r = await appel('/push/essai', { jeton, corps: { a, c: versBase64Url(corps) } });
    expect(((await r.json()) as { statut: number }).statut).toBe(201);

    await attendre(1);
    const m = recus.find((x) => x.chemin === '/essai')!;
    expect(m.entetes['content-encoding']).toBe('aes128gcm');
    expect(m.entetes.ttl).toBe('86400');
    const [, t, k] = /^vapid t=([^,]+), k=(.+)$/.exec(String(m.entetes.authorization))!;
    expect(k).toBe(cle);
    const [h, p, s] = t!.split('.');
    const pub = await crypto.subtle.importKey('raw', depuisBase64Url(k!) as BufferSource, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, depuisBase64Url(s!) as BufferSource, new TextEncoder().encode(`${h}.${p}`))).toBe(true);
    const claims = JSON.parse(new TextDecoder().decode(depuisBase64Url(p!))) as { aud: string; exp: number; sub: string };
    expect(claims.aud).toBe(FAUX);
    expect(claims.exp * 1000).toBeGreaterThan(Date.now());
    expect(claims.exp * 1000).toBeLessThanOrEqual(Date.now() + 24 * 3600_000);
    expect(claims.sub).toMatch(/^(https:|mailto:)/);
    expect(new TextDecoder().decode(await dechiffrerPush(ab.privee, ab.p256dh, ab.auth, m.corps))).toBe('{"t":"Essai"}');
  });

  it('planning + Cron : envoie les rappels échus, garde les suivants, retire un abonnement disparu', async () => {
    const ab = await abonnement();
    const a = id();
    const mort = id();
    await appel('/push/abonnements', { jeton, corps: { id: a, endpoint: `${FAUX}/cron` } });
    await appel('/push/abonnements', { jeton, corps: { id: mort, endpoint: `${FAUX}/disparu` } });
    const c = async (texte: string) => versBase64Url(await chiffrerPush(ab, new TextEncoder().encode(texte)));
    const maintenant = Date.now();
    const envois = [
      { a, i: 'p:n1:J-1', q: maintenant - 60_000, c: await c('échu') },
      { a, i: 'p:n1:J9h', q: maintenant + 86_400_000, c: await c('demain') },
      { a: mort, i: 'p:n1:J-1', q: maintenant - 60_000, c: await c('perdu') },
      { a: id(), i: 'inconnu', q: maintenant - 60_000, c: await c('ignoré') },
    ];
    const r = await appel('/push/planning', { jeton, corps: { empreinte: 'abc123', envois } });
    expect(await r.json()).toEqual({ envois: 3 });
    expect(await (await appel('/push/planning', { jeton })).json()).toEqual({ empreinte: 'abc123' });
    // Un planning invalide (heure hors bornes) est refusé en bloc.
    expect((await appel('/push/planning', { jeton, corps: { empreinte: 'x', envois: [{ ...envois[0], q: maintenant + 40 * 86_400_000 }] } })).status).toBe(400);

    const avant = recus.length;
    await fetch(`${BASE}/__scheduled?cron=*%2F5+*+*+*+*`);
    await attendre(avant + 2);
    const cron = recus.slice(avant);
    expect(cron.map((x) => x.chemin).sort()).toEqual(['/cron', '/disparu']);
    const m = cron.find((x) => x.chemin === '/cron')!;
    expect(new TextDecoder().decode(await dechiffrerPush(ab.privee, ab.p256dh, ab.auth, m.corps))).toBe('échu');

    // Abonnement disparu (410) : retiré. Second passage : rien de plus avant demain.
    const liste = (await (await appel('/push/abonnements', { jeton })).json()) as { id: string }[];
    expect(liste.map((x) => x.id)).toContain(a);
    expect(liste.map((x) => x.id)).not.toContain(mort);
    await fetch(`${BASE}/__scheduled?cron=*%2F5+*+*+*+*`);
    await new Promise((res) => setTimeout(res, 800));
    expect(recus.length).toBe(avant + 2);
  });
});

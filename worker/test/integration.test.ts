import { describe, expect, it } from 'vitest';

/**
 * Test d'intégration contre `wrangler dev` et une base D1 locale neuve
 * (voir `npm run test:integration`). Ignoré si WORKER_URL n'est pas défini.
 */
const BASE = process.env.WORKER_URL ?? '';
const ORIGINE = 'http://localhost:5173';

const hex = (n: number) => [...crypto.getRandomValues(new Uint8Array(n))].map((x) => x.toString(16).padStart(2, '0')).join('');
const ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const code = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (x) => ALPHA[x & 31]).join('');

const b64 = (o: number[]) => btoa(String.fromCharCode(...o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const premierOctet = (d: string) => atob(d.replace(/-/g, '+').replace(/_/g, '/')).charCodeAt(0);

async function appel(chemin: string, options: { methode?: string; jeton?: string; corps?: unknown; binaire?: string } = {}) {
  const h: Record<string, string> = { origin: ORIGINE };
  if (options.jeton) h.authorization = `Bearer ${options.jeton}`;
  if (options.corps !== undefined) h['content-type'] = 'application/json';
  const r = await fetch(`${BASE}${chemin}`, {
    method: options.methode ?? (options.corps !== undefined || options.binaire ? 'POST' : 'GET'),
    headers: h,
    body: options.binaire ?? (options.corps !== undefined ? JSON.stringify(options.corps) : undefined),
  });
  return r;
}

async function tirer(jeton: string, depuis = 0) {
  const d = (await (await appel(`/sync/projet?projet=p1&depuis=${depuis}`, { jeton })).json()) as { lignes: { id: number; partie: number; total: number; d: string }[] };
  return d.lignes.map((l) => ({ ...l, octet: premierOctet(l.d) }));
}

describe.skipIf(!BASE)('Worker : espace, appairage, synchro', () => {
  const espace = hex(16);
  const secours = hex(32);
  let jetonA = '';
  let jetonB = '';
  let appareilB = '';

  it('crée l’espace (premier appareil), refuse un second espace identique', async () => {
    const r = await appel('/espace', { corps: { espace, secours, nom: 'iPhone' } });
    expect(r.status).toBe(201);
    const d = (await r.json()) as { jeton: string };
    jetonA = d.jeton;
    expect(jetonA).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(r.headers.get('access-control-allow-origin')).toBe(ORIGINE);
    expect((await appel('/espace', { corps: { espace, secours, nom: 'x' } })).status).toBe(409);
  });

  it('appairage : le jeton n’est remis qu’après confirmation, et une seule fois', async () => {
    const c = code();
    const o = await appel('/appairage', { jeton: jetonA, corps: { code: c, pub: 'cleA' } });
    expect(o.status).toBe(201);
    const { id } = (await o.json()) as { id: string };
    expect((await appel('/appairage/reclamer', { corps: { code: 'AAAAAAAA', nom: 'x' } })).status).toBe(404);
    const rec = await appel('/appairage/reclamer', { corps: { code: c.toLowerCase(), nom: 'Ordinateur', pub: 'cleB' } });
    expect(rec.status).toBe(200);
    expect(await rec.json()).toMatchObject({ id, espace, pub: 'cleA' });
    // Avant confirmation : pas de jeton.
    expect(await (await appel(`/appairage/${id}/attente`)).json()).toEqual({ statut: 'reclame' });
    expect(await (await appel(`/appairage/${id}`, { jeton: jetonA })).json()).toMatchObject({ statut: 'reclame', pub: 'cleB', nom: 'Ordinateur' });
    expect((await appel(`/appairage/${id}/confirmer`, { jeton: jetonA, corps: { enveloppe: 'secretChiffre' } })).status).toBe(200);
    const fin = (await (await appel(`/appairage/${id}/attente`)).json()) as { jeton: string; appareil: string; enveloppe: string };
    expect(fin.enveloppe).toBe('secretChiffre');
    jetonB = fin.jeton;
    appareilB = fin.appareil;
    expect((await appel(`/appairage/${id}/attente`)).status).toBe(404); // remis une seule fois
    const liste = (await (await appel('/appareils', { jeton: jetonB })).json()) as { nom: string; moi: boolean }[];
    expect(liste.map((a) => a.nom)).toEqual(['iPhone', 'Ordinateur']);
  });

  it('les codes devinés sont limités en débit', async () => {
    const statuts: number[] = [];
    for (let i = 0; i < 12; i++) statuts.push((await appel('/appairage/reclamer', { corps: { code: code(), nom: 'x' } })).status);
    expect(statuts).toContain(429);
  });

  it('envoi, têtes, tirage ; un bloc en deux parties reste invisible tant qu’il est incomplet', async () => {
    for (const octet of [1, 2, 3]) {
      expect((await appel('/sync/envoi?projet=p1', { jeton: jetonA, binaire: b64([octet, octet]) })).status).toBe(200);
    }
    expect((await appel('/sync/envoi?projet=p1&partie=0&total=2', { jeton: jetonA, binaire: b64([9]) })).status).toBe(200);
    let trames = await tirer(jetonB);
    expect(trames.map((t) => t.octet)).toEqual([1, 2, 3]);
    await appel('/sync/envoi?projet=p1&partie=1&total=2', { jeton: jetonA, binaire: b64([10]) });
    trames = await tirer(jetonB);
    expect(trames.map((t) => `${t.octet}:${t.partie}/${t.total}`)).toEqual(['1:0/1', '2:0/1', '3:0/1', '9:0/2', '10:1/2']);
    const t = (await (await appel('/sync/tetes', { jeton: jetonB })).json()) as { projet: string; seq: number; nombre: number }[];
    expect(t).toEqual([{ projet: 'p1', seq: trames.at(-1)!.id, nombre: 4 }]);
  });

  it('compactage : l’état complet remplace les blocs anciens', async () => {
    const [tete] = (await (await appel('/sync/tetes', { jeton: jetonA })).json()) as { seq: number }[];
    expect((await appel(`/sync/compacter?projet=p1&jusqua=${tete!.seq + 5}`, { jeton: jetonA, binaire: b64([7]) })).status).toBe(409);
    expect((await appel(`/sync/compacter?projet=p1&jusqua=${tete!.seq}`, { jeton: jetonA, binaire: b64([42]) })).status).toBe(200);
    const trames = await tirer(jetonB);
    expect(trames.map((x) => x.octet)).toEqual([42]);
    const [apres] = (await (await appel('/sync/tetes', { jeton: jetonA })).json()) as { nombre: number }[];
    expect(apres!.nombre).toBe(1);
  });

  it('jauge d’usage, révocation, restauration par la clé de secours', async () => {
    const u = (await (await appel('/usage', { jeton: jetonA })).json()) as { octets: number; limite: number };
    expect(u.limite).toBe(500 * 1024 * 1024);
    expect(u.octets).toBeGreaterThan(0);
    expect((await appel(`/appareils/${appareilB}`, { methode: 'DELETE', jeton: jetonA })).status).toBe(200);
    expect((await appel('/sync/tetes', { jeton: jetonB })).status).toBe(401);
    expect((await appel('/restauration', { corps: { espace, secours: hex(32), nom: 'x' } })).status).toBe(403);
    const r = await appel('/restauration', { corps: { espace, secours, nom: 'Nouveau téléphone' } });
    expect(r.status).toBe(201);
    const { jeton } = (await r.json()) as { jeton: string };
    expect((await appel('/sync/tetes', { jeton })).status).toBe(200);
  });

  it('aperçus de liens et données réservés aux appareils ; CORS strict', async () => {
    expect((await appel('/unfurl?url=https%3A%2F%2Fexemple.fr')).status).toBe(401);
    expect((await appel('/sync/tetes')).status).toBe(401);
    expect((await appel('/sync/tetes', { jeton: 'x'.repeat(43) })).status).toBe(401);
    const pre = await fetch(`${BASE}/sync/tetes`, { method: 'OPTIONS', headers: { origin: 'https://pirate.example' } });
    expect(pre.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe.skipIf(!BASE)('Worker : partage en lecture seule', () => {
  const id = b64([...crypto.getRandomValues(new Uint8Array(32))]);
  const jetonDe = async () => ((await (await appel('/espace', { corps: { espace: hex(16), secours: hex(32), nom: 'Partage' } })).json()) as { jeton: string }).jeton;

  it('créer, lire sans jeton, mettre à jour, refuser un autre espace, révoquer', async () => {
    const jeton = await jetonDe();
    const expire = Date.now() + 30 * 86_400_000;
    expect((await appel('/partages', { jeton, corps: { id, donnees: 'AAAA', expire } })).status).toBe(201);
    const lu = await appel(`/s/${id}`);
    expect(lu.status).toBe(200);
    expect(lu.headers.get('x-robots-tag')).toMatch(/noindex/);
    expect(await lu.json()).toMatchObject({ donnees: 'AAAA', expire });
    expect((await appel('/partages', { jeton, corps: { id, donnees: 'BBBB', expire: null } })).status).toBe(200);
    expect(await (await appel(`/s/${id}`)).json()).toMatchObject({ donnees: 'BBBB', expire: null });

    // Un autre espace ne peut ni écraser ni révoquer ce lien.
    const autre = await jetonDe();
    expect((await appel('/partages', { jeton: autre, corps: { id, donnees: 'CCCC', expire: null } })).status).toBe(409);
    await appel(`/partages/${id}`, { jeton: autre, methode: 'DELETE' });
    expect((await appel(`/s/${id}`)).status).toBe(200);

    // Entrées invalides : expiration passée, sans jeton, identifiant mal formé.
    expect((await appel('/partages', { jeton, corps: { id, donnees: 'AAAA', expire: Date.now() - 1 } })).status).toBe(400);
    expect((await appel('/partages', { corps: { id, donnees: 'AAAA', expire: null } })).status).toBe(401);
    expect((await appel('/s/court')).status).toBe(404);

    await appel(`/partages/${id}`, { jeton, methode: 'DELETE' });
    expect((await appel(`/s/${id}`)).status).toBe(404);
  });
});

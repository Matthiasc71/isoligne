import {
  ErreurHttp, aleatoireB64, aleatoireId, authentifier, egal, empreinte, json, lireJson, limiter, texte, type Env,
  plafondEspaces,
} from './outils';

const HEX32 = /^[0-9a-f]{32}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const B64 = /^[A-Za-z0-9_-]+$/;
const CODE = /^[0-9A-HJKMNP-TV-Z]{8}$/;
const NOM = (v: unknown) => texte(v, 60).replace(/[\u0000-\u001f]/g, ' ').trim() || 'Appareil';

async function nouvelAppareil(env: Env, espace: string, nom: string): Promise<{ id: string; jeton: string; requete: D1PreparedStatement }> {
  const id = aleatoireId();
  const jeton = aleatoireB64(32);
  const maintenant = Date.now();
  const requete = env.DB.prepare('INSERT INTO appareils (id, espace, jeton_hash, nom, cree, vu) VALUES (?1, ?2, ?3, ?4, ?5, ?5)')
    .bind(id, espace, await empreinte(env, jeton), nom, maintenant);
  return { id, jeton, requete };
}

/** Premier appareil : crée l'espace (identifiant et empreinte du jeton de secours dérivés du secret maître). */
export async function creerEspace(r: Request, env: Env): Promise<Response> {
  await limiter(r, env, 'espace', 5);
  const c = await lireJson<{ espace?: unknown; secours?: unknown; nom?: unknown }>(r);
  const espace = texte(c.espace, 32, HEX32);
  const secours = texte(c.secours, 64, HEX64);
  const existe = await env.DB.prepare('SELECT 1 FROM espaces WHERE id = ?1').bind(espace).first();
  if (existe) throw new ErreurHttp(409, 'espace existant');
  // Instance personnelle : un inconnu ne peut pas ouvrir son propre espace sur ce Worker.
  const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM espaces').first<{ n: number }>();
  if ((total?.n ?? 0) >= plafondEspaces(env)) throw new ErreurHttp(403, 'instance personnelle : espace déjà créé');
  const a = await nouvelAppareil(env, espace, NOM(c.nom));
  await env.DB.batch([
    env.DB.prepare('INSERT INTO espaces (id, secours_hash, cree) VALUES (?1, ?2, ?3)').bind(espace, await empreinte(env, secours), Date.now()),
    a.requete,
  ]);
  return json(r, env, { appareil: a.id, jeton: a.jeton }, 201);
}

/** Restauration avec la clé de secours : nouvel appareil sans aucun autre appareil. */
export async function restaurer(r: Request, env: Env): Promise<Response> {
  await limiter(r, env, 'restauration', 5);
  const c = await lireJson<{ espace?: unknown; secours?: unknown; nom?: unknown }>(r);
  const espace = texte(c.espace, 32, HEX32);
  const secours = texte(c.secours, 64, HEX64);
  const e = await env.DB.prepare('SELECT secours_hash FROM espaces WHERE id = ?1').bind(espace).first<{ secours_hash: string }>();
  if (!e || !egal(e.secours_hash, await empreinte(env, secours))) throw new ErreurHttp(403, 'clé de secours refusée');
  const a = await nouvelAppareil(env, espace, NOM(c.nom));
  await a.requete.run();
  return json(r, env, { appareil: a.id, jeton: a.jeton }, 201);
}

export async function listerAppareils(r: Request, env: Env): Promise<Response> {
  const moi = await authentifier(r, env);
  const { results } = await env.DB.prepare('SELECT id, nom, cree, vu FROM appareils WHERE espace = ?1 AND revoque = 0 ORDER BY cree')
    .bind(moi.espace).all<{ id: string; nom: string; cree: number; vu: number }>();
  return json(r, env, results.map((a) => ({ ...a, moi: a.id === moi.id })));
}

export async function revoquer(r: Request, env: Env, id: string): Promise<Response> {
  const moi = await authentifier(r, env);
  await env.DB.prepare('UPDATE appareils SET revoque = 1 WHERE id = ?1 AND espace = ?2').bind(id, moi.espace).run();
  return json(r, env, { ok: true });
}

// ───────────────────────────── Appairage ─────────────────────────────

const CINQ_MINUTES = 5 * 60_000;

/** Appareil existant : ouvre un appairage (code de 8 caractères généré sur l'appareil, seule son empreinte est stockée). */
export async function ouvrirAppairage(r: Request, env: Env): Promise<Response> {
  const moi = await authentifier(r, env);
  const c = await lireJson<{ code?: unknown; pub?: unknown }>(r);
  const code = texte(c.code, 8, CODE);
  const pub = c.pub === undefined ? null : texte(c.pub, 100, B64);
  const id = aleatoireId();
  const expire = Date.now() + CINQ_MINUTES;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM appairages WHERE expire < ?1').bind(Date.now()),
    env.DB.prepare('INSERT INTO appairages (id, espace, code_hash, expire, statut, pub_ancien) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
      .bind(id, moi.espace, await empreinte(env, `code:${code}`), expire, 'ouvert', pub),
  ]);
  return json(r, env, { id, expire }, 201);
}

/** Nouvel appareil : saisit le code. Il reçoit l'identifiant de l'appairage, pas encore de jeton. */
export async function reclamerAppairage(r: Request, env: Env): Promise<Response> {
  await limiter(r, env, 'appairage', 10);
  const c = await lireJson<{ code?: unknown; nom?: unknown; pub?: unknown }>(r);
  const code = texte(typeof c.code === 'string' ? c.code.toUpperCase() : c.code, 8, CODE);
  const pub = c.pub === undefined ? null : texte(c.pub, 100, B64);
  const a = await env.DB.prepare("SELECT id, espace, pub_ancien FROM appairages WHERE code_hash = ?1 AND statut = 'ouvert' AND expire > ?2")
    .bind(await empreinte(env, `code:${code}`), Date.now()).first<{ id: string; espace: string; pub_ancien: string | null }>();
  if (!a) throw new ErreurHttp(404, 'code inconnu ou expiré');
  await env.DB.prepare("UPDATE appairages SET statut = 'reclame', pub_nouveau = ?1, nom_nouveau = ?2 WHERE id = ?3 AND statut = 'ouvert'")
    .bind(pub, NOM(c.nom), a.id).run();
  return json(r, env, { id: a.id, espace: a.espace, pub: a.pub_ancien });
}

/** Appareil existant : suit l'appairage (le nouvel appareil s'est-il présenté ?). */
export async function etatAppairage(r: Request, env: Env, id: string): Promise<Response> {
  const moi = await authentifier(r, env);
  const a = await env.DB.prepare('SELECT statut, pub_nouveau, nom_nouveau, expire FROM appairages WHERE id = ?1 AND espace = ?2')
    .bind(id, moi.espace).first<{ statut: string; pub_nouveau: string | null; nom_nouveau: string | null; expire: number }>();
  if (!a || a.expire < Date.now()) throw new ErreurHttp(404, 'appairage expiré');
  return json(r, env, { statut: a.statut, pub: a.pub_nouveau, nom: a.nom_nouveau });
}

/** Appareil existant : confirme (l'utilisateur a comparé les empreintes). Le jeton du nouvel appareil est créé ici. */
export async function confirmerAppairage(r: Request, env: Env, id: string): Promise<Response> {
  const moi = await authentifier(r, env);
  const c = await lireJson<{ enveloppe?: unknown }>(r);
  const enveloppe = c.enveloppe === undefined ? null : texte(c.enveloppe, 200, B64);
  const a = await env.DB.prepare("SELECT nom_nouveau FROM appairages WHERE id = ?1 AND espace = ?2 AND statut = 'reclame' AND expire > ?3")
    .bind(id, moi.espace, Date.now()).first<{ nom_nouveau: string }>();
  if (!a) throw new ErreurHttp(404, 'appairage expiré');
  const nouveau = await nouvelAppareil(env, moi.espace, a.nom_nouveau);
  await env.DB.batch([
    nouveau.requete,
    env.DB.prepare("UPDATE appairages SET statut = 'confirme', enveloppe = ?1, jeton_nouveau = ?2 WHERE id = ?3")
      .bind(enveloppe, `${nouveau.id}:${nouveau.jeton}`, id),
  ]);
  return json(r, env, { ok: true });
}

/** Nouvel appareil : attend la confirmation, reçoit son jeton une seule fois (la ligne est alors effacée). */
export async function attendreAppairage(r: Request, env: Env, id: string): Promise<Response> {
  await limiter(r, env, 'attente', 200);
  const a = await env.DB.prepare('SELECT statut, enveloppe, jeton_nouveau, expire FROM appairages WHERE id = ?1')
    .bind(id).first<{ statut: string; enveloppe: string | null; jeton_nouveau: string | null; expire: number }>();
  if (!a || a.expire < Date.now()) throw new ErreurHttp(404, 'appairage expiré');
  if (a.statut !== 'confirme' || !a.jeton_nouveau) return json(r, env, { statut: a.statut });
  await env.DB.prepare('DELETE FROM appairages WHERE id = ?1').bind(id).run();
  const [appareil, jeton] = a.jeton_nouveau.split(':');
  return json(r, env, { statut: 'confirme', appareil, jeton, enveloppe: a.enveloppe });
}

import { ErreurHttp, authentifier, empreinte, json, limiter, texte, type Env } from './outils';

/**
 * Partage en lecture seule (jalon 6). L'instantané est chiffré sur l'appareil ;
 * la clé n'est que dans le lien (après le #), jamais envoyée au serveur.
 * L'identifiant (256 bits) n'est stocké que haché, comme les jetons d'appareil.
 */

const ID = /^[A-Za-z0-9_-]{43}$/;
const B64 = /^[A-Za-z0-9_-]+$/;
/** 2 Mo d'instantané chiffré, en base64url. */
export const MAX_PARTAGE = 2_800_000;
const MAX_PARTAGES = 50;
const DUREE_MAX = 400 * 86_400_000;

async function lireCorps(r: Request): Promise<{ id?: unknown; donnees?: unknown; expire?: unknown }> {
  if (Number(r.headers.get('content-length') ?? '0') > MAX_PARTAGE + 1000) throw new ErreurHttp(413, 'instantané trop grand');
  const t = await r.text();
  if (t.length > MAX_PARTAGE + 1000) throw new ErreurHttp(413, 'instantané trop grand');
  try { return JSON.parse(t) as { id?: unknown; donnees?: unknown; expire?: unknown }; } catch { throw new ErreurHttp(400, 'JSON invalide'); }
}

/** Créer ou mettre à jour (même identifiant, même espace) un instantané. */
export async function poserPartage(r: Request, env: Env): Promise<Response> {
  const moi = await authentifier(r, env);
  await limiter(r, env, 'partage-ecrire', 60);
  const c = await lireCorps(r);
  const id = texte(c.id, 43, ID);
  const donnees = texte(c.donnees, MAX_PARTAGE, B64);
  const maintenant = Date.now();
  const expire = c.expire === null ? null : typeof c.expire === 'number' && c.expire > maintenant && c.expire < maintenant + DUREE_MAX ? Math.floor(c.expire) : undefined;
  if (expire === undefined) throw new ErreurHttp(400, 'expiration invalide');
  const h = await empreinte(env, `partage:${id}`);
  const existant = await env.DB.prepare('SELECT espace FROM partages WHERE id_hash = ?1').bind(h).first<{ espace: string }>();
  if (existant && existant.espace !== moi.espace) throw new ErreurHttp(409, 'identifiant pris');
  if (!existant) {
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM partages WHERE espace = ?1 AND (expire IS NULL OR expire > ?2)').bind(moi.espace, maintenant).first<{ n: number }>();
    if ((n?.n ?? 0) >= MAX_PARTAGES) throw new ErreurHttp(409, 'trop de liens actifs');
  }
  await env.DB.prepare(
    `INSERT INTO partages (id_hash, espace, donnees, cree, maj, expire) VALUES (?1, ?2, ?3, ?4, ?4, ?5)
     ON CONFLICT(id_hash) DO UPDATE SET donnees = excluded.donnees, maj = excluded.maj, expire = excluded.expire`,
  ).bind(h, moi.espace, donnees, maintenant, expire).run();
  return json(r, env, { ok: true }, existant ? 200 : 201);
}

export async function revoquerPartage(r: Request, env: Env, id: string): Promise<Response> {
  const moi = await authentifier(r, env);
  const h = await empreinte(env, `partage:${id}`);
  await env.DB.prepare('DELETE FROM partages WHERE id_hash = ?1 AND espace = ?2').bind(h, moi.espace).run();
  return json(r, env, { ok: true });
}

/** Lecture publique par le destinataire : seulement l'instantané chiffré. */
export async function lirePartage(r: Request, env: Env, id: string): Promise<Response> {
  await limiter(r, env, 'partage-lire', 120);
  const h = await empreinte(env, `partage:${id}`);
  const p = await env.DB.prepare('SELECT donnees, cree, maj, expire FROM partages WHERE id_hash = ?1')
    .bind(h).first<{ donnees: string; cree: number; maj: number; expire: number | null }>();
  if (!p || (p.expire !== null && p.expire <= Date.now())) throw new ErreurHttp(404, 'lien plus valable');
  const reponse = json(r, env, { donnees: p.donnees, maj: p.maj, expire: p.expire });
  reponse.headers.set('x-robots-tag', 'noindex, nofollow');
  return reponse;
}

/** Cron : efface les instantanés expirés. */
export async function purgerPartages(env: Env, maintenant = Date.now()): Promise<void> {
  await env.DB.prepare('DELETE FROM partages WHERE expire IS NOT NULL AND expire <= ?1').bind(maintenant).run();
}

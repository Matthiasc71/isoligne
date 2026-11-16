import { ErreurHttp, authentifier, json, type Env } from './outils';

const PROJET = /^[A-Za-z0-9]{1,32}$/;
const MAX_PARTIE = 1_000_000; // octets : nettement sous la limite de 2 Mo par ligne D1
const MAX_LIGNES = 200;
export const LIMITE_STOCKAGE = 500 * 1024 * 1024; // une base D1 gratuite : 500 Mo

function params(url: URL) {
  const projet = url.searchParams.get('projet') ?? '';
  if (!PROJET.test(projet)) throw new ErreurHttp(400, 'projet invalide');
  const partie = Number(url.searchParams.get('partie') ?? '0');
  const total = Number(url.searchParams.get('total') ?? '1');
  if (!Number.isInteger(partie) || !Number.isInteger(total) || total < 1 || total > 64 || partie < 0 || partie >= total) {
    throw new ErreurHttp(400, 'partie invalide');
  }
  return { projet, partie, total };
}

/** Corps : bloc chiffré en base64url (texte), sans décodage côté serveur. */
async function corpsBloc(r: Request): Promise<string> {
  const longueur = Number(r.headers.get('content-length') ?? '0');
  if (longueur > MAX_PARTIE) throw new ErreurHttp(413, 'bloc trop grand');
  const t = await r.text();
  if (t.length === 0 || t.length > MAX_PARTIE || !/^[A-Za-z0-9_-]+$/.test(t)) throw new ErreurHttp(400, 'bloc invalide');
  return t;
}

/**
 * Envoi d'un bloc chiffré (une mise à jour Yjs regroupée, ou une partie).
 * La tête du projet n'avance qu'à la dernière partie : un appareil ne lit jamais un bloc incomplet.
 */
export async function envoyer(r: Request, env: Env, url: URL): Promise<Response> {
  const moi = await authentifier(r, env);
  const { projet, partie, total } = params(url);
  const donnees = await corpsBloc(r);
  const maintenant = Date.now();
  const insertion = env.DB.prepare(
    'INSERT INTO majs (espace, projet, partie, total, donnees, appareil, cree) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) RETURNING id',
  ).bind(moi.espace, projet, partie, total, donnees, moi.id, maintenant);
  if (partie < total - 1) {
    const ligne = await insertion.first<{ id: number }>();
    return json(r, env, { id: ligne?.id });
  }
  const [ligne] = await env.DB.batch<{ id: number }>([
    insertion,
    env.DB.prepare(
      `INSERT INTO tetes (espace, projet, seq, nombre) VALUES (?1, ?2, last_insert_rowid(), 1)
       ON CONFLICT(espace, projet) DO UPDATE SET seq = last_insert_rowid(), nombre = nombre + 1`,
    ).bind(moi.espace, projet),
  ]);
  return json(r, env, { seq: ligne?.results[0]?.id });
}

/** Têtes de tous les projets de l'espace : une ligne lue par projet. */
export async function tetes(r: Request, env: Env): Promise<Response> {
  const moi = await authentifier(r, env);
  const { results } = await env.DB.prepare('SELECT projet, seq, nombre FROM tetes WHERE espace = ?1').bind(moi.espace).all();
  return json(r, env, results);
}

/** Blocs d'un projet après `depuis`, jusqu'à la tête (donc jamais de bloc incomplet), par pages de 200. */
export async function tirer(r: Request, env: Env, url: URL): Promise<Response> {
  const moi = await authentifier(r, env);
  const projet = url.searchParams.get('projet') ?? '';
  if (!PROJET.test(projet)) throw new ErreurHttp(400, 'projet invalide');
  const depuis = Number(url.searchParams.get('depuis') ?? '0');
  if (!Number.isSafeInteger(depuis) || depuis < 0) throw new ErreurHttp(400, 'depuis invalide');
  const tete = await env.DB.prepare('SELECT seq FROM tetes WHERE espace = ?1 AND projet = ?2').bind(moi.espace, projet).first<{ seq: number }>();
  if (!tete || tete.seq <= depuis) return json(r, env, { lignes: [], encore: false });
  const { results } = await env.DB.prepare(
    'SELECT id, partie, total, donnees AS d FROM majs WHERE espace = ?1 AND projet = ?2 AND id > ?3 AND id <= ?4 ORDER BY id LIMIT ?5',
  ).bind(moi.espace, projet, depuis, tete.seq, MAX_LIGNES + 1).all<{ id: number; partie: number; total: number; d: string }>();
  let lignes = results.slice(0, MAX_LIGNES);
  const encore = results.length > MAX_LIGNES;
  // Ne pas couper un bloc en plusieurs parties à la fin d'une page.
  if (encore) {
    while (lignes.length && lignes[lignes.length - 1]!.partie !== lignes[lignes.length - 1]!.total - 1) lignes = lignes.slice(0, -1);
  }
  return json(r, env, { lignes, encore });
}

/**
 * Compactage : l'appareil a tout lu jusqu'à `jusqua` et envoie l'état complet chiffré.
 * À la dernière partie, les blocs <= jusqua sont effacés dans le même lot.
 */
export async function compacter(r: Request, env: Env, url: URL): Promise<Response> {
  const moi = await authentifier(r, env);
  const { projet, partie, total } = params(url);
  const jusqua = Number(url.searchParams.get('jusqua') ?? '-1');
  if (!Number.isSafeInteger(jusqua) || jusqua < 1) throw new ErreurHttp(400, 'jusqua invalide');
  const tete = await env.DB.prepare('SELECT seq FROM tetes WHERE espace = ?1 AND projet = ?2').bind(moi.espace, projet).first<{ seq: number }>();
  if (!tete || jusqua > tete.seq) throw new ErreurHttp(409, 'tête dépassée');
  const donnees = await corpsBloc(r);
  const insertion = env.DB.prepare(
    'INSERT INTO majs (espace, projet, partie, total, donnees, appareil, cree) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)',
  ).bind(moi.espace, projet, partie, total, donnees, moi.id, Date.now());
  if (partie < total - 1) { await insertion.run(); return json(r, env, { ok: true }); }
  await env.DB.batch([
    insertion,
    env.DB.prepare('DELETE FROM majs WHERE espace = ?1 AND projet = ?2 AND id <= ?3').bind(moi.espace, projet, jusqua),
    env.DB.prepare(
      `UPDATE tetes SET seq = last_insert_rowid(),
         nombre = (SELECT COUNT(*) FROM majs WHERE espace = ?1 AND projet = ?2 AND partie = total - 1)
       WHERE espace = ?1 AND projet = ?2`,
    ).bind(moi.espace, projet),
  ]);
  return json(r, env, { ok: true });
}

/** Jauge : taille de la base (meta.size_after de D1) rapportée à la limite gratuite d'une base. */
export async function usage(r: Request, env: Env): Promise<Response> {
  await authentifier(r, env);
  const res = await env.DB.prepare('SELECT 1').run();
  const octets = (res.meta as { size_after?: number }).size_after ?? 0;
  return json(r, env, { octets, limite: LIMITE_STOCKAGE });
}

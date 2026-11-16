export interface Env {
  DB: D1Database;
  /** Origines autorisées (CORS), séparées par des virgules. */
  ORIGINES: string;
  /** Sel des empreintes de jetons (wrangler secret, jamais dans le dépôt). */
  SEL: string;
  /** Nombre maximal d'espaces : « 1 » en production (instance personnelle). */
  ESPACES_MAX?: string;
}

/** Instance personnelle : au-delà de ESPACES_MAX espaces (1 par défaut), plus aucune création. */
export function plafondEspaces(env: Pick<Env, 'ESPACES_MAX'>): number {
  const n = Number.parseInt(env.ESPACES_MAX ?? '1', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

const enc = new TextEncoder();

export function aleatoireB64(octets = 32): string {
  const o = crypto.getRandomValues(new Uint8Array(octets));
  let s = '';
  for (const x of o) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function aleatoireId(): string {
  return [...crypto.getRandomValues(new Uint8Array(12))].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Empreinte salée d'un secret (jeton, code, jeton de secours). Le secret lui-même n'est jamais stocké. */
export async function empreinte(env: Env, secret: string): Promise<string> {
  if (!env.SEL || env.SEL.length < 16) throw new Error('SEL manquant');
  const h = await crypto.subtle.digest('SHA-256', enc.encode(`${env.SEL}:${secret}`));
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Comparaison à temps constant de deux empreintes hexadécimales. */
export function egal(a: string, b: string): boolean {
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  return crypto.subtle.timingSafeEqual(x, y);
}

export function entetesSecurite(h: Headers): Headers {
  h.set('content-security-policy', "default-src 'none'; frame-ancestors 'none'");
  h.set('referrer-policy', 'no-referrer');
  h.set('x-content-type-options', 'nosniff');
  h.set('cross-origin-resource-policy', 'cross-origin');
  return h;
}

export function cors(requete: Request, env: Env, h: Headers): Headers {
  const origine = requete.headers.get('origin');
  const autorisees = env.ORIGINES.split(',').map((o) => o.trim()).filter(Boolean);
  if (origine && autorisees.includes(origine)) {
    h.set('access-control-allow-origin', origine);
    h.set('vary', 'origin');
    h.set('access-control-allow-methods', 'GET, POST, DELETE, OPTIONS');
    h.set('access-control-allow-headers', 'authorization, content-type');
    h.set('access-control-expose-headers', 'x-encore');
    h.set('access-control-max-age', '86400');
  }
  return h;
}

export function json(requete: Request, env: Env, corps: unknown, statut = 200, cache = 'no-store'): Response {
  const h = entetesSecurite(new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': cache }));
  return new Response(JSON.stringify(corps), { status: statut, headers: cors(requete, env, h) });
}

export class ErreurHttp extends Error {
  constructor(readonly statut: number, message: string) { super(message); }
}

/** Corps JSON borné (8 Ko par défaut). */
export async function lireJson<T>(requete: Request, max = 8192): Promise<T> {
  const texte = await requete.text();
  if (texte.length > max) throw new ErreurHttp(413, 'trop grand');
  try { return JSON.parse(texte) as T; } catch { throw new ErreurHttp(400, 'JSON invalide'); }
}

export function texte(v: unknown, max: number, motif?: RegExp): string {
  if (typeof v !== 'string' || v.length === 0 || v.length > max || (motif && !motif.test(v))) throw new ErreurHttp(400, 'paramètre invalide');
  return v;
}

/**
 * Limitation de débit par adresse IP et par route : `max` requêtes par fenêtre de 10 minutes.
 * Une seule ligne par clé (une écriture D1 par requête limitée).
 */
export async function limiter(requete: Request, env: Env, route: string, max: number): Promise<void> {
  const ip = requete.headers.get('cf-connecting-ip') ?? 'local';
  const fenetre = Math.floor(Date.now() / 600_000);
  const cle = `${route}:${ip}`;
  const r = await env.DB.prepare(
    `INSERT INTO limites (cle, fenetre, compte) VALUES (?1, ?2, 1)
     ON CONFLICT(cle) DO UPDATE SET compte = CASE WHEN fenetre = ?2 THEN compte + 1 ELSE 1 END, fenetre = ?2
     RETURNING compte`,
  ).bind(cle, fenetre).first<{ compte: number }>();
  if ((r?.compte ?? 0) > max) throw new ErreurHttp(429, 'trop de tentatives');
}

export interface Appareil { id: string; espace: string }

/** Authentifie un appareil par son jeton (en-tête Authorization: Bearer). */
export async function authentifier(requete: Request, env: Env): Promise<Appareil> {
  const m = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(requete.headers.get('authorization') ?? '');
  if (!m) throw new ErreurHttp(401, 'jeton manquant');
  const h = await empreinte(env, m[1]!);
  const a = await env.DB.prepare('SELECT id, espace, jeton_hash, vu FROM appareils WHERE jeton_hash = ?1 AND revoque = 0')
    .bind(h).first<{ id: string; espace: string; jeton_hash: string; vu: number }>();
  if (!a || !egal(a.jeton_hash, h)) throw new ErreurHttp(401, 'jeton refusé');
  // « Vu » à l'heure près : une écriture par heure et par appareil au plus.
  const maintenant = Date.now();
  if (maintenant - a.vu > 3_600_000) await env.DB.prepare('UPDATE appareils SET vu = ?1 WHERE id = ?2').bind(maintenant, a.id).run();
  return { id: a.id, espace: a.espace };
}

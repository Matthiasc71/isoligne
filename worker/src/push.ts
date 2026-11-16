import { ErreurHttp, authentifier, json, lireJson, limiter, texte, type Env } from './outils';

/**
 * Notifications (jalon 5). Le serveur ne lit rien : chaque appareil chiffre lui-même
 * le texte de chaque rappel pour chaque abonnement (RFC 8291). Le Worker garde
 * l'heure d'envoi et un bloc illisible, signe la requête (VAPID, RFC 8292) et l'envoie.
 */

const ID = /^[A-Za-z0-9_-]{16,43}$/;
const B64 = /^[A-Za-z0-9_-]+$/;
const MAX_ENVOIS = 400;
/** Un message chiffré tient en 4 Ko (limite des services de push) : ≈ 5 500 caractères base64url. */
const MAX_CORPS = 5600;
const MAX_PLANNING = 900_000;
const MAX_ABONNEMENTS = 10;
/** Un rappel en retard de plus d'une heure n'est plus envoyé. */
export const RETARD_MAX = 3_600_000;
const HORIZON_MAX = 16 * 86_400_000;
/** Envois par passage du Cron : sous la limite de 50 sous-requêtes de l'offre gratuite. */
export const PAR_PASSAGE = 40;

const enc = new TextEncoder();

function versB64u(o: Uint8Array): string {
  let s = '';
  for (const x of o) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function depuisB64u(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

/** Services de push des navigateurs : Apple, Google, Mozilla, Microsoft. Rien d'autre (pas de requête vers un hôte choisi par le client). */
export function endpointValide(adresse: string, env: Pick<Env, 'PUSH_TEST'>): boolean {
  if (env.PUSH_TEST && adresse.startsWith(`${env.PUSH_TEST}/`)) return true;
  let u: URL;
  try { u = new URL(adresse); } catch { return false; }
  if (u.protocol !== 'https:' || u.port || u.username || u.password || adresse.length > 1000) return false;
  const h = u.hostname;
  return h === 'web.push.apple.com' || h === 'fcm.googleapis.com' || h === 'updates.push.services.mozilla.com'
    || /^[a-z0-9-]+\.notify\.windows\.com$/.test(h);
}

// ───────────────────────────── VAPID (RFC 8292) ─────────────────────────────

interface Vapid { cle: CryptoKey; publique: string }
let memo: { jwk: string; v: Vapid } | null = null;

async function vapid(env: Env): Promise<Vapid> {
  if (!env.VAPID_JWK) throw new ErreurHttp(503, 'notifications non configurées');
  if (memo?.jwk === env.VAPID_JWK) return memo.v;
  const jwk = JSON.parse(env.VAPID_JWK) as JsonWebKey;
  if (!jwk.x || !jwk.y) throw new ErreurHttp(503, 'clé VAPID invalide');
  const publique = versB64u(new Uint8Array([4, ...depuisB64u(jwk.x), ...depuisB64u(jwk.y)]));
  const cle = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  memo = { jwk: env.VAPID_JWK, v: { cle, publique } };
  return memo.v;
}

export async function jetonVapid(v: Vapid, audience: string, sujet: string, maintenant: number): Promise<string> {
  const t = (o: unknown) => versB64u(enc.encode(JSON.stringify(o)));
  const signe = `${t({ typ: 'JWT', alg: 'ES256' })}.${t({ aud: audience, exp: Math.floor(maintenant / 1000) + 12 * 3600, sub: sujet })}`;
  // WebCrypto signe au format r‖s (64 octets) : exactement ce qu'attend ES256.
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, v.cle, enc.encode(signe));
  return `${signe}.${versB64u(new Uint8Array(sig))}`;
}

const SUJET = 'https://github.com/Matthiasc71/isoligne';

/** Envoie un message déjà chiffré ; renvoie le statut HTTP du service de push (0 si injoignable). */
async function pousser(env: Env, v: Vapid, jetons: Map<string, string>, endpoint: string, corps: string, maintenant: number): Promise<number> {
  const audience = new URL(endpoint).origin;
  let jwt = jetons.get(audience);
  if (!jwt) { jwt = await jetonVapid(v, audience, env.VAPID_SUJET || SUJET, maintenant); jetons.set(audience, jwt); }
  try {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ttl: '86400',
        urgency: 'normal',
        'content-encoding': 'aes128gcm',
        'content-type': 'application/octet-stream',
        authorization: `vapid t=${jwt}, k=${v.publique}`,
      },
      body: depuisB64u(corps),
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    });
    await r.body?.cancel();
    return r.status;
  } catch {
    return 0;
  }
}

// ───────────────────────────── Routes ─────────────────────────────

export async function clePublique(r: Request, env: Env): Promise<Response> {
  return json(r, env, { cle: (await vapid(env)).publique }, 200, 'public, max-age=3600');
}

export async function listerAbonnements(r: Request, env: Env): Promise<Response> {
  const moi = await authentifier(r, env);
  const l = await env.DB.prepare('SELECT id, appareil FROM abonnements WHERE espace = ?1').bind(moi.espace).all<{ id: string; appareil: string }>();
  return json(r, env, l.results);
}

export async function abonner(r: Request, env: Env): Promise<Response> {
  const moi = await authentifier(r, env);
  await limiter(r, env, 'abonnement', 20);
  const c = await lireJson<{ id?: unknown; endpoint?: unknown }>(r);
  const id = texte(c.id, 43, ID);
  const endpoint = texte(c.endpoint, 1000);
  if (!endpointValide(endpoint, env)) throw new ErreurHttp(400, 'service de push inconnu');
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM abonnements WHERE espace = ?1 AND id != ?2').bind(moi.espace, id).first<{ n: number }>();
  if ((n?.n ?? 0) >= MAX_ABONNEMENTS) throw new ErreurHttp(409, 'trop d’abonnements');
  // Un identifiant déjà pris par un autre espace n'est jamais repris.
  await env.DB.prepare(
    `INSERT INTO abonnements (id, espace, appareil, endpoint, cree) VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(id) DO UPDATE SET endpoint = excluded.endpoint, appareil = excluded.appareil WHERE abonnements.espace = excluded.espace`,
  ).bind(id, moi.espace, moi.id, endpoint, Date.now()).run();
  return json(r, env, { ok: true }, 201);
}

export async function desabonner(r: Request, env: Env, id: string): Promise<Response> {
  const moi = await authentifier(r, env);
  await env.DB.prepare('DELETE FROM abonnements WHERE id = ?1 AND espace = ?2').bind(id, moi.espace).run();
  return json(r, env, { ok: true });
}

interface Envoi { a: string; i: string; q: number; c: string; n?: number }

export async function lirePlanning(r: Request, env: Env): Promise<Response> {
  const moi = await authentifier(r, env);
  const p = await env.DB.prepare('SELECT empreinte FROM plannings WHERE espace = ?1').bind(moi.espace).first<{ empreinte: string }>();
  return json(r, env, { empreinte: p?.empreinte ?? null });
}

/** Remplace tout le planning de l'espace (le même calcul, quel que soit l'appareil). */
export async function poserPlanning(r: Request, env: Env): Promise<Response> {
  const moi = await authentifier(r, env);
  await limiter(r, env, 'planning', 60);
  const c = await lireJson<{ empreinte?: unknown; envois?: unknown }>(r, MAX_PLANNING);
  const empreinte = texte(c.empreinte, 64, B64);
  if (!Array.isArray(c.envois) || c.envois.length > MAX_ENVOIS) throw new ErreurHttp(400, 'envois invalides');
  const maintenant = Date.now();
  const abonnes = new Set((await env.DB.prepare('SELECT id FROM abonnements WHERE espace = ?1').bind(moi.espace).all<{ id: string }>()).results.map((x) => x.id));
  const envois: Envoi[] = [];
  for (const e of c.envois as Record<string, unknown>[]) {
    const a = texte(e?.a, 43, ID);
    const i = texte(e?.i, 200);
    const c2 = texte(e?.c, MAX_CORPS, B64);
    const q = e?.q;
    if (typeof q !== 'number' || !Number.isFinite(q) || q < maintenant - RETARD_MAX || q > maintenant + HORIZON_MAX) throw new ErreurHttp(400, 'heure invalide');
    if (abonnes.has(a)) envois.push({ a, i, q, c: c2 });
  }
  envois.sort((x, y) => x.q - y.q);
  await env.DB.prepare(
    `INSERT INTO plannings (espace, empreinte, envois, prochain, maj) VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(espace) DO UPDATE SET empreinte = excluded.empreinte, envois = excluded.envois, prochain = excluded.prochain, maj = excluded.maj`,
  ).bind(moi.espace, empreinte, JSON.stringify(envois), envois[0]?.q ?? null, maintenant).run();
  return json(r, env, { envois: envois.length });
}

/** « Envoyer un essai » : un message chiffré par l'appareil, envoyé tout de suite. */
export async function essai(r: Request, env: Env): Promise<Response> {
  const moi = await authentifier(r, env);
  await limiter(r, env, 'essai', 10);
  const c = await lireJson<{ a?: unknown; c?: unknown }>(r);
  const a = texte(c.a, 43, ID);
  const corps = texte(c.c, MAX_CORPS, B64);
  const ab = await env.DB.prepare('SELECT endpoint FROM abonnements WHERE id = ?1 AND espace = ?2').bind(a, moi.espace).first<{ endpoint: string }>();
  if (!ab) throw new ErreurHttp(404, 'abonnement inconnu');
  const statut = await pousser(env, await vapid(env), new Map(), ab.endpoint, corps, Date.now());
  if (statut === 404 || statut === 410) await env.DB.prepare('DELETE FROM abonnements WHERE id = ?1').bind(a).run();
  return json(r, env, { statut });
}

// ───────────────────────────── Cron ─────────────────────────────

export interface BilanTournee { envoyes: number; abandonnes: number; reportes: number }

/** Passage du Cron (toutes les 5 minutes) : envoie les rappels échus, au plus PAR_PASSAGE. */
export async function tournee(env: Env, maintenant = Date.now()): Promise<BilanTournee> {
  const bilan: BilanTournee = { envoyes: 0, abandonnes: 0, reportes: 0 };
  if (!env.VAPID_JWK) return bilan;
  const lignes = await env.DB.prepare('SELECT espace, envois, maj FROM plannings WHERE prochain IS NOT NULL AND prochain <= ?1 LIMIT 5')
    .bind(maintenant).all<{ espace: string; envois: string; maj: number }>();
  if (lignes.results.length === 0) return bilan;
  const v = await vapid(env);
  const jetons = new Map<string, string>();
  let budget = PAR_PASSAGE;
  for (const l of lignes.results) {
    const envois = JSON.parse(l.envois) as Envoi[];
    const abonnes = new Map((await env.DB.prepare('SELECT id, endpoint FROM abonnements WHERE espace = ?1').bind(l.espace).all<{ id: string; endpoint: string }>())
      .results.map((x) => [x.id, x.endpoint]));
    const morts = new Set<string>();
    const reste: Envoi[] = [];
    for (const e of envois) {
      const endpoint = abonnes.get(e.a);
      if (e.q > maintenant) { reste.push(e); continue; }
      if (e.q < maintenant - RETARD_MAX || !endpoint || morts.has(e.a)) { bilan.abandonnes++; continue; }
      if (budget <= 0) { reste.push(e); bilan.reportes++; continue; }
      budget--;
      const statut = await pousser(env, v, jetons, endpoint, e.c, maintenant);
      if (statut >= 200 && statut < 300) bilan.envoyes++;
      else if (statut === 404 || statut === 410) {
        morts.add(e.a);
        bilan.abandonnes++;
        await env.DB.prepare('DELETE FROM abonnements WHERE id = ?1').bind(e.a).run();
      } else if ((statut === 0 || statut === 429 || statut >= 500) && (e.n ?? 0) < 3) {
        reste.push({ ...e, n: (e.n ?? 0) + 1 });
        bilan.reportes++;
      } else bilan.abandonnes++;
    }
    const prochain = reste.length ? Math.min(...reste.map((e) => e.q)) : null;
    // Écriture conditionnelle : un planning reposé entre-temps par un appareil n'est pas écrasé.
    await env.DB.prepare('UPDATE plannings SET envois = ?1, prochain = ?2 WHERE espace = ?3 AND maj = ?4')
      .bind(JSON.stringify(reste), prochain, l.espace, l.maj).run();
  }
  return bilan;
}

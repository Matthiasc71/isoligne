import { composer, type Collecte } from './apercu';
import { resolutionPublique, verifierUrl } from './securite';

export interface Env {
  /** Origines autorisées (CORS), séparées par des virgules. */
  ORIGINES: string;
}

const MAX_HTML = 512 * 1024;
const MAX_REDIRECTIONS = 3;
const DELAI_MS = 5000;
const AGENT = 'Mozilla/5.0 (compatible; IsoligneApercu/1.0)';

function entetesSecurite(h: Headers): Headers {
  h.set('content-security-policy', "default-src 'none'; frame-ancestors 'none'");
  h.set('referrer-policy', 'no-referrer');
  h.set('x-content-type-options', 'nosniff');
  h.set('cross-origin-resource-policy', 'cross-origin');
  return h;
}

function cors(requete: Request, env: Env, h: Headers): Headers {
  const origine = requete.headers.get('origin');
  const autorisees = env.ORIGINES.split(',').map((o) => o.trim()).filter(Boolean);
  if (origine && autorisees.includes(origine)) {
    h.set('access-control-allow-origin', origine);
    h.set('vary', 'origin');
    h.set('access-control-allow-methods', 'GET, OPTIONS');
    h.set('access-control-max-age', '86400');
  }
  return h;
}

function json(requete: Request, env: Env, corps: unknown, statut = 200, cache = 'no-store'): Response {
  const h = entetesSecurite(new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': cache }));
  return new Response(JSON.stringify(corps), { status: statut, headers: cors(requete, env, h) });
}

/** Coupe le flux au-delà de `max` octets. */
function limiter(flux: ReadableStream<Uint8Array>, max: number): ReadableStream<Uint8Array> {
  let lus = 0;
  return flux.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(morceau, ctrl) {
      if (lus >= max) { ctrl.terminate(); return; }
      lus += morceau.byteLength;
      ctrl.enqueue(lus > max ? morceau.subarray(0, morceau.byteLength - (lus - max)) : morceau);
    },
  }));
}

/** Va chercher la page en suivant au plus 3 redirections, chacune revérifiée. */
async function chercher(depart: URL): Promise<{ reponse: Response; url: URL } | null> {
  let url = depart;
  for (let saut = 0; saut <= MAX_REDIRECTIONS; saut++) {
    if (!(await resolutionPublique(url.hostname))) return null;
    const r = await fetch(url.href, {
      redirect: 'manual',
      headers: { 'user-agent': AGENT, accept: 'text/html,application/xhtml+xml', 'accept-language': 'fr,en;q=0.5' },
      signal: AbortSignal.timeout(DELAI_MS),
    });
    if (r.status >= 300 && r.status < 400) {
      const cible = r.headers.get('location');
      await r.body?.cancel();
      if (!cible) return null;
      const suivante = verifierUrl(new URL(cible, url).href);
      if (!suivante) return null;
      url = suivante;
      continue;
    }
    return { reponse: r, url };
  }
  return null;
}

async function apercu(cible: URL): Promise<Collecte & { url: string } | null> {
  const trouve = await chercher(cible);
  if (!trouve || !trouve.reponse.ok || !trouve.reponse.body) {
    await trouve?.reponse.body?.cancel();
    return null;
  }
  const type = trouve.reponse.headers.get('content-type') ?? '';
  if (!/text\/html|application\/xhtml/i.test(type)) {
    await trouve.reponse.body.cancel();
    return null;
  }
  const c: Collecte = { titre: '' };
  let dansTitre = false;
  const lecteur = new HTMLRewriter()
    .on('meta', {
      element(e) {
        const cle = (e.getAttribute('property') ?? e.getAttribute('name') ?? '').toLowerCase();
        const v = e.getAttribute('content') ?? '';
        if (cle === 'og:title') c.ogTitre ??= v;
        else if (cle === 'og:site_name') c.ogSite ??= v;
        else if (cle === 'og:description') c.ogDescription ??= v;
        else if (cle === 'twitter:title') c.twitterTitre ??= v;
        else if (cle === 'description') c.description ??= v;
      },
    })
    .on('title', {
      element(e) { dansTitre = !c.titre; e.onEndTag(() => { dansTitre = false; }); },
      text(t) { if (dansTitre && c.titre.length < 400) c.titre += t.text; },
    });
  const limite = new Response(limiter(trouve.reponse.body, MAX_HTML), { headers: { 'content-type': type } });
  await lecteur.transform(limite).arrayBuffer();
  return { ...c, url: trouve.url.href };
}

export default {
  async fetch(requete: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(requete.url);
    if (requete.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(requete, env, entetesSecurite(new Headers())) });
    }
    if (requete.method !== 'GET') return json(requete, env, { erreur: 'méthode' }, 405);

    if (url.pathname === '/unfurl') {
      const brute = url.searchParams.get('url') ?? '';
      const cible = brute.length <= 2000 ? verifierUrl(brute) : null;
      if (!cible) return json(requete, env, { erreur: 'adresse refusée' }, 400);

      // Cache d'un jour : moins de requêtes sortantes, et la même page n'est lue qu'une fois.
      const cle = new Request(`https://cache.isoligne/unfurl?u=${encodeURIComponent(cible.href)}`);
      const cache = caches.default;
      const enCache = await cache.match(cle);
      if (enCache) return json(requete, env, await enCache.json(), 200, 'private, max-age=3600');

      let resultat: Awaited<ReturnType<typeof apercu>> = null;
      try { resultat = await apercu(cible); } catch { resultat = null; }
      if (!resultat) return json(requete, env, { erreur: 'aperçu indisponible' }, 422);
      const corps = composer(resultat, resultat.url);
      ctx.waitUntil(cache.put(cle, new Response(JSON.stringify(corps), { headers: { 'cache-control': 'max-age=86400' } })));
      return json(requete, env, corps, 200, 'private, max-age=3600');
    }

    if (url.pathname === '/') return json(requete, env, { service: 'isoligne' });
    return json(requete, env, { erreur: 'introuvable' }, 404);
  },
} satisfies ExportedHandler<Env>;

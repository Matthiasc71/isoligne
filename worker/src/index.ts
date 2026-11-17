import { ErreurHttp, cors, entetesSecurite, json, type Env } from './outils';
import {
  attendreAppairage, confirmerAppairage, creerEspace, etatAppairage, listerAppareils, ouvrirAppairage,
  reclamerAppairage, restaurer, revoquer,
} from './espaces';
import { compacter, envoyer, tetes, tirer, usage } from './synchro';
import { unfurl } from './unfurl';
import { lirePartage, poserPartage, purgerPartages, revoquerPartage } from './partages';
import { abonner, clePublique, desabonner, essai, lirePlanning, listerAbonnements, poserPlanning, tournee } from './push';

export type { Env };

const ID = '([0-9a-f]{24})';

export default {
  async fetch(requete: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(requete.url);
    const m = requete.method;
    const p = url.pathname;
    if (m === 'OPTIONS') return new Response(null, { status: 204, headers: cors(requete, env, entetesSecurite(new Headers())) });
    try {
      let x: RegExpExecArray | null;
      if (m === 'GET' && p === '/') return json(requete, env, { service: 'isoligne' });
      if (m === 'POST' && p === '/espace') return await creerEspace(requete, env);
      if (m === 'POST' && p === '/restauration') return await restaurer(requete, env);
      if (m === 'GET' && p === '/appareils') return await listerAppareils(requete, env);
      if (m === 'DELETE' && (x = new RegExp(`^/appareils/${ID}$`).exec(p))) return await revoquer(requete, env, x[1]!);
      if (m === 'POST' && p === '/appairage') return await ouvrirAppairage(requete, env);
      if (m === 'POST' && p === '/appairage/reclamer') return await reclamerAppairage(requete, env);
      if (m === 'GET' && (x = new RegExp(`^/appairage/${ID}$`).exec(p))) return await etatAppairage(requete, env, x[1]!);
      if (m === 'POST' && (x = new RegExp(`^/appairage/${ID}/confirmer$`).exec(p))) return await confirmerAppairage(requete, env, x[1]!);
      if (m === 'GET' && (x = new RegExp(`^/appairage/${ID}/attente$`).exec(p))) return await attendreAppairage(requete, env, x[1]!);
      if (m === 'POST' && p === '/sync/envoi') return await envoyer(requete, env, url);
      if (m === 'GET' && p === '/sync/tetes') return await tetes(requete, env);
      if (m === 'GET' && p === '/sync/projet') return await tirer(requete, env, url);
      if (m === 'POST' && p === '/sync/compacter') return await compacter(requete, env, url);
      if (m === 'GET' && p === '/usage') return await usage(requete, env);
      if (m === 'GET' && p === '/push/cle') return await clePublique(requete, env);
      if (m === 'GET' && p === '/push/abonnements') return await listerAbonnements(requete, env);
      if (m === 'POST' && p === '/push/abonnements') return await abonner(requete, env);
      if (m === 'DELETE' && (x = /^\/push\/abonnements\/([A-Za-z0-9_-]{16,43})$/.exec(p))) return await desabonner(requete, env, x[1]!);
      if (m === 'GET' && p === '/push/planning') return await lirePlanning(requete, env);
      if (m === 'POST' && p === '/push/planning') return await poserPlanning(requete, env);
      if (m === 'POST' && p === '/push/essai') return await essai(requete, env);
      if (m === 'POST' && p === '/partages') return await poserPartage(requete, env);
      if (m === 'DELETE' && (x = /^\/partages\/([A-Za-z0-9_-]{43})$/.exec(p))) return await revoquerPartage(requete, env, x[1]!);
      if (m === 'GET' && (x = /^\/s\/([A-Za-z0-9_-]{43})$/.exec(p))) return await lirePartage(requete, env, x[1]!);
      if (m === 'GET' && p === '/unfurl') return await unfurl(requete, env, url, ctx);
      return json(requete, env, { erreur: 'introuvable' }, 404);
    } catch (e) {
      if (e instanceof ErreurHttp) return json(requete, env, { erreur: e.message }, e.statut);
      return json(requete, env, { erreur: 'erreur interne' }, 500);
    }
  },

  /** Cron (toutes les 5 minutes) : envoi des rappels échus. */
  async scheduled(_e: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(Promise.all([tournee(env), purgerPartages(env)]).then(() => undefined));
  },
} satisfies ExportedHandler<Env>;

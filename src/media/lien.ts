import type * as Y from 'yjs';
import { blocs } from '../data/schema';
import { LOCAL } from '../tree/arbre';

/** Aperçu d'un lien : du texte seul (pas d'image, décision du 16.11.2026). */
export interface Apercu {
  url: string;
  titre: string;
  site: string;
  description: string;
}

export type EtatLien = 'vide' | 'attente' | 'ok' | 'echec';

/** Adresse du Worker (aperçus, synchro). Vide : les aperçus restent en attente. */
export const ADRESSE_WORKER: string = (import.meta.env.VITE_WORKER_URL as string | undefined)?.replace(/\/$/, '') ?? '';

/** « exemple.fr/page » → « https://exemple.fr/page ». Refuse tout ce qui n'est pas http(s). */
export function normaliserUrl(saisie: string): string | null {
  let s = saisie.trim();
  if (!s || /\s/.test(s)) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!u.hostname.includes('.') && u.hostname !== 'localhost') return null;
    return u.href;
  } catch {
    return null;
  }
}

/** Nom de site lisible quand l'aperçu ne le donne pas : « www.exemple.fr » → « exemple.fr ». */
export function siteDe(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

export function poserUrl(doc: Y.Doc, id: string, url: string): void {
  doc.transact(() => {
    const y = blocs(doc).get(id);
    if (!y) return;
    y.set('url', url);
    y.set('etat', 'attente');
    y.set('titre', '');
    y.set('site', siteDe(url));
    y.set('description', '');
  }, LOCAL);
}

export function poserApercu(doc: Y.Doc, id: string, a: Apercu | null): void {
  doc.transact(() => {
    const y = blocs(doc).get(id);
    if (!y) return;
    if (!a) { y.set('etat', 'echec'); return; }
    y.set('titre', a.titre);
    y.set('site', a.site || siteDe(a.url));
    y.set('description', a.description);
    y.set('etat', 'ok');
  }, LOCAL);
}

let jetonAppareil: string | null = null;
/** Jeton de l'appareil appairé : les aperçus sont réservés aux appareils de l'espace. */
export function definirJetonApercus(jeton: string | null): void { jetonAppareil = jeton; }
export function apercusPossibles(): boolean { return Boolean(ADRESSE_WORKER && jetonAppareil); }

/** Demande l'aperçu au Worker. `null` : hors ligne, appareil non appairé ou page illisible. */
export async function demanderApercu(url: string, signal?: AbortSignal): Promise<Apercu | null> {
  if (!ADRESSE_WORKER || !jetonAppareil || navigator.onLine === false) return null;
  try {
    const r = await fetch(`${ADRESSE_WORKER}/unfurl?url=${encodeURIComponent(url)}`, {
      headers: { authorization: `Bearer ${jetonAppareil}` },
      signal: signal ?? AbortSignal.timeout(8000),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!r.ok) return null;
    const d = (await r.json()) as Partial<Apercu>;
    const texte = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
    return { url: texte(d.url, 2000) || url, titre: texte(d.titre, 200), site: texte(d.site, 100), description: texte(d.description, 300) };
  } catch {
    return null;
  }
}

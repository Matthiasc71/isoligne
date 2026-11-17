import { useSyncExternalStore } from 'react';

export type Vue = 'page' | 'graphe' | 'frise';

export type Route =
  | { ecran: 'accueil' }
  | { ecran: 'projet'; id: string; branche: string | null; vue: Vue; noeud?: string; bloc?: string }
  | { ecran: 'calendrier' }
  | { ecran: 'recherche' }
  | { ecran: 'reglages' }
  | { ecran: 'archives' }
  /** Lien de partage en lecture seule : identifiant et clé, jamais envoyés à GitHub Pages (après le #). */
  | { ecran: 'partage'; id: string; cle: string };

/** Routage par ancre (`#/p/<id>`) : compatible GitHub Pages et hors ligne. */
export function lireRoute(hash: string = location.hash): Route {
  const [chemin = '', requete = ''] = hash.replace(/^#/, '').split('?');
  const parts = chemin.split('/').filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(requete);
  const vue = params.get('vue');
  switch (parts[0]) {
    case 'p':
      if (parts[1]) {
        return {
          ecran: 'projet',
          id: parts[1],
          branche: parts[2] === 'b' && parts[3] ? parts[3] : null,
          vue: vue === 'graphe' || vue === 'frise' ? vue : 'page',
          // Ouverture ciblée (calendrier, notification) : un nœud ou un bloc Échéance.
          ...(params.get('noeud') ? { noeud: params.get('noeud')! } : {}),
          ...(params.get('bloc') ? { bloc: params.get('bloc')! } : {}),
        };
      }
      return { ecran: 'accueil' };
    case 'calendrier': return { ecran: 'calendrier' };
    case 'recherche': return { ecran: 'recherche' };
    case 'reglages': return { ecran: 'reglages' };
    case 'archives': return { ecran: 'archives' };
    case 's':
      if (/^[A-Za-z0-9_-]{43}$/.test(parts[1] ?? '') && /^[A-Za-z0-9_-]{43}$/.test(parts[2] ?? '')) return { ecran: 'partage', id: parts[1]!, cle: parts[2]! };
      return { ecran: 'accueil' };
    default: return { ecran: 'accueil' };
  }
}

export function lien(route: Route): string {
  switch (route.ecran) {
    case 'accueil': return '#/';
    case 'projet': {
      const b = route.branche ? `/b/${encodeURIComponent(route.branche)}` : '';
      const q = new URLSearchParams();
      if (route.vue !== 'page') q.set('vue', route.vue);
      if (route.noeud) q.set('noeud', route.noeud);
      if (route.bloc) q.set('bloc', route.bloc);
      const v = q.toString() ? `?${q.toString()}` : '';
      return `#/p/${encodeURIComponent(route.id)}${b}${v}`;
    }
    case 'partage': return `#/s/${route.id}/${route.cle}`;
    default: return `#/${route.ecran}`;
  }
}

export function aller(route: Route, remplacer = false): void {
  const h = lien(route);
  if (remplacer) history.replaceState(null, '', h);
  else location.hash = h;
  if (remplacer) window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function abonner(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(abonner, () => location.hash);
  return lireRoute(hash);
}

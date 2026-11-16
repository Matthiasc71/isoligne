import { useSyncExternalStore } from 'react';

export type Vue = 'page' | 'graphe' | 'frise';

export type Route =
  | { ecran: 'accueil' }
  | { ecran: 'projet'; id: string; branche: string | null; vue: Vue }
  | { ecran: 'calendrier' }
  | { ecran: 'recherche' }
  | { ecran: 'reglages' }
  | { ecran: 'archives' };

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
        };
      }
      return { ecran: 'accueil' };
    case 'calendrier': return { ecran: 'calendrier' };
    case 'recherche': return { ecran: 'recherche' };
    case 'reglages': return { ecran: 'reglages' };
    case 'archives': return { ecran: 'archives' };
    default: return { ecran: 'accueil' };
  }
}

export function lien(route: Route): string {
  switch (route.ecran) {
    case 'accueil': return '#/';
    case 'projet': {
      const b = route.branche ? `/b/${encodeURIComponent(route.branche)}` : '';
      const v = route.vue !== 'page' ? `?vue=${route.vue}` : '';
      return `#/p/${encodeURIComponent(route.id)}${b}${v}`;
    }
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

import * as Y from 'yjs';

/** Racine virtuelle de l'arbre d'un projet : elle n'est pas stockée. */
export const RACINE = 'racine';

export type TypeProjet = 'creatif' | 'pro' | 'perso' | 'idees';
export type StatutProjet = 'idee' | 'en-cours' | 'pause' | 'termine' | 'archive';
export type CleCouleur =
  | 'orange' | 'vert-deau' | 'lilas' | 'ocre' | 'vert' | 'ciel' | 'rose' | 'craie';

export const COULEURS: readonly CleCouleur[] = [
  'orange', 'vert-deau', 'lilas', 'ocre', 'vert', 'ciel', 'rose', 'craie',
];

export const LIBELLES_TYPE: Record<TypeProjet, string> = {
  creatif: 'Créatif',
  pro: 'Pro · client · études',
  perso: 'Perso',
  idees: 'Idées',
};
export const LIBELLES_TYPE_COURT: Record<TypeProjet, string> = {
  creatif: 'Créatif', pro: 'Pro', perso: 'Perso', idees: 'Idées',
};
export const LIBELLES_STATUT: Record<StatutProjet, string> = {
  idee: 'Idée', 'en-cours': 'En cours', pause: 'En pause', termine: 'Terminé', archive: 'Archivé',
};
export const LIBELLES_COULEUR: Record<CleCouleur, string> = {
  orange: 'orange', 'vert-deau': "vert d'eau", lilas: 'lilas', ocre: 'ocre',
  vert: 'vert', ciel: 'ciel', rose: 'rose', craie: 'craie',
};

export type Rappel = 'J-7' | 'J-1' | 'J9h' | 'H-1';

/** Date au format `AAAA-MM-JJ` ou `AAAA-MM-JJTHH:mm`, heure de Paris. */
export type DateLocale = string;

export type TypeBloc = 'arbre' | 'texte' | 'echeance' | 'separateur' | 'lien' | 'croquis';

/** Le bloc arborescence est unique : son id est fixe pour éviter les doublons concurrents. */
export const BLOC_ARBRE = 'arbre';

export interface Meta {
  titre: string;
  type: TypeProjet;
  couleur: CleCouleur;
  calque: number;
  statut: StatutProjet;
  epingle: boolean;
  fin: DateLocale | null;
  cree: number;
  modifie: number;
  revision: number;
}

export type YNoeud = Y.Map<unknown>;
export type YBloc = Y.Map<unknown>;

export function meta(doc: Y.Doc): Y.Map<unknown> { return doc.getMap('meta'); }
export function noeuds(doc: Y.Doc): Y.Map<YNoeud> { return doc.getMap('noeuds'); }
export function blocs(doc: Y.Doc): Y.Map<YBloc> { return doc.getMap('blocs'); }

export function lireMeta(doc: Y.Doc): Meta {
  const m = meta(doc);
  return {
    titre: (m.get('titre') as string | undefined) ?? '',
    type: (m.get('type') as TypeProjet | undefined) ?? 'idees',
    couleur: (m.get('couleur') as CleCouleur | undefined) ?? 'craie',
    calque: (m.get('calque') as number | undefined) ?? 0,
    statut: (m.get('statut') as StatutProjet | undefined) ?? 'en-cours',
    epingle: (m.get('epingle') as boolean | undefined) ?? false,
    fin: (m.get('fin') as string | null | undefined) ?? null,
    cree: (m.get('cree') as number | undefined) ?? 0,
    modifie: (m.get('modifie') as number | undefined) ?? 0,
    revision: (m.get('revision') as number | undefined) ?? 0,
  };
}

export function formaterCalque(n: number): string {
  return String(n).padStart(2, '0');
}

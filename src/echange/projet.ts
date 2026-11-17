import * as Y from 'yjs';
import { creerBloc, lireBlocs } from '../data/projet';
import {
  BLOC_ARBRE, blocs, lireMeta, meta, noeuds, RACINE,
  type CleCouleur, type DateLocale, type Rappel, type StatutProjet, type TypeProjet,
} from '../data/schema';
import { creerLien, lireLiens, modifierLien } from '../graph/liens';
import type { Trait } from '../media/croquis';
import { creerNoeud, lireArbre, LOCAL, noteDe, numero } from '../tree/arbre';
import { remplirRiche, richeVersMarkdown } from './riche';

/**
 * Forme d'échange d'un projet, indépendante de Yjs : Markdown, OPML et modèles
 * de départ passent par elle. Les nœuds sont désignés par leur numéro (« 1.2 »)
 * pour les liens libres, puisque les identifiants changent à l'import.
 */

export interface NoeudEch {
  texte: string;
  tache: boolean;
  fait: boolean;
  echeance: DateLocale | null;
  /** null : rappels par défaut. */
  rappels: Rappel[] | null;
  perso: DateLocale | null;
  couleur: CleCouleur | null;
  replie: boolean;
  /** Note en Markdown ('' si aucune). */
  note: string;
  enfants: NoeudEch[];
}

export type BlocEch =
  | { type: 'arbre' }
  | { type: 'texte'; md: string }
  | { type: 'echeance'; titre: string; date: DateLocale | null; fait: boolean; rappels: Rappel[] | null; perso: DateLocale | null }
  | { type: 'separateur' }
  | { type: 'lien'; url: string; titre: string; site: string; description: string }
  | { type: 'croquis'; legende: string; couverture: boolean; traits: Trait[] };

export interface LienEch { de: string; vers: string; libelle: string; style: 'trait' | 'pointille' }

export interface ProjetEch {
  titre: string;
  type: TypeProjet;
  couleur: CleCouleur;
  statut: StatutProjet;
  epingle: boolean;
  fin: DateLocale | null;
  arbre: NoeudEch[];
  blocs: BlocEch[];
  liens: LienEch[];
}

export function noeudVide(texte: string, o: Partial<NoeudEch> = {}): NoeudEch {
  return { texte, tache: false, fait: false, echeance: null, rappels: null, perso: null, couleur: null, replie: false, note: '', enfants: [], ...o };
}

const texteDe = (v: unknown): string => (v instanceof Y.Text ? v.toString() : typeof v === 'string' ? v : '');

/** Lecture complète d'un document de projet. */
export function lireProjet(doc: Y.Doc): ProjetEch {
  const m = lireMeta(doc);
  const arbre = lireArbre(doc);
  const yn = noeuds(doc);
  const lireNoeud = (id: string): NoeudEch => {
    const n = arbre.parId.get(id)!;
    const note = yn.get(id)?.get('note');
    return {
      texte: n.texte, tache: n.tache, fait: n.fait, echeance: n.echeance, rappels: n.rappels, perso: n.rappelPerso,
      couleur: n.couleur, replie: n.replie, note: note instanceof Y.XmlFragment ? richeVersMarkdown(note) : '',
      enfants: (arbre.enfants.get(id) ?? []).map(lireNoeud),
    };
  };
  const res: BlocEch[] = lireBlocs(doc).map((b): BlocEch => {
    const y = b.y;
    switch (b.type) {
      case 'arbre': return { type: 'arbre' };
      case 'texte': {
        const f = y.get('contenu');
        return { type: 'texte', md: f instanceof Y.XmlFragment ? richeVersMarkdown(f) : '' };
      }
      case 'echeance': return {
        type: 'echeance', titre: texteDe(y.get('titre')), date: (y.get('date') as string | null) ?? null, fait: Boolean(y.get('fait')),
        rappels: (y.get('rappels') as Rappel[] | undefined) ?? null, perso: (y.get('rappelPerso') as string | null | undefined) ?? null,
      };
      case 'separateur': return { type: 'separateur' };
      case 'lien': return {
        type: 'lien', url: texteDe(y.get('url')), titre: texteDe(y.get('titre')), site: texteDe(y.get('site')), description: texteDe(y.get('description')),
      };
      case 'croquis': {
        const t = y.get('traits');
        return { type: 'croquis', legende: texteDe(y.get('legende')), couverture: Boolean(y.get('couverture')), traits: t instanceof Y.Array ? (t.toArray() as Trait[]).map((x) => ({ ...x, p: [...x.p] })) : [] };
      }
    }
  });
  return {
    titre: m.titre, type: m.type, couleur: m.couleur, statut: m.statut, epingle: m.epingle, fin: m.fin,
    arbre: (arbre.enfants.get(RACINE) ?? []).map(lireNoeud),
    blocs: res,
    liens: lireLiens(doc, arbre).map((l) => ({ de: numero(arbre, l.de), vers: numero(arbre, l.vers), libelle: l.libelle, style: l.style })),
  };
}

/**
 * Remplit un document fraîchement initialisé (`initialiserProjet`) : métadonnées,
 * arborescence, blocs dans l'ordre de la page, liens libres.
 */
export function ecrireProjet(doc: Y.Doc, p: ProjetEch): void {
  doc.transact(() => {
    const m = meta(doc);
    m.set('titre', p.titre);
    m.set('type', p.type);
    m.set('couleur', p.couleur);
    m.set('statut', p.statut);
    m.set('epingle', p.epingle);
    m.set('fin', p.fin);
  }, LOCAL);

  const parNumero = new Map<string, string>();
  const ecrireNoeud = (n: NoeudEch, parent: string, index: number, num: string) => {
    const id = creerNoeud(doc, parent, index, { texte: n.texte, tache: n.tache, echeance: n.echeance });
    parNumero.set(num, id);
    doc.transact(() => {
      const y = noeuds(doc).get(id)!;
      if (n.fait) y.set('fait', true);
      if (n.rappels) y.set('rappels', [...n.rappels]);
      if (n.perso) y.set('rappelPerso', n.perso);
      if (n.couleur) y.set('couleur', n.couleur);
      if (n.replie) y.set('replie', true);
    }, LOCAL);
    if (n.note) {
      const f = noteDe(doc, id)!;
      doc.transact(() => remplirRiche(f, n.note), LOCAL);
    }
    n.enfants.forEach((e, i) => ecrireNoeud(e, id, i, `${num}.${i + 1}`));
  };
  p.arbre.forEach((n, i) => ecrireNoeud(n, RACINE, i, String(i + 1)));

  // Blocs : l'arborescence existe déjà ; les autres sont insérés à leur rang.
  const sansArbre = p.blocs.some((b) => b.type === 'arbre') ? p.blocs : [{ type: 'arbre' } as BlocEch, ...p.blocs];
  sansArbre.forEach((b, i) => {
    if (b.type === 'arbre') return;
    const id = creerBloc(doc, b.type, i);
    doc.transact(() => {
      const y = blocs(doc).get(id)!;
      switch (b.type) {
        case 'texte': remplirRiche(y.get('contenu') as Y.XmlFragment, b.md); break;
        case 'echeance':
          (y.get('titre') as Y.Text).insert(0, b.titre);
          y.set('date', b.date);
          y.set('fait', b.fait);
          if (b.rappels) y.set('rappels', [...b.rappels]);
          if (b.perso) y.set('rappelPerso', b.perso);
          break;
        case 'lien':
          y.set('url', b.url);
          y.set('titre', b.titre);
          y.set('site', b.site);
          y.set('description', b.description);
          y.set('etat', b.url ? (b.titre ? 'ok' : 'attente') : 'vide');
          break;
        case 'croquis':
          (y.get('legende') as Y.Text).insert(0, b.legende);
          y.set('couverture', b.couverture);
          (y.get('traits') as Y.Array<Trait>).push(b.traits.map((t) => ({ ...t, p: [...t.p] })));
          break;
      }
    }, LOCAL);
  });

  const arbre = lireArbre(doc);
  for (const l of p.liens) {
    const de = parNumero.get(l.de);
    const vers = parNumero.get(l.vers);
    if (!de || !vers) continue;
    const id = creerLien(doc, arbre, de, vers, l.libelle);
    if (id && l.style !== 'pointille') modifierLien(doc, id, 'style', l.style);
  }
}

export { BLOC_ARBRE };

import * as Y from 'yjs';
import { comparerOrdre, cleInsertion } from '../tree/ordre';
import { LOCAL, lireArbre, appliquerDiff, type Arbre } from '../tree/arbre';
import { avancement } from '../tree/lignes';
import { comparerDates } from '../time/dates';
import { rappelsParDefaut } from '../time/rappels';
import { nouvelId } from './ids';
import { initialiserCroquis } from '../media/croquis';
import {
  BLOC_ARBRE, blocs, lireMeta, meta, RACINE,
  type CleCouleur, type DateLocale, type Meta, type Rappel, type StatutProjet, type TypeBloc, type TypeProjet, type YBloc,
} from './schema';

export interface InitProjet {
  titre: string;
  type: TypeProjet;
  couleur: CleCouleur;
  calque: number;
}

/** Remplit un document vide : métadonnées et bloc arborescence. */
export function initialiserProjet(doc: Y.Doc, init: InitProjet, maintenant = Date.now()): void {
  doc.transact(() => {
    const m = meta(doc);
    m.set('titre', init.titre);
    m.set('type', init.type);
    m.set('couleur', init.couleur);
    m.set('calque', init.calque);
    m.set('statut', 'en-cours');
    m.set('epingle', false);
    m.set('fin', null);
    m.set('cree', maintenant);
    m.set('modifie', maintenant);
    m.set('revision', 1);
    if (!blocs(doc).has(BLOC_ARBRE)) {
      const b = new Y.Map<unknown>();
      b.set('type', 'arbre');
      b.set('ordre', 'a0');
      blocs(doc).set(BLOC_ARBRE, b);
    }
  }, LOCAL);
}

export function modifierMeta<K extends keyof Meta>(doc: Y.Doc, cle: K, valeur: Meta[K]): void {
  doc.transact(() => meta(doc).set(cle, valeur), LOCAL);
}

export function definirTitre(doc: Y.Doc, titre: string): void { modifierMeta(doc, 'titre', titre); }
export function definirStatut(doc: Y.Doc, statut: StatutProjet): void { modifierMeta(doc, 'statut', statut); }

// ───────────────────────────── Blocs ─────────────────────────────

export interface Bloc {
  id: string;
  type: TypeBloc;
  ordre: string;
  y: YBloc;
}

export function lireBlocs(doc: Y.Doc): Bloc[] {
  const res: Bloc[] = [];
  blocs(doc).forEach((y, id) => {
    if (y.get('supprime')) return;
    res.push({ id, type: (y.get('type') as TypeBloc) ?? 'texte', ordre: (y.get('ordre') as string) ?? 'a0', y });
  });
  return res.sort(comparerOrdre);
}

export function creerBloc(doc: Y.Doc, type: Exclude<TypeBloc, 'arbre'>, index?: number): string {
  const id = nouvelId();
  doc.transact(() => {
    const liste = lireBlocs(doc);
    const { cle, recles } = cleInsertion(liste, index ?? liste.length);
    if (recles) for (const [bid, c] of recles) blocs(doc).get(bid)?.set('ordre', c);
    const y = new Y.Map<unknown>();
    y.set('type', type);
    y.set('ordre', cle);
    if (type === 'texte') y.set('contenu', new Y.XmlFragment());
    if (type === 'echeance') {
      y.set('titre', new Y.Text());
      y.set('date', null);
      y.set('fait', false);
    }
    if (type === 'croquis') initialiserCroquis(y);
    if (type === 'lien') {
      y.set('url', '');
      y.set('etat', 'vide');
    }
    blocs(doc).set(id, y);
  }, LOCAL);
  return id;
}

export function supprimerBloc(doc: Y.Doc, id: string): void {
  if (id === BLOC_ARBRE) return;
  doc.transact(() => blocs(doc).get(id)?.set('supprime', true), LOCAL);
}

export function deplacerBloc(doc: Y.Doc, id: string, sens: -1 | 1): void {
  doc.transact(() => {
    const liste = lireBlocs(doc);
    const i = liste.findIndex((b) => b.id === id);
    const cible = i + sens;
    if (i < 0 || cible < 0 || cible >= liste.length) return;
    const autres = liste.filter((b) => b.id !== id);
    const { cle, recles } = cleInsertion(autres, cible);
    if (recles) for (const [bid, c] of recles) blocs(doc).get(bid)?.set('ordre', c);
    blocs(doc).get(id)?.set('ordre', cle);
  }, LOCAL);
}

export function poserBloc(doc: Y.Doc, id: string, cle: string, valeur: unknown): void {
  doc.transact(() => blocs(doc).get(id)?.set(cle, valeur), LOCAL);
}

/** Date d'un bloc Échéance ; la première reçoit les rappels par défaut. */
export function dateBloc(doc: Y.Doc, id: string, date: DateLocale | null): void {
  doc.transact(() => {
    const y = blocs(doc).get(id);
    if (!y) return;
    y.set('date', date);
    if (date && y.get('rappels') === undefined) y.set('rappels', rappelsParDefaut());
  }, LOCAL);
}

export function texteBloc(doc: Y.Doc, id: string, valeur: string): void {
  const t = blocs(doc).get(id)?.get('titre');
  if (t instanceof Y.Text) appliquerDiff(doc, t, valeur);
}

// ───────────────────────────── Échéances ─────────────────────────────

export interface Echeance {
  /** Id du nœud ou du bloc échéance. */
  cible: string;
  genre: 'noeud' | 'bloc';
  titre: string;
  date: DateLocale;
  /** null : rappels par défaut. */
  rappels: Rappel[] | null;
  rappelPerso: DateLocale | null;
}

/** Échéances ouvertes (non faites) d'un projet, de la plus urgente à la plus lointaine. */
export function echeancesOuvertes(doc: Y.Doc, arbre: Arbre = lireArbre(doc), racine: string = RACINE): Echeance[] {
  const res: Echeance[] = [];
  const dansRacine = (id: string) => {
    if (racine === RACINE) return true;
    let cur: string | undefined = id;
    while (cur !== undefined && cur !== RACINE) {
      if (cur === racine) return true;
      cur = arbre.parId.get(cur)?.parent;
    }
    return false;
  };
  for (const n of arbre.parId.values()) {
    if (n.echeance && !(n.tache && n.fait) && dansRacine(n.id)) {
      res.push({ cible: n.id, genre: 'noeud', titre: n.texte, date: n.echeance, rappels: n.rappels, rappelPerso: n.rappelPerso });
    }
  }
  if (racine === RACINE) {
    for (const b of lireBlocs(doc)) {
      if (b.type !== 'echeance') continue;
      const date = b.y.get('date') as DateLocale | null;
      if (!date || b.y.get('fait')) continue;
      const t = b.y.get('titre');
      res.push({
        cible: b.id, genre: 'bloc', titre: t instanceof Y.Text ? t.toString() : '', date,
        rappels: (b.y.get('rappels') as Rappel[] | undefined) ?? null,
        rappelPerso: (b.y.get('rappelPerso') as string | null | undefined) ?? null,
      });
    }
  }
  return res.sort((a, b) => comparerDates(a.date, b.date) || (a.cible < b.cible ? -1 : 1));
}

// ───────────────────────────── Résumé (index) ─────────────────────────────

export interface ResumeProjet {
  id: string;
  titre: string;
  type: TypeProjet;
  couleur: CleCouleur;
  calque: number;
  statut: StatutProjet;
  epingle: 0 | 1;
  fin: DateLocale | null;
  prochaine: Echeance | null;
  /** Date de la prochaine échéance, pour trier ('9999' si aucune). */
  prochaineDate: string;
  faites: number;
  total: number;
  modifie: number;
}

export function resumer(id: string, doc: Y.Doc): { resume: ResumeProjet; echeances: Echeance[] } {
  const m = lireMeta(doc);
  const arbre = lireArbre(doc);
  const ech = echeancesOuvertes(doc, arbre);
  const { faites, total } = avancement(arbre);
  return {
    resume: {
      id,
      titre: m.titre,
      type: m.type,
      couleur: m.couleur,
      calque: m.calque,
      statut: m.statut,
      epingle: m.epingle ? 1 : 0,
      fin: m.fin,
      prochaine: ech[0] ?? null,
      prochaineDate: ech[0]?.date ?? '9999',
      faites,
      total,
      modifie: m.modifie,
    },
    echeances: ech,
  };
}

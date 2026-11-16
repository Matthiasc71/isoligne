import * as Y from 'yjs';
import { nouvelId } from '../data/ids';
import { LOCAL, type Arbre } from '../tree/arbre';

/** Lien libre entre deux nœuds, hors de la hiérarchie. */
export interface LienLibre {
  id: string;
  de: string;
  vers: string;
  libelle: string;
  style: 'trait' | 'pointille';
}

export type Disposition = 'radial' | 'arbre' | 'libre' | 'frise';
export interface Point { x: number; y: number }

export function liens(doc: Y.Doc): Y.Map<Y.Map<unknown>> { return doc.getMap('liens'); }
export function positions(doc: Y.Doc): Y.Map<Y.Map<Point>> { return doc.getMap('positions'); }

/** Liens vivants dont les deux extrémités existent encore dans l'arbre. */
export function lireLiens(doc: Y.Doc, arbre: Arbre): LienLibre[] {
  const res: LienLibre[] = [];
  liens(doc).forEach((y, id) => {
    if (y.get('supprime')) return;
    const de = y.get('de') as string;
    const vers = y.get('vers') as string;
    if (!arbre.parId.has(de) || !arbre.parId.has(vers)) return;
    res.push({
      id, de, vers,
      libelle: (y.get('libelle') as string | undefined) ?? '',
      style: (y.get('style') as 'trait' | 'pointille' | undefined) ?? 'pointille',
    });
  });
  return res.sort((a, b) => (a.id < b.id ? -1 : 1));
}

/** Crée un lien libre ; refuse une boucle sur soi-même et un doublon (dans un sens ou dans l'autre). */
export function creerLien(doc: Y.Doc, arbre: Arbre, de: string, vers: string, libelle = ''): string | null {
  if (de === vers || !arbre.parId.has(de) || !arbre.parId.has(vers)) return null;
  if (lireLiens(doc, arbre).some((l) => (l.de === de && l.vers === vers) || (l.de === vers && l.vers === de))) return null;
  const id = nouvelId();
  doc.transact(() => {
    const y = new Y.Map<unknown>();
    y.set('de', de);
    y.set('vers', vers);
    y.set('libelle', libelle);
    y.set('style', 'pointille');
    liens(doc).set(id, y);
  }, LOCAL);
  return id;
}

export function modifierLien(doc: Y.Doc, id: string, champ: 'libelle' | 'style', valeur: string): void {
  doc.transact(() => liens(doc).get(id)?.set(champ, valeur), LOCAL);
}

export function supprimerLien(doc: Y.Doc, id: string): void {
  doc.transact(() => liens(doc).get(id)?.set('supprime', true), LOCAL);
}

// ───────────────────────────── Positions épinglées ─────────────────────────────

/** Positions posées à la main dans une disposition (les autres nœuds restent automatiques). */
export function lirePositions(doc: Y.Doc, disposition: Disposition): Map<string, Point> {
  const res = new Map<string, Point>();
  positions(doc).get(disposition)?.forEach((p, id) => res.set(id, { x: p.x, y: p.y }));
  return res;
}

export function epingler(doc: Y.Doc, disposition: Disposition, id: string, p: Point): void {
  doc.transact(() => {
    let m = positions(doc).get(disposition);
    if (!m) {
      m = new Y.Map<Point>();
      positions(doc).set(disposition, m);
    }
    m.set(id, { x: Math.round(p.x), y: Math.round(p.y) });
  }, LOCAL);
}

/** « Réorganiser » : oublie toutes les positions manuelles de la disposition. */
export function reorganiser(doc: Y.Doc, disposition: Disposition): void {
  doc.transact(() => {
    const m = positions(doc).get(disposition);
    if (m) for (const k of [...m.keys()]) m.delete(k);
  }, LOCAL);
}

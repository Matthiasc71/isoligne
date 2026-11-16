import * as Y from 'yjs';
import { nouvelId } from '../data/ids';
import { rappelsParDefaut } from '../time/rappels';
import { noeuds, RACINE, type CleCouleur, type DateLocale, type Rappel, type YNoeud } from '../data/schema';
import { cleInsertion, comparerOrdre } from './ordre';

/** Origine des transactions locales (suivie par l'annulation). */
export const LOCAL = 'local';

export interface Noeud {
  id: string;
  /** Parent effectif, après réparation. */
  parent: string;
  ordre: string;
  texte: string;
  tache: boolean;
  fait: boolean;
  echeance: DateLocale | null;
  /** null : jamais réglés (rappels par défaut). */
  rappels: Rappel[] | null;
  /** Rappel personnalisé (date et heure, Paris). */
  rappelPerso: DateLocale | null;
  couleur: CleCouleur | null;
  replie: boolean;
  aNote: boolean;
  enfants: string[];
}

export interface Arbre {
  /** Nœuds vivants, par id. La racine virtuelle n'y figure pas. */
  parId: Map<string, Noeud>;
  /** Enfants triés de chaque parent (y compris `RACINE`). */
  enfants: Map<string, string[]>;
}

interface Brut {
  id: string;
  parent: string | null;
  ordre: string;
  supprime: boolean;
  y: YNoeud;
}

function brut(id: string, y: YNoeud): Brut {
  return {
    id,
    parent: (y.get('parent') as string | null | undefined) ?? RACINE,
    ordre: (y.get('ordre') as string | undefined) ?? 'a0',
    supprime: (y.get('supprime') as boolean | undefined) ?? false,
    y,
  };
}

/**
 * Lit l'arbre d'un projet et le répare de façon déterministe : tous les
 * appareils obtiennent le même résultat à partir du même état Yjs.
 *
 * 1. Un nœud dont le parent est supprimé ou inconnu remonte au plus proche
 *    ancêtre vivant (ou à la racine).
 * 2. Un cycle (deux déplacements concurrents) est cassé en rattachant à la
 *    racine le nœud du cycle qui a le plus petit id.
 */
export function lireArbre(doc: Y.Doc): Arbre {
  const tous = new Map<string, Brut>();
  noeuds(doc).forEach((y, id) => tous.set(id, brut(id, y)));

  const vivant = (id: string) => {
    const n = tous.get(id);
    return n !== undefined && !n.supprime;
  };

  // 1. Parent effectif : on traverse les nœuds supprimés ou absents.
  const parentEffectif = new Map<string, string>();
  for (const n of tous.values()) {
    if (n.supprime) continue;
    let p = n.parent ?? RACINE;
    const vus = new Set<string>();
    while (p !== RACINE && !vivant(p)) {
      if (vus.has(p)) { p = RACINE; break; }
      vus.add(p);
      const parentDuParent = tous.get(p);
      p = parentDuParent ? (parentDuParent.parent ?? RACINE) : RACINE;
    }
    if (p === n.id) p = RACINE;
    parentEffectif.set(n.id, p);
  }

  // 2. Cycles : graphe fonctionnel, chaque cycle est disjoint des autres.
  const etat = new Map<string, 1 | 2>(); // 1 = en cours, 2 = terminé
  const ids = [...parentEffectif.keys()].sort();
  for (const depart of ids) {
    if (etat.has(depart)) continue;
    const chemin: string[] = [];
    let cur: string = depart;
    while (cur !== RACINE && !etat.has(cur)) {
      etat.set(cur, 1);
      chemin.push(cur);
      cur = parentEffectif.get(cur)!;
    }
    if (cur !== RACINE && etat.get(cur) === 1) {
      const cycle = chemin.slice(chemin.indexOf(cur));
      const plusPetit = cycle.reduce((a, b) => (a < b ? a : b));
      parentEffectif.set(plusPetit, RACINE);
    }
    for (const c of chemin) etat.set(c, 2);
  }

  const parId = new Map<string, Noeud>();
  const groupes = new Map<string, Brut[]>();
  for (const [id, p] of parentEffectif) {
    const b = tous.get(id)!;
    const liste = groupes.get(p) ?? [];
    liste.push(b);
    groupes.set(p, liste);
    const y = b.y;
    const texte = y.get('texte');
    parId.set(id, {
      id,
      parent: p,
      ordre: b.ordre,
      texte: texte instanceof Y.Text ? texte.toString() : '',
      tache: (y.get('tache') as boolean | undefined) ?? false,
      fait: (y.get('fait') as boolean | undefined) ?? false,
      echeance: (y.get('echeance') as string | null | undefined) ?? null,
      rappels: (y.get('rappels') as Rappel[] | undefined) ?? null,
      rappelPerso: (y.get('rappelPerso') as string | null | undefined) ?? null,
      couleur: (y.get('couleur') as CleCouleur | null | undefined) ?? null,
      replie: (y.get('replie') as boolean | undefined) ?? false,
      aNote: (() => {
        const note = y.get('note');
        return note instanceof Y.XmlFragment && note.length > 0;
      })(),
      enfants: [],
    });
  }
  const enfants = new Map<string, string[]>();
  enfants.set(RACINE, []);
  for (const [p, liste] of groupes) {
    liste.sort(comparerOrdre);
    const idsTries = liste.map((b) => b.id);
    enfants.set(p, idsTries);
    const parent = parId.get(p);
    if (parent) parent.enfants = idsTries;
  }
  return { parId, enfants };
}

/** Vrai si `candidat` est `id` ou l'un de ses descendants. */
export function estDansSousArbre(arbre: Arbre, id: string, candidat: string): boolean {
  let cur: string | undefined = candidat;
  while (cur !== undefined && cur !== RACINE) {
    if (cur === id) return true;
    cur = arbre.parId.get(cur)?.parent;
  }
  return false;
}

/** Ancêtres de `id`, de la racine (exclue) jusqu'à son parent. */
export function ancetres(arbre: Arbre, id: string): string[] {
  const res: string[] = [];
  let cur = arbre.parId.get(id)?.parent;
  while (cur !== undefined && cur !== RACINE) {
    res.unshift(cur);
    cur = arbre.parId.get(cur)?.parent;
  }
  return res;
}

/** Numéro de nomenclature (« 2.1 ») calculé sur l'arbre entier. */
export function numero(arbre: Arbre, id: string): string {
  const parts: number[] = [];
  let cur: string = id;
  while (cur !== RACINE) {
    const n = arbre.parId.get(cur);
    if (!n) break;
    const freres = arbre.enfants.get(n.parent) ?? [];
    parts.unshift(freres.indexOf(cur) + 1);
    cur = n.parent;
  }
  return parts.join('.');
}

export function descendants(arbre: Arbre, id: string): string[] {
  const res: string[] = [];
  const pile = [...(arbre.enfants.get(id) ?? [])];
  while (pile.length) {
    const c = pile.pop()!;
    res.push(c);
    pile.push(...(arbre.enfants.get(c) ?? []));
  }
  return res;
}

// ───────────────────────────── Opérations ─────────────────────────────

function yNoeud(doc: Y.Doc, id: string): YNoeud | undefined {
  return noeuds(doc).get(id);
}

function ecrireOrdre(doc: Y.Doc, arbre: Arbre, parent: string, index: number, exclure?: string): string {
  const freres = (arbre.enfants.get(parent) ?? [])
    .filter((f) => f !== exclure)
    .map((f) => arbre.parId.get(f)!);
  const { cle, recles } = cleInsertion(freres, index);
  if (recles) for (const [fid, c] of recles) yNoeud(doc, fid)?.set('ordre', c);
  return cle;
}

export interface NouveauNoeud {
  texte?: string;
  tache?: boolean;
  echeance?: DateLocale | null;
}

/** Crée un nœud dans `parent` à la position `index` (par défaut à la fin). */
export function creerNoeud(
  doc: Y.Doc,
  parent: string,
  index?: number,
  init: NouveauNoeud = {},
): string {
  const id = nouvelId();
  doc.transact(() => {
    const arbre = lireArbre(doc);
    const p = parent === RACINE || arbre.parId.has(parent) ? parent : RACINE;
    const nb = arbre.enfants.get(p)?.length ?? 0;
    const ordre = ecrireOrdre(doc, arbre, p, index ?? nb);
    const y = new Y.Map<unknown>();
    const texte = new Y.Text();
    if (init.texte) texte.insert(0, init.texte);
    y.set('parent', p);
    y.set('ordre', ordre);
    y.set('texte', texte);
    y.set('tache', init.tache ?? false);
    y.set('fait', false);
    y.set('echeance', init.echeance ?? null);
    noeuds(doc).set(id, y);
    if (p !== RACINE && arbre.parId.get(p)?.replie) yNoeud(doc, p)?.set('replie', false);
  }, LOCAL);
  return id;
}

/** Crée un frère juste après `id`. */
export function creerApres(doc: Y.Doc, id: string, init: NouveauNoeud = {}): string {
  const arbre = lireArbre(doc);
  const n = arbre.parId.get(id);
  if (!n) return creerNoeud(doc, RACINE, undefined, init);
  const freres = arbre.enfants.get(n.parent) ?? [];
  return creerNoeud(doc, n.parent, freres.indexOf(id) + 1, init);
}

/** Déplace `id` sous `parent` à `index`. Refuse de créer un cycle. */
export function deplacer(doc: Y.Doc, id: string, parent: string, index: number): boolean {
  let ok = false;
  doc.transact(() => {
    const arbre = lireArbre(doc);
    if (!arbre.parId.has(id)) return;
    if (parent !== RACINE && (!arbre.parId.has(parent) || estDansSousArbre(arbre, id, parent))) return;
    const ordre = ecrireOrdre(doc, arbre, parent, index, id);
    const y = yNoeud(doc, id)!;
    y.set('parent', parent);
    y.set('ordre', ordre);
    if (parent !== RACINE && arbre.parId.get(parent)?.replie) yNoeud(doc, parent)?.set('replie', false);
    ok = true;
  }, LOCAL);
  return ok;
}

/** Devient le dernier enfant du frère précédent. */
export function indenter(doc: Y.Doc, id: string): boolean {
  const arbre = lireArbre(doc);
  const n = arbre.parId.get(id);
  if (!n) return false;
  const freres = arbre.enfants.get(n.parent) ?? [];
  const i = freres.indexOf(id);
  if (i <= 0) return false;
  const nouveauParent = freres[i - 1]!;
  return deplacer(doc, id, nouveauParent, arbre.enfants.get(nouveauParent)?.length ?? 0);
}

/** Devient le frère suivant de son parent. */
export function desindenter(doc: Y.Doc, id: string): boolean {
  const arbre = lireArbre(doc);
  const n = arbre.parId.get(id);
  if (!n || n.parent === RACINE) return false;
  const parent = arbre.parId.get(n.parent)!;
  const oncles = arbre.enfants.get(parent.parent) ?? [];
  return deplacer(doc, id, parent.parent, oncles.indexOf(parent.id) + 1);
}

/** Monte (-1) ou descend (+1) parmi ses frères. */
export function decaler(doc: Y.Doc, id: string, sens: -1 | 1): boolean {
  const arbre = lireArbre(doc);
  const n = arbre.parId.get(id);
  if (!n) return false;
  const freres = (arbre.enfants.get(n.parent) ?? []).filter((f) => f !== id);
  const i = (arbre.enfants.get(n.parent) ?? []).indexOf(id);
  const cible = i + sens;
  if (cible < 0 || cible > freres.length) return false;
  return deplacer(doc, id, n.parent, cible);
}

/** Supprime `id` et sa descendance (pierres tombales, annulables). */
export function supprimer(doc: Y.Doc, id: string): void {
  doc.transact(() => {
    const arbre = lireArbre(doc);
    for (const d of [id, ...descendants(arbre, id)]) yNoeud(doc, d)?.set('supprime', true);
  }, LOCAL);
}

/** Remplace le texte d'un nœud par `valeur` en ne modifiant que la partie changée. */
export function definirTexte(doc: Y.Doc, id: string, valeur: string): void {
  const y = yNoeud(doc, id);
  const t = y?.get('texte');
  if (!(t instanceof Y.Text)) return;
  appliquerDiff(doc, t, valeur);
}

export function appliquerDiff(doc: Y.Doc, t: Y.Text, valeur: string): void {
  const ancien = t.toString();
  if (ancien === valeur) return;
  let debut = 0;
  while (debut < ancien.length && debut < valeur.length && ancien[debut] === valeur[debut]) debut++;
  let finA = ancien.length;
  let finN = valeur.length;
  while (finA > debut && finN > debut && ancien[finA - 1] === valeur[finN - 1]) { finA--; finN--; }
  doc.transact(() => {
    if (finA > debut) t.delete(debut, finA - debut);
    if (finN > debut) t.insert(debut, valeur.slice(debut, finN));
  }, LOCAL);
}

function poser(doc: Y.Doc, id: string, cle: string, valeur: unknown): void {
  doc.transact(() => { yNoeud(doc, id)?.set(cle, valeur); }, LOCAL);
}

export function basculerTache(doc: Y.Doc, id: string): void {
  const n = lireArbre(doc).parId.get(id);
  if (n) poser(doc, id, 'tache', !n.tache);
}

/** Coche ou décoche. Un élément qui n'était pas une tâche le devient. */
export function basculerFait(doc: Y.Doc, id: string): void {
  const n = lireArbre(doc).parId.get(id);
  if (!n) return;
  doc.transact(() => {
    const y = yNoeud(doc, id)!;
    if (!n.tache) y.set('tache', true);
    y.set('fait', n.tache ? !n.fait : false);
  }, LOCAL);
}

/** Pose l'échéance ; une première échéance reçoit les rappels par défaut du moment. */
export function definirEcheance(doc: Y.Doc, id: string, date: DateLocale | null): void {
  doc.transact(() => {
    const y = yNoeud(doc, id);
    if (!y) return;
    y.set('echeance', date);
    if (date && y.get('rappels') === undefined) y.set('rappels', rappelsParDefaut());
  }, LOCAL);
}
export function definirRappelPerso(doc: Y.Doc, id: string, quand: DateLocale | null): void {
  poser(doc, id, 'rappelPerso', quand);
}
export function definirRappels(doc: Y.Doc, id: string, rappels: Rappel[]): void {
  poser(doc, id, 'rappels', rappels);
}
export function definirCouleur(doc: Y.Doc, id: string, couleur: CleCouleur | null): void {
  poser(doc, id, 'couleur', couleur);
}
export function basculerReplie(doc: Y.Doc, id: string): void {
  const n = lireArbre(doc).parId.get(id);
  if (n) poser(doc, id, 'replie', !n.replie);
}

/** Note en texte riche d'un nœud (créée à la demande). */
export function noteDe(doc: Y.Doc, id: string): Y.XmlFragment | null {
  const y = yNoeud(doc, id);
  if (!y) return null;
  let note = y.get('note');
  if (!(note instanceof Y.XmlFragment)) {
    note = new Y.XmlFragment();
    doc.transact(() => y.set('note', note), LOCAL);
  }
  return note as Y.XmlFragment;
}

/**
 * Retour arrière en début d'élément : fusionne avec l'élément visible
 * précédent (`precedent`). Le texte est ajouté au sien et les enfants le
 * rejoignent. Renvoie l'id qui garde le focus et la position du curseur.
 */
export function fusionnerAvec(
  doc: Y.Doc,
  id: string,
  precedent: string,
): { focus: string; curseur: number } | null {
  const arbre = lireArbre(doc);
  const n = arbre.parId.get(id);
  const p = arbre.parId.get(precedent);
  if (!n || !p || estDansSousArbre(arbre, id, precedent)) return null;
  const curseur = p.texte.length;
  doc.transact(() => {
    if (n.texte) {
      const t = yNoeud(doc, precedent)!.get('texte') as Y.Text;
      t.insert(t.length, n.texte);
    }
    // Si le précédent est le parent, les enfants prennent la place de `id`.
    let base = n.parent === precedent
      ? (arbre.enfants.get(precedent) ?? []).indexOf(id)
      : arbre.enfants.get(precedent)?.length ?? 0;
    for (const e of n.enfants) {
      deplacer(doc, e, precedent, base++);
    }
    yNoeud(doc, id)!.set('supprime', true);
  }, LOCAL);
  return { focus: precedent, curseur };
}

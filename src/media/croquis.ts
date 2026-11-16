import * as Y from 'yjs';
import { getStroke } from 'perfect-freehand';
import { nouvelId } from '../data/ids';
import { blocs, type YBloc } from '../data/schema';
import { LOCAL } from '../tree/arbre';

/** Espace logique du croquis : 1000 × 400 (indépendant de l'écran). */
export const LARGEUR = 1000;
export const HAUTEUR = 400;

export type Epaisseur = 1 | 2 | 3;
/** Couleurs du thème uniquement : elles suivent le mode clair ou sombre. */
export type EncreCroquis = 'trait' | 'trait-2' | 'redline' | 'calque';

/**
 * Un trait, figé une fois dessiné. Les points sont aplatis
 * `[x, y, pression, x, y, pression, …]`, arrondis au dixième : un trait
 * d'une seconde pèse environ 1 Ko dans Yjs.
 */
export interface Trait {
  id: string;
  p: number[];
  e: Epaisseur;
  c: EncreCroquis;
}

export const TAILLES: Record<Epaisseur, number> = { 1: 4, 2: 8, 3: 16 };

export function traitsDe(bloc: YBloc): Y.Array<Trait> | null {
  const t = bloc.get('traits');
  return t instanceof Y.Array ? (t as Y.Array<Trait>) : null;
}

/** Prépare un bloc croquis vide (appelé à la création du bloc). */
export function initialiserCroquis(y: YBloc): void {
  y.set('traits', new Y.Array<Trait>());
  y.set('legende', new Y.Text());
  y.set('couverture', false);
}

export function compacter(points: { x: number; y: number; pression: number }[]): number[] {
  const r = (v: number) => Math.round(v * 10) / 10;
  const p: number[] = [];
  for (const pt of points) {
    p.push(r(Math.max(0, Math.min(LARGEUR, pt.x))), r(Math.max(0, Math.min(HAUTEUR, pt.y))), Math.round(pt.pression * 100) / 100);
  }
  return p;
}

export function ajouterTrait(doc: Y.Doc, idBloc: string, points: { x: number; y: number; pression: number }[], e: Epaisseur, c: EncreCroquis): string | null {
  if (points.length === 0) return null;
  const y = blocs(doc).get(idBloc);
  const traits = y ? traitsDe(y) : null;
  if (!traits) return null;
  const id = nouvelId(10);
  doc.transact(() => traits.push([{ id, p: compacter(points), e, c }]), LOCAL);
  return id;
}

/** Gomme : retire les traits passant à moins de `rayon` du point (x, y). */
export function gommer(doc: Y.Doc, idBloc: string, x: number, y: number, rayon = 14): number {
  const b = blocs(doc).get(idBloc);
  const traits = b ? traitsDe(b) : null;
  if (!traits) return 0;
  const touches: number[] = [];
  traits.forEach((t, i) => {
    for (let k = 0; k < t.p.length; k += 3) {
      if (Math.hypot(t.p[k]! - x, t.p[k + 1]! - y) <= rayon + TAILLES[t.e] / 2) { touches.push(i); break; }
    }
  });
  if (touches.length) doc.transact(() => { for (const i of touches.reverse()) traits.delete(i, 1); }, LOCAL);
  return touches.length;
}

export function effacerTout(doc: Y.Doc, idBloc: string): void {
  const b = blocs(doc).get(idBloc);
  const traits = b ? traitsDe(b) : null;
  if (traits && traits.length) doc.transact(() => traits.delete(0, traits.length), LOCAL);
}

/** Un seul croquis de couverture par projet. */
export function mettreEnCouverture(doc: Y.Doc, idBloc: string, oui: boolean): void {
  doc.transact(() => {
    blocs(doc).forEach((y, id) => {
      if (y.get('type') === 'croquis') y.set('couverture', oui && id === idBloc);
    });
  }, LOCAL);
}

// ───────────────────────────── Tracé ─────────────────────────────

/** Contour d'un trait (perfect-freehand) en chemin SVG. Sans pression mesurée, elle est simulée. */
export function cheminTrait(t: Pick<Trait, 'p' | 'e'>): string {
  const points: [number, number, number][] = [];
  let pressionReelle = false;
  for (let k = 0; k < t.p.length; k += 3) {
    const pr = t.p[k + 2]!;
    if (pr !== 0.5) pressionReelle = true;
    points.push([t.p[k]!, t.p[k + 1]!, pr]);
  }
  const contour = getStroke(points, {
    size: TAILLES[t.e],
    thinning: 0.55,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: !pressionReelle,
    last: true,
  });
  return versChemin(contour);
}

/** Contour → chemin SVG lissé (courbes quadratiques entre milieux successifs). */
export function versChemin(contour: number[][]): string {
  const n = contour.length;
  if (n === 0) return '';
  if (n < 3) {
    const [x, y] = contour[0]!;
    return `M${x!.toFixed(1)} ${y!.toFixed(1)}h.1Z`;
  }
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(contour[0]![0]!)} ${f(contour[0]![1]!)}Q`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = contour[i]!;
    const [x1, y1] = contour[(i + 1) % n]!;
    d += `${f(x0!)} ${f(y0!)} ${f((x0! + x1!) / 2)} ${f((y0! + y1!) / 2)} `;
  }
  return `${d}Z`;
}

/** Numéro de figure : rang du bloc parmi les croquis de la page (FIG. 1, FIG. 2…). */
export function numerosFigures(blocsTries: { id: string; type: string }[]): Map<string, number> {
  const res = new Map<string, number>();
  let n = 0;
  for (const b of blocsTries) if (b.type === 'croquis') res.set(b.id, ++n);
  return res;
}

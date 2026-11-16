import type { Arbre } from '../tree/arbre';
import type { NoeudPlace, Plan } from './dispositions';
import type { Point } from './liens';

export type GenreNoeud = 'centre' | 'branche' | 'feuille';
export type Cote = 'droite' | 'gauche' | 'haut' | 'bas';

/** Centre (projet ou branche ouverte), branche (a des enfants) ou feuille (petit carré). */
export function genre(n: NoeudPlace, plan: Plan, arbre: Arbre): GenreNoeud {
  if (n.id === plan.centre) return 'centre';
  if (plan.disposition === 'frise') return 'feuille';
  return (arbre.enfants.get(n.id)?.length ?? 0) > 0 ? 'branche' : 'feuille';
}

/** Côté de l'étiquette d'une feuille : vers l'extérieur du plan. */
export function coteEtiquette(n: NoeudPlace, plan: Plan, parent: Point | null): Cote {
  if (plan.disposition === 'frise') return 'droite';
  if (plan.disposition === 'arbre') {
    const vertical = parent !== null && Math.abs(n.y - parent.y) > Math.abs(n.x - parent.x);
    return vertical ? 'bas' : 'droite';
  }
  const ox = plan.disposition === 'radial' ? 0 : (parent?.x ?? 0);
  const oy = plan.disposition === 'radial' ? 0 : (parent?.y ?? 0);
  const a = Math.atan2(n.y - oy, n.x - ox);
  const deg = (a * 180) / Math.PI;
  if (deg > -60 && deg < 60) return 'droite';
  if (deg > 120 || deg < -120) return 'gauche';
  return deg < 0 ? 'haut' : 'bas';
}

/** Arête de l'arbre : droite (radial, libre) ou coudée à angle droit (arbre). */
export function cheminArete(de: Point, vers: Point, coude: boolean, vertical = false): string {
  if (!coude) return `M${de.x} ${de.y}L${vers.x} ${vers.y}`;
  if (vertical) {
    const my = (de.y + vers.y) / 2;
    return `M${de.x} ${de.y}V${my}H${vers.x}V${vers.y}`;
  }
  const mx = (de.x + vers.x) / 2;
  return `M${de.x} ${de.y}H${mx}V${vers.y}H${vers.x}`;
}

/** Lien libre : courbe douce décalée de la droite, pour le distinguer des arêtes de l'arbre. */
export function cheminLien(de: Point, vers: Point): { d: string; milieu: Point } {
  const mx = (de.x + vers.x) / 2;
  const my = (de.y + vers.y) / 2;
  const dx = vers.x - de.x;
  const dy = vers.y - de.y;
  const l = Math.hypot(dx, dy) || 1;
  const k = Math.min(60, l * 0.25);
  const cx = mx - (dy / l) * k;
  const cy = my + (dx / l) * k;
  return { d: `M${de.x} ${de.y}Q${cx} ${cy} ${vers.x} ${vers.y}`, milieu: { x: (mx + cx) / 2, y: (my + cy) / 2 } };
}

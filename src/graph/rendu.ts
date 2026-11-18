import type { Arbre } from '../tree/arbre';
import type { NoeudPlace, Plan } from './dispositions';
import type { Point } from './liens';
import { encombrement, type Cote } from './etiquettes';

export type { Cote } from './etiquettes';
export type GenreNoeud = 'centre' | 'branche' | 'feuille';

/**
 * Centre (projet ou branche ouverte), branche (point principal : niveau 1, cadre)
 * ou feuille (sous-point : carré et libellé, plus petits à partir du niveau 3).
 */
export function genre(n: NoeudPlace, plan: Plan, _arbre?: Arbre): GenreNoeud {
  if (n.id === plan.centre) return 'centre';
  if (plan.disposition === 'frise') return 'feuille';
  return n.profondeur <= 1 ? 'branche' : 'feuille';
}

/** Côté de l'étiquette d'une feuille : vers l'extérieur du plan. */
export function coteEtiquette(n: NoeudPlace, plan: Plan, parent: Point | null): Cote {
  if (plan.disposition === 'frise') return 'droite';
  if (plan.disposition === 'arbre') return plan.vertical ? 'bas' : 'droite';
  const ox = plan.disposition === 'radial' ? 0 : (parent?.x ?? 0);
  const oy = plan.disposition === 'radial' ? 0 : (parent?.y ?? 0);
  const a = Math.atan2(n.y - oy, n.x - ox);
  const deg = (a * 180) / Math.PI;
  if (deg > -60 && deg < 60) return 'droite';
  if (deg > 120 || deg < -120) return 'gauche';
  return deg < 0 ? 'haut' : 'bas';
}

/**
 * Arête de l'arbre : droite (radial, libre) ou coudée à angle droit (arbre). Dans l'arbre
 * horizontal, elle part après le libellé du parent et arrive au bord gauche de l'enfant ;
 * le coude se place juste avant la colonne de l'enfant.
 */
export function cheminArete(
  de: Point, vers: Point, coude: boolean, vertical = false,
  noeuds?: { de: NoeudPlace | undefined; vers: NoeudPlace | undefined },
): string {
  if (!coude) return `M${de.x} ${de.y}L${vers.x} ${vers.y}`;
  if (vertical) {
    const my = (de.y + vers.y) / 2;
    return `M${de.x} ${de.y}V${my}H${vers.x}V${vers.y}`;
  }
  const sortie = noeuds?.de ? encombrement(de.x, de.y, noeuds.de.etiquette, 'droite').x1 + 4 : de.x;
  const entree = noeuds?.vers ? encombrement(vers.x, vers.y, noeuds.vers.etiquette, 'droite').x0 : vers.x;
  if (entree <= sortie + 8) {
    const mx = (de.x + vers.x) / 2;
    return `M${de.x} ${de.y}H${mx}V${vers.y}H${vers.x}`;
  }
  const mx = Math.max(sortie + 8, entree - 20);
  return `M${sortie} ${de.y}H${mx}V${vers.y}H${entree}`;
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

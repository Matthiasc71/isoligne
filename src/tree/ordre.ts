import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';

export interface Ordonnable { id: string; ordre: string }

/**
 * Ordre des frères : clé d'indexation fractionnaire, puis id.
 * Deux appareils hors ligne peuvent produire la même clé ; l'id départage,
 * donc tous les appareils trient de la même façon.
 */
export function comparerOrdre(a: Ordonnable, b: Ordonnable): number {
  if (a.ordre < b.ordre) return -1;
  if (a.ordre > b.ordre) return 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Clé pour insérer à la position `index` d'une liste de frères déjà triée.
 * Si les voisins sont ex aequo, renvoie aussi les nouvelles clés à écrire
 * pour toute la fratrie (cas rare, après des insertions concurrentes).
 */
export function cleInsertion(
  freres: readonly Ordonnable[],
  index: number,
): { cle: string; recles?: Map<string, string> } {
  const i = Math.max(0, Math.min(index, freres.length));
  const avant = freres[i - 1]?.ordre ?? null;
  const apres = freres[i]?.ordre ?? null;
  if (avant === null || apres === null || avant < apres) {
    return { cle: generateKeyBetween(avant, apres) };
  }
  // Ex aequo : on renumérote la fratrie en laissant une place à `i`.
  const cles = generateNKeysBetween(null, null, freres.length + 1);
  const recles = new Map<string, string>();
  freres.forEach((f, k) => recles.set(f.id, cles[k < i ? k : k + 1]!));
  return { cle: cles[i]!, recles };
}

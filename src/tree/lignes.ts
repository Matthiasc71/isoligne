import { RACINE } from '../data/schema';
import { numero, type Arbre, type Noeud } from './arbre';

export interface Ligne {
  noeud: Noeud;
  /** Profondeur relative à la racine affichée (0 = premier niveau). */
  profondeur: number;
  numero: string;
  /** Tâches faites repliées sous cet élément (« + 2 faites »). */
  faitesCachees: number;
  /** Nombre de descendants masqués par le repli. */
  replies: number;
}

export interface Lignes {
  lignes: Ligne[];
  /** Tâches faites repliées directement sous la racine affichée. */
  faitesRacine: number;
}

/**
 * Aplatit l'arbre à partir de `racine` en lignes visibles.
 * Les tâches faites sont repliées (sauf si leur parent figure dans `faitesOuvertes`),
 * les branches repliées masquent leur descendance.
 */
export function aplatir(arbre: Arbre, racine: string = RACINE, faitesOuvertes: ReadonlySet<string> = new Set()): Lignes {
  const lignes: Ligne[] = [];
  const compterDescendants = (id: string): number => {
    let n = 0;
    for (const e of arbre.enfants.get(id) ?? []) n += 1 + compterDescendants(e);
    return n;
  };
  const enfantsVisibles = (parent: string): { visibles: string[]; faites: number } => {
    const tous = arbre.enfants.get(parent) ?? [];
    if (faitesOuvertes.has(parent)) return { visibles: tous, faites: 0 };
    const visibles: string[] = [];
    let faites = 0;
    for (const e of tous) {
      const n = arbre.parId.get(e)!;
      if (n.tache && n.fait) faites++;
      else visibles.push(e);
    }
    return { visibles, faites };
  };
  const parcourir = (parent: string, profondeur: number) => {
    for (const id of enfantsVisibles(parent).visibles) {
      const n = arbre.parId.get(id)!;
      const { faites } = enfantsVisibles(id);
      lignes.push({
        noeud: n,
        profondeur,
        numero: numero(arbre, id),
        faitesCachees: n.replie ? 0 : faites,
        replies: n.replie ? compterDescendants(id) : 0,
      });
      if (!n.replie) parcourir(id, profondeur + 1);
    }
  };
  parcourir(racine, 0);
  return { lignes, faitesRacine: enfantsVisibles(racine).faites };
}

/** Avancement : tâches faites / tâches, sur tout le sous-arbre de `racine`. */
export function avancement(arbre: Arbre, racine: string = RACINE): { faites: number; total: number } {
  let faites = 0;
  let total = 0;
  const pile = [...(arbre.enfants.get(racine) ?? [])];
  while (pile.length) {
    const id = pile.pop()!;
    const n = arbre.parId.get(id)!;
    if (n.tache) { total++; if (n.fait) faites++; }
    pile.push(...n.enfants);
  }
  return { faites, total };
}

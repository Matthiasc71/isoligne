/// <reference lib="webworker" />
import { libre } from './dispositions';
import type { Arbre } from '../tree/arbre';
import type { LienLibre, Point } from './liens';

/** Disposition libre (force dirigée) hors du fil principal : jusqu'à ~1 s pour 500 nœuds sur iPhone. */
export interface DemandeLibre { n: number; arbre: Arbre; liens: LienLibre[]; centre: string; epingles: Map<string, Point> }

self.onmessage = (e: MessageEvent<DemandeLibre>) => {
  const { n, arbre, liens, centre, epingles } = e.data;
  self.postMessage({ n, plan: libre(arbre, liens, centre, epingles) });
};

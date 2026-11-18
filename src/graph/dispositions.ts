import { hierarchy, tree, type HierarchyPointNode } from 'd3-hierarchy';
import { forceCollide, forceLink, forceManyBody, forceSimulation, type SimulationNodeDatum } from 'd3-force';
import { RACINE, type DateLocale } from '../data/schema';
import type { Arbre } from '../tree/arbre';
import type { Disposition, LienLibre, Point } from './liens';
import { chevauchement, coteRadial, encombrement, etiquette, niveauDe, type Etiquette, type Rect } from './etiquettes';

/** Nœud placé sur la toile. La racine affichée (projet ou branche ouverte) est le nœud `centre`. */
export interface NoeudPlace extends Point {
  id: string;
  parent: string | null;
  profondeur: number;
  feuille: boolean;
  epingle: boolean;
  /** Libellé coupé et mesuré (null pour le centre). */
  etiquette: Etiquette | null;
}

export interface Arete { de: string; vers: string }

export interface Graduation { x: number; libelle: string; majeure: boolean }

export interface AxeFrise {
  /** Premier jour affiché (AAAA-MM-JJ). */
  debut: DateLocale;
  pxJour: number;
  aujourdhuiX: number;
  graduations: Graduation[];
  /** Couloirs : une branche de premier niveau par couloir. */
  couloirs: { id: string; y: number; hauteur: number }[];
}

export interface Plan {
  disposition: Disposition;
  centre: string;
  noeuds: NoeudPlace[];
  aretes: Arete[];
  /** Rayons des cercles de construction (radial). */
  cercles: number[];
  axe: AxeFrise | null;
  /** Nœuds sans date, absents de la frise. */
  sansDate: number;
  /** Arbre de haut en bas. */
  vertical?: boolean;
}

/** Écart minimal entre deux cercles de construction. */
export const PAS_RADIAL = 72;
/** Marge minimale entre deux encombrements de nœuds. */
export const MARGE = 6;
/** Arbre : écart entre la fin d'une colonne et le début de la suivante ; écarts verticaux. */
export const PAS_ARBRE = { colonne: 56, frere: 10, cousin: 22 };
export const PAS_ARBRE_VERTICAL = { niveau: 96, frere: 150 };

interface Brut { id: string; enfants: Brut[]; etiquette: Etiquette | null }

/** Sous-arbre visible à partir de `centre` : les branches repliées cachent leur descendance. */
function sousArbre(arbre: Arbre, centre: string): Brut {
  const construire = (id: string, profondeur: number): Brut => {
    const n = arbre.parId.get(id);
    const enfants = n?.replie ? [] : (arbre.enfants.get(id) ?? []);
    return {
      id,
      enfants: enfants.map((e) => construire(e, profondeur + 1)),
      etiquette: profondeur === 0 ? null : etiquette(n?.texte ?? '', niveauDe(profondeur), Boolean(n?.echeance)),
    };
  };
  return construire(centre, 0);
}

function appliquerEpingles(noeuds: NoeudPlace[], epingles: Map<string, Point>): void {
  for (const n of noeuds) {
    const p = epingles.get(n.id);
    if (p) { n.x = p.x; n.y = p.y; n.epingle = true; }
  }
}

function placer(racine: HierarchyPointNode<Brut>, f: (n: HierarchyPointNode<Brut>) => Point): NoeudPlace[] {
  return racine.descendants().map((n) => ({
    id: n.data.id,
    parent: n.parent?.data.id ?? null,
    profondeur: n.depth,
    feuille: !n.children?.length,
    epingle: false,
    etiquette: n.data.etiquette,
    ...f(n),
  }));
}

function aretesDe(noeuds: NoeudPlace[]): Arete[] {
  return noeuds.filter((n) => n.parent !== null).map((n) => ({ de: n.parent!, vers: n.id }));
}

/**
 * Radial : le centre au milieu, un cercle de construction par niveau. Les angles suivent
 * l'arbre (d3 tidy tree) ; chaque cercle s'agrandit jusqu'à ce que ses nœuds, libellés
 * compris, ne recouvrent ni leurs voisins ni les cercles intérieurs.
 */
export function radial(arbre: Arbre, centre: string = RACINE, epingles = new Map<string, Point>()): Plan {
  const h = hierarchy(sousArbre(arbre, centre), (d) => d.enfants);
  const racine = tree<Brut>().size([2 * Math.PI, 1]).separation((a, b) => (a.parent === b.parent ? 1 : 1.6))(h);
  const parNiveau: HierarchyPointNode<Brut>[][] = [];
  racine.each((n) => { (parNiveau[n.depth] ??= []).push(n); });
  const rayons: number[] = [0];
  const fixes: Rect[] = [encombrement(0, 0, null, 'droite')];
  const boites = (noeuds: HierarchyPointNode<Brut>[], r: number) => noeuds.map((n) => {
    const a = n.x - Math.PI / 2;
    const x = r * Math.cos(a);
    const y = r * Math.sin(a);
    return encombrement(x, y, n.data.etiquette, coteRadial(x, y));
  });
  for (let d = 1; d < parNiveau.length; d++) {
    const noeuds = parNiveau[d]!;
    let r = rayons[d - 1]! + PAS_RADIAL + (d === 1 ? 24 : 0);
    // Agrandir par pas croissants : le cercle ne grandit que du nécessaire.
    for (let i = 0; i < 400 && chevauchement(boites(noeuds, r), fixes, MARGE); i++) r += Math.max(8, r * 0.04);
    rayons[d] = r;
    fixes.push(...boites(noeuds, r));
  }
  const noeuds = placer(racine, (n) => {
    const r = rayons[n.depth] ?? 0;
    if (r === 0) return { x: 0, y: 0 };
    const a = n.x - Math.PI / 2;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  });
  appliquerEpingles(noeuds, epingles);
  return { disposition: 'radial', centre, noeuds, aretes: aretesDe(noeuds), cercles: rayons.slice(1), axe: null, sansDate: 0 };
}

/** Largeur occupée par un nœud dans une colonne de l'arbre (le libellé est à droite du carré). */
export function largeurColonne(e: Etiquette | null): number {
  const r = encombrement(0, 0, e, 'droite');
  return r.x1 - r.x0;
}
function hauteurArbre(e: Etiquette | null): number {
  const r = encombrement(0, 0, e, 'droite');
  return r.y1 - r.y0;
}

/**
 * Arbre : de gauche à droite, connecteurs orthogonaux. Chaque colonne commence après le
 * plus long libellé de la précédente ; l'écart vertical suit la hauteur des libellés.
 * Les nœuds d'une colonne sont alignés à gauche (x = bord gauche + demi-largeur du cadre ou du carré).
 * `vertical` : de haut en bas, pas fixes (export, petits écrans étroits).
 */
export function arborescence(
  arbre: Arbre, centre: string = RACINE, epingles = new Map<string, Point>(), vertical = false,
): Plan {
  const h = hierarchy(sousArbre(arbre, centre), (d) => d.enfants);
  if (vertical) {
    const racine = tree<Brut>().nodeSize([PAS_ARBRE_VERTICAL.frere, PAS_ARBRE_VERTICAL.niveau])(h);
    const noeuds = placer(racine, (n) => ({ x: n.x, y: n.y }));
    appliquerEpingles(noeuds, epingles);
    return { disposition: 'arbre', centre, noeuds, aretes: aretesDe(noeuds), cercles: [], axe: null, sansDate: 0, vertical: true };
  }
  const racine = tree<Brut>().nodeSize([1, 1]).separation((a, b) =>
    (hauteurArbre(a.data.etiquette) + hauteurArbre(b.data.etiquette)) / 2 + (a.parent === b.parent ? PAS_ARBRE.frere : PAS_ARBRE.cousin))(h);
  // Bord gauche de chaque colonne.
  const largeurs: number[] = [];
  racine.each((n) => { largeurs[n.depth] = Math.max(largeurs[n.depth] ?? 0, largeurColonne(n.data.etiquette)); });
  const gauches: number[] = [0];
  for (let d = 1; d < largeurs.length; d++) gauches[d] = gauches[d - 1]! + largeurs[d - 1]! + PAS_ARBRE.colonne;
  const noeuds = placer(racine, (n) => {
    const r = encombrement(0, 0, n.data.etiquette, 'droite');
    // Centre : son cercle commence au bord gauche de la colonne 0.
    return { x: gauches[n.depth]! - r.x0, y: n.x };
  });
  appliquerEpingles(noeuds, epingles);
  return { disposition: 'arbre', centre, noeuds, aretes: aretesDe(noeuds), cercles: [], axe: null, sansDate: 0 };
}

interface Particule extends SimulationNodeDatum { id: string }

/**
 * Libre : force dirigée. Les liens libres tirent aussi les nœuds l'un vers l'autre.
 * Départ depuis la disposition radiale, nombre de pas fixe : le résultat est
 * déterministe (le générateur aléatoire de d3-force a une graine fixe).
 */
export function libre(
  arbre: Arbre, liensLibres: LienLibre[], centre: string = RACINE, epingles = new Map<string, Point>(),
): Plan {
  const base = radial(arbre, centre);
  const visibles = new Set(base.noeuds.map((n) => n.id));
  const particules: Particule[] = base.noeuds.map((n) => {
    const p = epingles.get(n.id);
    const fixe = n.id === centre ? { x: 0, y: 0 } : p;
    return { id: n.id, x: n.x * 0.8, y: n.y * 0.8, ...(fixe ? { fx: fixe.x, fy: fixe.y } : {}) };
  });
  const transverses = liensLibres
    .filter((l) => visibles.has(l.de) && visibles.has(l.vers))
    .map((l) => ({ source: l.de, target: l.vers }));
  const simulation = forceSimulation<Particule>(particules)
    .force('arbre', forceLink<Particule, { source: string; target: string }>(base.aretes.map((a) => ({ source: a.de, target: a.vers })))
      .id((d) => d.id).distance(90).strength(0.9))
    .force('transverses', forceLink<Particule, { source: string; target: string }>(transverses)
      .id((d) => d.id).distance(140).strength(0.25))
    .force('charge', forceManyBody<Particule>().strength(-260).distanceMax(600))
    .force('collision', forceCollide<Particule>(34))
    .alphaDecay(0.045)
    .stop();
  const pas = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay()));
  simulation.tick(pas);
  const parId = new Map(particules.map((p) => [p.id, p]));
  const noeuds = base.noeuds.map((n) => {
    const p = parId.get(n.id)!;
    return { ...n, x: p.x ?? 0, y: p.y ?? 0, epingle: epingles.has(n.id) };
  });
  return { ...base, disposition: 'libre', noeuds, cercles: [] };
}

// ───────────────────────────── Frise ─────────────────────────────

const JOUR = 86_400_000;
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** Numéro de jour (sans fuseau ni heure d'été : calcul en UTC sur la date calendaire). */
export function numeroJour(d: DateLocale): number {
  const [a, m, j] = d.slice(0, 10).split('-').map(Number) as [number, number, number];
  return Math.round(Date.UTC(a, m - 1, j) / JOUR);
}
export function dateDuJour(n: number): DateLocale {
  return new Date(n * JOUR).toISOString().slice(0, 10);
}

export const COULOIR = 64;
const LARGEUR_ETIQUETTE = 132;

/** Position x → date, en conservant l'heure éventuelle de la date d'origine. */
export function dateDepuisX(x: number, axe: AxeFrise, origine: DateLocale | null = null): DateLocale {
  const jour = dateDuJour(numeroJour(axe.debut) + Math.round(x / axe.pxJour));
  return origine && origine.length > 10 ? `${jour}${origine.slice(10)}` : jour;
}

/**
 * Frise : axe du temps (aujourd'hui marqué), nœuds datés placés dessus,
 * un couloir par branche de premier niveau ; dans un couloir, les étiquettes
 * qui se chevaucheraient passent sur une sous-ligne.
 */
export function frise(arbre: Arbre, centre: string = RACINE, aujourdhui: DateLocale, largeurCible = 960): Plan {
  const premierNiveau = arbre.enfants.get(centre) ?? [];
  const brancheDe = (id: string): string => {
    let cur = id;
    let p = arbre.parId.get(cur)?.parent;
    while (p !== undefined && p !== centre && p !== RACINE) { cur = p; p = arbre.parId.get(cur)?.parent; }
    return cur;
  };
  const dansCentre = (id: string): boolean => {
    let cur: string | undefined = id;
    while (cur !== undefined && cur !== RACINE) { if (cur === centre) return true; cur = arbre.parId.get(cur)?.parent; }
    return centre === RACINE;
  };
  const tous = [...arbre.parId.values()].filter((n) => n.id !== centre && dansCentre(n.id));
  const dates2 = tous.filter((n) => n.echeance);
  const t0 = numeroJour(aujourdhui);
  const jours = dates2.map((n) => numeroJour(n.echeance!));
  const min = Math.min(t0, ...jours) - 3;
  const max = Math.max(t0 + 14, ...jours) + 3;
  const pxJour = Math.max(6, Math.min(48, largeurCible / (max - min)));
  const debut = dateDuJour(min);

  // Couloirs et sous-lignes.
  const couloirs: AxeFrise['couloirs'] = [];
  const noeuds: NoeudPlace[] = [];
  let y = 0;
  for (const branche of premierNiveau) {
    const items = dates2
      .filter((n) => brancheDe(n.id) === branche)
      .sort((a, b) => numeroJour(a.echeance!) - numeroJour(b.echeance!) || (a.id < b.id ? -1 : 1));
    if (!items.length) continue;
    const finsDeLigne: number[] = [];
    for (const n of items) {
      const x = (numeroJour(n.echeance!) - min) * pxJour;
      let ligne = finsDeLigne.findIndex((fin) => fin <= x);
      if (ligne < 0) { ligne = finsDeLigne.length; finsDeLigne.push(0); }
      finsDeLigne[ligne] = x + LARGEUR_ETIQUETTE;
      noeuds.push({
        id: n.id, parent: null, profondeur: 1, feuille: !(arbre.enfants.get(n.id)?.length),
        epingle: false, etiquette: etiquette(n.texte, 2, true), x, y: y + COULOIR / 2 + 8 + ligne * (COULOIR * 0.75),
      });
    }
    const hauteur = COULOIR + (finsDeLigne.length - 1) * COULOIR * 0.75;
    couloirs.push({ id: branche, y, hauteur });
    y += hauteur;
  }

  // Graduations : chaque lundi si l'échelle le permet, sinon chaque début de mois.
  const graduations: Graduation[] = [];
  for (let j = min; j <= max; j++) {
    const d = new Date(j * JOUR);
    const premier = d.getUTCDate() === 1;
    const lundi = d.getUTCDay() === 1;
    if (premier) graduations.push({ x: (j - min) * pxJour, libelle: MOIS[d.getUTCMonth()]!, majeure: true });
    else if (lundi && pxJour >= 12) graduations.push({ x: (j - min) * pxJour, libelle: String(d.getUTCDate()).padStart(2, '0'), majeure: false });
  }

  return {
    disposition: 'frise', centre, noeuds, aretes: [], cercles: [],
    axe: { debut, pxJour, aujourdhuiX: (t0 - min) * pxJour, graduations, couloirs },
    sansDate: tous.length - dates2.length,
  };
}

export function calculerPlan(
  disposition: Disposition, arbre: Arbre, liensLibres: LienLibre[], centre: string,
  epingles: Map<string, Point>, aujourdhui: DateLocale, options: { vertical?: boolean } = {},
): Plan {
  switch (disposition) {
    case 'radial': return radial(arbre, centre, epingles);
    case 'arbre': return arborescence(arbre, centre, epingles, options.vertical);
    case 'libre': return libre(arbre, liensLibres, centre, epingles);
    case 'frise': return frise(arbre, centre, aujourdhui);
  }
}

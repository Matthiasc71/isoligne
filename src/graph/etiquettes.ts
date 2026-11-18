/**
 * Hiérarchie et encombrement des étiquettes du graphe (brief design/briefs/graphe-lisibilite.md).
 *
 * Niveau 1 (point principal) : cadre, Label 14 px. Niveau 2 : carré de 9 px, texte 14 px.
 * Niveau 3 et plus : carré de 6 px, texte 12 px, couleur secondaire.
 * Les largeurs sont estimées (un peu au-dessus des mesures réelles des polices) pour que
 * les dispositions réservent la place des libellés sans dépendre du DOM ; l'affichage
 * impose la même largeur, le navigateur ne peut donc pas couper en plus de lignes.
 */

export type Niveau = 1 | 2 | 3;
export type Cote = 'droite' | 'gauche' | 'haut' | 'bas';

export interface Etiquette {
  niveau: Niveau;
  /** Lignes après coupure (bornées). */
  lignes: string[];
  /** Largeur du texte (la plus longue ligne). */
  largeur: number;
  /** Hauteur du texte (date comprise). */
  hauteur: number;
  /** Une date peut s'afficher sous le libellé (nœud daté). */
  date: boolean;
}

interface Style { car: number; espace: number; max: number; ligne: number; lignesMax: number }

/** Largeur moyenne d'un caractère mesurée sur Archivo élargi (capitales) et B612, majorée d'environ 5 %. */
export const STYLES: Record<Niveau, Style> = {
  1: { car: 13.6, espace: 13.6, max: 260, ligne: 17, lignesMax: 3 },
  2: { car: 7.6, espace: 5, max: 210, ligne: 19, lignesMax: 2 },
  3: { car: 6.5, espace: 4.3, max: 180, ligne: 16, lignesMax: 2 },
};

/** Cadre du niveau 1 : marges intérieures et trait. */
export const CADRE = { x: 12, y: 8 };
/** Côté du carré selon le niveau, et écart entre le carré et son libellé. */
export const CARRE: Record<Niveau, number> = { 1: 0, 2: 9, 3: 6 };
export const ECART_ETIQUETTE = 10;
/** Ligne de date sous un libellé (cote 12 px). */
export const LIGNE_DATE = 16;
/** Marge accordée au navigateur sur la largeur estimée (glyphes plus larges que la moyenne). */
export const MAJORATION = 1.1;
/** Cercle du centre. */
export const RAYON_CENTRE = 28;

export const niveauDe = (profondeur: number): Niveau => (profondeur <= 1 ? 1 : profondeur === 2 ? 2 : 3);

/** Largeur d'un texte sur une ligne, au niveau donné. */
export type Mesure = (texte: string, niveau: Niveau) => number;

/** Estimation sans DOM (tests, Worker du mode libre) : moyenne par caractère, majorée. */
export const estimer: Mesure = (texte, niveau) => {
  const s = STYLES[niveau];
  const espaces = texte.split(' ').length - 1;
  return ((texte.length - espaces) * s.car + espaces * s.espace) * MAJORATION;
};

let mesureCourante: Mesure = estimer;
/** L'app remplace l'estimation par une mesure réelle des polices (voir mesure.ts). */
export function definirMesure(m: Mesure): void { mesureCourante = m; }

/** Coupe le texte en lignes (mots entiers, mot trop long coupé), au plus `lignesMax`. */
export function etiquette(texte: string, niveau: Niveau, date = false): Etiquette {
  const s = STYLES[niveau];
  const mesure = (t: string) => mesureCourante(t, niveau);
  const mots = (texte.trim() || 'Sans titre').split(/\s+/);
  const lignes: string[] = [];
  let courante = '';
  for (let mot of mots) {
    // Mot plus long qu'une ligne : coupé en morceaux (comme overflow-wrap: break-word).
    while (mot.length > 1 && mesure(mot) > s.max) {
      if (courante) { lignes.push(courante); courante = ''; }
      let n = mot.length - 1;
      while (n > 1 && mesure(mot.slice(0, n)) > s.max) n--;
      lignes.push(mot.slice(0, n));
      mot = mot.slice(n);
    }
    const essai = courante ? `${courante} ${mot}` : mot;
    if (courante && mesure(essai) > s.max) {
      lignes.push(courante);
      courante = mot;
    } else {
      courante = essai;
    }
  }
  if (courante) lignes.push(courante);
  const gardees = lignes.slice(0, s.lignesMax);
  const largeur = Math.min(s.max, Math.max(...gardees.map(mesure)));
  return {
    niveau, lignes: gardees, date,
    // Un pixel de plus : arrondis du navigateur.
    largeur: Math.ceil(largeur) + 1,
    // Niveau 1 : la date se place sous le cadre (voir encombrement) ; ailleurs, sous le libellé.
    hauteur: gardees.length * s.ligne + (date && niveau > 1 ? LIGNE_DATE : 0),
  };
}

export interface Rect { x0: number; y0: number; x1: number; y1: number }

/** Encombrement d'un nœud placé en (x, y), libellé compris. */
export function encombrement(x: number, y: number, e: Etiquette | null, cote: Cote): Rect {
  if (!e) return { x0: x - RAYON_CENTRE, y0: y - RAYON_CENTRE, x1: x + RAYON_CENTRE, y1: y + RAYON_CENTRE };
  if (e.niveau === 1) {
    const l = e.largeur / 2 + CADRE.x + 1;
    const h = e.hauteur / 2 + CADRE.y + 1;
    return { x0: x - l, y0: y - h, x1: x + l, y1: y + h + (e.date ? LIGNE_DATE + 4 : 0) };
  }
  const c = CARRE[e.niveau] / 2;
  const d = c + ECART_ETIQUETTE;
  switch (cote) {
    case 'droite': return { x0: x - c, y0: y - Math.max(c, e.hauteur / 2), x1: x + d + e.largeur, y1: y + Math.max(c, e.hauteur / 2) };
    case 'gauche': return { x0: x - d - e.largeur, y0: y - Math.max(c, e.hauteur / 2), x1: x + c, y1: y + Math.max(c, e.hauteur / 2) };
    case 'haut': return { x0: x - Math.max(c, e.largeur / 2), y0: y - d - e.hauteur, x1: x + Math.max(c, e.largeur / 2), y1: y + c };
    case 'bas': return { x0: x - Math.max(c, e.largeur / 2), y0: y - c, x1: x + Math.max(c, e.largeur / 2), y1: y + d + e.hauteur };
  }
}

/** Vrai si deux rectangles, agrandis de `marge`, se recouvrent. */
export function recouvre(a: Rect, b: Rect, marge = 0): boolean {
  return a.x0 - marge < b.x1 && b.x0 - marge < a.x1 && a.y0 - marge < b.y1 && b.y0 - marge < a.y1;
}

/** Un rectangle de `mobiles` recouvre-t-il un autre rectangle (mobile ou fixe) ? Balayage selon x. */
export function chevauchement(mobiles: Rect[], fixes: Rect[], marge: number): boolean {
  const tous = [...mobiles.map((r) => ({ r, m: true })), ...fixes.map((r) => ({ r, m: false }))].sort((a, b) => a.r.x0 - b.r.x0);
  const actifs: { r: Rect; m: boolean }[] = [];
  for (const c of tous) {
    for (let i = actifs.length - 1; i >= 0; i--) if (actifs[i]!.r.x1 + marge <= c.r.x0) actifs.splice(i, 1);
    for (const a of actifs) if ((a.m || c.m) && recouvre(a.r, c.r, marge)) return true;
    actifs.push(c);
  }
  return false;
}

/** Côté du libellé en radial : vers l'extérieur, selon l'angle depuis le centre. */
export function coteRadial(x: number, y: number): Cote {
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  if (deg > -60 && deg < 60) return 'droite';
  if (deg > 120 || deg < -120) return 'gauche';
  return deg < 0 ? 'haut' : 'bas';
}

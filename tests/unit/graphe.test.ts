import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { creerNoeud, definirEcheance, basculerReplie, lireArbre, supprimer } from '../../src/tree/arbre';
import { RACINE } from '../../src/data/schema';
import { creerLien, epingler, lireLiens, lirePositions, reorganiser, supprimerLien } from '../../src/graph/liens';
import {
  arborescence, dateDepuisX, frise, libre, numeroJour, radial, dateDuJour, type Plan,
} from '../../src/graph/dispositions';
import { encombrement, etiquette, niveauDe, recouvre } from '../../src/graph/etiquettes';
import { coteEtiquette, genre } from '../../src/graph/rendu';

/** Projet très indenté aux libellés longs (cas signalé : radial et arbre illisibles). */
function dense() {
  const doc = new Y.Doc();
  const cdc = creerNoeud(doc, RACINE, undefined, { texte: 'Construire cahier des charges du parafoudre' });
  for (const t of ['Définir le niveau de protection', 'Tension de protection Up', 'Coordination avec les disjoncteurs', 'Signalisation de fin de vie']) {
    const n = creerNoeud(doc, cdc, undefined, { texte: t });
    for (const u of ['In nominal', 'Imax', 'Iimp onde 10/350']) creerNoeud(doc, n, undefined, { texte: `${u} ${t.slice(0, 6)}` });
  }
  const v = creerNoeud(doc, RACINE, undefined, { texte: 'Validation' });
  creerNoeud(doc, v, undefined, { texte: 'Relecture bureau d’études' });
  creerNoeud(doc, RACINE, undefined, { texte: 'Commande', echeance: '2026-12-09' });
  return lireArbre(doc);
}

function aucunChevauchement(plan: Plan) {
  const pos = new Map(plan.noeuds.map((n) => [n.id, n]));
  const boites = plan.noeuds.map((n) => encombrement(n.x, n.y, n.profondeur === 0 ? null : n.etiquette,
    coteEtiquette(n, plan, n.parent ? pos.get(n.parent) ?? null : null)));
  for (let i = 0; i < boites.length; i++) for (let j = i + 1; j < boites.length; j++) expect(recouvre(boites[i]!, boites[j]!)).toBe(false);
}

function projet() {
  const doc = new Y.Doc();
  const ecriture = creerNoeud(doc, RACINE, undefined, { texte: 'Écriture' });
  const synopsis = creerNoeud(doc, ecriture, undefined, { texte: 'Synopsis' });
  const scenario = creerNoeud(doc, ecriture, undefined, { texte: 'Scénario' });
  const tournage = creerNoeud(doc, RACINE, undefined, { texte: 'Tournage' });
  const reperages = creerNoeud(doc, tournage, undefined, { texte: 'Repérages', echeance: '2026-12-05' });
  const materiel = creerNoeud(doc, tournage, undefined, { texte: 'Matériel', echeance: '2026-12-26' });
  const montage = creerNoeud(doc, RACINE, undefined, { texte: 'Montage', echeance: '2027-01-09' });
  return { doc, ecriture, synopsis, scenario, tournage, reperages, materiel, montage };
}

const fini = (n: { x: number; y: number }) => Number.isFinite(n.x) && Number.isFinite(n.y);

describe('liens libres', () => {
  it('crée, refuse les boucles et doublons, ignore les extrémités supprimées', () => {
    const p = projet();
    const arbre = lireArbre(p.doc);
    const id = creerLien(p.doc, arbre, p.synopsis, p.reperages, 'lieux');
    expect(id).not.toBeNull();
    expect(creerLien(p.doc, arbre, p.reperages, p.synopsis)).toBeNull();
    expect(creerLien(p.doc, arbre, p.synopsis, p.synopsis)).toBeNull();
    expect(lireLiens(p.doc, lireArbre(p.doc))).toHaveLength(1);
    supprimer(p.doc, p.reperages);
    expect(lireLiens(p.doc, lireArbre(p.doc))).toHaveLength(0);
    supprimerLien(p.doc, id!);
  });
});

describe('positions épinglées', () => {
  it('épingle par disposition et « Réorganiser » les oublie', () => {
    const p = projet();
    epingler(p.doc, 'radial', p.synopsis, { x: 10.4, y: -20.6 });
    expect(lirePositions(p.doc, 'radial').get(p.synopsis)).toEqual({ x: 10, y: -21 });
    expect(lirePositions(p.doc, 'arbre').size).toBe(0);
    const plan = radial(lireArbre(p.doc), RACINE, lirePositions(p.doc, 'radial'));
    const n = plan.noeuds.find((x) => x.id === p.synopsis)!;
    expect(n).toMatchObject({ x: 10, y: -21, epingle: true });
    reorganiser(p.doc, 'radial');
    expect(lirePositions(p.doc, 'radial').size).toBe(0);
  });
});

describe('dispositions', () => {
  it('radial : centre au milieu, un cercle de construction par niveau', () => {
    const p = projet();
    const plan = radial(lireArbre(p.doc));
    expect(plan.noeuds).toHaveLength(8);
    expect(plan.noeuds[0]).toMatchObject({ id: RACINE, x: 0, y: 0 });
    expect(plan.cercles).toHaveLength(2);
    for (const n of plan.noeuds) {
      expect(fini(n)).toBe(true);
      if (n.profondeur > 0) expect(Math.hypot(n.x, n.y)).toBeCloseTo(plan.cercles[n.profondeur - 1]!, 3);
    }
    expect(plan.aretes).toHaveLength(7);
  });

  it('une branche repliée cache sa descendance ; une branche ouverte devient le centre', () => {
    const p = projet();
    basculerReplie(p.doc, p.tournage);
    expect(radial(lireArbre(p.doc)).noeuds).toHaveLength(6);
    const centre = radial(lireArbre(p.doc), p.ecriture);
    expect(centre.noeuds.map((n) => n.id).sort()).toEqual([p.ecriture, p.synopsis, p.scenario].sort());
    expect(centre.noeuds[0]).toMatchObject({ id: p.ecriture, x: 0, y: 0 });
  });

  it('arbre : niveaux alignés de gauche à droite, ou de haut en bas', () => {
    const p = projet();
    const h = arborescence(lireArbre(p.doc));
    // Colonnes alignées par leur bord gauche ; chacune commence après la plus longue étiquette de la précédente.
    const gauches = new Map<number, Set<number>>();
    const droites = new Map<number, number>();
    for (const n of h.noeuds) {
      const r = encombrement(n.x, n.y, n.profondeur === 0 ? null : n.etiquette, 'droite');
      gauches.set(n.profondeur, (gauches.get(n.profondeur) ?? new Set()).add(Math.round(r.x0)));
      droites.set(n.profondeur, Math.max(droites.get(n.profondeur) ?? -Infinity, r.x1));
    }
    for (const xs of gauches.values()) expect(xs.size).toBe(1);
    for (const [d, xs] of gauches) if (d > 0) expect([...xs][0]!).toBeGreaterThan(droites.get(d - 1)!);
    const v = arborescence(lireArbre(p.doc), RACINE, new Map(), true);
    for (const n of v.noeuds) expect(n.y).toBe(n.profondeur * 96);
  });

  it('radial et arbre : aucun nœud ne recouvre un autre, libellés compris', () => {
    const arbre = dense();
    aucunChevauchement(radial(arbre));
    aucunChevauchement(arborescence(arbre));
  });

  it('hiérarchie : points principaux en cadre, sous-points en carré, plus petits au-delà du niveau 2', () => {
    const arbre = dense();
    const plan = radial(arbre);
    for (const n of plan.noeuds) {
      if (n.profondeur === 0) { expect(genre(n, plan)).toBe('centre'); continue; }
      expect(genre(n, plan)).toBe(n.profondeur === 1 ? 'branche' : 'feuille');
      expect(n.etiquette?.niveau).toBe(niveauDe(n.profondeur));
    }
    // Un libellé long se coupe en lignes bornées ; le niveau 1 est plus grand que le niveau 2, lui-même plus grand que le 3.
    const long = 'Construire cahier des charges du parafoudre';
    const [n1, n2, n3] = ([1, 2, 3] as const).map((n) => etiquette(long, n));
    expect(n1!.lignes.length).toBeGreaterThan(1);
    expect(n1!.lignes.length).toBeLessThanOrEqual(3);
    expect(n2!.lignes.length).toBeLessThanOrEqual(2);
    const court = ([1, 2, 3] as const).map((n) => etiquette('Imax', n));
    expect(court[0]!.largeur).toBeGreaterThan(court[1]!.largeur);
    expect(court[1]!.largeur).toBeGreaterThan(court[2]!.largeur);
    expect(n3!.hauteur / n3!.lignes.length).toBeLessThan(n2!.hauteur / n2!.lignes.length);
  });

  it('libre : déterministe, sans chevauchement, les liens libres rapprochent', () => {
    const p = projet();
    const arbre = lireArbre(p.doc);
    const sans = libre(arbre, []);
    const encore = libre(arbre, []);
    expect(sans.noeuds).toEqual(encore.noeuds);
    for (const a of sans.noeuds) {
      expect(fini(a)).toBe(true);
      for (const b of sans.noeuds) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(30);
    }
    creerLien(p.doc, arbre, p.synopsis, p.materiel);
    const avec = libre(lireArbre(p.doc), lireLiens(p.doc, lireArbre(p.doc)));
    const distance = (plan: typeof sans) => {
      const a = plan.noeuds.find((n) => n.id === p.synopsis)!;
      const b = plan.noeuds.find((n) => n.id === p.materiel)!;
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    expect(distance(avec)).toBeLessThan(distance(sans));
  });

  it('frise : nœuds datés placés dans le temps, un couloir par branche, aujourd’hui marqué', () => {
    const p = projet();
    const plan = frise(lireArbre(p.doc), RACINE, '2026-11-16');
    expect(plan.noeuds.map((n) => n.id).sort()).toEqual([p.reperages, p.materiel, p.montage].sort());
    expect(plan.sansDate).toBe(4);
    const x = (id: string) => plan.noeuds.find((n) => n.id === id)!.x;
    expect(x(p.reperages)).toBeLessThan(x(p.materiel));
    expect(x(p.materiel)).toBeLessThan(x(p.montage));
    expect(plan.axe!.aujourdhuiX).toBeLessThan(x(p.reperages));
    expect(plan.axe!.couloirs.map((c) => c.id)).toEqual([p.tournage, p.montage]);
    // Glisser sur la frise change la date : aller-retour exact.
    expect(dateDepuisX(x(p.materiel), plan.axe!)).toBe('2026-12-26');
    expect(dateDepuisX(x(p.materiel) + plan.axe!.pxJour * 3, plan.axe!, '2026-12-26T14:30')).toBe('2026-12-29T14:30');
  });

  it('frise : les jours se comptent sans dérive à l’heure d’été', () => {
    expect(numeroJour('2026-03-30') - numeroJour('2026-03-28')).toBe(2);
    expect(numeroJour('2026-10-26') - numeroJour('2026-10-24')).toBe(2);
    expect(dateDuJour(numeroJour('2026-03-29'))).toBe('2026-03-29');
  });

  it('tient 500 nœuds rapidement', () => {
    const doc = new Y.Doc();
    doc.transact(() => {
      let n = 0;
      for (let a = 0; a < 5; a++) {
        const b = creerNoeud(doc, RACINE); n++;
        for (let c = 0; c < 9; c++) {
          const s = creerNoeud(doc, b); n++;
          for (let d = 0; d < 10 && n < 500; d++) {
            const f = creerNoeud(doc, s); n++;
            if (d % 4 === 0) definirEcheance(doc, f, `2026-12-${String((d % 28) + 1).padStart(2, '0')}`);
          }
        }
      }
    });
    const arbre = lireArbre(doc);
    expect(arbre.parId.size).toBe(500);
    for (const [nom, f] of [
      ['radial', () => radial(arbre)],
      ['arbre', () => arborescence(arbre)],
      ['frise', () => frise(arbre, RACINE, '2026-11-16')],
      ['libre', () => libre(arbre, [])],
    ] as const) {
      const t = performance.now();
      const plan = f();
      const duree = performance.now() - t;
      expect(plan.noeuds.every(fini), nom).toBe(true);
      console.log(`${nom} 500 nœuds : ${duree.toFixed(0)} ms`);
      expect(duree, `${nom} : ${duree.toFixed(0)} ms`).toBeLessThan(nom === 'libre' ? 1500 : 100);
    }
  });
});

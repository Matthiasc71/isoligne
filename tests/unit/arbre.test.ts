import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import * as Y from 'yjs';
import {
  basculerFait, creerApres, creerNoeud, decaler, definirTexte, deplacer, desindenter, fusionnerAvec, indenter,
  lireArbre, numero, supprimer, type Arbre,
} from '../../src/tree/arbre';
import { aplatir, avancement } from '../../src/tree/lignes';
import { RACINE } from '../../src/data/schema';

function texte(arbre: Arbre, parent = RACINE): string[] {
  return (arbre.enfants.get(parent) ?? []).map((id) => arbre.parId.get(id)!.texte);
}

/** Un arbre est valide si chaque nœud vivant remonte à la racine sans boucle. */
function verifierArbre(doc: Y.Doc): void {
  const arbre = lireArbre(doc);
  for (const id of arbre.parId.keys()) {
    const vus = new Set<string>();
    let cur = id;
    while (cur !== RACINE) {
      expect(vus.has(cur), `cycle via ${cur}`).toBe(false);
      vus.add(cur);
      const n = arbre.parId.get(cur);
      expect(n, `orphelin ${cur}`).toBeDefined();
      cur = n!.parent;
    }
    const parent = arbre.parId.get(id)!.parent;
    expect(arbre.enfants.get(parent)).toContain(id);
  }
  const total = [...arbre.enfants.values()].reduce((s, l) => s + l.length, 0);
  expect(total).toBe(arbre.parId.size);
}

describe('opérations sur l’arbre', () => {
  it('crée, indente, désindente, décale', () => {
    const doc = new Y.Doc();
    const a = creerNoeud(doc, RACINE, undefined, { texte: 'Écriture' });
    const b = creerApres(doc, a, { texte: 'Synopsis' });
    const c = creerApres(doc, b, { texte: 'Scénario' });
    expect(texte(lireArbre(doc))).toEqual(['Écriture', 'Synopsis', 'Scénario']);

    expect(indenter(doc, b)).toBe(true);
    expect(indenter(doc, c)).toBe(true);
    let arbre = lireArbre(doc);
    expect(texte(arbre, a)).toEqual(['Synopsis', 'Scénario']);
    expect(numero(arbre, c)).toBe('1.2');

    expect(decaler(doc, c, -1)).toBe(true);
    expect(texte(lireArbre(doc), a)).toEqual(['Scénario', 'Synopsis']);

    expect(desindenter(doc, c)).toBe(true);
    arbre = lireArbre(doc);
    expect(texte(arbre)).toEqual(['Écriture', 'Scénario']);
    expect(numero(arbre, c)).toBe('2');
    expect(indenter(doc, a)).toBe(false); // pas de frère précédent
    verifierArbre(doc);
  });

  it('refuse de créer un cycle', () => {
    const doc = new Y.Doc();
    const a = creerNoeud(doc, RACINE);
    const b = creerNoeud(doc, a);
    expect(deplacer(doc, a, b, 0)).toBe(false);
    expect(deplacer(doc, a, a, 0)).toBe(false);
    verifierArbre(doc);
  });

  it('supprime une branche entière', () => {
    const doc = new Y.Doc();
    const a = creerNoeud(doc, RACINE);
    creerNoeud(doc, a);
    creerNoeud(doc, RACINE);
    supprimer(doc, a);
    expect(lireArbre(doc).parId.size).toBe(1);
  });

  it('modifie le texte par différence', () => {
    const doc = new Y.Doc();
    const a = creerNoeud(doc, RACINE, undefined, { texte: 'Repérage' });
    definirTexte(doc, a, 'Repérages');
    definirTexte(doc, a, 'Les repérages');
    expect(lireArbre(doc).parId.get(a)!.texte).toBe('Les repérages');
  });

  it('fusionne avec l’élément précédent', () => {
    const doc = new Y.Doc();
    const a = creerNoeud(doc, RACINE, undefined, { texte: 'Mon' });
    const b = creerApres(doc, a, { texte: 'tage' });
    const enfant = creerNoeud(doc, b, undefined, { texte: 'Étalonnage' });
    expect(fusionnerAvec(doc, b, a)).toEqual({ focus: a, curseur: 3 });
    const arbre = lireArbre(doc);
    expect(texte(arbre)).toEqual(['Montage']);
    expect(arbre.parId.get(enfant)!.parent).toBe(a);
    verifierArbre(doc);
  });

  it('replie les tâches faites et calcule l’avancement', () => {
    const doc = new Y.Doc();
    const a = creerNoeud(doc, RACINE, undefined, { texte: 'Écriture' });
    const t1 = creerNoeud(doc, a, undefined, { texte: 'Synopsis', tache: true });
    const t2 = creerNoeud(doc, a, undefined, { texte: 'Scénario', tache: true });
    creerNoeud(doc, a, undefined, { texte: 'Découpage', tache: true });
    basculerFait(doc, t1);
    basculerFait(doc, t2);
    const arbre = lireArbre(doc);
    const { lignes } = aplatir(arbre);
    expect(lignes.map((l) => `${l.numero} ${l.noeud.texte}`)).toEqual(['1 Écriture', '1.3 Découpage']);
    expect(lignes[0]!.faitesCachees).toBe(2);
    expect(aplatir(arbre, RACINE, new Set([a])).lignes).toHaveLength(4);
    expect(avancement(arbre)).toEqual({ faites: 2, total: 3 });
  });
});

// ───────────────────────── Concurrence (deux appareils hors ligne) ─────────────────────────

type Op =
  | { k: 'creer'; parent: number; index: number }
  | { k: 'deplacer'; noeud: number; parent: number; index: number }
  | { k: 'indenter' | 'desindenter' | 'supprimer' | 'monter'; noeud: number }
  | { k: 'texte'; noeud: number; valeur: string };

const opArb: fc.Arbitrary<Op> = fc.oneof(
  { weight: 4, arbitrary: fc.record({ k: fc.constant('creer' as const), parent: fc.nat(30), index: fc.nat(10) }) },
  { weight: 3, arbitrary: fc.record({ k: fc.constant('deplacer' as const), noeud: fc.nat(30), parent: fc.nat(30), index: fc.nat(10) }) },
  { weight: 2, arbitrary: fc.record({ k: fc.constantFrom('indenter' as const, 'desindenter' as const, 'monter' as const), noeud: fc.nat(30) }) },
  { weight: 1, arbitrary: fc.record({ k: fc.constant('supprimer' as const), noeud: fc.nat(30) }) },
  { weight: 1, arbitrary: fc.record({ k: fc.constant('texte' as const), noeud: fc.nat(30), valeur: fc.string({ maxLength: 6 }) }) },
);

function appliquer(doc: Y.Doc, op: Op): void {
  const ids = [...lireArbre(doc).parId.keys()].sort();
  const choisir = (n: number) => (ids.length ? ids[n % ids.length]! : null);
  switch (op.k) {
    case 'creer': creerNoeud(doc, op.parent % 4 === 0 ? RACINE : choisir(op.parent) ?? RACINE, op.index); break;
    case 'deplacer': {
      const n = choisir(op.noeud);
      if (n) deplacer(doc, n, op.parent % 4 === 0 ? RACINE : choisir(op.parent) ?? RACINE, op.index);
      break;
    }
    case 'indenter': { const n = choisir(op.noeud); if (n) indenter(doc, n); break; }
    case 'desindenter': { const n = choisir(op.noeud); if (n) desindenter(doc, n); break; }
    case 'monter': { const n = choisir(op.noeud); if (n) decaler(doc, n, -1); break; }
    case 'supprimer': { const n = choisir(op.noeud); if (n) supprimer(doc, n); break; }
    case 'texte': { const n = choisir(op.noeud); if (n) definirTexte(doc, n, op.valeur); break; }
  }
}

function synchroniser(a: Y.Doc, b: Y.Doc): void {
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b, Y.encodeStateVector(a)));
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a, Y.encodeStateVector(b)));
}

function signature(doc: Y.Doc): string {
  const arbre = lireArbre(doc);
  const rec = (p: string): unknown => (arbre.enfants.get(p) ?? []).map((id) => [id, arbre.parId.get(id)!.texte, rec(id)]);
  return JSON.stringify(rec(RACINE));
}

describe('convergence hors ligne (propriétés)', () => {
  it('deux appareils convergent vers le même arbre valide, quelles que soient les opérations', () => {
    fc.assert(
      fc.property(
        fc.array(opArb, { maxLength: 12 }),
        fc.array(fc.tuple(fc.array(opArb, { maxLength: 10 }), fc.array(opArb, { maxLength: 10 })), { minLength: 1, maxLength: 4 }),
        (communes, tours) => {
          const iphone = new Y.Doc();
          const ordi = new Y.Doc();
          for (const op of communes) appliquer(iphone, op);
          synchroniser(iphone, ordi);
          for (const [opsIphone, opsOrdi] of tours) {
            // Chaque appareil travaille hors ligne, puis ils se reconnectent.
            for (const op of opsIphone) appliquer(iphone, op);
            for (const op of opsOrdi) appliquer(ordi, op);
            synchroniser(iphone, ordi);
            verifierArbre(iphone);
            expect(signature(iphone)).toBe(signature(ordi));
          }
        },
      ),
      { numRuns: 300 },
    );
  });

  it('casse de la même façon un cycle créé par deux déplacements concurrents', () => {
    const iphone = new Y.Doc();
    const ordi = new Y.Doc();
    const a = creerNoeud(iphone, RACINE, undefined, { texte: 'A' });
    const b = creerNoeud(iphone, RACINE, undefined, { texte: 'B' });
    synchroniser(iphone, ordi);
    deplacer(iphone, a, b, 0); // A sous B
    deplacer(ordi, b, a, 0); // B sous A
    synchroniser(iphone, ordi);
    verifierArbre(iphone);
    expect(signature(iphone)).toBe(signature(ordi));
    expect(lireArbre(iphone).enfants.get(RACINE)).toHaveLength(1);
  });

  it('rattache à un ancêtre vivant les enfants créés sous une branche supprimée ailleurs', () => {
    const iphone = new Y.Doc();
    const ordi = new Y.Doc();
    const a = creerNoeud(iphone, RACINE, undefined, { texte: 'A' });
    const b = creerNoeud(iphone, a, undefined, { texte: 'B' });
    synchroniser(iphone, ordi);
    supprimer(iphone, b);
    const c = creerNoeud(ordi, b, undefined, { texte: 'C' });
    synchroniser(iphone, ordi);
    expect(lireArbre(iphone).parId.get(c)!.parent).toBe(a);
    verifierArbre(ordi);
  });
});

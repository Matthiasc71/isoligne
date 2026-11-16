import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import * as Y from 'yjs';
import { creerNoeud, definirEcheance, definirRappels, lireArbre } from '../../src/tree/arbre';
import { RACINE } from '../../src/data/schema';
import { instantsRappels, planifier, poserRappelsParDefaut, RAPPELS_DEFAUT, type EcheancePlan } from '../../src/time/rappels';

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 16);

describe('instants des rappels (Paris)', () => {
  it('J-7, J-1 et jour J à 9 h, en hiver', () => {
    const r = instantsRappels('2026-12-10', ['J-7', 'J-1', 'J9h']);
    expect(r.map((x) => [x.genre, iso(x.quand)])).toEqual([
      ['J-7', '2026-12-03T08:00'], ['J-1', '2026-12-09T08:00'], ['J9h', '2026-12-10T08:00'],
    ]);
  });

  it('passage à l’heure d’été (28.03.2027) : 9 h reste 9 h à Paris', () => {
    const r = instantsRappels('2027-03-30', ['J-7', 'J-1', 'J9h']);
    expect(r.map((x) => iso(x.quand))).toEqual(['2027-03-23T08:00', '2027-03-29T07:00', '2027-03-30T07:00']);
  });

  it('retour à l’heure d’hiver (31.10.2027)', () => {
    const r = instantsRappels('2027-11-01', ['J-1', 'J9h']);
    expect(r.map((x) => iso(x.quand))).toEqual(['2027-10-31T08:00', '2027-11-01T08:00']);
  });

  it('1 h avant : seulement avec une heure, en instant absolu', () => {
    expect(instantsRappels('2026-12-10', ['H-1'])).toEqual([]);
    expect(instantsRappels('2026-12-10T14:30', ['H-1']).map((x) => iso(x.quand))).toEqual(['2026-12-10T12:30']);
    // La nuit du changement d'heure : 03:30 CEST = 01:30 UTC, une heure avant = 00:30 UTC.
    expect(instantsRappels('2027-03-28T03:30', ['H-1']).map((x) => iso(x.quand))).toEqual(['2027-03-28T00:30']);
  });

  it('le jour J à 9 h est sauté si l’échéance est plus tôt ce jour-là', () => {
    expect(instantsRappels('2026-12-10T08:30', ['J9h'])).toEqual([]);
    expect(instantsRappels('2026-12-10T09:00', ['J9h'])).toEqual([]);
    expect(instantsRappels('2026-12-10T14:00', ['J9h'])).toHaveLength(1);
  });

  it('rappel personnalisé, sans doublon d’instant', () => {
    const r = instantsRappels('2026-12-10', ['J9h'], '2026-12-10T09:00');
    expect(r).toHaveLength(1);
    expect(instantsRappels('2026-12-10', [], '2026-12-05T18:15').map((x) => [x.genre, iso(x.quand)])).toEqual([['perso', '2026-12-05T17:15']]);
  });
});

describe('rappels par défaut', () => {
  it('une première échéance reçoit J-7, J-1, jour J ; un choix explicite est gardé', () => {
    poserRappelsParDefaut(RAPPELS_DEFAUT);
    const doc = new Y.Doc();
    const id = creerNoeud(doc, RACINE, 0, { texte: 'Rendu' });
    expect(lireArbre(doc).parId.get(id)!.rappels).toBeNull();
    definirEcheance(doc, id, '2026-12-10');
    expect(lireArbre(doc).parId.get(id)!.rappels).toEqual(['J-7', 'J-1', 'J9h']);
    definirRappels(doc, id, []);
    definirEcheance(doc, id, '2026-12-11');
    expect(lireArbre(doc).parId.get(id)!.rappels).toEqual([]);
  });

  it('les réglages par défaut ne s’appliquent qu’aux nouvelles échéances', () => {
    const doc = new Y.Doc();
    const a = creerNoeud(doc, RACINE, 0, { texte: 'A' });
    definirEcheance(doc, a, '2026-12-10');
    poserRappelsParDefaut(['H-1']);
    const b = creerNoeud(doc, RACINE, 1, { texte: 'B' });
    definirEcheance(doc, b, '2026-12-10T10:00');
    expect(lireArbre(doc).parId.get(a)!.rappels).toEqual(['J-7', 'J-1', 'J9h']);
    expect(lireArbre(doc).parId.get(b)!.rappels).toEqual(['H-1']);
    poserRappelsParDefaut(RAPPELS_DEFAUT);
  });
});

const ech = (o: Partial<EcheancePlan>): EcheancePlan => ({
  projetId: 'p1', projet: 'Café Orge', cible: 'n1', genre: 'noeud', titre: 'Présentation du logo',
  date: '2026-11-19', rappels: null, perso: null, ...o,
});
const LUNDI = Date.parse('2026-11-16T10:00:00Z'); // lun. 16.11, 11 h à Paris

describe('planning des notifications', () => {
  it('textes, ancre, passé exclu, horizon de 14 jours', () => {
    const n = planifier([ech({}), ech({ cible: 'n2', titre: 'Loin', date: '2027-01-20' })], { maintenant: LUNDI });
    expect(n.map((x) => [x.titre, x.texte, iso(x.quand)])).toEqual([
      ['J-1 · Présentation du logo', 'Café Orge · jeu. 19.11', '2026-11-18T08:00'],
      ['Aujourd’hui · Présentation du logo', 'Café Orge · jeu. 19.11', '2026-11-19T08:00'],
    ]);
    expect(n[0]!.url).toBe('#/p/p1?noeud=n1');
    expect(n[0]!.id).toBe('p1:n1:J-1');
  });

  it('résumé quotidien : seulement les jours qui ont quelque chose', () => {
    const n = planifier([ech({ rappels: [], date: '2026-11-15' }), ech({ cible: 'n2', rappels: [], date: '2026-11-17' })],
      { maintenant: LUNDI, resume: '08:30', horizon: 2 * 86_400_000 });
    expect(n.map((x) => [x.titre, x.texte, iso(x.quand)])).toEqual([
      ['Aujourd’hui', '1 échéance, 1 en retard', '2026-11-17T07:30'],
      ['Aujourd’hui', '2 en retard', '2026-11-18T07:30'],
    ]);
    expect(planifier([], { maintenant: LUNDI, resume: '08:30' })).toEqual([]);
  });

  it('déterministe : le même plan sur chaque appareil, quel que soit l’ordre', () => {
    const dates = fc.array(fc.record({
      j: fc.integer({ min: 0, max: 20 }), h: fc.option(fc.integer({ min: 0, max: 23 }), { nil: null }),
    }), { maxLength: 8 });
    fc.assert(fc.property(dates, (ds) => {
      const liste = ds.map((d, i) => {
        const jour = new Date(LUNDI + d.j * 86_400_000).toISOString().slice(0, 10);
        return ech({ cible: `n${i}`, date: d.h === null ? jour : `${jour}T${String(d.h).padStart(2, '0')}:00`, rappels: ['J-1', 'J9h', 'H-1'] });
      });
      const a = planifier(liste, { maintenant: LUNDI, resume: '08:30' });
      const b = planifier([...liste].reverse(), { maintenant: LUNDI, resume: '08:30' });
      expect(b).toEqual(a);
      expect(a.every((x) => x.quand > LUNDI && x.quand <= LUNDI + 14 * 86_400_000)).toBe(true);
    }), { numRuns: 100 });
  });
});

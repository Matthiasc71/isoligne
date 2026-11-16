import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { ajouterJours, ajouterMois, debutSemaine, deplacerDate, grilleMois, joursSemaine, rangDansSemaine } from '../../src/time/calendrier';

describe('calendrier', () => {
  it('novembre 2026 : 6 semaines, du lun. 26.10 au dim. 06.12 (maquette)', () => {
    const g = grilleMois('2026-11-19');
    expect(g).toHaveLength(6);
    expect(g[0]![0]).toBe('2026-10-26');
    expect(g[5]![6]).toBe('2026-12-06');
  });

  it('février 2027 commence un lundi : 4 semaines exactement', () => {
    const g = grilleMois('2027-02-10');
    expect(g).toHaveLength(4);
    expect(g[0]![0]).toBe('2027-02-01');
    expect(g[3]![6]).toBe('2027-02-28');
  });

  it('semaine du lundi au dimanche, y compris au passage d’année et d’heure', () => {
    expect(rangDansSemaine('2026-11-16')).toBe(0);
    expect(joursSemaine('2027-01-01')).toEqual(['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
    expect(ajouterJours('2027-03-27', 2)).toBe('2027-03-29');
  });

  it('mois suivant borné à la fin du mois', () => {
    expect(ajouterMois('2027-01-31', 1)).toBe('2027-02-28');
    expect(ajouterMois('2026-12-15', 1)).toBe('2027-01-15');
    expect(ajouterMois('2026-01-15', -1)).toBe('2025-12-15');
  });

  it('replanifier garde l’heure', () => {
    expect(deplacerDate('2026-11-19T14:30', '2026-11-24')).toBe('2026-11-24T14:30');
    expect(deplacerDate('2026-11-19', '2026-11-24')).toBe('2026-11-24');
  });

  it('propriété : chaque jour du mois apparaît une fois, dans des semaines commençant le lundi', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 3650 }), (n) => {
      const d = ajouterJours('2024-01-01', n);
      const g = grilleMois(d);
      const jours = g.flat();
      expect(new Set(jours).size).toBe(jours.length);
      expect(g.every((s) => rangDansSemaine(s[0]!) === 0 && s.length === 7)).toBe(true);
      const duMois = jours.filter((j) => j.slice(0, 7) === d.slice(0, 7));
      expect(duMois[0]!.slice(8)).toBe('01');
      expect(debutSemaine(d) <= d).toBe(true);
    }));
  });
});

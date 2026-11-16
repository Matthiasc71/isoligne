import { describe, expect, it } from 'vitest';
import {
  aujourdhui, compteARebours, dateCourte, dateJour, dateParlee, enRetard, enteteDuJour, instant, joursRestants,
} from '../../src/time/dates';

// Lundi 16 novembre 2026, 10 h à Paris (UTC+1).
const LUNDI = Date.UTC(2026, 10, 16, 9, 0);

describe('dates françaises (Europe/Paris)', () => {
  it('formate comme la spec', () => {
    expect(dateJour('2026-11-19', LUNDI)).toBe('jeu. 19.11');
    expect(dateJour('2026-11-19T14:30', LUNDI)).toBe('jeu. 19.11 14:30');
    expect(dateCourte('2027-02-26', LUNDI)).toBe('26.02.27');
    expect(enteteDuJour(LUNDI)).toBe('LUN 16.11');
    expect(dateParlee('2026-11-19')).toBe('jeudi 19 novembre');
  });

  it('compte les jours calendaires', () => {
    expect(compteARebours('2026-11-19', LUNDI)).toBe('J-3');
    expect(compteARebours('2026-11-16', LUNDI)).toBe('J-0');
    expect(compteARebours('2026-11-14', LUNDI)).toBe('J+2');
    expect(enRetard('2026-11-15', LUNDI)).toBe(true);
    expect(enRetard('2026-11-16', LUNDI)).toBe(false);
    expect(enRetard('2026-11-16T09:00', LUNDI)).toBe(true);
  });

  it('reste juste autour du passage à l’heure d’été et d’hiver', () => {
    // 29.03.2026 : 2 h → 3 h. 25.10.2026 : 3 h → 2 h.
    const avantEte = Date.UTC(2026, 2, 28, 22, 30); // 28.03, 23 h 30 à Paris
    expect(aujourdhui(avantEte)).toBe('2026-03-28');
    expect(joursRestants('2026-03-30', avantEte)).toBe(2);
    const apresEte = Date.UTC(2026, 2, 29, 22, 30); // 30.03, 0 h 30 à Paris (UTC+2)
    expect(aujourdhui(apresEte)).toBe('2026-03-30');
    expect(joursRestants('2026-03-30', apresEte)).toBe(0);
    expect(instant('2026-03-29T03:00') - instant('2026-03-29T01:00')).toBe(3_600_000);
    expect(instant('2026-10-25T04:00') - instant('2026-10-25T01:00')).toBe(4 * 3_600_000);
    expect(aujourdhui(Date.UTC(2026, 9, 25, 23, 30))).toBe('2026-10-26');
  });
});

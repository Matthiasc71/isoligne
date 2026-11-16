import type { DateLocale } from '../data/schema';

/** Arithmétique de jours calendaires (`AAAA-MM-JJ`), indépendante du fuseau. */

const JOUR = 86_400_000;
const versMs = (d: DateLocale) => {
  const [a, m, j] = d.slice(0, 10).split('-').map(Number) as [number, number, number];
  return Date.UTC(a, m - 1, j);
};
const depuisMs = (ms: number): DateLocale => new Date(ms).toISOString().slice(0, 10);

export const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'] as const;
export const INITIALES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

export function ajouterJours(d: DateLocale, n: number): DateLocale {
  return depuisMs(versMs(d) + n * JOUR);
}

/** 0 = lundi … 6 = dimanche. */
export function rangDansSemaine(d: DateLocale): number {
  return (new Date(versMs(d)).getUTCDay() + 6) % 7;
}

export function debutSemaine(d: DateLocale): DateLocale {
  return ajouterJours(d, -rangDansSemaine(d));
}

export function debutMois(d: DateLocale): DateLocale {
  return `${d.slice(0, 7)}-01`;
}

/** Même jour (borné à la fin du mois) `n` mois plus tard. */
export function ajouterMois(d: DateLocale, n: number): DateLocale {
  const [a, m, j] = d.slice(0, 10).split('-').map(Number) as [number, number, number];
  const fin = new Date(Date.UTC(a, m - 1 + n + 1, 0)).getUTCDate();
  return depuisMs(Date.UTC(a, m - 1 + n, Math.min(j, fin)));
}

export function memeMois(a: DateLocale, b: DateLocale): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/** Semaines (lundi → dimanche) qui couvrent le mois de `d` : 4 à 6 lignes de 7 jours. */
export function grilleMois(d: DateLocale): DateLocale[][] {
  const premier = debutMois(d);
  const dernier = ajouterJours(ajouterMois(premier, 1), -1);
  const semaines: DateLocale[][] = [];
  for (let lundi = debutSemaine(premier); lundi <= dernier; lundi = ajouterJours(lundi, 7)) {
    semaines.push(Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i)));
  }
  return semaines;
}

export function joursSemaine(d: DateLocale): DateLocale[] {
  const lundi = debutSemaine(d);
  return Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i));
}

/** Nouvelle date d'une échéance déplacée sur `jour` : l'heure éventuelle est gardée. */
export function deplacerDate(ancienne: DateLocale, jour: DateLocale): DateLocale {
  return `${jour.slice(0, 10)}${ancienne.slice(10)}`;
}

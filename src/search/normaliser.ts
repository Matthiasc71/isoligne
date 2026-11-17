/** Insensible aux accents et à la casse (sans dépendance : utilisable partout). */
export function normaliser(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

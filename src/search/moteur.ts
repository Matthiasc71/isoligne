import MiniSearch, { type SearchResult } from 'minisearch';
import { enRetard } from '../time/dates';
import type { Nature, TexteCherchable } from './textes';

/** Insensible aux accents et à la casse. */
export function normaliser(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export type Filtre = 'texte' | 'taches' | 'croquis' | 'liens' | 'retard';

export const FILTRES: { valeur: Filtre; libelle: string }[] = [
  { valeur: 'texte', libelle: 'Texte' },
  { valeur: 'taches', libelle: 'Tâches' },
  { valeur: 'croquis', libelle: 'Croquis' },
  { valeur: 'liens', libelle: 'Liens' },
  { valeur: 'retard', libelle: 'En retard' },
];

const NATURES_TEXTE: readonly Nature[] = ['projet', 'branche', 'note', 'texte', 'echeance'];

export function passeFiltre(t: TexteCherchable, f: Filtre, maintenant: number): boolean {
  switch (f) {
    case 'texte': return NATURES_TEXTE.includes(t.nature);
    case 'taches': return t.tache;
    case 'croquis': return t.nature === 'croquis';
    case 'liens': return t.nature === 'lien';
    case 'retard': return Boolean(t.date) && !t.fait && enRetard(t.date!, maintenant);
  }
}

/** Index MiniSearch : préfixes pendant la frappe, une faute légère tolérée, tous les mots requis. */
export function creerIndex(textes: readonly TexteCherchable[]): MiniSearch<TexteCherchable> {
  const m = new MiniSearch<TexteCherchable>({
    fields: ['texte', 'repere'],
    storeFields: ['projetId', 'cible', 'genre', 'nature', 'repere', 'texte', 'tache', 'fait', 'date'],
    processTerm: (t) => normaliser(t),
    searchOptions: {
      prefix: true,
      fuzzy: (terme) => (terme.length >= 5 ? 0.2 : terme.length >= 4 ? 1 : 0),
      combineWith: 'AND',
      boost: { texte: 2 },
    },
  });
  m.addAll(textes);
  return m;
}

export type Resultat = TexteCherchable & { score: number; termes: string[] };

export function chercher(index: MiniSearch<TexteCherchable>, requete: string, filtres: readonly Filtre[], maintenant: number): Resultat[] {
  const q = requete.trim();
  if (!q) return [];
  return index.search(q).flatMap((r: SearchResult) => {
    const t = r as unknown as TexteCherchable;
    if (filtres.length && !filtres.every((f) => passeFiltre(t, f, maintenant))) return [];
    return [{ ...t, score: r.score, termes: [...r.terms, ...r.queryTerms] }];
  });
}

/** Regroupe par projet, dans l'ordre du meilleur résultat de chaque projet. */
export function grouper(res: readonly Resultat[]): { projetId: string; resultats: Resultat[] }[] {
  const m = new Map<string, Resultat[]>();
  for (const r of res) m.set(r.projetId, [...(m.get(r.projetId) ?? []), r]);
  return [...m].map(([projetId, resultats]) => ({ projetId, resultats }));
}

export interface Segment { texte: string; trouve: boolean }

/**
 * Extrait d'environ `largeur` caractères autour du premier mot trouvé, découpé
 * en segments ; un mot est « trouvé » si sa forme normalisée commence par un terme.
 */
export function extrait(texte: string, termes: readonly string[], largeur = 90): Segment[] {
  const plat = texte.replace(/\s+/g, ' ').trim();
  const t = [...new Set(termes.map(normaliser).filter(Boolean))];
  const mots = plat.split(/([\p{L}\p{N}]+)/u);
  const estTrouve = (m: string) => /[\p{L}\p{N}]/u.test(m) && t.some((x) => normaliser(m).startsWith(x));
  // Position (en caractères) du premier mot trouvé.
  let pos = 0;
  let premier = -1;
  for (const m of mots) { if (premier < 0 && estTrouve(m)) premier = pos; pos += m.length; }
  let debut = 0;
  let fin = plat.length;
  if (plat.length > largeur) {
    debut = Math.max(0, Math.min(premier < 0 ? 0 : premier - Math.floor(largeur / 3), plat.length - largeur));
    fin = debut + largeur;
  }
  const segments: Segment[] = [];
  pos = 0;
  for (const m of mots) {
    const a = pos;
    const b = pos + m.length;
    pos = b;
    if (b <= debut || a >= fin) continue;
    const morceau = m.slice(Math.max(0, debut - a), m.length - Math.max(0, b - fin));
    const trouve = estTrouve(m) && morceau.length === m.length;
    const dernier = segments[segments.length - 1];
    if (dernier && dernier.trouve === trouve && !trouve) dernier.texte += morceau;
    else segments.push({ texte: morceau, trouve });
  }
  if (debut > 0) segments.unshift({ texte: '…', trouve: false });
  if (fin < plat.length) segments.push({ texte: '…', trouve: false });
  return segments.filter((s) => s.texte);
}

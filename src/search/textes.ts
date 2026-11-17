import * as Y from 'yjs';
import { lireBlocs } from '../data/projet';
import { lireMeta, type DateLocale } from '../data/schema';
import { lireArbre, numero } from '../tree/arbre';
import { numerosFigures } from '../media/croquis';

/** Nature d'un texte cherchable (filtres de la recherche). */
export type Nature = 'projet' | 'branche' | 'note' | 'texte' | 'echeance' | 'croquis' | 'lien';

export interface TexteCherchable {
  /** `${projetId}:${cible}:${nature}` */
  id: string;
  projetId: string;
  /** Nœud ou bloc à ouvrir ('' pour le projet). */
  cible: string;
  genre: 'noeud' | 'bloc' | 'projet';
  nature: Nature;
  /** Repère affiché en cote : « 1.2 », « FIG. 2 », « exemple.fr »… */
  repere: string;
  texte: string;
  tache: boolean;
  fait: boolean;
  date: DateLocale | null;
}

/** Texte brut d'un fragment riche (TipTap) : un paragraphe par ligne. */
export function texteRiche(f: Y.XmlFragment | Y.XmlElement): string {
  const parts: string[] = [];
  const parcourir = (n: Y.XmlFragment | Y.XmlElement | Y.XmlText) => {
    if (n instanceof Y.XmlText) { parts.push(n.toString().replace(/<[^>]+>/g, '')); return; }
    const avant = parts.length;
    for (const e of n.toArray()) parcourir(e as Y.XmlElement | Y.XmlText);
    if (n instanceof Y.XmlElement && parts.length > avant) parts.push('\n');
  };
  parcourir(f);
  return parts.join('').replace(/\n{2,}/g, '\n').trim();
}

const texteDe = (v: unknown): string => (v instanceof Y.Text ? v.toString() : typeof v === 'string' ? v : '');

/** Tout ce qu'un projet contient de cherchable. */
export function textesDuProjet(projetId: string, doc: Y.Doc): TexteCherchable[] {
  const res: TexteCherchable[] = [];
  const ajouter = (t: Omit<TexteCherchable, 'id' | 'projetId'>) => {
    if (t.texte.trim()) res.push({ ...t, id: `${projetId}:${t.cible}:${t.nature}`, projetId });
  };
  const base = { tache: false, fait: false, date: null };
  ajouter({ ...base, cible: '', genre: 'projet', nature: 'projet', repere: 'Projet', texte: lireMeta(doc).titre });

  const arbre = lireArbre(doc);
  for (const n of arbre.parId.values()) {
    const num = numero(arbre, n.id);
    ajouter({ cible: n.id, genre: 'noeud', nature: 'branche', repere: num, texte: n.texte, tache: n.tache, fait: n.fait, date: n.echeance });
    const note = doc.getMap<Y.Map<unknown>>('noeuds').get(n.id)?.get('note');
    if (note instanceof Y.XmlFragment) {
      ajouter({ ...base, cible: n.id, genre: 'noeud', nature: 'note', repere: `${num} · note`, texte: texteRiche(note) });
    }
  }

  const blocs = lireBlocs(doc);
  const figures = numerosFigures(blocs);
  for (const b of blocs) {
    if (b.type === 'texte') {
      const f = b.y.get('contenu');
      if (f instanceof Y.XmlFragment) ajouter({ ...base, cible: b.id, genre: 'bloc', nature: 'texte', repere: 'Texte', texte: texteRiche(f) });
    } else if (b.type === 'echeance') {
      ajouter({
        cible: b.id, genre: 'bloc', nature: 'echeance', repere: 'Échéance', texte: texteDe(b.y.get('titre')),
        tache: true, fait: Boolean(b.y.get('fait')), date: (b.y.get('date') as string | null) ?? null,
      });
    } else if (b.type === 'croquis') {
      ajouter({ ...base, cible: b.id, genre: 'bloc', nature: 'croquis', repere: `FIG. ${figures.get(b.id) ?? 1}`, texte: texteDe(b.y.get('legende')) });
    } else if (b.type === 'lien') {
      const site = texteDe(b.y.get('site'));
      const texte = [texteDe(b.y.get('titre')), texteDe(b.y.get('description')), texteDe(b.y.get('url'))].filter(Boolean).join('\n');
      ajouter({ ...base, cible: b.id, genre: 'bloc', nature: 'lien', repere: site ? `Lien · ${site}` : 'Lien', texte });
    }
  }
  return res;
}

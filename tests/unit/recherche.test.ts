import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { creerBloc, initialiserProjet } from '../../src/data/projet';
import { blocs } from '../../src/data/schema';
import { creerNoeud, definirEcheance, noteDe, basculerTache } from '../../src/tree/arbre';
import { RACINE } from '../../src/data/schema';
import { chercher, creerIndex, extrait, grouper } from '../../src/search/moteur';
import { textesDuProjet } from '../../src/search/textes';

function projet(): Y.Doc {
  const doc = new Y.Doc();
  initialiserProjet(doc, { titre: 'Mémoire M2', type: 'pro', couleur: 'lilas', calque: 2 });
  const a = creerNoeud(doc, RACINE, 0, { texte: 'Bibliographie' });
  const b = creerNoeud(doc, a, 0, { texte: 'Lire Bachelard, la poétique de l’espace' });
  basculerTache(doc, b);
  definirEcheance(doc, b, '2026-11-10');
  const note = noteDe(doc, a)!;
  const p = new Y.XmlElement('paragraph');
  p.insert(0, [new Y.XmlText('Chercher les éditions de poche.')]);
  note.insert(0, [p]);
  const t = creerBloc(doc, 'texte');
  const pt = new Y.XmlElement('paragraph');
  pt.insert(0, [new Y.XmlText('Le scénario du plan détaillé avance.')]);
  (blocs(doc).get(t)!.get('contenu') as Y.XmlFragment).insert(0, [pt]);
  const c = creerBloc(doc, 'croquis');
  (blocs(doc).get(c)!.get('legende') as Y.Text).insert(0, 'Schéma des chapitres');
  const l = creerBloc(doc, 'lien');
  blocs(doc).get(l)!.set('url', 'https://exemple.fr/espace');
  blocs(doc).get(l)!.set('titre', 'Archives de l’espace');
  blocs(doc).get(l)!.set('site', 'exemple.fr');
  return doc;
}

const MAINTENANT = Date.parse('2026-11-17T10:00:00Z');

describe('recherche plein texte', () => {
  const textes = textesDuProjet('p1', projet());
  const index = creerIndex(textes);
  const q = (s: string, f: Parameters<typeof chercher>[2] = []) => chercher(index, s, f, MAINTENANT);

  it('extrait branches (avec numéro), notes, textes, légendes, liens', () => {
    const paires = textes.map((t) => [t.nature, t.repere]);
    for (const p of [['projet', 'Projet'], ['branche', '1'], ['branche', '1.1'], ['note', '1 · note'], ['texte', 'Texte'], ['croquis', 'FIG. 1'], ['lien', 'Lien · exemple.fr']]) {
      expect(paires).toContainEqual(p);
    }
    expect(textes.find((t) => t.repere === '1.1')).toMatchObject({ tache: true, date: '2026-11-10' });
    expect(textes.find((t) => t.nature === 'note')?.texte).toBe('Chercher les éditions de poche.');
  });

  it('insensible aux accents et à la casse, par préfixe, avec une faute légère', () => {
    expect(q('memoire').map((r) => r.nature)).toContain('projet');
    expect(q('POETIQUE')[0]?.repere).toBe('1.1');
    expect(q('bibli')[0]?.texte).toBe('Bibliographie');
    expect(q('scenarion').map((r) => r.nature)).toContain('texte');
    expect(q('schema chapitres')[0]?.repere).toBe('FIG. 1');
    expect(q('poche')[0]?.nature).toBe('note');
  });

  it('filtres : tâches, croquis, liens, en retard', () => {
    expect(q('espace', ['liens']).map((r) => r.nature)).toEqual(['lien']);
    expect(q('espace', ['taches']).map((r) => r.repere)).toEqual(['1.1']);
    expect(q('lire', ['retard']).map((r) => r.repere)).toEqual(['1.1']);
    expect(q('schema', ['texte'])).toEqual([]);
  });

  it('groupes par projet ; extrait centré, mots trouvés marqués', () => {
    const g = grouper(q('espace'));
    expect(g).toHaveLength(1);
    const s = extrait('Une très longue introduction qui ne parle de rien du tout avant enfin la poétique de l’espace chez Bachelard, puis la suite.', ['poetique'], 50);
    expect(s[0]!.texte).toBe('…');
    expect(s.filter((x) => x.trouve).map((x) => x.texte)).toEqual(['poétique']);
    expect(s.map((x) => x.texte).join('').length).toBeLessThanOrEqual(56);
  });
});

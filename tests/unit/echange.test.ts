// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import * as Y from 'yjs';
import { initialiserProjet } from '../../src/data/projet';
import { COULEURS, type Rappel } from '../../src/data/schema';
import { depuisMarkdown, versMarkdown } from '../../src/echange/markdown';
import { depuisOpml, versOpml } from '../../src/echange/opml';
import { ecrireProjet, lireProjet, noeudVide, type NoeudEch, type ProjetEch } from '../../src/echange/projet';

function doc(p: ProjetEch): Y.Doc {
  const d = new Y.Doc();
  initialiserProjet(d, { titre: p.titre, type: p.type, couleur: p.couleur, calque: 1 });
  ecrireProjet(d, p);
  return d;
}

/** Liens libres comparés comme un ensemble (leur ordre suit des identifiants aléatoires). */
const norm = (p: ProjetEch) => ({ ...p, liens: [...p.liens].sort((a, b) => `${a.de}>${a.vers}`.localeCompare(`${b.de}>${b.vers}`)) });

const EXEMPLE: ProjetEch = {
  titre: 'Marée basse', type: 'creatif', couleur: 'orange', statut: 'en-cours', epingle: true, fin: '2027-03-01',
  arbre: [
    noeudVide('Écriture', {
      couleur: 'ciel', note: 'Ton : **sec**, _lumineux_.\n\n- pas de voix off',
      enfants: [
        noeudVide('Synopsis @ envoyer {vite} [brouillon] <ok>', { tache: true, fait: true }),
        noeudVide('Scénario', { tache: true, echeance: '2026-12-01T14:30', rappels: ['J-1', 'H-1'], perso: '2026-11-28T18:00' }),
      ],
    }),
    noeudVide('Tournage', { echeance: '2027-01-15', replie: true, enfants: [noeudVide('Plage')] }),
    noeudVide('- pas une liste\\n # ni un titre'),
  ],
  blocs: [
    { type: 'texte', md: '## Intentions\n\nUn film **court** sur [la marée](https://exemple.fr/m%C3%A9e).' },
    { type: 'arbre' },
    { type: 'echeance', titre: 'Dépôt CNC', date: '2027-02-01', fait: false, rappels: null, perso: null },
    { type: 'separateur' },
    { type: 'lien', url: 'https://exemple.fr/a(b)', titre: 'Archives [INA]', site: 'exemple.fr', description: 'Images -- d’archives' },
    { type: 'croquis', legende: 'Plan --> large', couverture: true, traits: [{ id: 't1', p: [0.1, 0.2, 0.5, 0.3, 0.4, 0.6], e: 2, c: 'trait' }] },
  ],
  liens: [{ de: '1.2', vers: '2.1', libelle: 'repérer avant', style: 'trait' }],
};

describe('échange : Markdown', () => {
  it('projet complet : aller-retour sans perte', () => {
    const a = lireProjet(doc(EXEMPLE));
    const md = versMarkdown(a);
    expect(md).toContain('# Marée basse');
    expect(md).toContain('- [x] Synopsis \\@ envoyer \\{vite} \\[brouillon] \\<ok>');
    expect(md).toContain('- [ ] Scénario @2026-12-01T14:30 <!-- rappels:J-1,H-1 perso:2026-11-28T18:00 -->');
    expect(md).not.toMatch(/--(?!>)[^\n]*-->[^\n]*-->/);
    const b = lireProjet(doc(depuisMarkdown(md)));
    expect(norm(b)).toEqual(norm(a));
  });

  it('Markdown quelconque : titre, listes → arborescence, cases, le reste en texte', () => {
    const p = depuisMarkdown('# Courses\n\nPour samedi.\n\n* Pain\n    * Complet\n- [x] Lait\n+ Œufs\n');
    expect(p.titre).toBe('Courses');
    expect(p.arbre.map((n) => n.texte)).toEqual(['Pain', 'Lait', 'Œufs']);
    expect(p.arbre[0]!.enfants[0]!.texte).toBe('Complet');
    expect(p.arbre[1]).toMatchObject({ tache: true, fait: true });
    expect(p.blocs).toEqual([{ type: 'arbre' }, { type: 'texte', md: 'Pour samedi.' }]);
  });
});

describe('échange : OPML', () => {
  it('arborescence, notes, tâches, dates, couleurs, rappels, liens libres', () => {
    const a = lireProjet(doc(EXEMPLE));
    const xml = versOpml(a);
    const b = lireProjet(doc(depuisOpml(xml)));
    expect(norm({ ...b, blocs: [] })).toEqual(norm({ ...a, blocs: [] }));
  });

  it('OPML d’un autre outil (Workflowy, OmniOutliner)', () => {
    const p = depuisOpml(`<?xml version="1.0"?><opml version="2.0"><head><title>Idées</title></head><body>
      <outline text="Lire" _note="Deux livres"><outline text="Bachelard" _complete="true"/></outline></body></opml>`);
    expect(p.titre).toBe('Idées');
    expect(p.arbre[0]).toMatchObject({ texte: 'Lire', note: 'Deux livres' });
    expect(p.arbre[0]!.enfants[0]).toMatchObject({ texte: 'Bachelard', tache: true, fait: true });
    expect(() => depuisOpml('<html/>')).toThrow();
  });
});

// ───────────── Propriétés : arbres aléatoires, caractères piégeux ─────────────

const CARACTERES = [...'ab é@{}[]<>\\-*_#`~!1.>\n'];
const texte = fc.string({ unit: fc.constantFrom(...CARACTERES), maxLength: 14 });
const date = fc.option(fc.tuple(fc.integer({ min: 1, max: 28 }), fc.boolean()).map(([j, h]) => `2027-02-${String(j).padStart(2, '0')}${h ? 'T09:30' : ''}`), { nil: null });
const rappels = fc.option(fc.subarray(['J-7', 'J-1', 'J9h', 'H-1'] as Rappel[]), { nil: null });
const note = fc.option(fc.array(fc.string({ unit: fc.constantFrom(...'ab *_`-#>1. '), minLength: 1, maxLength: 12 }), { minLength: 1, maxLength: 3 }).map((ps) => ps.join('\n\n')), { nil: '' });

const noeud: fc.Memo<NoeudEch> = fc.memo((n) => fc.record({
  texte, tache: fc.boolean(), fait: fc.boolean(), echeance: date, rappels, perso: date, replie: fc.boolean(),
  couleur: fc.option(fc.constantFrom(...COULEURS), { nil: null }), note,
  enfants: n > 1 ? fc.array(noeud(n - 1), { maxLength: 3 }) : fc.constant([]),
}).map((x) => ({ ...x, fait: x.tache && x.fait })));

const projet = fc.record({ arbre: fc.array(noeud(3), { minLength: 1, maxLength: 4 }), titre: texte.map((t) => t.replace(/\n/g, ' ').trim() || 'Projet') })
  .map(({ arbre, titre }): ProjetEch => ({ ...EXEMPLE, titre, arbre, liens: [] }));

describe('échange : propriétés', () => {
  it('Markdown : tout projet revient identique', () => {
    fc.assert(fc.property(projet, (p) => {
      const a = lireProjet(doc(p));
      expect(norm(lireProjet(doc(depuisMarkdown(versMarkdown(a)))))).toEqual(norm(a));
    }), { numRuns: 150 });
  });

  it('OPML : toute arborescence revient identique', () => {
    fc.assert(fc.property(projet, (p) => {
      const a = lireProjet(doc(p));
      const b = lireProjet(doc(depuisOpml(versOpml(a))));
      expect({ ...b, blocs: [] }).toEqual({ ...a, blocs: [] });
    }), { numRuns: 150 });
  });
});

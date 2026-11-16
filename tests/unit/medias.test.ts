import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { creerBloc, lireBlocs } from '../../src/data/projet';
import { blocs } from '../../src/data/schema';
import {
  ajouterTrait, cheminTrait, compacter, effacerTout, gommer, mettreEnCouverture, numerosFigures, traitsDe,
} from '../../src/media/croquis';
import { normaliserUrl, poserApercu, poserUrl, siteDe } from '../../src/media/lien';

const ligne = (x0: number, x1: number, y = 100) =>
  Array.from({ length: 12 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / 11, y, pression: 0.5 }));

describe('croquis', () => {
  it('ajoute des traits compacts, gomme ceux qu’on touche, efface tout', () => {
    const doc = new Y.Doc();
    const id = creerBloc(doc, 'croquis');
    ajouterTrait(doc, id, ligne(10, 300), 2, 'trait');
    ajouterTrait(doc, id, ligne(500, 900, 300), 1, 'redline');
    const traits = traitsDe(blocs(doc).get(id)!)!;
    expect(traits.length).toBe(2);
    expect(traits.get(0).p).toHaveLength(36);
    expect(gommer(doc, id, 150, 102)).toBe(1);
    expect(traits.length).toBe(1);
    expect(traits.get(0).c).toBe('redline');
    effacerTout(doc, id);
    expect(traits.length).toBe(0);
  });

  it('borne et arrondit les points à l’espace 1000 × 400', () => {
    expect(compacter([{ x: -5, y: 1234.567, pression: 0.4567 }])).toEqual([0, 400, 0.46]);
  });

  it('trace un contour SVG fermé, même pour un point', () => {
    const d = cheminTrait({ p: compacter(ligne(10, 300)), e: 2 });
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(cheminTrait({ p: [50, 50, 0.5], e: 1 })).toMatch(/^M.*Z$/);
  });

  it('un seul croquis de couverture ; FIG. n suit l’ordre des croquis', () => {
    const doc = new Y.Doc();
    const a = creerBloc(doc, 'croquis');
    creerBloc(doc, 'texte');
    const b = creerBloc(doc, 'croquis');
    mettreEnCouverture(doc, a, true);
    mettreEnCouverture(doc, b, true);
    expect(blocs(doc).get(a)!.get('couverture')).toBe(false);
    expect(blocs(doc).get(b)!.get('couverture')).toBe(true);
    const fig = numerosFigures(lireBlocs(doc));
    expect(fig.get(a)).toBe(1);
    expect(fig.get(b)).toBe(2);
  });

  it('deux appareils qui dessinent hors ligne gardent tous les traits', () => {
    const iphone = new Y.Doc();
    const id = creerBloc(iphone, 'croquis');
    const ordi = new Y.Doc();
    Y.applyUpdate(ordi, Y.encodeStateAsUpdate(iphone));
    ajouterTrait(iphone, id, ligne(0, 100), 1, 'trait');
    ajouterTrait(ordi, id, ligne(200, 300), 3, 'calque');
    Y.applyUpdate(ordi, Y.encodeStateAsUpdate(iphone));
    Y.applyUpdate(iphone, Y.encodeStateAsUpdate(ordi));
    expect(traitsDe(blocs(iphone).get(id)!)!.toJSON()).toEqual(traitsDe(blocs(ordi).get(id)!)!.toJSON());
    expect(traitsDe(blocs(iphone).get(id)!)!.length).toBe(2);
  });
});

describe('liens', () => {
  it('normalise les adresses et refuse le reste', () => {
    expect(normaliserUrl('exemple.fr/page')).toBe('https://exemple.fr/page');
    expect(normaliserUrl('  https://www.exemple.fr  ')).toBe('https://www.exemple.fr/');
    expect(normaliserUrl('javascript:alert(1)')).toBeNull();
    expect(normaliserUrl('pas une adresse')).toBeNull();
    expect(normaliserUrl('motseul')).toBeNull();
    expect(siteDe('https://www.exemple.fr/a')).toBe('exemple.fr');
  });

  it('garde l’adresse en attente, puis l’aperçu en texte seul', () => {
    const doc = new Y.Doc();
    const id = creerBloc(doc, 'lien');
    poserUrl(doc, id, 'https://exemple.fr/');
    const y = blocs(doc).get(id)!;
    expect(y.get('etat')).toBe('attente');
    expect(y.get('site')).toBe('exemple.fr');
    poserApercu(doc, id, { url: 'https://exemple.fr/', titre: 'Exemple', site: 'Exemple', description: 'Une page.' });
    expect(y.get('etat')).toBe('ok');
    expect(y.get('titre')).toBe('Exemple');
    poserApercu(doc, id, null);
    expect(y.get('etat')).toBe('echec');
  });
});

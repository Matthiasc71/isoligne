import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { initialiserProjet } from '../../src/data/projet';
import { ecrireProjet, lireProjet } from '../../src/echange/projet';
import { MODELES, projetDepuisModele } from '../../src/echange/modeles';

describe('modèles de départ', () => {
  it('chaque modèle crée son arborescence ; les actions sont des tâches ; aucune date', () => {
    for (const m of MODELES) {
      const p = projetDepuisModele(m.cle, 'Essai', m.type, 'ciel');
      const d = new Y.Doc();
      initialiserProjet(d, { titre: 'Essai', type: m.type, couleur: 'ciel', calque: 1 });
      ecrireProjet(d, p);
      const lu = lireProjet(d);
      expect(lu.arbre.map((n) => n.texte)).toEqual(m.arbre.map((n) => n.texte));
      expect(JSON.stringify(lu)).not.toMatch(/"echeance":"\d/);
    }
    const client = lireProjet((() => { const d = new Y.Doc(); initialiserProjet(d, { titre: 'C', type: 'pro', couleur: 'ciel', calque: 1 }); ecrireProjet(d, projetDepuisModele('client', 'C', 'pro', 'ciel')); return d; })());
    expect(client.arbre.find((n) => n.texte === 'Devis')).toMatchObject({ tache: true, fait: false });
    expect(client.arbre.find((n) => n.texte === 'Brief')).toMatchObject({ tache: false });
  });
});

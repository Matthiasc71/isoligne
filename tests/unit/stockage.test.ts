import { afterEach, describe, expect, it } from 'vitest';
import { Stockage } from '../../src/data/stockage';
import { creerNoeud, basculerFait, definirEcheance } from '../../src/tree/arbre';
import { creerBloc, poserBloc, texteBloc } from '../../src/data/projet';
import { RACINE } from '../../src/data/schema';

let n = 0;
const ouverts: Stockage[] = [];
function nouveau(prefixe = `test-${++n}`): Stockage {
  const s = new Stockage(prefixe);
  ouverts.push(s);
  return s;
}
afterEach(async () => { while (ouverts.length) await ouverts.pop()!.fermer(); });

describe('stockage local', () => {
  it('crée un projet, numérote les calques et indexe le résumé', async () => {
    const s = nouveau();
    const id1 = await s.creerProjet({ titre: 'Marée basse', type: 'creatif', couleur: 'orange' });
    const id2 = await s.creerProjet({ titre: 'Café Orge', type: 'pro', couleur: 'vert-deau' });
    const p1 = await s.index.projets.get(id1);
    const p2 = await s.index.projets.get(id2);
    expect(p1?.calque).toBe(1);
    expect(p2?.calque).toBe(2);
    expect(p1?.titre).toBe('Marée basse');
  });

  it('indexe les échéances des nœuds et des blocs, la plus urgente en tête', async () => {
    const s = nouveau();
    const id = await s.creerProjet({ titre: 'Café Orge', type: 'pro', couleur: 'vert-deau' });
    const { doc } = s.ouvrir(id);
    const t = creerNoeud(doc, RACINE, undefined, { texte: 'Présentation du logo', tache: true, echeance: '2026-11-19' });
    const fait = creerNoeud(doc, RACINE, undefined, { texte: 'Brief', tache: true, echeance: '2026-11-10' });
    basculerFait(doc, fait);
    const b = creerBloc(doc, 'echeance');
    texteBloc(doc, b, 'Livraison');
    poserBloc(doc, b, 'date', '2026-12-01');
    await s.indexer(id, doc);
    const p = await s.index.projets.get(id);
    expect(p?.prochaine?.titre).toBe('Présentation du logo');
    expect(p?.prochaineDate).toBe('2026-11-19');
    expect(p?.faites).toBe(1);
    expect(p?.total).toBe(2);
    const ech = await s.index.echeances.where('projetId').equals(id).sortBy('date');
    expect(ech.map((e) => e.titre)).toEqual(['Présentation du logo', 'Livraison']);
    definirEcheance(doc, t, null);
    await s.indexer(id, doc);
    expect((await s.index.projets.get(id))?.prochaine?.titre).toBe('Livraison');
  });

  it('retrouve les données après redémarrage (hors ligne, IndexedDB)', async () => {
    const prefixe = `persist-${++n}`;
    const s1 = new Stockage(prefixe);
    const id = await s1.creerProjet({ titre: 'Déménagement', type: 'perso', couleur: 'ocre' });
    creerNoeud(s1.ouvrir(id).doc, RACINE, undefined, { texte: 'Cartons' });
    await new Promise((r) => setTimeout(r, 50));
    await s1.fermer();

    const s2 = nouveau(prefixe);
    await s2.espacePret;
    expect(s2.idsProjets()).toEqual([id]);
    const p = s2.ouvrir(id);
    await p.pret;
    const textes: string[] = [];
    p.doc.getMap<import('yjs').Map<unknown>>('noeuds').forEach((y) => textes.push(String(y.get('texte'))));
    expect(textes).toEqual(['Cartons']);
  });
});

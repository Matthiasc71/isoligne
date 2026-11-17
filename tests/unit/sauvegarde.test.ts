import { afterEach, describe, expect, it } from 'vitest';
import { strFromU8, unzipSync, zipSync, strToU8 } from 'fflate';
import { Stockage } from '../../src/data/stockage';
import { creerBloc } from '../../src/data/projet';
import { blocs, RACINE } from '../../src/data/schema';
import { creerNoeud } from '../../src/tree/arbre';
import { lireProjet } from '../../src/echange/projet';
import { creerSauvegarde, nomFichier, restaurerSauvegarde } from '../../src/echange/sauvegarde';

let n = 0;
const ouverts: Stockage[] = [];
const nouveau = () => { const s = new Stockage(`sauvegarde-${++n}`); ouverts.push(s); return s; };
afterEach(async () => { while (ouverts.length) await ouverts.pop()!.fermer(); });

async function remplir(s: Stockage) {
  const a = await s.creerProjet({ titre: 'Marée basse', type: 'creatif', couleur: 'orange' });
  const pa = s.ouvrir(a);
  creerNoeud(pa.doc, RACINE, 0, { texte: 'Repérages' });
  const c = creerBloc(pa.doc, 'croquis');
  (blocs(pa.doc).get(c)!.get('traits') as import('yjs').Array<unknown>).push([{ id: 't', p: [100, 100, 0.5, 300, 200, 0.6], e: 2, c: 'calque' }]);
  const b = await s.creerProjet({ titre: 'Café Orge', type: 'pro', couleur: 'vert-deau' });
  creerNoeud(s.ouvrir(b).doc, RACINE, 0, { texte: 'Logo' });
  return { a, b };
}

describe('sauvegarde complète', () => {
  it('zip : manifeste, états exacts, copie lisible (Markdown et croquis SVG)', async () => {
    const s = nouveau();
    await remplir(s);
    const z = await creerSauvegarde(s, Date.parse('2026-11-17T10:00:00Z'));
    expect(z.nom).toBe('isoligne-2026-11-17.zip');
    expect(z.projets).toBe(2);
    const f = unzipSync(z.octets);
    expect(Object.keys(f).sort()).toEqual(expect.arrayContaining(['manifeste.json', 'etat/espace.yjs', 'lisible/maree-basse.md', 'lisible/maree-basse-fig-1.svg', 'lisible/cafe-orge.md']));
    expect(strFromU8(f['lisible/maree-basse.md']!)).toContain('- Repérages');
    expect(strFromU8(f['lisible/maree-basse-fig-1.svg']!)).toMatch(/^<svg[^>]+viewBox="0 0 1000 400".*<path d="M[^"]+" fill="#b0601e"\/>/);
  });

  it('restaurer sur un appareil vierge : tout revient à l’identique', async () => {
    const s1 = nouveau();
    const { a, b } = await remplir(s1);
    const z = await creerSauvegarde(s1);
    const s2 = nouveau();
    expect(await restaurerSauvegarde(s2, z.octets)).toBe(2);
    expect(s2.idsProjets().sort()).toEqual([a, b].sort());
    expect(lireProjet(s2.ouvrir(a).doc)).toEqual(lireProjet(s1.ouvrir(a).doc));
    expect((await s2.index.projets.get(b))?.titre).toBe('Café Orge');
  });

  it('fusion : un projet supprimé depuis revient, rien n’est doublé, les ajouts récents restent', async () => {
    const s = nouveau();
    const { a, b } = await remplir(s);
    const z = await creerSauvegarde(s);
    await s.supprimerProjet(b);
    creerNoeud(s.ouvrir(a).doc, RACINE, 1, { texte: 'Ajouté après la sauvegarde' });
    await restaurerSauvegarde(s, z.octets);
    await restaurerSauvegarde(s, z.octets);
    expect(s.idsProjets().sort()).toEqual([a, b].sort());
    const arbre = lireProjet(s.ouvrir(a).doc).arbre.map((x) => x.texte);
    expect(arbre).toEqual(['Repérages', 'Ajouté après la sauvegarde']);
  });

  it('refuse un fichier qui n’est pas une sauvegarde', async () => {
    const s = nouveau();
    await expect(restaurerSauvegarde(s, strToU8('pas un zip'))).rejects.toThrow(/zip/);
    await expect(restaurerSauvegarde(s, zipSync({ 'a.txt': strToU8('x') }))).rejects.toThrow(/Isoligne/);
    expect(nomFichier('  Mémoire M2 : plan !  ')).toBe('memoire-m2-plan');
  });
});

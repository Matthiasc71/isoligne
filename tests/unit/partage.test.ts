import { describe, expect, it } from 'vitest';
import { chiffrerInstantane, dechiffrerInstantane, lienDe } from '../../src/partage/partage';
import { aleatoire, versBase64Url } from '../../src/sync/crypto';
import { noeudVide, type ProjetEch } from '../../src/echange/projet';

const P: ProjetEch = {
  titre: 'Marée basse', type: 'creatif', couleur: 'orange', statut: 'en-cours', epingle: false, fin: null,
  arbre: [noeudVide('Repérages', { note: 'Marée **haute** à 7 h' })], blocs: [{ type: 'arbre' }], liens: [],
};

describe('instantané partagé', () => {
  it('aller-retour, et rien de lisible sans la clé', async () => {
    const cle = aleatoire(32);
    const d = await chiffrerInstantane({ v: 1, cree: 1, projet: P }, cle);
    expect(d).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(d).not.toContain('Mar');
    expect((await dechiffrerInstantane(d, cle)).projet).toEqual(P);
    await expect(dechiffrerInstantane(d, aleatoire(32))).rejects.toThrow();
    // Deux chiffrements du même instantané diffèrent (vecteur aléatoire).
    expect(await chiffrerInstantane({ v: 1, cree: 1, projet: P }, cle)).not.toBe(d);
  });

  it('la clé et l’identifiant ne sont que dans le fragment (#) du lien', () => {
    const p = { id: versBase64Url(aleatoire(32)), cle: versBase64Url(aleatoire(32)) };
    const u = new URL(lienDe(p, 'https://matthiasc71.github.io/isoligne/'));
    expect(u.pathname).toBe('/isoligne/');
    expect(u.search).toBe('');
    expect(u.hash).toBe(`#/s/${p.id}/${p.cle}`);
  });
});

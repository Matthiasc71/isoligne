import { describe, expect, it } from 'vitest';
import {
  aleatoire, base32, chiffrer, cleDeSecours, cleEnveloppe, codeAppairage, dechiffrer, depuisBase32, depuisBase64Url,
  deriverEspace, empreinte, genererPaire, lireCleDeSecours, versBase64Url,
} from '../../src/sync/crypto';

describe('chiffrement de bout en bout', () => {
  it('le même secret maître donne le même espace sur deux appareils', async () => {
    const m = aleatoire(32);
    const a = await deriverEspace(m);
    const b = await deriverEspace(m.slice());
    expect(a.id).toBe(b.id);
    expect(a.id).toMatch(/^[0-9a-f]{32}$/);
    expect(a.jetonSecours).toBe(b.jetonSecours);
    const bloc = await chiffrer(a.cle, new TextEncoder().encode('Repérages'), 'projet-1');
    expect(new TextDecoder().decode(await dechiffrer(b.cle, bloc, 'projet-1'))).toBe('Repérages');
  });

  it('refuse un bloc modifié, déplacé vers un autre projet ou chiffré avec une autre clé', async () => {
    const e = await deriverEspace(aleatoire(32));
    const autre = await deriverEspace(aleatoire(32));
    const bloc = await chiffrer(e.cle, new Uint8Array([1, 2, 3]), 'projet-1');
    const modifie = bloc.slice();
    modifie[20]! ^= 1;
    await expect(dechiffrer(e.cle, modifie, 'projet-1')).rejects.toThrow();
    await expect(dechiffrer(e.cle, bloc, 'projet-2')).rejects.toThrow();
    await expect(dechiffrer(autre.cle, bloc, 'projet-1')).rejects.toThrow();
  });

  it('deux chiffrements du même contenu diffèrent (nonce aléatoire)', async () => {
    const e = await deriverEspace(aleatoire(32));
    const x = await chiffrer(e.cle, new Uint8Array(10), 'p');
    const y = await chiffrer(e.cle, new Uint8Array(10), 'p');
    expect(versBase64Url(x)).not.toBe(versBase64Url(y));
    expect(depuisBase64Url(versBase64Url(x))).toEqual(x);
  });
});

describe('appairage par code', () => {
  it('les deux appareils obtiennent la même clé d’enveloppe et la même empreinte', async () => {
    const ancien = await genererPaire();
    const nouveau = await genererPaire();
    const k1 = await cleEnveloppe(ancien.privee, nouveau.publique);
    const k2 = await cleEnveloppe(nouveau.privee, ancien.publique);
    const maitre = aleatoire(32);
    const enveloppe = await chiffrer(k1, maitre, 'appairage');
    expect(await dechiffrer(k2, enveloppe, 'appairage')).toEqual(maitre);
    const e1 = await empreinte(ancien.publique, nouveau.publique);
    expect(e1).toMatch(/^\d{6}$/);
    expect(await empreinte(nouveau.publique, ancien.publique)).toBe(e1);
  });

  it('un intermédiaire produit une autre empreinte', async () => {
    const ancien = await genererPaire();
    const nouveau = await genererPaire();
    const pirate = await genererPaire();
    expect(await empreinte(ancien.publique, pirate.publique)).not.toBe(await empreinte(nouveau.publique, pirate.publique));
  });

  it('code d’appairage : 8 caractères base32 sans lettres ambiguës', () => {
    for (let i = 0; i < 50; i++) expect(codeAppairage()).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
  });
});

describe('clé de secours', () => {
  it('aller-retour, saisie tolérante, et fautes de frappe détectées', async () => {
    const m = aleatoire(32);
    const cle = await cleDeSecours(m);
    expect(cle).toMatch(/^([0-9A-Z]{4}-){12}[0-9A-Z]{4}$/);
    expect(await lireCleDeSecours(cle)).toEqual(m);
    expect(await lireCleDeSecours(cle.toLowerCase().replace(/-/g, ' '))).toEqual(m);
    // Une faute de frappe : jamais le bon secret, et rejetée localement dans ~15 cas sur 16.
    let acceptees = 0;
    for (let i = 0; i < 300; i++) {
      const k = await cleDeSecours(aleatoire(32));
      const j = Math.floor(Math.random() * k.length);
      if (k[j] === '-') continue;
      const faute = k.slice(0, j) + (k[j] === 'A' ? 'B' : 'A') + k.slice(j + 1);
      const lu = await lireCleDeSecours(faute);
      if (lu) { acceptees++; expect(lu).not.toEqual(await lireCleDeSecours(k)); }
    }
    expect(acceptees).toBeLessThan(45);
    expect(await lireCleDeSecours('trop-court')).toBeNull();
  });

  it('base32 : aller-retour exact', () => {
    const o = aleatoire(32);
    expect(depuisBase32(base32(o), 32)).toEqual(o);
  });
});

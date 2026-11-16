import { describe, expect, it } from 'vitest';
import { chiffrerPush } from '../../src/notif/webpush';
import { depuisBase64Url, versBase64Url } from '../../src/sync/crypto';
import { dechiffrerPush } from './aide-webpush';

/** RFC 8291, annexe A (valeurs intermédiaires). */
const V = {
  texte: 'When I grow up, I want to be a watermelon',
  asPublique: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  asPrivee: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  uaPublique: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  uaPrivee: 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94',
  sel: 'DGv6ra1nlYgDCS1FRnbzlw',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  entete: 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  chiffre: '8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ',
};

async function clePrivee(publique: string, d: string, usages: KeyUsage[]): Promise<CryptoKey> {
  const p = depuisBase64Url(publique);
  return crypto.subtle.importKey('jwk', {
    kty: 'EC', crv: 'P-256', d, x: versBase64Url(p.slice(1, 33)), y: versBase64Url(p.slice(33, 65)), ext: true,
  }, { name: 'ECDH', namedCurve: 'P-256' }, true, usages);
}

describe('Web Push chiffré sur l’appareil (RFC 8291)', () => {
  it('reproduit exactement le vecteur de l’annexe A', async () => {
    const corps = await chiffrerPush({ p256dh: V.uaPublique, auth: V.auth }, new TextEncoder().encode(V.texte), {
      sel: depuisBase64Url(V.sel),
      paire: { privee: await clePrivee(V.asPublique, V.asPrivee, ['deriveBits']), publique: depuisBase64Url(V.asPublique) },
    });
    const entete = depuisBase64Url(V.entete);
    expect(versBase64Url(corps.slice(0, entete.length))).toBe(V.entete);
    expect(versBase64Url(corps.slice(entete.length))).toBe(V.chiffre);
  });

  it('aller-retour avec une paire et un sel neufs à chaque message', async () => {
    const ua = await clePrivee(V.uaPublique, V.uaPrivee, ['deriveBits']);
    const a = await chiffrerPush({ p256dh: V.uaPublique, auth: V.auth }, new TextEncoder().encode('J-1 · Rendu'));
    const b = await chiffrerPush({ p256dh: V.uaPublique, auth: V.auth }, new TextEncoder().encode('J-1 · Rendu'));
    expect(versBase64Url(a)).not.toBe(versBase64Url(b));
    expect(new TextDecoder().decode(await dechiffrerPush(ua, V.uaPublique, V.auth, a))).toBe('J-1 · Rendu');
  });

  it('refuse un abonnement mal formé ou un message trop long', async () => {
    await expect(chiffrerPush({ p256dh: 'AAAA', auth: V.auth }, new Uint8Array(1))).rejects.toThrow();
    await expect(chiffrerPush({ p256dh: V.uaPublique, auth: V.auth }, new Uint8Array(5000))).rejects.toThrow();
  });
});

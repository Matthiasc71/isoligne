import { depuisBase64Url } from '../../src/sync/crypto';

const enc = new TextEncoder();

async function hkdf(sel: Uint8Array, ikm: Uint8Array, info: Uint8Array, octets: number): Promise<Uint8Array> {
  const cle = await crypto.subtle.importKey('raw', ikm as BufferSource, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: sel as BufferSource, info: info as BufferSource }, cle, octets * 8));
}

/** Déchiffrement côté navigateur (tests seulement) : ce que fait le service de push du système. */
export async function dechiffrerPush(uaPrivee: CryptoKey, uaPubliqueB64: string, authB64: string, corps: Uint8Array): Promise<Uint8Array> {
  const uaPublique = depuisBase64Url(uaPubliqueB64);
  const sel = corps.slice(0, 16);
  const idlen = corps[20]!;
  const asPublique = corps.slice(21, 21 + idlen);
  const chiffre = corps.slice(21 + idlen);
  const cleAs = await crypto.subtle.importKey('raw', asPublique as BufferSource, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: cleAs }, uaPrivee, 256));
  const info = new Uint8Array([...enc.encode('WebPush: info\0'), ...uaPublique, ...asPublique]);
  const ikm = await hkdf(depuisBase64Url(authB64), ecdh, info, 32);
  const cek = await hkdf(sel, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(sel, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const cle = await crypto.subtle.importKey('raw', cek as BufferSource, 'AES-GCM', false, ['decrypt']);
  const clair = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce as BufferSource }, cle, chiffre as BufferSource));
  if (clair[clair.length - 1] !== 2) throw new Error('délimiteur absent');
  return clair.slice(0, -1);
}

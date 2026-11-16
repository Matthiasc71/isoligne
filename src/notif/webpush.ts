import { depuisBase64Url, versBase64Url } from '../sync/crypto';

/**
 * Chiffrement d'un message Web Push (RFC 8291, encodage aes128gcm de la RFC 8188),
 * fait **sur l'appareil** : le Worker ne transmet qu'un bloc illisible.
 */

const enc = new TextEncoder();

export interface ClesAbonnement {
  /** Clé publique P-256 de l'abonnement (65 octets, base64url). */
  p256dh: string;
  /** Secret d'authentification (16 octets, base64url). */
  auth: string;
}

export interface OptionsChiffrement {
  /** Sel imposé (tests) ; sinon 16 octets aléatoires. */
  sel?: Uint8Array;
  /** Paire éphémère imposée (tests) ; sinon une nouvelle paire par message. */
  paire?: { privee: CryptoKey; publique: Uint8Array };
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
}

async function hkdf(sel: Uint8Array, ikm: Uint8Array, info: Uint8Array, octets: number): Promise<Uint8Array> {
  const cle = await crypto.subtle.importKey('raw', ikm as BufferSource, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: sel as BufferSource, info: info as BufferSource }, cle, octets * 8));
}

async function paireEphemere(): Promise<{ privee: CryptoKey; publique: Uint8Array }> {
  const p = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  return { privee: p.privateKey, publique: new Uint8Array(await crypto.subtle.exportKey('raw', p.publicKey)) };
}

/** Taille d'enregistrement annoncée (un seul enregistrement par message). */
const RS = 4096;

export async function chiffrerPush(ab: ClesAbonnement, contenu: Uint8Array, o: OptionsChiffrement = {}): Promise<Uint8Array> {
  const uaPublique = depuisBase64Url(ab.p256dh);
  const auth = depuisBase64Url(ab.auth);
  if (uaPublique.length !== 65 || auth.length !== 16) throw new Error('Abonnement invalide');
  if (contenu.length + 17 > RS) throw new Error('Message trop long');
  const as = o.paire ?? await paireEphemere();
  const cleUa = await crypto.subtle.importKey('raw', uaPublique as BufferSource, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: cleUa }, as.privee, 256));
  const ikm = await hkdf(auth, ecdh, concat(enc.encode('WebPush: info\0'), uaPublique, as.publique), 32);
  const sel = o.sel ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(sel, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(sel, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const cle = await crypto.subtle.importKey('raw', cek as BufferSource, 'AES-GCM', false, ['encrypt']);
  // Dernier (et seul) enregistrement : délimiteur 0x02, sans bourrage.
  const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce as BufferSource }, cle, concat(contenu, new Uint8Array([2])) as BufferSource));
  const entete = new Uint8Array(21);
  entete.set(sel, 0);
  new DataView(entete.buffer).setUint32(16, RS);
  entete[20] = 65;
  return concat(entete, as.publique, chiffre);
}

/** Contenu d'une notification (lu par le service worker). */
export interface ContenuNotif {
  /** Titre, texte, ancre de l'app, étiquette (une notification remplace la précédente de même étiquette). */
  t: string;
  b: string;
  u: string;
  g: string;
}

export async function chiffrerNotif(ab: ClesAbonnement, c: ContenuNotif): Promise<string> {
  return versBase64Url(await chiffrerPush(ab, enc.encode(JSON.stringify(c))));
}

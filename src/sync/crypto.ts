/**
 * Chiffrement de bout en bout (WebCrypto uniquement).
 *
 * Un **secret maître** de 256 bits, créé par le premier appareil, donne par
 * dérivation HKDF-SHA-256 :
 * - la clé AES-256-GCM des données (mises à jour Yjs, rappels, partages) ;
 * - l'identifiant de l'espace ;
 * - le jeton de secours, qui permet d'ajouter un appareil sans aucun autre appareil.
 * La clé de secours imprimable est ce secret maître, écrit en base32.
 *
 * Le serveur ne voit que des octets chiffrés, des identifiants et des empreintes.
 */

const enc = new TextEncoder();
const VERSION = 1;

export function aleatoire(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

export function versHex(o: Uint8Array): string {
  return [...o].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function versBase64Url(o: Uint8Array): string {
  let s = '';
  for (const x of o) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function depuisBase64Url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

async function hkdf(secret: Uint8Array, info: string, octets: number): Promise<Uint8Array> {
  const base = await crypto.subtle.importKey('raw', secret as BufferSource, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: enc.encode('isoligne') as BufferSource, info: enc.encode(info) as BufferSource },
    base,
    octets * 8,
  );
  return new Uint8Array(bits);
}

export interface Espace {
  /** Identifiant public de l'espace (32 caractères hexadécimaux). */
  id: string;
  /** Clé AES-GCM des données, non extractible. */
  cle: CryptoKey;
  /** Jeton de secours (hexadécimal), envoyé au serveur seulement lors d'une restauration. */
  jetonSecours: string;
}

export async function deriverEspace(maitre: Uint8Array): Promise<Espace> {
  if (maitre.length !== 32) throw new Error('Secret maître invalide');
  const [brute, id, secours] = await Promise.all([
    hkdf(maitre, 'isoligne-donnees-v1', 32),
    hkdf(maitre, 'isoligne-espace-v1', 16),
    hkdf(maitre, 'isoligne-secours-v1', 32),
  ]);
  const cle = await crypto.subtle.importKey('raw', brute as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
  return { id: versHex(id), cle, jetonSecours: versHex(secours) };
}

/**
 * Chiffre `donnees` : [version 1 octet][nonce 12 octets][chiffré + étiquette 16 octets].
 * Les données associées (`contexte`, par ex. l'id du projet) lient le bloc à sa place :
 * le serveur ne peut pas échanger les blocs de deux projets sans que le déchiffrement échoue.
 */
export async function chiffrer(cle: CryptoKey, donnees: Uint8Array, contexte: string): Promise<Uint8Array> {
  const nonce = aleatoire(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce as BufferSource, additionalData: enc.encode(contexte) as BufferSource },
    cle,
    donnees as BufferSource,
  ));
  const sortie = new Uint8Array(1 + 12 + ct.length);
  sortie[0] = VERSION;
  sortie.set(nonce, 1);
  sortie.set(ct, 13);
  return sortie;
}

export async function dechiffrer(cle: CryptoKey, bloc: Uint8Array, contexte: string): Promise<Uint8Array> {
  if (bloc[0] !== VERSION || bloc.length < 13 + 16) throw new Error('Bloc chiffré illisible');
  return new Uint8Array(await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bloc.subarray(1, 13) as BufferSource, additionalData: enc.encode(contexte) as BufferSource },
    cle,
    bloc.subarray(13) as BufferSource,
  ));
}

// ───────────────────────────── Appairage par code (ECDH) ─────────────────────────────

export interface Paire { privee: CryptoKey; publique: Uint8Array }

export async function genererPaire(): Promise<Paire> {
  const p = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const publique = new Uint8Array(await crypto.subtle.exportKey('raw', p.publicKey));
  return { privee: p.privateKey, publique };
}

/** Clé d'enveloppe commune aux deux appareils (ECDH P-256, puis HKDF). */
export async function cleEnveloppe(privee: CryptoKey, publiqueAutre: Uint8Array): Promise<CryptoKey> {
  const autre = await crypto.subtle.importKey('raw', publiqueAutre as BufferSource, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const commun = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: autre }, privee, 256));
  const brute = await hkdf(commun, 'isoligne-appairage-v1', 32);
  return crypto.subtle.importKey('raw', brute as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/**
 * Empreinte à 6 chiffres, identique sur les deux écrans si personne ne s'est
 * interposé entre eux (le serveur compris). L'ordre des clés ne compte pas.
 */
export async function empreinte(a: Uint8Array, b: Uint8Array): Promise<string> {
  const [x, y] = versHex(a) < versHex(b) ? [a, b] : [b, a];
  const tout = new Uint8Array(x.length + y.length);
  tout.set(x);
  tout.set(y, x.length);
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', tout as BufferSource));
  const n = ((h[0]! << 24) | (h[1]! << 16) | (h[2]! << 8) | h[3]!) >>> 0;
  return String(n % 1_000_000).padStart(6, '0');
}

// ───────────────────────────── Base32 de Crockford ─────────────────────────────

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function base32(o: Uint8Array): string {
  let bits = 0;
  let valeur = 0;
  let s = '';
  for (const x of o) {
    valeur = (valeur << 8) | x;
    bits += 8;
    while (bits >= 5) { s += ALPHABET[(valeur >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) s += ALPHABET[(valeur << (5 - bits)) & 31];
  return s;
}

/** Lecture tolérante : minuscules, O→0, I/L→1, tirets et espaces ignorés. */
export function normaliserBase32(s: string): string | null {
  const t = s.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  return /^[0-9A-HJKMNP-TV-Z]*$/.test(t) ? t : null;
}

export function depuisBase32(s: string, octets: number): Uint8Array | null {
  const t = normaliserBase32(s);
  if (t === null) return null;
  const sortie = new Uint8Array(octets);
  let bits = 0;
  let valeur = 0;
  let i = 0;
  for (const c of t) {
    valeur = (valeur << 5) | ALPHABET.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      if (i >= octets) return null;
      sortie[i++] = (valeur >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return i === octets ? sortie : null;
}

/** Code d'appairage : 8 caractères (40 bits), valable 5 minutes, à usage unique. */
export function codeAppairage(): string {
  return base32(aleatoire(5));
}

/**
 * Clé de secours imprimable : le secret maître en base32 (52 caractères),
 * en groupes de 4, suivie de 2 caractères de contrôle contre les fautes de frappe.
 */
export async function cleDeSecours(maitre: Uint8Array): Promise<string> {
  const corps = base32(maitre);
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', maitre as BufferSource));
  const controle = base32(h.subarray(0, 2)).slice(0, 2);
  return `${corps}${controle}`.match(/.{1,4}/g)!.join('-');
}

export async function lireCleDeSecours(saisie: string): Promise<Uint8Array | null> {
  const t = normaliserBase32(saisie);
  if (!t || t.length !== 54) return null;
  const maitre = depuisBase32(t.slice(0, 52), 32);
  if (!maitre) return null;
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', maitre as BufferSource));
  return base32(h.subarray(0, 2)).slice(0, 2) === t.slice(52) ? maitre : null;
}

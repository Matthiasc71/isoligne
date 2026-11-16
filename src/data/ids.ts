const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** Identifiant aléatoire de 16 caractères base62 (≈ 95 bits). */
export function nouvelId(longueur = 16): string {
  const octets = crypto.getRandomValues(new Uint8Array(longueur));
  let id = '';
  for (const o of octets) id += ALPHABET[o % 62];
  return id;
}

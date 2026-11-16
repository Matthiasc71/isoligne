/**
 * Protection contre la falsification de requêtes côté serveur (SSRF) :
 * le Worker ne doit jamais aller chercher une adresse interne ou locale.
 * La documentation de Cloudflare ne garantit pas que `fetch` refuse les
 * adresses privées : on ne s'en remet donc pas à la plateforme.
 */

const NOMS_INTERDITS = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain|home\.arpa)$/i;

function ipv4(texte: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(texte);
  if (!m) return null;
  const o = m.slice(1).map(Number);
  return o.every((x) => x <= 255) ? o : null;
}

/** Adresse IPv4 non routable sur Internet (privée, locale, réservée, multicast…). */
export function ipv4Privee(o: number[]): boolean {
  const [a, b] = o as [number, number, number, number];
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127) // CGNAT
    || (a === 169 && b === 254) // lien local, métadonnées cloud
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0)
    || (a === 198 && (b === 18 || b === 19)) // bancs d'essai
    || (a === 198 && b === 51) || (a === 203 && b === 0); // documentation
}

/** Développe une adresse IPv6 en 8 groupes de 16 bits. */
function ipv6(texte: string): number[] | null {
  let t = texte.replace(/^\[|\]$/g, '').toLowerCase();
  const zone = t.indexOf('%');
  if (zone >= 0) t = t.slice(0, zone);
  if (!t.includes(':')) return null;
  // IPv4 en fin d'adresse (::ffff:1.2.3.4)
  const v4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(t);
  if (v4) {
    const o = ipv4(v4[1]!);
    if (!o) return null;
    t = t.replace(v4[1]!, `${((o[0]! << 8) | o[1]!).toString(16)}:${((o[2]! << 8) | o[3]!).toString(16)}`);
  }
  const [gauche, droite, ...reste] = t.split('::');
  if (reste.length) return null;
  const g = gauche ? gauche.split(':') : [];
  const d = droite !== undefined ? (droite ? droite.split(':') : []) : null;
  const manque = d === null ? 0 : 8 - g.length - d.length;
  const groupes = [...g, ...Array(Math.max(0, manque)).fill('0'), ...(d ?? [])];
  if (groupes.length !== 8 || groupes.some((x) => !/^[0-9a-f]{1,4}$/.test(x))) return null;
  return groupes.map((x) => parseInt(x, 16));
}

export function ipv6Privee(g: number[]): boolean {
  const tousNuls = g.slice(0, 7).every((x) => x === 0);
  if (tousNuls && (g[7] === 0 || g[7] === 1)) return true; // :: et ::1
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) {
    return ipv4Privee([g[6]! >> 8, g[6]! & 255, g[7]! >> 8, g[7]! & 255]); // ::ffff:a.b.c.d
  }
  const premier = g[0]!;
  return (premier & 0xfe00) === 0xfc00 // fc00::/7 unique local
    || (premier & 0xffc0) === 0xfe80 // fe80::/10 lien local
    || (premier & 0xff00) === 0xff00 // multicast
    || premier === 0x2001 && g[1] === 0x0db8 // documentation
    || premier === 0x0064 && g[1] === 0xff9b; // NAT64 vers IPv4 (ambigu : refusé)
}

/** Vrai si le texte est une adresse IP littérale non publique. */
export function ipPrivee(texte: string): boolean {
  const v4 = ipv4(texte);
  if (v4) return ipv4Privee(v4);
  const v6 = ipv6(texte);
  return v6 ? ipv6Privee(v6) : false;
}

export function estIpLitterale(texte: string): boolean {
  return ipv4(texte) !== null || ipv6(texte) !== null;
}

/**
 * Vérifie une URL avant toute requête : http(s), ports standard, pas
 * d'identifiants, pas de nom ou d'IP interne. Renvoie l'URL normalisée
 * (le parseur WHATWG réécrit déjà « 2130706433 » ou « 0x7f.1 » en IPv4).
 */
export function verifierUrl(brute: string): URL | null {
  let u: URL;
  try { u = new URL(brute); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.username || u.password) return null;
  if (u.port && u.port !== '80' && u.port !== '443') return null;
  const hote = u.hostname.replace(/\.$/, '');
  if (!hote || NOMS_INTERDITS.test(hote)) return null;
  if (estIpLitterale(hote)) return ipPrivee(hote) ? null : u;
  if (!hote.includes('.')) return null;
  return u;
}

/**
 * Résout le nom via DNS sur HTTPS (1.1.1.1) et refuse s'il pointe vers
 * une adresse privée. Limite connue : un nom qui change d'adresse entre
 * cette vérification et la requête (rebinding) n'est pas couvert ; le
 * risque est faible ici (usage personnel, réponses limitées à du texte).
 */
export async function resolutionPublique(hote: string, f: typeof fetch = fetch): Promise<boolean> {
  if (estIpLitterale(hote)) return !ipPrivee(hote);
  const types = ['A', 'AAAA'] as const;
  let trouve = false;
  for (const type of types) {
    const r = await f(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hote)}&type=${type}`, {
      headers: { accept: 'application/dns-json' },
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return false;
    const d = (await r.json()) as { Answer?: { type: number; data: string }[] };
    for (const a of d.Answer ?? []) {
      if (a.type !== 1 && a.type !== 28) continue; // A, AAAA (on ignore les CNAME intermédiaires)
      trouve = true;
      if (ipPrivee(a.data)) return false;
    }
  }
  return trouve;
}

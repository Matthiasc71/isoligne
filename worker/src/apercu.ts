/** Extraction d'un aperçu en texte seul (titre, site, description) : jamais de HTML renvoyé. */

export interface Apercu {
  url: string;
  titre: string;
  site: string;
  description: string;
}

const ENTITES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»',
  eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', acirc: 'â', ccedil: 'ç', ocirc: 'ô',
  ucirc: 'û', ugrave: 'ù', icirc: 'î', iuml: 'ï', euml: 'ë', oelig: 'œ', hellip: '…',
  ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', middot: '·',
};

export function decoderEntites(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (tout, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
    }
    return ENTITES[e.toLowerCase()] ?? tout;
  });
}

/** Texte brut, sans balise ni caractère de contrôle, espaces réduits, longueur bornée. */
export function nettoyer(s: string | null | undefined, max: number): string {
  if (!s) return '';
  const t = decoderEntites(s)
    .replace(/<[^>]*>/g, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Champs bruts collectés pendant la lecture de l'en-tête de la page. */
export interface Collecte {
  ogTitre?: string;
  ogSite?: string;
  ogDescription?: string;
  twitterTitre?: string;
  description?: string;
  titre: string;
}

export function composer(c: Collecte, url: string): Apercu {
  const hote = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } })();
  return {
    url,
    titre: nettoyer(c.ogTitre || c.twitterTitre || c.titre, 200),
    site: nettoyer(c.ogSite, 100) || hote,
    description: nettoyer(c.ogDescription || c.description, 300),
  };
}

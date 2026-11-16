import archivoUrl from '@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2?url';
import b612Url from '@fontsource/b612/files/b612-latin-400-normal.woff2?url';
import monoUrl from '@fontsource/b612-mono/files/b612-mono-latin-400-normal.woff2?url';
import { RACINE, type CleCouleur } from '../data/schema';
import type { Arbre } from '../tree/arbre';
import type { Plan } from './dispositions';
import type { LienLibre } from './liens';
import { cheminArete, cheminLien, coteEtiquette, genre } from './rendu';

const echapper = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

async function enBase64(url: string): Promise<string> {
  const octets = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let bin = '';
  for (let i = 0; i < octets.length; i += 0x8000) bin += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Lit les couleurs du thème courant (clair ou sombre) depuis les tokens CSS. */
function couleurs(couleur: CleCouleur) {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return {
    fond: v('--fond'), trait: v('--trait'), trait2: v('--trait-2'), redline: v('--redline'),
    grilleM: v('--grille-majeure'), grillem: v('--grille-mineure'), calque: v(`--calque-${couleur}`),
  };
}

export interface DonneesExport {
  plan: Plan;
  arbre: Arbre;
  liens: LienLibre[];
  titre: string;
  couleur: CleCouleur;
  urgente: string | null;
  dateUrgente: string | null;
}

/**
 * Construit un SVG autonome du graphe, dans le style du thème : polices
 * embarquées, grille, cercles de construction, arêtes, liens libres, nœuds.
 */
export async function versSvg(d: DonneesExport): Promise<{ svg: string; largeur: number; hauteur: number }> {
  const c = couleurs(d.couleur);
  const { plan, arbre } = d;
  const pos = new Map(plan.noeuds.map((n) => [n.id, n]));
  const marge = 80;
  const xs = plan.noeuds.map((n) => n.x);
  const ys = plan.noeuds.map((n) => n.y);
  for (const r of plan.cercles) { xs.push(-r, r); ys.push(-r, r); }
  const minX = Math.min(0, ...xs) - marge - 120;
  const maxX = Math.max(0, ...xs) + marge + 120;
  const minY = Math.min(0, ...ys) - marge;
  const maxY = Math.max(0, ...ys) + marge;
  const largeur = Math.round(maxX - minX);
  const hauteur = Math.round(maxY - minY);

  const [archivo, b612, mono] = await Promise.all([enBase64(archivoUrl), enBase64(b612Url), enBase64(monoUrl)]);
  const parties: string[] = [];
  parties.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}" viewBox="${minX} ${minY} ${largeur} ${hauteur}">`);
  parties.push(`<title>${echapper(d.titre)}</title>`);
  parties.push(`<defs><style>
@font-face{font-family:'Archivo Variable';src:url(data:font/woff2;base64,${archivo}) format('woff2');font-weight:100 900;font-stretch:62% 125%}
@font-face{font-family:'B612';src:url(data:font/woff2;base64,${b612}) format('woff2')}
@font-face{font-family:'B612 Mono';src:url(data:font/woff2;base64,${mono}) format('woff2')}
.l{font-family:'Archivo Variable';font-weight:700;font-stretch:125%;font-size:12px;letter-spacing:.14em;fill:${c.trait};text-transform:uppercase}
.c{font-family:'B612';font-size:16px;fill:${c.trait}}
.f{fill:${c.trait2}}
.m{font-family:'B612 Mono';font-size:12px;fill:${c.trait2}}
</style>
<pattern id="gm" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 .5H.5V12" fill="none" stroke="${c.grillem}"/></pattern>
<pattern id="gM" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="url(#gm)"/><path d="M60 .5H.5V60" fill="none" stroke="${c.grilleM}"/></pattern>
</defs>`);
  parties.push(`<rect x="${minX}" y="${minY}" width="${largeur}" height="${hauteur}" fill="${c.fond}"/>`);
  parties.push(`<rect x="${minX}" y="${minY}" width="${largeur}" height="${hauteur}" fill="url(#gM)"/>`);
  for (const r of plan.cercles) parties.push(`<circle r="${r}" fill="none" stroke="${c.trait2}" stroke-dasharray="2 5" stroke-opacity=".6"/>`);

  if (plan.axe) {
    const a = plan.axe;
    const bas = Math.max(...a.couloirs.map((k) => k.y + k.hauteur), 60);
    parties.push(`<line x1="${minX}" x2="${maxX}" y1="${bas}" y2="${bas}" stroke="${c.trait}"/>`);
    for (const g of a.graduations) {
      parties.push(`<line x1="${g.x}" x2="${g.x}" y1="${bas}" y2="${bas + (g.majeure ? 10 : 5)}" stroke="${c.trait2}"/>`);
      parties.push(`<text class="m" x="${g.x + 4}" y="${bas + 24}">${echapper(g.libelle)}</text>`);
    }
    parties.push(`<line x1="${a.aujourdhuiX}" x2="${a.aujourdhuiX}" y1="${minY + 20}" y2="${bas}" stroke="${c.redline}"/>`);
    for (const k of a.couloirs) {
      parties.push(`<line x1="${minX}" x2="${maxX}" y1="${k.y}" y2="${k.y}" stroke="${c.grilleM}"/>`);
      parties.push(`<text class="l" x="${minX + 16}" y="${k.y + 18}">${echapper(arbre.parId.get(k.id)?.texte ?? '')}</text>`);
    }
  }

  const coude = plan.disposition === 'arbre';
  const vertical = coude && plan.noeuds.some((n) => n.profondeur === 1 && n.y > 0 && Math.abs(n.x) < 1e-6);
  for (const a of plan.aretes) {
    const de = pos.get(a.de); const vers = pos.get(a.vers);
    if (de && vers) parties.push(`<path d="${cheminArete(de, vers, coude, vertical)}" fill="none" stroke="${c.trait}" stroke-opacity=".75"/>`);
  }
  for (const l of d.liens) {
    const de = pos.get(l.de); const vers = pos.get(l.vers);
    if (!de || !vers) continue;
    const { d: chemin, milieu } = cheminLien(de, vers);
    parties.push(`<path d="${chemin}" fill="none" stroke="${c.calque}" stroke-dasharray="${l.style === 'trait' ? '0' : '4 4'}"/>`);
    if (l.libelle) parties.push(`<text class="m" x="${milieu.x}" y="${milieu.y - 6}" text-anchor="middle">${echapper(l.libelle)}</text>`);
  }

  for (const n of plan.noeuds) {
    const g = genre(n, plan, arbre);
    const noeud = arbre.parId.get(n.id);
    const fait = noeud?.tache && noeud.fait;
    const texte = echapper(n.id === RACINE ? d.titre : noeud?.texte ?? '');
    if (g === 'centre') {
      parties.push(`<circle cx="${n.x}" cy="${n.y}" r="28" fill="${c.fond}" stroke="${c.trait}"/>`);
      parties.push(`<rect x="${n.x - 7}" y="${n.y - 7}" width="14" height="14" fill="${c.calque}"/>`);
      if (n.id !== RACINE) parties.push(`<text class="l" x="${n.x}" y="${n.y + 48}" text-anchor="middle">${texte}</text>`);
    } else if (g === 'branche') {
      const l = Math.max(60, texte.length * 10 + 24);
      parties.push(`<rect x="${n.x - l / 2}" y="${n.y - 14}" width="${l}" height="28" fill="${c.fond}" stroke="${fait ? c.trait2 : c.trait}"/>`);
      parties.push(`<text class="l${fait ? ' f' : ''}" x="${n.x}" y="${n.y + 4}" text-anchor="middle">${texte}</text>`);
    } else {
      const parent = n.parent ? pos.get(n.parent) ?? null : null;
      const cote = coteEtiquette(n, plan, parent);
      parties.push(fait
        ? `<rect x="${n.x - 4.5}" y="${n.y - 4.5}" width="9" height="9" fill="${c.fond}" stroke="${c.trait2}"/><path d="M${n.x - 3} ${n.y - 3}l6 6m0-6-6 6" stroke="${c.trait2}"/>`
        : `<rect x="${n.x - 4.5}" y="${n.y - 4.5}" width="9" height="9" fill="${n.id === d.urgente ? c.redline : c.trait}"/>`);
      const [tx, ty, ancre] = cote === 'droite' ? [n.x + 12, n.y + 5, 'start'] : cote === 'gauche' ? [n.x - 12, n.y + 5, 'end'] : cote === 'haut' ? [n.x, n.y - 14, 'middle'] : [n.x, n.y + 24, 'middle'];
      parties.push(`<text class="c${fait ? ' f' : ''}" x="${tx}" y="${ty}" text-anchor="${ancre}">${texte}</text>`);
      if (n.id === d.urgente && d.dateUrgente) parties.push(`<text class="m" x="${tx}" y="${ty + 16}" text-anchor="${ancre}" fill="${c.redline}" style="fill:${c.redline}">${echapper(d.dateUrgente)}</text>`);
    }
  }
  parties.push('</svg>');
  return { svg: parties.join('\n'), largeur, hauteur };
}

export async function versPng(d: DonneesExport, echelle = 2): Promise<Blob> {
  const { svg, largeur, hauteur } = await versSvg(d);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = largeur * echelle;
    canvas.height = hauteur * echelle;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(echelle, echelle);
    ctx.drawImage(img, 0, 0, largeur, hauteur);
    return await new Promise((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error('PNG impossible'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function telecharger(contenu: Blob, nom: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(contenu);
  a.download = nom;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

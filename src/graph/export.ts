import archivoUrl from '@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2?url';
import b612Url from '@fontsource/b612/files/b612-latin-400-normal.woff2?url';
import monoUrl from '@fontsource/b612-mono/files/b612-mono-latin-400-normal.woff2?url';
import { RACINE, type CleCouleur } from '../data/schema';
import type { Arbre } from '../tree/arbre';
import type { Plan } from './dispositions';
import type { LienLibre } from './liens';
import { cheminArete, cheminLien, coteEtiquette, genre } from './rendu';
import { CADRE, CARRE, ECART_ETIQUETTE, RAYON_CENTRE, STYLES, encombrement } from './etiquettes';

/** Taille des libellés du graphe (token --taille-graphe). */
const TAILLE_GRAPHE = 14;

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
  const xs: number[] = [];
  const ys: number[] = [];
  for (const n of plan.noeuds) {
    const parent = n.parent ? pos.get(n.parent) ?? null : null;
    const r = encombrement(n.x, n.y, n.id === plan.centre ? null : n.etiquette, coteEtiquette(n, plan, parent));
    xs.push(r.x0, r.x1); ys.push(r.y0, r.y1 + 20);
  }
  for (const r of plan.cercles) { xs.push(-r, r); ys.push(-r, r); }
  const minX = Math.min(0, ...xs) - marge;
  const maxX = Math.max(0, ...xs) + marge;
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
.l1{font-family:'Archivo Variable';font-weight:700;font-stretch:125%;font-size:${TAILLE_GRAPHE}px;letter-spacing:.1em;fill:${c.trait};text-transform:uppercase}
.c2{font-family:'B612';font-size:${TAILLE_GRAPHE}px;fill:${c.trait}}
.c3{font-family:'B612';font-size:12px;fill:${c.trait2}}
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
  const vertical = coude && Boolean(plan.vertical);
  for (const a of plan.aretes) {
    const de = pos.get(a.de); const vers = pos.get(a.vers);
    if (de && vers) parties.push(`<path d="${cheminArete(de, vers, coude, vertical, { de, vers })}" fill="none" stroke="${c.trait}" stroke-opacity=".75"/>`);
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
    const e = n.etiquette;
    const urgente = n.id === d.urgente && d.dateUrgente ? echapper(d.dateUrgente) : null;
    if (g === 'centre' || !e) {
      parties.push(`<circle cx="${n.x}" cy="${n.y}" r="${RAYON_CENTRE}" fill="${c.fond}" stroke="${c.trait}"/>`);
      parties.push(`<rect x="${n.x - 7}" y="${n.y - 7}" width="14" height="14" fill="${c.calque}"/>`);
      if (n.id !== RACINE) parties.push(`<text class="l" x="${n.x}" y="${n.y + 48}" text-anchor="middle">${echapper(noeud?.texte ?? '')}</text>`);
      continue;
    }
    const style = STYLES[e.niveau];
    const lignes = (x: number, y0: number, ancre: string, classe: string) => parties.push(
      `<text class="${classe}${fait ? ' f' : ''}" text-anchor="${ancre}">${e.lignes.map((t, i) =>
        `<tspan x="${x}" y="${y0 + i * style.ligne + style.ligne * 0.75}">${echapper(t)}</tspan>`).join('')}</text>`,
    );
    if (g === 'branche') {
      const r = encombrement(n.x, n.y, { ...e, date: false }, 'droite');
      parties.push(`<rect x="${r.x0 + 0.5}" y="${r.y0 + 0.5}" width="${r.x1 - r.x0 - 1}" height="${r.y1 - r.y0 - 1}" fill="${c.fond}" stroke="${urgente ? c.redline : fait ? c.trait2 : c.trait}"/>`);
      lignes(r.x0 + 1 + CADRE.x, r.y0 + 1 + CADRE.y, 'start', 'l1');
      if (urgente) parties.push(`<text class="m" x="${r.x0}" y="${r.y1 + 16}" style="fill:${c.redline}">${urgente}</text>`);
      continue;
    }
    const parent = n.parent ? pos.get(n.parent) ?? null : null;
    const cote = coteEtiquette(n, plan, parent);
    const t = CARRE[e.niveau];
    const plein = n.id === d.urgente ? c.redline : e.niveau === 3 ? c.trait2 : c.trait;
    parties.push(fait
      ? `<rect x="${n.x - t / 2 + 0.5}" y="${n.y - t / 2 + 0.5}" width="${t - 1}" height="${t - 1}" fill="${c.fond}" stroke="${c.trait2}"/><path d="M${n.x - t / 3} ${n.y - t / 3}L${n.x + t / 3} ${n.y + t / 3}M${n.x + t / 3} ${n.y - t / 3}L${n.x - t / 3} ${n.y + t / 3}" stroke="${c.trait2}"/>`
      : `<rect x="${n.x - t / 2}" y="${n.y - t / 2}" width="${t}" height="${t}" fill="${plein}"/>`);
    const d0 = t / 2 + ECART_ETIQUETTE;
    const [tx, y0, ancre] = cote === 'droite' ? [n.x + d0, n.y - e.hauteur / 2, 'start']
      : cote === 'gauche' ? [n.x - d0, n.y - e.hauteur / 2, 'end']
        : cote === 'haut' ? [n.x, n.y - d0 - e.hauteur, 'middle'] : [n.x, n.y + d0, 'middle'];
    lignes(tx, y0, ancre, e.niveau === 3 ? 'c3' : 'c2');
    if (urgente) parties.push(`<text class="m" x="${tx}" y="${y0 + e.lignes.length * style.ligne + 12}" text-anchor="${ancre}" style="fill:${c.redline}">${urgente}</text>`);
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

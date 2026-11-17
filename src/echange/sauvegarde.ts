import * as Y from 'yjs';
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import type { Stockage } from '../data/stockage';
import { HAUTEUR, LARGEUR, cheminTrait } from '../media/croquis';
import type { CleCouleur } from '../data/schema';
import { aujourdhui } from '../time/dates';
import { versMarkdown } from './markdown';
import { lireProjet, type ProjetEch } from './projet';

/**
 * Sauvegarde complète (zip, fflate) :
 * - `manifeste.json` ;
 * - `etat/espace.yjs` et `etat/<id>.yjs` : l'état exact (Yjs), pour restaurer ;
 * - `lisible/…md` et `lisible/…svg` : une copie lisible hors de l'app.
 * La restauration **fusionne** (les états Yjs se combinent) : rien n'est écrasé,
 * aucun doublon, et chaque projet de la sauvegarde est présent ensuite.
 */

export interface Manifeste {
  app: 'isoligne';
  version: 1;
  cree: string;
  projets: { id: string; titre: string }[];
}

/** Encres en couleurs du thème clair, pour un SVG lisible n'importe où. */
const ENCRES: Record<string, string> = { trait: '#1f4e8c', 'trait-2': '#44658c', redline: '#b8321c' };
const CALQUES: Record<CleCouleur, string> = {
  orange: '#b0601e', 'vert-deau': '#2c8572', lilas: '#7a5cc2', ocre: '#8f741c', vert: '#448540', ciel: '#2f6fb0', rose: '#c24d6a', craie: '#5a5f66',
};

export function croquisSvg(p: ProjetEch, b: Extract<ProjetEch['blocs'][number], { type: 'croquis' }>): string {
  const chemins = b.traits.map((t) => `<path d="${cheminTrait(t)}" fill="${t.c === 'calque' ? CALQUES[p.couleur] : ENCRES[t.c] ?? ENCRES.trait}"/>`).join('');
  const titre = b.legende.replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGEUR} ${HAUTEUR}"><title>${titre}</title><rect width="100%" height="100%" fill="#f4f6f2"/>${chemins}</svg>\n`;
}

/** Nom de fichier sûr et ASCII (« maree-basse ») : Chromium ignore un nom accentué pour un téléchargement. */
export function nomFichier(titre: string): string {
  const n = titre.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return n || 'projet';
}

export async function creerSauvegarde(stockage: Stockage, maintenant = Date.now()): Promise<{ octets: Uint8Array; nom: string; projets: number }> {
  await stockage.espacePret;
  const fichiers: Zippable = { etat: {}, lisible: {} };
  const manifeste: Manifeste = { app: 'isoligne', version: 1, cree: new Date(maintenant).toISOString(), projets: [] };
  (fichiers.etat as Zippable)['espace.yjs'] = Y.encodeStateAsUpdate(stockage.espace);
  const pris = new Set<string>();
  for (const id of stockage.idsProjets()) {
    const p = stockage.ouvrir(id);
    await p.pret;
    const e = lireProjet(p.doc);
    manifeste.projets.push({ id, titre: e.titre });
    (fichiers.etat as Zippable)[`${id}.yjs`] = Y.encodeStateAsUpdate(p.doc);
    let base = nomFichier(e.titre);
    if (pris.has(base)) base = `${base}-${id.slice(0, 4)}`;
    pris.add(base);
    (fichiers.lisible as Zippable)[`${base}.md`] = strToU8(versMarkdown(e));
    let fig = 0;
    for (const b of e.blocs) {
      if (b.type !== 'croquis') continue;
      fig++;
      (fichiers.lisible as Zippable)[`${base}-fig-${fig}.svg`] = strToU8(croquisSvg(e, b));
    }
  }
  fichiers['manifeste.json'] = strToU8(JSON.stringify(manifeste, null, 2));
  // Les états Yjs sont déjà compacts : niveau de compression modéré, rapide sur iPhone.
  const octets = zipSync(fichiers, { level: 6, mtime: new Date(maintenant) });
  return { octets, nom: `isoligne-${aujourdhui(maintenant)}.zip`, projets: manifeste.projets.length };
}

/** Origine des mises à jour appliquées par une restauration (comptées comme des modifications locales à synchroniser). */
export const RESTAURATION = 'restauration';

export async function restaurerSauvegarde(stockage: Stockage, octets: Uint8Array): Promise<number> {
  let fichiers: Record<string, Uint8Array>;
  try { fichiers = unzipSync(octets); } catch { throw new Error('Fichier illisible : ce n’est pas une sauvegarde zip.'); }
  const m = fichiers['manifeste.json'];
  let manifeste: Manifeste;
  try { manifeste = JSON.parse(strFromU8(m!)) as Manifeste; } catch { throw new Error('Ce zip n’est pas une sauvegarde Isoligne.'); }
  if (manifeste.app !== 'isoligne' || manifeste.version !== 1) throw new Error('Ce zip n’est pas une sauvegarde Isoligne.');
  await stockage.espacePret;
  const espace = fichiers['etat/espace.yjs'];
  if (espace) Y.applyUpdate(stockage.espace, espace, RESTAURATION);
  let n = 0;
  for (const { id } of manifeste.projets) {
    const etat = fichiers[`etat/${id}.yjs`];
    if (!etat || !/^[A-Za-z0-9]{1,32}$/.test(id)) continue;
    const p = stockage.ouvrir(id);
    await p.pret;
    Y.applyUpdate(p.doc, etat, RESTAURATION);
    // Un projet supprimé depuis la sauvegarde revient : la sauvegarde fait foi pour ses projets.
    const entree = stockage.espace.getMap<{ supprime?: boolean; cree?: number }>('projets').get(id);
    if (!entree || entree.supprime) stockage.espace.getMap('projets').set(id, { cree: Date.now() });
    await stockage.indexer(id, p.doc);
    n++;
  }
  return n;
}

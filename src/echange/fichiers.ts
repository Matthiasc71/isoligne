import type * as Y from 'yjs';
import type { Stockage } from '../data/stockage';
import { telecharger } from '../graph/export';
import { estIos } from '../notif/service';
import { depuisMarkdown, versMarkdown } from './markdown';
import { depuisOpml, versOpml } from './opml';
import { ecrireProjet, lireProjet, type ProjetEch } from './projet';
import { nomFichier, restaurerSauvegarde } from './sauvegarde';

/** Donne un fichier : feuille de partage du système sur iPhone (Fichiers, Mail…), téléchargement ailleurs. */
export async function livrer(contenu: Blob, nom: string): Promise<void> {
  const fichier = new File([contenu], nom, { type: contenu.type || 'application/octet-stream' });
  if (estIos() && navigator.canShare?.({ files: [fichier] })) {
    try { await navigator.share({ files: [fichier] }); return; } catch (e) {
      if ((e as Error).name === 'AbortError') return; // partage annulé par l'utilisateur
    }
  }
  telecharger(contenu, nom);
}

export async function exporterProjet(doc: Y.Doc, format: 'md' | 'opml'): Promise<void> {
  const p = lireProjet(doc);
  const texte = format === 'md' ? versMarkdown(p) : versOpml(p);
  const type = format === 'md' ? 'text/markdown;charset=utf-8' : 'text/x-opml;charset=utf-8';
  await livrer(new Blob([texte], { type }), `${nomFichier(p.titre)}.${format}`);
}

/** Nouveau projet rempli (import, modèle de départ) ; renvoie son identifiant. */
export async function creerDepuis(stockage: Stockage, e: ProjetEch): Promise<string> {
  const id = await stockage.creerProjet({ titre: e.titre, type: e.type, couleur: e.couleur });
  const p = stockage.ouvrir(id);
  ecrireProjet(p.doc, e);
  p.annuler.clear();
  await stockage.indexer(id, p.doc);
  return id;
}

export type ResultatImport = { genre: 'projet'; id: string; titre: string } | { genre: 'sauvegarde'; projets: number };

/** Markdown ou OPML → nouveau projet ; sauvegarde zip → fusion. Tout autre fichier est refusé. */
export async function importerFichier(stockage: Stockage, f: File): Promise<ResultatImport> {
  const nom = f.name.toLowerCase();
  const titre = f.name.replace(/\.[^.]+$/, '') || 'Import';
  if (f.size > 50 * 1024 * 1024) throw new Error('Fichier trop lourd (50 Mo au plus).');
  if (nom.endsWith('.zip')) return { genre: 'sauvegarde', projets: await restaurerSauvegarde(stockage, new Uint8Array(await f.arrayBuffer())) };
  if (/\.(opml|xml)$/.test(nom)) {
    const p = depuisOpml(await f.text(), titre);
    return { genre: 'projet', id: await creerDepuis(stockage, p), titre: p.titre };
  }
  if (/\.(md|markdown|txt)$/.test(nom)) {
    const p = depuisMarkdown(await f.text(), titre);
    return { genre: 'projet', id: await creerDepuis(stockage, p), titre: p.titre };
  }
  throw new Error('Format non pris en charge : Markdown (.md), OPML (.opml) ou sauvegarde (.zip).');
}

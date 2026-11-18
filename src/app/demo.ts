import type { Stockage } from '../data/stockage';
import { RACINE } from '../data/schema';
import { basculerFait, creerNoeud } from '../tree/arbre';
import { creerBloc, modifierMeta, poserBloc, texteBloc } from '../data/projet';
import { aujourdhui } from '../time/dates';

/** Décale la date du jour de `j` jours (format AAAA-MM-JJ, Paris). */
function dans(j: number): string {
  return aujourdhui(Date.now() + j * 86_400_000);
}

/** Projet de 500 nœuds (5 branches × 9 sous-branches × ~10 éléments) pour mesurer les performances. */
export async function chargerGrandProjet(s: Stockage): Promise<string> {
  const id = await s.creerProjet({ titre: 'Gros projet', type: 'idees', couleur: 'ciel' });
  const { doc } = s.ouvrir(id);
  doc.transact(() => {
    let n = 0;
    for (let a = 0; a < 5 && n < 500; a++) {
      const b = creerNoeud(doc, RACINE, undefined, { texte: `Branche ${a + 1}` }); n++;
      for (let c = 0; c < 9 && n < 500; c++) {
        const sb = creerNoeud(doc, b, undefined, { texte: `Sous-branche ${a + 1}.${c + 1}` }); n++;
        for (let d = 0; d < 10 && n < 500; d++) { creerNoeud(doc, sb, undefined, { texte: `Élément ${n}`, tache: d % 3 === 0 }); n++; }
      }
    }
  });
  await s.indexer(id, doc);
  return id;
}

/** Projet très indenté aux libellés longs, pour vérifier la lisibilité du graphe. */
export async function chargerProjetDense(s: Stockage): Promise<string> {
  const id = await s.creerProjet({ titre: 'Parafoudre', type: 'pro', couleur: 'ciel' });
  const { doc } = s.ouvrir(id);
  doc.transact(() => {
    const etude = creerNoeud(doc, RACINE, undefined, { texte: 'Étude préalable' });
    creerNoeud(doc, etude, undefined, { texte: 'Relevé du site', tache: true });
    const normes = creerNoeud(doc, etude, undefined, { texte: 'Normes applicables' });
    creerNoeud(doc, normes, undefined, { texte: 'NF C 15-100' });
    creerNoeud(doc, normes, undefined, { texte: 'NF EN 61643-11' });
    const cdc = creerNoeud(doc, RACINE, undefined, { texte: 'Construire cahier des charges du parafoudre' });
    creerNoeud(doc, cdc, undefined, { texte: 'Définir le niveau de protection', tache: true });
    const courants = creerNoeud(doc, cdc, undefined, { texte: 'Courants de décharge' });
    creerNoeud(doc, courants, undefined, { texte: 'In nominal' });
    creerNoeud(doc, courants, undefined, { texte: 'Imax' });
    creerNoeud(doc, courants, undefined, { texte: 'Iimp onde 10/350' });
    creerNoeud(doc, cdc, undefined, { texte: 'Tension de protection Up', tache: true, echeance: dans(4) });
    creerNoeud(doc, cdc, undefined, { texte: 'Coordination avec les disjoncteurs', tache: true });
    const env = creerNoeud(doc, cdc, undefined, { texte: 'Environnement' });
    creerNoeud(doc, env, undefined, { texte: 'Température' });
    creerNoeud(doc, env, undefined, { texte: 'Indice IP' });
    creerNoeud(doc, cdc, undefined, { texte: 'Signalisation de fin de vie', tache: true });
    const valid = creerNoeud(doc, RACINE, undefined, { texte: 'Validation' });
    creerNoeud(doc, valid, undefined, { texte: 'Relecture bureau d’études', tache: true });
    creerNoeud(doc, valid, undefined, { texte: 'Signature client', tache: true });
    creerNoeud(doc, RACINE, undefined, { texte: 'Commande', tache: true, echeance: dans(21) });
  });
  await s.indexer(id, doc);
  return id;
}

/** Données de démonstration reprenant les maquettes (développement et tests uniquement). */
export async function chargerDemo(s: Stockage): Promise<void> {
  const cafe = await s.creerProjet({ titre: 'Café Orge', type: 'pro', couleur: 'vert-deau' });
  const memoire = await s.creerProjet({ titre: 'Mémoire M2', type: 'pro', couleur: 'lilas' });
  const demenagement = await s.creerProjet({ titre: 'Déménagement', type: 'perso', couleur: 'ocre' });
  const maree = await s.creerProjet({ titre: 'Marée basse', type: 'creatif', couleur: 'orange' });
  await s.creerProjet({ titre: 'Jardin partagé', type: 'idees', couleur: 'vert' });

  {
    const { doc } = s.ouvrir(cafe);
    const id = creerNoeud(doc, RACINE, undefined, { texte: 'Identité' });
    creerNoeud(doc, id, undefined, { texte: 'Présentation du logo', tache: true, echeance: dans(3) });
    const t = creerNoeud(doc, id, undefined, { texte: 'Moodboard', tache: true });
    basculerFait(doc, t);
    creerNoeud(doc, id, undefined, { texte: 'Charte', tache: true });
    await s.indexer(cafe, doc);
  }
  {
    const { doc } = s.ouvrir(memoire);
    const a = creerNoeud(doc, RACINE, undefined, { texte: 'Rédaction' });
    creerNoeud(doc, a, undefined, { texte: 'Plan détaillé', tache: true, echeance: dans(11) });
    creerNoeud(doc, a, undefined, { texte: 'Chapitre 1', tache: true });
    creerNoeud(doc, a, undefined, { texte: 'Chapitre 2', tache: true });
    await s.indexer(memoire, doc);
  }
  {
    const { doc } = s.ouvrir(demenagement);
    const a = creerNoeud(doc, RACINE, undefined, { texte: 'Cartons' });
    const t1 = creerNoeud(doc, a, undefined, { texte: 'Livres', tache: true });
    basculerFait(doc, t1);
    creerNoeud(doc, a, undefined, { texte: 'Cuisine', tache: true });
    creerNoeud(doc, RACINE, undefined, { texte: 'Remise des clés', tache: true, echeance: dans(14) });
    await s.indexer(demenagement, doc);
  }
  {
    const { doc } = s.ouvrir(maree);
    modifierMeta(doc, 'fin', dans(102));
    const ecriture = creerNoeud(doc, RACINE, undefined, { texte: 'Écriture' });
    const syn = creerNoeud(doc, ecriture, undefined, { texte: 'Synopsis', tache: true });
    const sce = creerNoeud(doc, ecriture, undefined, { texte: 'Scénario', tache: true });
    creerNoeud(doc, ecriture, undefined, { texte: 'Découpage', tache: true });
    basculerFait(doc, syn);
    basculerFait(doc, sce);
    const tournage = creerNoeud(doc, RACINE, undefined, { texte: 'Tournage' });
    creerNoeud(doc, tournage, undefined, { texte: 'Repérages', tache: true, echeance: dans(19) });
    creerNoeud(doc, tournage, undefined, { texte: 'Matériel', tache: true, echeance: dans(40) });
    creerNoeud(doc, tournage, undefined, { texte: 'Équipe', tache: true });
    const post = creerNoeud(doc, RACINE, undefined, { texte: 'Post-prod' });
    creerNoeud(doc, post, undefined, { texte: 'Montage', tache: true });
    creerNoeud(doc, post, undefined, { texte: 'Mixage', tache: true });
    creerNoeud(doc, post, undefined, { texte: 'Dépôt', tache: true, echeance: dans(102) });
    const b = creerBloc(doc, 'echeance', 0);
    texteBloc(doc, b, 'Dossier CNC');
    poserBloc(doc, b, 'date', dans(54));
    await s.indexer(maree, doc);
  }
}

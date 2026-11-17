import type { TypeProjet } from '../data/schema';
import { noeudVide, type NoeudEch, type ProjetEch } from './projet';

/** Modèles de départ (brief bonus §5) : petites arborescences modifiables, sans dates imposées. */

export type CleModele = 'aucun' | 'court-metrage' | 'client' | 'memoire' | 'demenagement' | 'brainstorm';

interface Modele { cle: Exclude<CleModele, 'aucun'>; libelle: string; type: TypeProjet; arbre: NoeudEch[] }

const b = (texte: string, enfants: NoeudEch[] = []) => noeudVide(texte, { enfants });
/** Une étape qui est une action : tâche non cochée. */
const t = (texte: string, enfants: NoeudEch[] = []) => noeudVide(texte, { tache: true, enfants });

export const MODELES: readonly Modele[] = [
  {
    cle: 'court-metrage', libelle: 'Court-métrage', type: 'creatif',
    arbre: [
      b('Écriture', [t('Synopsis'), t('Scénario'), t('Découpage')]),
      b('Préparation', [t('Repérages'), t('Casting'), t('Plan de travail')]),
      b('Tournage'),
      b('Postproduction', [t('Montage'), t('Son'), t('Étalonnage')]),
      b('Diffusion', [t('Festivals')]),
    ],
  },
  {
    cle: 'client', libelle: 'Client', type: 'pro',
    arbre: [b('Brief'), t('Devis'), b('Production', [t('Pistes'), t('Présentation'), t('Corrections')]), t('Livraison'), t('Facturation')],
  },
  {
    cle: 'memoire', libelle: 'Mémoire', type: 'pro',
    arbre: [
      b('Sujet et problématique'), b('Bibliographie'), b('Plan'),
      b('Rédaction', [t('Introduction'), t('Parties'), t('Conclusion')]), t('Relecture'), t('Soutenance'),
    ],
  },
  {
    cle: 'demenagement', libelle: 'Déménagement ou événement', type: 'perso',
    arbre: [
      b('Avant', [t('Cartons'), t('Résiliations'), t('Changements d’adresse')]),
      b('Jour J', [t('Camion'), t('Aide')]),
      b('Après', [t('Installation'), t('Remise des clés')]),
    ],
  },
  { cle: 'brainstorm', libelle: 'Brainstorm', type: 'idees', arbre: [b('Question'), b('Idées'), b('À creuser'), b('Écartées')] },
];

export function projetDepuisModele(cle: Exclude<CleModele, 'aucun'>, titre: string, type: TypeProjet, couleur: ProjetEch['couleur']): ProjetEch {
  const m = MODELES.find((x) => x.cle === cle)!;
  return { titre, type, couleur, statut: 'en-cours', epingle: false, fin: null, arbre: structuredClone(m.arbre), blocs: [{ type: 'arbre' }], liens: [] };
}

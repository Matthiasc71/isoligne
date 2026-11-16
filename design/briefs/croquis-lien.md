# Brief : blocs Croquis et Lien

Statut : **validé le 16.11.2026** : planche plein écran, format fixe 2,5:1, SVG seul (pas de miniature PNG). Spec : §4.1 (croquis, liens), §8.4.5 (figures). Référence : la « FIG. 1 » de `design/maquettes/v2-projet-sombre.png`.

## 1. Rôle
Mode **Operate**. Deux blocs de la page projet :
- le **croquis** : une esquisse rapide au doigt ou au stylet (repérage, plan, schéma) ;
- le **lien** : une référence web retrouvée d'un coup d'œil.

Les deux restent sobres dans la page ; leur édition s'ouvre au toucher.

## 2. Croquis

### Dans la page (lecture)
- La figure, au format 1000 × 400 (2,5:1, comme la maquette), entourée de **4 repères d'angle** en cote, sans cadre plein.
- Dessous, en cote : « FIG. 1 », suivi de la légende si elle existe (« FIG. 1 — Plage au petit matin »).
- Les traits suivent le thème : craie la nuit, encre le jour. Le rouge et la couleur du calque restent possibles.
- Un croquis vide affiche les repères et « FIG. 1 » ; le toucher ouvre la planche.
- **Couverture** : un croquis marqué « en couverture » s'affiche aussi sous l'en-tête du projet, à la place de la figure de la maquette.

### Planche (édition, plein écran)
- Le dessin occupe toute la largeur, sur la grille.
- Barre d'outils en bas, icônes seules :
  - crayon fin, moyen, épais ;
  - encre : trait, cote, redline, calque ;
  - gomme (efface un trait entier) ;
  - annuler, rétablir ;
  - « Terminé ».
- La légende se saisit sous le dessin. « Couverture » et « Effacer tout » (avec confirmation) sont dans le menu « ··· ».
- Saisie : Pointer Events, pression du stylet si l'appareil la donne, sinon pression simulée selon la vitesse. Le doigt dessine ; deux doigts déplacent la page sans dessiner.
- À l'apparition, le trait se dessine en 200 ms, sauf avec « réduire les animations ».

### Accessibilité
La figure est une image nommée par sa légende (« FIG. 1, Plage au petit matin, 12 traits »). Un croquis ne porte pas d'information indispensable ; la légende la remplace pour VoiceOver.

## 3. Lien

### Dans la page
- **Une ligne en body** : le titre de la page, ou l'adresse tant qu'il n'est pas connu.
- **Une ligne grise en cote** : le nom du site.
- La description n'est pas affichée (une seule ligne grise par élément, spec §8.0). Elle apparaît dans le détail.
- Pas d'image, pas de favicon (décision « aucune image »).
- **Toucher** : ouvre la page dans le navigateur, sans transmettre l'adresse d'Isoligne. **Appui long** ou « ··· » : détail (adresse complète, description, copier, modifier, supprimer).

### Saisie
- Nouveau bloc Lien : un champ « Adresse », pré-rempli si le presse-papiers contient une adresse.
- Après validation, l'aperçu est demandé au Worker. Hors ligne, il le sera au retour du réseau. En attendant, le site s'affiche à partir de l'adresse.
- Une adresse invalide est refusée sur place, en une ligne : « Adresse invalide ».
- Ajout rapide (bouton + global) : « Lien dans un projet », avec la même détection du presse-papiers.

## 4. États
- **Croquis** : vide, en cours, avec légende, en couverture. Jusqu'à environ 300 traits par croquis.
- **Lien** :
  - vide (champ) ;
  - en attente (site seul) ;
  - aperçu prêt ;
  - échec : « Aperçu indisponible », en cote, sans alarme ; le lien reste utilisable.

## 5. Contraintes
- 3 tailles de texte : body, cote ; le Label n'apparaît que dans la barre de la planche.
- Couleurs du thème uniquement, jamais de couleur libre.
- Le croquis reste vectoriel. La spec prévoyait aussi une miniature PNG : je propose de la remplacer par le SVG lui-même, plus léger et net à toute taille. Une miniature PNG ne serait produite qu'à l'export (jalon 6).
- Le Worker voit l'adresse demandée : seule exception au chiffrement de bout en bout, documentée. Il ne garde rien, à part un cache d'un jour de l'aperçu.

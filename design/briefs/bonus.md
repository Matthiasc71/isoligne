# Brief : recherche, import/export, sauvegarde, partage, modèles, palette, aide

Statut : **à valider**. Choix du 17.11.2026 :
- liens de partage valables **30 jours** par défaut ;
- **indice au premier usage** pour les gestes, plus une page « Gestes et raccourcis » ;
- **rappel mensuel discret** pour la sauvegarde.

Spec : §4.1 (MiniSearch, fflate), §4.2 point 5, §7.5, §7.6, §7.8, §7.9, §10.

Mode **Operate** partout : des outils qu'on retrouve sans y penser. Aucun nouvel écran spectaculaire ; la marque tient aux détails (cotes, cartouche, nomenclature).

## 1. Recherche (onglet « Recherche »)
- **Un seul champ**, au focus dès l'ouverture. Sous lui, des filtres en cases : **Texte · Tâches · Croquis · Liens · En retard**. « Images » de la spec devient « Croquis », puisqu'il n'y a pas d'images.
- **Ce qui est cherché** : titres de projets, branches (avec leur numéro « 1.2 »), notes des branches, blocs texte, titres d'échéances, légendes de croquis, titres, sites et adresses des liens.
- **Moteur** : MiniSearch, en local. Insensible aux accents et à la casse, tolère une faute légère (« memoir » trouve « Mémoire »), cherche aussi par préfixe pendant la frappe.
- **Index** : tenu à jour à chaque modification, dans l'index local (Dexie), pour qu'une recherche parte instantanément sans ouvrir chaque projet.
- **Résultats groupés par projet** :
  - en-tête du groupe : carré calque et titre du projet ;
  - par résultat : la nature en cote (« 1.2 », « Texte », « Échéance · jeu. 19.11 », « FIG. 2 », « Lien · exemple.fr »), puis un extrait en body où les mots trouvés sont **soulignés et en gras** (pas de surligneur coloré) ;
  - au plus 5 résultats par projet, puis « 3 de plus » qui déplie le groupe.
- **Toucher un résultat** ouvre le nœud (panneau ouvert) ou le bloc, comme depuis le calendrier.
- **Vides** : sans saisie, les 5 dernières recherches (effaçables). Sans résultat : « Aucun résultat ».

## 2. Import et export
- **Exporter un projet** (« ··· » du projet → « Exporter ») : **Markdown** (.md) ou **OPML** (.opml).
  - Sur iPhone, la feuille de partage du système (Fichiers, Mail…) ; sur ordinateur, un téléchargement.
  - Le graphe garde son propre export SVG et PNG (jalon 2).
- **Format Markdown**, lisible tel quel :
  - `# Titre`, puis une ligne de cote en commentaire HTML pour le type, la couleur, le statut et les liens libres (métadonnées) ;
  - l'arborescence en liste imbriquée : `- [ ]` pour une tâche, `- [x]` pour une tâche faite, ` @2026-11-19` (ou `@2026-11-19T14:30`) pour une échéance, ` {orange}` pour une couleur ;
  - les blocs texte en paragraphes, les liens en `[titre](adresse)`, les croquis en `![FIG. 1 — légende](croquis)`, avec le tracé dans le commentaire.
- **OPML** : une ligne par branche ; tâche, date, couleur et note en attributs.
- **Importer** (Réglages → Données → « Importer un fichier ») : Markdown ou OPML crée un **nouveau projet** ; une sauvegarde zip est **fusionnée** (voir §3). Un autre format est refusé par un message clair.
- **Garantie testée** : un aller-retour Markdown ou OPML ne perd rien (texte, tâches, dates, couleurs, notes, liens libres).

## 3. Sauvegarde complète
- **Réglages → Données** :
  - « **Sauvegarder tout** » produit `isoligne-2026-11-17.zip` (fflate). Pour chaque projet, il contient l'état exact (Yjs) et une copie lisible hors de l'app (Markdown et croquis en SVG), plus un `manifeste.json` ;
  - « **Restaurer une sauvegarde** » **fusionne** : rien n'est écrasé, aucun doublon (les états Yjs se combinent) ;
  - une phrase sobre : « Le fichier n'est pas chiffré : rangez-le en lieu sûr. »
- **Rappel** : une ligne de cote, « Dernière sauvegarde il y a 34 jours », ou « Aucune sauvegarde ». Au-delà de 30 jours, elle passe à « Sauvegarde conseillée ». Jamais de notification ni de rouge : le rouge reste aux échéances.

## 4. Partage en lecture seule
- **Partager** (« ··· » du projet → « Partager en lecture seule ») ouvre une feuille :
  - durée en segments : **7 j · 30 j · Jamais** (30 j par défaut) ;
  - une phrase : « Toute personne qui a ce lien voit cet instantané. Le serveur ne peut pas le lire. » ;
  - « Créer le lien ». Le lien s'affiche ensuite en cote, avec « Copier » et « Partager » (feuille du système).
- **Instantané** : le projet tel qu'il est au moment du partage, sans suivre les modifications ; « Mettre à jour » le remplace en gardant le même lien. Il contient la page (cartouche, arborescence numérotée, textes, échéances, liens, croquis) et le graphe radial (SVG).
- **Chiffrement** : l'instantané est chiffré sur l'appareil avec une clé neuve, et la clé n'est que dans le lien, après le `#`. Les navigateurs n'envoient jamais cette partie aux serveurs. Le Worker garde un bloc illisible et l'empreinte de l'identifiant ; un lien expiré ou révoqué est effacé.
- **Vue du destinataire** : l'app s'ouvre en lecture seule.
  - Pas de barre de navigation ni d'édition.
  - En tête, en cote : « Instantané du 17.11.2026 · lecture seule ». Puis le cartouche, et les onglets **Page · Graphe**.
  - Lien expiré ou révoqué : « Ce lien n'est plus valable. »
- **Réglages → « Liens partagés »** : projet, créé le, expire le, « Mettre à jour », « Révoquer » (confirmé).
- **Sans synchro** : « Le partage passe par votre serveur de synchro. Activez d'abord la synchro. »

## 5. Modèles de départ
- Dans « Nouveau projet », une ligne « **Modèle** » propose : Aucun (par défaut), Court-métrage, Client, Mémoire, Déménagement ou événement, Brainstorm. Le modèle choisit aussi le type ; la couleur reste au choix.
- **Contenu**, modifiable ensuite :
  - **Court-métrage** :
    - Écriture : Synopsis, Scénario, Découpage ;
    - Préparation : Repérages, Casting, Plan de travail ;
    - Tournage ;
    - Postproduction : Montage, Son, Étalonnage ;
    - Diffusion : Festivals.
  - **Client** :
    - Brief ;
    - Devis ;
    - Production : Pistes, Présentation, Corrections ;
    - Livraison ;
    - Facturation.
  - **Mémoire** :
    - Sujet et problématique ;
    - Bibliographie ;
    - Plan ;
    - Rédaction : Introduction, Parties, Conclusion ;
    - Relecture ;
    - Soutenance.
  - **Déménagement ou événement** :
    - Avant : Cartons, Résiliations, Changements d'adresse ;
    - Jour J : Camion, Aide ;
    - Après : Installation, Remise des clés.
  - **Brainstorm** : Question, Idées, À creuser, Écartées.
- Les étapes qui sont des actions (Devis, Facturation, Relecture…) sont des tâches non cochées. Aucune date n'est imposée.

## 6. Palette de commandes (ordinateur, Cmd/Ctrl+K)
- Cmd+K ouvre une **palette** et non plus directement « Ajouter ».
  - En haut, un champ « Commande ou projet ».
  - Dessous, une liste groupée en label : **Ajouter** (Nouveau projet, Idée, Lien), **Aller à** (chaque projet, Calendrier, Recherche, Réglages), **Ce projet** (Exporter en Markdown, Exporter en OPML, Partager, Ouvrir le graphe), **Données** (Sauvegarder tout), **Thème** (Auto, Clair, Sombre), **Aide** (Gestes et raccourcis).
- **Filtre** tolérant aux accents et aux fautes légères. Flèches pour parcourir, Entrée pour lancer, Échap pour fermer. Le raccourci de chaque commande est à droite, en cote.
- Sur iPhone, pas de palette : l'onglet Recherche et le « + » suffisent.

## 7. Aide : gestes et raccourcis
- **Une page unique**, « Gestes et raccourcis » : touche « ? » sur ordinateur, ou Réglages → Aide sur iPhone. Elle tient en deux listes en cote et body :
  - **Gestes (iPhone)** :
    - balayer une ligne vers la droite ou la gauche : indenter ou désindenter ;
    - toucher le numéro : détails ; appui long sur le numéro : déplacer ;
    - appui long sur un projet : actions ;
    - calendrier : appui long sur une échéance puis glisser pour la déplacer, balayer la grille pour changer de mois ;
    - graphe : glisser un nœud et s'arrêter 0,3 s sur un autre pour le rattacher, ailleurs pour l'épingler ;
    - planche : deux doigts pour défiler sans dessiner.
  - **Raccourcis (ordinateur)** : la liste actuelle, plus Cmd+K pour la palette, et les touches du calendrier (flèches, Page préc. et suiv., T).
- **Indice au premier usage**, une seule fois par geste, en une ligne de cote avec « Compris » :
  - dans la nomenclature : « Balayez une ligne pour l'indenter. Appui long sur le numéro pour la déplacer. » ;
  - dans le calendrier : « Appui long sur une échéance pour la déplacer. » ;
  - dans le graphe : « Glissez un nœud sur un autre pour le rattacher. » ;
  - dans la planche : « Deux doigts pour défiler. »
  - Il disparaît aussi dès que le geste a été fait une fois.

## 8. Contraintes
- Tout fonctionne hors ligne, sauf créer, mettre à jour ou révoquer un partage, qui demandent le réseau et le disent.
- **Accessibilité** :
  - résultats en liste annoncée (« 12 résultats dans 3 projets ») ;
  - palette en `combobox` avec `listbox` ;
  - champs nommés et cibles de 44 px ;
  - mots trouvés marqués aussi par la graisse, pas seulement par le soulignement ;
  - VoiceOver lit les extraits en entier.
- **Bibliothèques** : MiniSearch et fflate (MIT), versions vérifiées sur npm et vieilles d'au moins deux semaines, ajoutées aux licences.
- **Gratuité** : partage limité à 2 Mo par instantané et à 50 liens actifs, très loin de la limite de 500 Mo.
- Trois tailles de texte par écran ; rayon 0 ; aucune ombre.

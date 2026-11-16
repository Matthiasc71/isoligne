# Brief : Accueil / Projets

Statut : **proposé le 16.11.2026, en attente de confirmation.** Référence : `design/maquettes/v2-accueil-sombre.png`.

## 1. Rôle et contexte
Mode **Operate**. Écran d'ouverture de l'app, presque toujours sur iPhone, d'une main, pour quelques secondes : « qu'est-ce qui presse ? », puis entrer dans un projet. Sur ordinateur, il devient la colonne de gauche de la mise en page à 3 colonnes.

## 2. Résultat attendu
Voir en un coup d'œil **la prochaine échéance** et, dessous, tous les projets actifs avec leur prochaine date. Réussite : ouvrir l'app → savoir quoi faire → toucher le bon projet, en moins de 3 s.

## 3. Direction
Tirage de plan (DESIGN.md). Point focal unique : le **compte à rebours en redline** (« J-3 »), coté par une ligne de cote « 3 j » comme une mesure sur un plan. Tout le reste est en trait et en cote.

## 4. Structure (de haut en bas)
1. **Date du jour** en cote (« LUN 16.11 »). À droite, un bouton icône « ··· » (feuille : Trier · Filtrer · Archives · Réglages).
2. **Prochaine échéance** : « J-3 » en display redline ; à droite, le titre de la tâche (body) et une ligne de cote : carré de calque + projet + « jeu. 19.11 ». Dessous, la ligne de cote entre aujourd'hui et l'échéance, marquée « 3 j ». Toucher ce bloc ouvre le nœud dans son projet.
3. **Liste des projets** : par ligne, carré de calque, titre (body), prochaine date à droite (cote), fin trait d'avancement dessous (longueur = part des tâches faites ; absent s'il n'y a aucune tâche). Lignes de 64 px séparées par un trait de cote.
4. **Barre du bas** : Projets · Calendrier · Recherche · + (le + en redline), icônes seules.

**Écart avec la maquette** : le mot « ISOLIGNE » en titre (28 px) disparaît. Avec lui, l'écran aurait 4 tailles de texte au lieu de 3 au plus (spec §8.0), et le nom de l'app est déjà sur l'icône. Test « si je l'enlève, quelque chose manque-t-il ? » : non.

## 5. États et volumes
- **Volumes** : 0 à ~40 projets actifs ; titres de 1 à ~40 caractères (coupés sur une ligne, titre complet pour VoiceOver).
- **Aucun projet** : la date, puis « Aucun projet » en cote. L'action est le + de la barre.
- **Aucune échéance** : le bloc 2 disparaît, la liste remonte.
- **Échéance en retard** : le bloc 2 affiche « J+2 » (pas seulement la couleur : le signe change). Dans la liste, une date en retard s'écrit « J+2 » en redline, sans nuage.
- **Projet sans date** : rien à droite.
- **Épinglés** : en tête de liste, séparés des autres par un espace de 28 px. Pas d'icône ; VoiceOver annonce « épinglé ».
- **Tri** par défaut : prochaine échéance (les projets sans date ensuite, par modification récente). Tri et filtres sont mémorisés ; un filtre actif se signale par le bouton « ··· » rempli.
- **Archives** : hors de la liste, accessibles par la feuille « ··· ».

## 6. Interactions
- Toucher une ligne : ouvre le projet. Appui long : feuille du projet (épingler, statut, couleur, archiver).
- Le + de la barre ouvre l'**ajout rapide** : nouveau projet (avec modèle optionnel), ou idée / lien dans un projet existant. Un lien présent dans le presse-papiers est proposé.
- Ordinateur : ↑/↓ pour parcourir, Entrée pour ouvrir, Cmd/Ctrl+K pour la palette.
- Apparition : les traits de séparation se dessinent (200 ms) au premier affichage seulement ; rien avec « réduire les animations ».

## 7. Contraintes
- 3 tailles de texte : display (J-3), body, cote.
- Une seule redline : celle du bloc 2 (la date correspondante dans la liste reprend la redline, puisque c'est la même échéance).
- Couleur de calque toujours suivie du titre ou du numéro.
- VoiceOver : le bloc 2 se lit « Dans 3 jours, Présentation du logo, Café Orge, jeudi 19 novembre ».

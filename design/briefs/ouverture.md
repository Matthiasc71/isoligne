# Brief : ouverture, titre, retrait des sous-points, glisser pour déplacer

Statut : **validé le 17.11.2026**. Propositions vues sur une page de démonstration ; choix **C · Construction** (ouverture) et **2 · Isoligne** (titre).

## Ouverture (C · Construction)
- Au lancement à froid seulement. Un cercle de construction en pointillé et deux axes se tracent, le logo s'y pose, le point rouge marque le centre (≈ 0,95 s).
- Présente dans `index.html` : visible avant même le chargement du code. Retirée dès que les projets sont prêts et l'animation jouée, au plus tard 1,5 s après le lancement (spec : ouverture à froid < 1,5 s). Un toucher la passe.
- « Réduire les animations » : logo fixe, retiré dès que les projets sont prêts.
- Le thème choisi dans les Réglages est posé avant le premier affichage (`public/theme-initial.js`, mémorisé localement) : pas d'éclair de l'autre thème.

## Titre de l'accueil (2 · Isoligne)
- « ISOLIGNE » en titre sous la date, comme dans les maquettes v1.
- Dessous, deux courbes de niveau (le sens du nom) glissent très lentement en sens contraires (cycles de 26 s et 38 s), et un point rouge suit la première.
- Animation CSS de transformation, pas de calcul à chaque image. Arrêtée si l'on réduit les animations. Décorative pour VoiceOver.

## Sous-points décalés
- Toute la ligne, numéro compris, se décale de 20 px par niveau dès 1.1 (avant : seulement le texte, et seulement à partir de 1.1.1). Au-delà de 5 niveaux, le retrait plafonne : la page reste lisible sur iPhone.

## Glisser pour déplacer
- Glisser le **numéro** vers le haut ou le bas déplace la ligne tout de suite, sans appui long. Le numéro ne fait pas défiler la page, donc le geste ne gêne pas le défilement. L'appui long reste possible ; la souris marche aussi.
- Indice et page « Gestes et raccourcis » mis à jour.

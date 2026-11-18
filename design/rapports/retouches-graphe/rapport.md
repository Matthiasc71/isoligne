# Retouche : lisibilité du graphe (18.11.2026)

Brief : `design/briefs/graphe-lisibilite.md`. Projet de vérification : `?demo=dense` (« Parafoudre », 3 niveaux, libellés longs).

## Constat (avant)
- Radial : cadres de niveau 2 posés sur ceux du niveau 1, libellés qui se chevauchent, arêtes qui traversent les cadres.
- Arbre : colonnes à pas fixe de 200 px, plus courtes que les libellés ; « Définir le niveau de protection » recouvrait « In nominal ».
- Recadrage : tout dans l'écran, texte réduit à 6–7 px sur iPhone. Tous les niveaux avaient le même poids.

## Corrections
- Hiérarchie par profondeur : niveau 1 en cadre (capitales 14 px, 3 lignes au plus) ; niveau 2 carré 9 px + 14 px ; niveau 3 et plus carré 6 px + 12 px en couleur secondaire.
- Libellés mesurés avec les vraies polices (sonde hors écran, cache) ; estimation majorée hors DOM (tests, Worker du mode libre).
- Radial : chaque cercle s'agrandit jusqu'à ce qu'aucun encombrement (libellé compris) n'en recouvre un autre.
- Arbre : colonnes calées sur le plus long libellé de la précédente, écarts verticaux selon la hauteur des libellés, arête qui part après le libellé du parent.
- Recadrage à une taille lisible minimale (0,8 iPhone, 0,75 ordinateur), centré sur le centre (radial) ou la racine (arbre).
- Rattachement par glisser : la cible est le nœud sous le doigt (cadre, ou carré et libellé), plus fiable avec des cadres larges.
- Export SVG/PNG et vue partagée : même hiérarchie et mêmes positions.

## Critique
- Hiérarchie lisible au premier coup d'œil, dans les deux modes ; la couleur n'est jamais seule (taille et forme).
- Le radial d'un gros projet reste grand : c'est le prix des libellés horizontaux (choix confirmé). On glisse ou on pince.
- Petit reste : en radial, une arête peut frôler un libellé voisin ; le fond papier des libellés la masque à l'écran (pas dans l'export).

## Audit
- Contraste : niveau 3 en `--trait-2`, déjà AA pour le texte des cotes dans les deux modes.
- Libellés coupés au-delà de 2 ou 3 lignes : texte complet dans le panneau de sélection et dans le nom accessible du nœud.
- Performance : 500 nœuds, radial 22 ms, arbre 5 ms (Node, estimation) ; mesures DOM mises en cache.
- `npx impeccable detect src/` : 0 anti-pattern ; 14 px ajouté au système (`--taille-graphe`, DESIGN.md).
- Tests : non-chevauchement radial et arbre sur un projet dense, hiérarchie, coupure des libellés ; e2e graphe et accessibilité verts (Chromium).

## Captures
`avant-*`, `apres-*` (jour et nuit, iPhone et ordinateur), `export-radial.png`.

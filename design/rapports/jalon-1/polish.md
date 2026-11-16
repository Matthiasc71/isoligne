# Distill, quieter, polish : jalon 1

## Distill (épurer)
- Accueil : le mot « ISOLIGNE » est retiré (règle des 3 tailles de texte).
- Accueil : le trait d'avancement est masqué tant qu'aucune tâche n'est faite. Un tiret à 0 % ressemblait à un défaut.
- Étiquettes « Couleur » et « Note » masquées visuellement (gardées pour VoiceOver) : les carrés de couleur et le texte d'invite parlent d'eux-mêmes.
- Ligne de cote à 0 % : seule la borne reste, sans flèche ni trait plein.

## Quieter (calmer)
- Animation de tracé réservée aux lignes **nouvellement créées**. Ouvrir une page ne fait plus « dessiner » 500 lignes.
- Pas de survol animé : seul le remplissage change, instantanément.

## Polish (finitions)
- Grille de fond visible : le fond de `<body>` la recouvrait.
- « 22 % » ne passe plus à la ligne ; la cote se raccourcit à la place.
- Date du bloc échéance : ne déborde plus, et la case est alignée sur l'arborescence.
- Branches de premier niveau alignées sur leur numéro.
- Cartouche : 3 cases par rangée pour révision, création et modification.
- Surfaces du navigateur thématisées : sélection, curseur (redline), barres de défilement, anneau de focus de 2 px.
- Colonne projets sur ordinateur : « J-3 » au-dessus du texte, au lieu d'un retour à la ligne serré.

## Checklist UI UX Pro Max (`design/checklist.md`)
Cochée pour l'accueil, la page projet, le cartouche, le panneau et l'ajout. Deux exceptions, à reprendre au jalon 7 :
- VoiceOver sur appareil ;
- WebKit (le moteur de Safari) : absent de cet environnement. La CI l'installe et lance les mêmes tests.

# Brief : Page projet

Statut : **proposé le 16.11.2026, en attente de confirmation.** Référence : `design/maquettes/v2-projet-sombre.png`.

## 1. Rôle et contexte
Mode **Operate**. Le lieu où l'on pense un projet : surtout sur iPhone (consulter, cocher, ajouter une idée), parfois longuement sur ordinateur (structurer au clavier, colonne centrale à côté du graphe).

## 2. Résultat attendu
Lire l'état du projet sans rien toucher (avancement, échéance urgente, branches), puis éditer l'arborescence aussi vite qu'une liste de notes. Réussite : ajouter, indenter et cocher sans jamais ouvrir un menu.

## 3. Direction
Tirage de plan. L'arborescence est une **nomenclature** (1, 1.1, 1.2) ; l'avancement est une **ligne de cote** ; l'échéance la plus urgente est entourée d'un **nuage de révision**.

## 4. Structure (de haut en bas)
1. **Barre haute** : retour « ‹ » à gauche, « ··· » à droite (partager, exporter, statut, archiver, supprimer).
2. **En-tête minimal** : carré de calque + « 01 » (cote), TITRE (title, capitales), une seule ligne grise « Créatif · fin 26.02 ». Toucher le titre déplie le **cartouche** (type, échéance finale, statut, couleur, révision, créé, modifié) ; le retoucher le replie.
3. **Couverture** (optionnelle) : un croquis marqué « en couverture », avec ses repères d'angle et « FIG. 1 ». Remplace la couverture photo, abandonnée.
4. **Avancement** : ligne de cote suivie de « 39 % ». Absente s'il n'y a aucune tâche.
5. **Blocs empilés**, dans l'ordre choisi : arborescence (nomenclature), texte, deadline, lien (texte seul), croquis (FIG. n), séparateur.
6. **Barre du bas** (à la place de la navigation) : sélecteur **Page · Graphe · Frise** + bouton + en redline (ajout de bloc).

### La nomenclature
- Branche de premier niveau : numéro (cote), libellé en Label capitales, à droite « + 2 faites » (cote) quand des tâches sont repliées.
- Éléments : numéro, case carrée si c'est une tâche, libellé (body), lignes de points jusqu'à la date à droite (cote). Seule l'échéance la plus urgente du projet porte le nuage rouge.
- **Les tâches faites se replient** sous « + 2 faites » ; le toucher les déplie.
- Numérotation calculée sur tout l'arbre (le « 2.1 » reste « 2.1 » partout).

### Poupée russe
- Tout élément qui a des enfants peut être **ouvert** : la page se recentre sur lui. L'en-tête devient un fil d'Ariane en cote (« MARÉE BASSE › TOURNAGE », chaque segment touchable), son libellé passe en titre, sa note s'affiche comme texte, et ses enfants forment la nomenclature. Le graphe et la frise suivent le même recentrage.
- Ouvrir : depuis le panneau du nœud (« Ouvrir »), ou par Cmd/Ctrl+→ sur ordinateur. Remonter : « ‹ » ou le fil d'Ariane ; Cmd/Ctrl+←.

## 5. États et volumes
- **Volumes** : de 0 à ~500 nœuds, 0 à ~20 blocs ; liste virtualisée.
- **Projet vide** (créé sans modèle) : en-tête seul, puis un champ « Première idée » (body, gris) qui crée le premier élément. Le + reste disponible.
- **Pas d'échéance** : la ligne grise devient « Créatif ».
- **Titres longs** : 2 lignes au plus, puis coupés (complet au toucher, dans le cartouche).
- **Édition hors ligne** : aucun indicateur. La synchro est silencieuse ; un trait de cote immobile n'apparaît dans les Réglages qu'en cas d'échec prolongé.

## 6. Interactions
- **Toucher un libellé** : édition directe (curseur). Barre au-dessus du clavier, icônes seules : indenter, désindenter, cocher, date, couleur.
- **Toucher le numéro** (zone de 44 px) : **panneau du nœud** en feuille du bas (date et heure, rappels, couleur, note, Ouvrir, monter / descendre / rattacher à…, supprimer avec annulation).
- **Glisser à droite / à gauche** : indenter / désindenter. **Appui long** : déplacer. Chaque geste a son équivalent dans le panneau (WCAG 2.5.7).
- **Toucher la case** : cocher, une croix se trace (200 ms). La tâche glisse dans « + n faites » après 1 s.
- **Ordinateur** : Entrée, Tab / Maj+Tab, Alt+↑/↓, Cmd/Ctrl+Entrée, Retour arrière sur un élément vide, Cmd/Ctrl+. (spec §4.1). Aide complète avec `?`.
- **Bouton +** : feuille des blocs (Arborescence, Texte, Deadline, Lien, Croquis, Séparateur), avec un libellé sous chaque icône : c'est un menu de choix, pas une barre d'outils.
- **Sélecteur Page · Graphe · Frise** : bascule de vue, avec une transition de 300 ms entre les positions (aucune avec « réduire les animations »).

## 7. Contraintes et points laissés au graphe
- 3 tailles de texte : title, body, cote / label (12 px).
- Ordinateur : la page occupe la colonne centrale ; la colonne de droite montre le graphe, et le sélecteur y choisit Graphe ou Frise.
- VoiceOver : la nomenclature est un `tree` (niveaux, état déplié / replié, tâche cochée ou non).
- Le graphe a son propre brief, au jalon 2.

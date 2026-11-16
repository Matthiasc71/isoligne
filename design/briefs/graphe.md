# Brief : Graphe et Frise

Statut : **validé le 16.11.2026** : tâches faites estompées, 4 icônes, glisser = rattacher ou épingler. Référence : `design/maquettes/v2-graphe-sombre.png`. Spec : §6, §7.3, §8.4.6.

## 1. Rôle et contexte
Mode **Operate**. La même arborescence que la Page, vue comme un plan : on y voit la forme du projet, on y crée des liens transversaux, on y réorganise d'un geste.
- **iPhone** : écran plein, atteint par Graphe ou Frise depuis la Page.
- **Ordinateur** : colonne de droite, toujours visible à côté de la Page ; les deux vues bougent ensemble.

## 2. Résultat attendu
Saisir le projet d'un coup d'œil (branches, échéance urgente, liens), puis le modifier sans retourner à la liste. Réussite : rattacher une branche par glisser, et la retrouver aussitôt au bon numéro dans la liste.

## 3. Direction
Plan de construction :
- le centre est un **cercle** portant le carré de calque du projet (ou le libellé de la branche ouverte) ;
- les branches sont des **rectangles bordés** en Label capitales ;
- les feuilles sont de **petits carrés pleins** avec leur libellé à côté ;
- **cercles de construction** en pointillé (radial) ;
- **liens libres** en pointillé courbe, couleur du projet, avec leur libellé ;
- **sélection** = 4 repères d'angle rouges.

Sur les nœuds : seulement le libellé, et la date pour la seule redline.

## 4. Structure (iPhone, de haut en bas)
1. **Barre haute** : « ‹ » (retour à la Page) + titre du projet en Label. En poupée russe, le titre devient la branche ouverte.
2. **Onglets soulignés** : Radial · Arbre · Libre · Frise. L'actif est souligné d'un trait de 2 px.
3. **Toile** : pincer pour zoomer, glisser pour se déplacer, double-toucher le fond pour recadrer.
4. **Panneau de sélection**, seulement quand un nœud est sélectionné :
   - libellé ;
   - une ligne grise « 2.1 · 05.12 · 0/3 » (numéro, date, sous-tâches) ;
   - bouton « › » qui ouvre le panneau complet du nœud (celui de la Page).
   - Cadre en redline seulement si le nœud porte l'échéance urgente, sinon en trait.
5. **Barre d'outils**, icônes seules : Ajouter · Relier · Replier · Exporter (spec : 4 icônes). « Réorganiser » n'apparaît qu'en présence de nœuds déplacés à la main.

**Ordinateur** : mêmes onglets en haut de la colonne, barre d'outils en bas, **mini-carte** dans le coin, info-bulles sur les icônes.

## 5. Interactions
- **Toucher un nœud** : le sélectionne (repères d'angle et panneau). **Double-toucher** : le renomme sur place.
- **Glisser un nœud** :
  - au-dessus d'un autre nœud pendant au moins 0,3 s, la cible prend les repères rouges ; lâcher la **rattache** (changement de parent, refusé s'il créait une boucle) ;
  - ailleurs, le nœud reste où on le pose et devient **épinglé** dans cette disposition.
  - Dans la **frise**, le glisser est horizontal et **change la date**, affichée en direct.
- **Ajouter** : crée un enfant du nœud sélectionné (du centre si rien n'est sélectionné), puis passe en renommage.
- **Relier** : mode « Relier » ; toucher un nœud puis un autre, puis libellé facultatif. Un trait pointillé suit le doigt. Échap ou l'icône quitte le mode.
- **Replier** : replie ou déplie la branche sélectionnée, comme dans la liste.
- **Exporter** : SVG ou PNG, dans le thème courant, avec la grille.
- **Clavier** (ordinateur) :
  - flèches pour passer d'un nœud à l'autre ;
  - Entrée pour renommer, Tab pour ajouter un enfant, Suppr pour supprimer (avec Annuler) ;
  - Cmd+→ pour ouvrir la branche.
- **Alternatives sans glisser** : le panneau du nœud propose déjà « Rattacher à… », « Monter », « Descendre » (WCAG 2.5.7).
- **Transitions** : 300 ms entre deux dispositions, les nœuds glissent de leur ancienne place à la nouvelle. Aucune avec « réduire les animations ». Les traits se dessinent à l'apparition d'un nœud.

## 6. États et volumes
- **0 nœud** : le cercle central seul, et l'icône Ajouter.
- **Jusqu'à 500 nœuds** : 60 i/s visés. Seuls les nœuds visibles sont dessinés ; la disposition libre est calculée hors du fil principal.
- **Frise** :
  - les nœuds sans date n'y figurent pas ; une ligne grise discrète en bas l'indique (« 12 sans date ») ;
  - aujourd'hui est marqué d'un trait rouge vertical ;
  - un couloir par branche de premier niveau, son libellé en Label à gauche.
- **Tâches faites** : **estompées** (trait cote, croix tracée), toujours visibles dans le graphe.

## 7. Contraintes et décisions à confirmer
- 3 tailles de texte : Label (branches), body (feuilles), cote (dates, ligne grise).
- Couleur jamais seule : le centre porte aussi le numéro de calque (pour VoiceOver) ; les liens libres ont un libellé ou un nom accessible.
- VoiceOver : le graphe est une image décrite. La liste reste l'interface de référence pour le lecteur d'écran, et toutes les actions y sont possibles.

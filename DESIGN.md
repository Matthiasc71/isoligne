---
name: Isoligne
description: Tirage de plan d'architecte pour projets personnels. Cyanotype la nuit, diazo le jour.
colors:
  fond-cyanotype: "#0F2D52"
  trait-craie: "#D6E4F0"
  cote-brume: "#8FB0CF"
  redline-vermillon: "#FF8064"
  fond-diazo: "#EEF1EC"
  trait-encre: "#1F4E8C"
  cote-ardoise: "#44658C"
  redline-sanguine: "#B8321C"
  calque-orange-nuit: "#FFA552"
  calque-orange-jour: "#B0601E"
  calque-vert-deau-nuit: "#7FD1B9"
  calque-vert-deau-jour: "#2C8572"
  calque-lilas-nuit: "#C3A6FF"
  calque-lilas-jour: "#7A5CC2"
  calque-ocre-nuit: "#FFD166"
  calque-ocre-jour: "#8F741C"
  calque-vert-nuit: "#9BD38A"
  calque-vert-jour: "#448540"
  calque-ciel-nuit: "#9AD0FF"
  calque-ciel-jour: "#2F6FB0"
  calque-rose-nuit: "#FF9FB2"
  calque-rose-jour: "#C24D6A"
  calque-craie-nuit: "#E6E6E6"
  calque-craie-jour: "#5A5F66"
  encre-impression: "#000000"
typography:
  display:
    fontFamily: "'Archivo Variable', 'Arial Narrow', sans-serif"
    fontSize: "44px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.04em"
    fontVariation: "'wdth' 125"
  title:
    fontFamily: "'Archivo Variable', 'Arial Narrow', sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 125"
  label:
    fontFamily: "'Archivo Variable', 'Arial Narrow', sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.14em"
    fontVariation: "'wdth' 125"
  body:
    fontFamily: "B612, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
  cote:
    fontFamily: "'B612 Mono', ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.04em"
    fontFeature: "'tnum' 1"
rounded:
  none: "0px"
spacing:
  trait: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  marge: "28px"
  section: "40px"
  grille: "60px"
components:
  bouton-icone:
    backgroundColor: "transparent"
    textColor: "{colors.trait-craie}"
    rounded: "{rounded.none}"
    size: "48px"
  bouton-icone-actif:
    backgroundColor: "{colors.trait-craie}"
    textColor: "{colors.fond-cyanotype}"
    rounded: "{rounded.none}"
    size: "48px"
  bouton-ajouter:
    backgroundColor: "transparent"
    textColor: "{colors.redline-vermillon}"
    rounded: "{rounded.none}"
    size: "48px"
  selecteur-vue:
    backgroundColor: "transparent"
    textColor: "{colors.trait-craie}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    height: "52px"
  selecteur-vue-actif:
    backgroundColor: "{colors.trait-craie}"
    textColor: "{colors.fond-cyanotype}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    height: "52px"
  ligne-projet:
    textColor: "{colors.trait-craie}"
    typography: "{typography.body}"
    height: "64px"
  ligne-nomenclature:
    textColor: "{colors.trait-craie}"
    typography: "{typography.body}"
    height: "56px"
  champ:
    backgroundColor: "transparent"
    textColor: "{colors.trait-craie}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    height: "48px"
---

<!-- Relevé sur l'implémentation du jalon 1 (src/design/, src/ui/, src/outliner/). Les tokens sont normatifs. -->

# Design System: Isoligne

## Overview

**Creative North Star : « Le tirage de plan »**

Chaque écran est une feuille de plan d'architecte sortie du tirage : un fond uni (cyanotype bleu de Prusse la nuit, papier diazo vert pâle le jour), une grille de construction à peine visible, des traits de 1 px et des cotes en chiffres mono. Rien ne flotte, rien ne brille. La hiérarchie vient du blanc, de la largeur de l'Archivo et d'un seul accent rouge, la **redline**, qui marque ce qui presse comme un correcteur annote un plan.

L'écran respire : marges de 28 px, sections espacées de 28 à 40 px, une seule ligne grise d'information secondaire par élément. Le détail s'ouvre au toucher. Le vide n'est pas un manque, c'est l'espace de la feuille. Le mode est **Operate** : précision et retenue plutôt qu'expression ; la marque vit dans les détails (cotes, nuages de révision, repères d'angle, nomenclature).

Rejets confirmés : dégradés, verre dépoli, ombres, coins arrondis, bordures colorées à gauche des cartes, emoji, illustrations 3D, textes marketing, polices Inter / Roboto / SF / Poppins / Montserrat / Space Grotesk.

**Key Characteristics:**
- Fond quadrillé permanent : grille majeure 60 px, mineure 12 px, presque invisibles.
- Rayon 0, aucune ombre, traits de 1 px. Les états actifs sont remplis (fond = trait, texte = fond).
- Une seule couleur d'alerte, la redline, et une couleur par projet (« crayon de calque ») toujours accompagnée de son numéro.
- Typo à trois voix : Archivo élargi (titres, étiquettes), B612 (texte), B612 Mono (chiffres et dates).
- Animations de tracé (le trait se dessine), jamais de rebond.

## Colors

Deux tirages d'un même plan : chaque rôle a une valeur nuit (cyanotype) et une valeur jour (diazo), choisie automatiquement selon le réglage de l'appareil (ou forcée dans les Réglages).

### Primary
- **Trait craie** (nuit) / **Trait encre** (jour) : texte principal, traits, bordures, icônes, remplissage des états actifs. Contraste 10,7:1 la nuit, 7,3:1 le jour.

### Secondary
- **Redline vermillon** (nuit) / **Redline sanguine** (jour) : l'échéance la plus urgente, les retards, le bouton « ajouter ». Rien d'autre. Contraste ≥ 4,5:1 même au croisement d'une ligne de grille.

### Tertiary : crayons de calque (couleur de projet)
Huit couleurs, chacune en valeur nuit et jour : orange, vert d'eau, lilas, ocre, vert, ciel, rose, craie. Elles marquent un projet par un petit carré plein (contour décalé de 2 px en mode jour), la pastille du calendrier, le nœud central du graphe et les liens libres. La nuit, toutes atteignent ≥ 4,5:1 ; le jour, ≥ 3:1 (repère graphique) : **jamais de texte en couleur de calque en mode jour.** Écart perceptuel minimal entre deux calques ou avec la redline : ΔE ≥ 24 (calcul : `scripts/contrastes.py`).

### Neutral
- **Fond cyanotype** (nuit) / **Fond diazo** (jour) : le papier. Unique couleur de fond, aucune surface superposée d'une autre teinte.
- **Cote brume** (nuit) / **Cote ardoise** (jour) : texte secondaire, cotes, dates, numéros de nomenclature, séparateurs de liste. ≥ 4,7:1.
- **Grille** : `rgba(214,228,240,.08)` majeure / `.03` mineure la nuit ; `rgba(31,78,140,.07)` / `.025` le jour.

### Named Rules
**La règle de la redline unique.** À l'écran, une seule échéance porte le nuage de révision : la plus urgente (ou en retard). Les autres sont en pointillé de cote. Si deux éléments sont rouges, l'un est en trop.

**La règle du calque numéroté.** Une couleur de projet n'apparaît jamais seule : toujours avec son numéro de calque (« 01 ») ou le titre du projet.

## Typography

**Display Font:** Archivo (famille « Archivo Variable » auto-hébergée), axe de largeur à 125 % (repli : Arial Narrow)
**Body Font:** B612 (repli : system-ui)
**Label/Mono Font:** B612 Mono (repli : ui-monospace)

**Character:** l'Archivo élargi en capitales sonne comme le lettrage d'un cartouche ; la B612, dessinée pour les cockpits, reste lisible en petit et sans fioriture ; la mono aligne les cotes et les dates comme sur une nomenclature.

### Hierarchy
- **Display** (800, 44 px, interligne 1, capitales) : le compte à rebours « J-3 » de l'accueil, et lui seul.
- **Title** (800, 28 px, capitales, interlettrage 0,06 em) : titre du projet, nom du mois du calendrier.
- **Body** (400, 16 px, interligne 1,45) : lignes de liste, tâches, texte des blocs. Largeur de lecture ≤ 68 ch sur ordinateur.
- **Label** (700, 12 px, capitales, interlettrage 0,14 em) : branches de premier niveau de la nomenclature, sélecteur Page · Graphe · Frise, onglets de disposition, cartouche.
- **Cote** (mono 400, 12 px, chiffres tabulaires) : dates (« 19.11 »), numéros (« 2.1 »), pourcentages, « 2 faites ».

### Named Rules
**La règle des trois tailles.** Trois tailles de texte au plus par écran. L'accueil : display, body, cote. La page projet : title, body, cote (label et cote partagent 12 px).

**La règle des chiffres en mono.** Tout chiffre (date, numéro, pourcentage, compte) est en B612 Mono. Un chiffre en B612 proportionnelle est une erreur.

## Layout

Feuille unique, colonne centrale sur iPhone (393 px de large de référence) : marges latérales de 28 px, sections espacées de 28 à 40 px, lignes de liste d'au moins 46 px (64 px pour une ligne de projet à deux étages). Barre du bas fixe (navigation ou sélecteur de vue) au-dessus de la zone de sécurité ; le contenu défile dessous sans être masqué.

Sur ordinateur (≥ 1024 px) : trois colonnes redimensionnables, projets · page · graphe, séparées par un trait de 1 px. La navigation passe en colonne latérale d'icônes. La grille de fond reste continue d'une colonne à l'autre.

Rythme : multiples de 4 px (4, 8, 12, 16, 20, 28, 40, 60). La grille de construction (12 / 60 px) est ancrée au coin haut-gauche de la fenêtre.

### Named Rules
**La règle de la feuille vide.** Si l'on enlève un élément et que rien ne manque, il part. Le vide se défend, il ne se remplit pas.

## Elevation & Depth

Plat, absolument. Aucune ombre, aucun flou, aucune surface surélevée. La profondeur se lit par le trait : un panneau (sélection d'un nœud, cartouche complet, feuille d'action) est un rectangle bordé de 1 px posé sur le même fond, éventuellement séparé par un trait plein. Un état actif se remplit. Un élément sélectionné reçoit quatre repères d'angle en redline.

### Named Rules
**La règle du papier unique.** Il n'existe qu'un papier. Pas de carte plus claire, pas de feuille modale assombrie : une feuille d'action recouvre le contenu avec le même fond et un trait.

## Shapes

Angles vifs partout (rayon 0). Traits de 1 px, pointillés (2 px / 4 px) pour le provisoire et les cercles de construction. Formes signature : le **nuage de révision** (contour festonné autour de la redline), les **repères d'angle** (équerres de 12 px aux quatre coins d'une figure ou d'une sélection), la **ligne de cote** (flèches aux extrémités, trait épais jusqu'à l'avancement), les **petits carrés pleins** (feuilles du graphe, couleur de calque). Icônes dessinées sur mesure, trait de 1,5 px, angles vifs, sur une grille de 24 px.

## Components

Implémentés dans `src/design/signature.tsx` (signature), `src/ui/ui.tsx` (primitives) et `src/outliner/` (nomenclature).

### Buttons
- **Bouton icône** (`BoutonIcone`) : carré de 48 px, trait de 1 px en cote, icône maison de 24 px. `aria-label` + info-bulle. Actif = rempli (fond trait, icône fond). Variante « ajouter » en redline, remplie au survol. Variante sans cadre pour les barres hautes.
- **Bouton principal** : plein (fond trait), libellé en Label capitales, 48 px de haut. Désactivé = contour cote, sans remplissage.
- **Danger** : rempli en redline, toujours dans une feuille de confirmation à deux boutons (« Garder » / « Supprimer »).

### Segments (sélecteurs)
- **Sélecteur de vue Page · Graphe · Frise** et **segments** (tri, type, thème) : cases de 48 à 52 px séparées par un trait, libellés en Label, l'option active remplie. Seuls contrôles à texte de la navigation.

### Feuilles (panneaux)
- **Feuille du bas** (`Feuille`, `<dialog>` modal) : même papier que l'écran, trait de 1 px en haut (cadre complet sur ordinateur), fond derrière **non assombri**, titre en Label, fermeture par icône. Entrée : glissement de 16 px et fondu en 300 ms (coupé si « réduire les animations »).
- **Choix** : lignes pleine largeur de 48 px séparées par un trait de grille ; l'option active est en gras avec un carré plein à droite.

### Champs
- Soulignés d'un trait cote de 1 px, sans boîte ni fond ; focus = trait de 2 px. Texte d'invite en cote.

### Navigation
- **iPhone** : barre du bas fixe (Projets · Calendrier · Recherche · +), 4 boutons icônes répartis, l'écran courant rempli. Remplacée sur la page projet par le sélecteur de vue + « + ».
- **Ordinateur** : colonne latérale d'icônes (80 px), colonne projets (300 à 360 px), page.

### Nomenclature (signature)
- Ligne de 56 px minimum : numéro en cote (cible de 44 px : toucher = panneau, appui long = déplacer), case carrée si c'est une tâche, texte éditable (Label capitales pour les branches de premier niveau), lignes de points, information de droite (date, « + 2 faites », « +4 » replié).
- Seule l'échéance la plus urgente porte le **nuage de révision** ; une date en retard s'écrit « J+2 » en redline.
- Hauteur des champs calculée par CSS (copie invisible du texte), sans mesure en JavaScript.

### Cote, nuage, calque, cartouche
- **Ligne de cote** (`CoteAvancement`) : borne, trait plein de 2 px jusqu'à l'avancement avec flèche, pointillé 2/4 jusqu'à la borne de fin, valeur « 39 % ».
- **Cote de distance** (`CoteDistance`) : « ⟵ 3 j ⟶ » en redline sous le compte à rebours.
- **Nuage** (`Nuage`) : contour festonné calculé à la taille du texte, tracé en 250 ms.
- **Calque** (`Calque`) : carré de 10 px + numéro en cote ; contour décalé de 2 px en mode jour.
- **Cartouche** : grille de 6 colonnes bordée de traits pleins, étiquettes en Label cote au-dessus de chaque valeur. C'est le seul endroit où les étiquettes sont permises, parce que c'est le détail déplié.

### Graphe (signature)
- **Centre** : cercle de 56 px bordé, carré de calque de 14 px au milieu ; une branche ouverte (poupée russe) écrit son libellé en Label dessous.
- **Branche** : rectangle bordé de 1 px, libellé en Label capitales, fond papier (il masque les arêtes qui le traversent).
- **Feuille** : carré plein de 9 px, libellé en body vers l'extérieur du plan ; la seule redline a son carré et sa date en rouge.
- **Tâche faite** : carré vide avec une croix, libellé en cote : estompée, jamais cachée.
- **Arêtes** : trait de 1 px à 75 % d'opacité ; droites (radial, libre) ou à angle droit (arbre). Celles d'un nœud nouveau se tracent.
- **Liens libres** : courbe pointillée 4/4 à la couleur du calque du projet, libellé en cote au milieu.
- **Construction** : cercles en pointillé 2/5 (radial), axes de grille ; frise : axe du temps en trait, graduations en cote, aujourd'hui en redline, couloirs par branche.
- **Sélection** : 4 repères d'angle rouges ; panneau de sélection bordé (rouge si c'est la redline) avec chevron « › ».
- **Onglets de disposition** : libellés en Label, l'actif souligné de 2 px.
- **Mini-carte** (ordinateur) : 160 × 110, points de 3 px en cote, cadre visible en trait.

### Croquis
- **Figure** : dessin au format 2,5:1, sans cadre, **4 repères d'angle** en cote décalés de 8 px ; sous elle, en cote, « FIG. n — légende ».
- **Encres** : trait, cote, redline, calque du projet. Uniquement des tokens, donc un croquis suit le thème.
- **Planche** : plein écran sur la grille. En haut, « FIG. n », « ··· » et « Terminé » (bouton principal). En bas, la rangée épaisseurs + encres (boutons de 44 px, séparateur) et la barre crayon, gomme, annuler, rétablir. Légende soulignée sous le dessin.

### Lien
- Une ligne en body soulignée d'un trait de cote (le titre, ou l'adresse), une ligne grise en cote (le site). « ··· » ouvre le détail (adresse, description, copier, modifier, supprimer). Aucune image.

### Calendrier
- En-tête : année en cote, mois en titre, chevrons. Onglets soulignés **Mois · Semaine · Agenda** (comme le graphe).
- Mois : initiales L à D sur un trait plein. Aujourd'hui est un carré tracé, le jour choisi un carré plein. Sous le chiffre, un petit carré par échéance (couleur du calque, redline si en retard), au plus 3, puis « +n ». Sous la grille, la liste du jour.
- Ligne d'échéance : carré calque, titre en body, projet en cote, compte à rebours à droite (redline si c'est la plus proche ou si elle est en retard), « ··· » (ouvrir, replanifier).
- Glisser : jour survolé encadré en tirets, fantôme d'une ligne de cote qui suit le doigt. « Déplacée au … · Annuler ».
- Ordinateur : la semaine sur 7 colonnes égales, lignes empilées.

### Rappels et notifications
- Cases de rappel (44 px, cochées pleines) : J-7, J-1, Jour J 9 h, 1 h avant (avec une heure), puis un champ « Rappel personnalisé ».
- Réglages, section Notifications : état en une ligne de cote, action principale en choix (« Activer les notifications », « Envoyer un essai »), rappels par défaut, résumé quotidien.

### Recherche, palette, aide
- Recherche : champ unique, puces de filtre (44 px, pleines quand cochées), décompte en cote. Groupes par projet (carré calque + titre en label), résultats en deux lignes : repère en cote (« 1.2 · ven. 20.11 »), extrait en body. Les mots trouvés sont **en gras et soulignés**, jamais surlignés en couleur.
- Palette (Cmd/Ctrl+K) : champ, puis commandes groupées en label ; la commande active est encadrée d'un trait de 1 px.
- Indice au premier usage : une ligne de cote sous un trait en tirets, avec « Compris » en label.

### Partage (vue du destinataire)
- En tête, en cote : « Instantané du … · lecture seule ». Titre, puis cartouche en `dl` à traits pleins (Type, Calque, Échéance finale). Onglets Page · Graphe.
- Arborescence figée : numéro en cote, case dessinée (pas de glyphe), texte en body, note en trait-2 sous la ligne.

### Synchro (Réglages)
- **État** : une ligne en cote (« À jour · il y a 2 min ») ; redline seulement si révoqué ou en erreur.
- **Appareils** : lignes body + cote (« cet appareil », « vu le… »), « Révoquer » en label redline, confirmé dans une feuille.
- **Code d'appairage** et **empreinte** : en display B612 Mono, groupés (« 7K2M QX9P », « 313 597 »).
- **Clé de secours** : 13 groupes de 4 dans une grille de cartouche à 4 colonnes, la 14ᵉ case (3 colonnes) porte « Isoligne · clé de secours ». À l'impression, seul ce bloc sort, à l'encre noire (`encre-impression`) sur papier blanc.
- **Témoin** : carré redline de 7 px sur « ··· » de l'accueil, uniquement en cas de problème durable ; le libellé VoiceOver le dit aussi.

## Do's and Don'ts

### Do:
- **Do** garder les marges de 28 px sur iPhone et 28 à 40 px entre sections.
- **Do** n'afficher qu'une ligne grise d'information secondaire par élément.
- **Do** écrire chaque chiffre en B612 Mono et chaque titre en Archivo élargi en capitales.
- **Do** remplir les états actifs (fond = trait, texte = fond) plutôt que de les teinter.
- **Do** accompagner chaque couleur de calque de son numéro ou du titre du projet.
- **Do** faire se dessiner les traits (150 à 250 ms) à l'apparition, et tout couper avec `prefers-reduced-motion`.

### Don't:
- **Don't** utiliser de dégradé, d'ombre, de flou ni de verre dépoli.
- **Don't** arrondir un coin, même de 2 px.
- **Don't** mettre de bordure colorée à gauche d'une carte ni de carte du tout : des lignes séparées par des traits.
- **Don't** poser d'étiquette au-dessus d'une valeur qui parle d'elle-même (« AVANCEMENT », « TYPE »).
- **Don't** utiliser d'emoji, d'icône de bibliothèque (Lucide, Heroicons) ni d'illustration.
- **Don't** écrire de texte marketing ou enthousiaste : « 2 faites », pas « Bravo, 2 tâches terminées ! ».
- **Don't** écrire du texte en couleur de calque en mode jour.

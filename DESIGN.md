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
typography:
  display:
    fontFamily: "Archivo, 'Arial Narrow', sans-serif"
    fontSize: "44px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.04em"
    fontVariation: "'wdth' 125"
  title:
    fontFamily: "Archivo, 'Arial Narrow', sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 125"
  label:
    fontFamily: "Archivo, 'Arial Narrow', sans-serif"
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

<!-- SEED: établi avec le propriétaire avant implémentation (spec §8, maquettes design/maquettes/v2-*.png). Les tokens sont normatifs. Relancer /impeccable document en mode scan dès que src/design/ existe, pour relever les composants réels et écrire .impeccable/design.json. -->

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

**Display Font:** Archivo variable, axe de largeur à 125 % (repli : Arial Narrow)
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

Les composants seront relevés dans le code au premier passage `/impeccable document` en mode scan. Principes établis :

- **Boutons** : icônes seules, carré de 48 px bordé de 1 px, `aria-label` et info-bulle sur ordinateur. Actif = rempli. « Ajouter » = trait et icône en redline.
- **Sélecteur de vue (Page · Graphe · Frise)** : seul contrôle avec du texte, segments en capitales Label, le segment actif rempli.
- **Onglets de disposition (Radial · Arbre · Libre · Frise)** : simples libellés, l'actif souligné d'un trait de 2 px.
- **Ligne de projet** : carré de calque, titre en body, date en cote à droite (en redline si c'est la plus urgente), trait d'avancement fin dessous ; séparée de la suivante par un trait de cote.
- **Ligne de nomenclature** : numéro en cote, case à cocher carrée (cocher trace une croix), libellé, lignes de points jusqu'à l'info de droite. Les branches de premier niveau en Label.
- **Champs** : soulignés d'un trait de 1 px, sans boîte ni fond ; focus = trait de 2 px.

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

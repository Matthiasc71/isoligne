# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

PWA installée sur l'écran d'accueil de l'iPhone (usage principal) + navigateur sur ordinateur. Pas de Mac, donc pas d'app native.

## Stack

Imposée par la spec (`docs/spec.md` §4) : Vite + React + TypeScript strict, vite-plugin-pwa, Yjs + y-indexeddb, Dexie, TipTap, React Flow (`@xyflow/react`) avec d3-hierarchy / d3-force, perfect-freehand, MiniSearch, fflate. Back : un Worker Cloudflare + D1 (offres gratuites). Front sur GitHub Pages, déploiement par GitHub Actions.

## Users

Une seule personne, propriétaire de l'app et seule utilisatrice. Elle y range tous ses projets : créatifs (court-métrage…), pro / clients / études (mémoire), vie perso (déménagement, événement), idées et réflexion. **Usage surtout sur iPhone**, en mobilité : capturer une idée, cocher une tâche, voir la prochaine échéance. L'ordinateur sert à structurer en profondeur (3 colonnes, clavier).

## Product Purpose

Un seul endroit pour chaque projet : une page qui mêle texte riche, tâches, deadlines, liens, croquis et surtout une **arborescence de bullet points** que l'on voit et édite aussi comme un **graphe** (radial, arbre, libre, frise). La liste et le graphe sont deux vues des mêmes données, éditables dans les deux sens.

Réussite : ouvrir l'app, voir en une seconde ce qui presse (« J-3 »), et pouvoir penser un projet en arbre sans friction, hors ligne, sur deux appareils synchronisés.

## Positioning

Un outil de pensée personnel qui traite un projet comme un **plan d'architecte** : arborescence numérotée en nomenclature (1, 1.1, 1.2), graphe de construction, échéances en « redlines ». Local d'abord, chiffré de bout en bout, 0 € pour toujours, sans compte tiers.

## Operating Context

- Usage dominant : iPhone, une main, sessions courtes, souvent hors réseau. Gestes (glisser pour indenter, appui long pour déplacer), barre d'outils au-dessus du clavier.
- Usage secondaire : ordinateur, sessions longues, clavier d'abord (raccourcis, Cmd/Ctrl+K), 3 colonnes (projets · page · graphe).
- **Poupée russe** : profondeur illimitée. Ouvrir une branche la met au centre : la liste et le graphe se recentrent sur elle, un fil d'Ariane permet de remonter. Chaque branche garde sa note en texte riche.
- Rituels : consulter la prochaine échéance, cocher, replanifier dans le calendrier, recevoir un rappel (J-7, J-1, le jour J à 9 h, 1 h avant).

## Capabilities and Constraints

- Projets : titre, type (créatif, pro-client-études, perso, idées), couleur parmi 8 « crayons de calque » + numéro de calque, statut, épinglé.
- Blocs : texte, arborescence, deadline, lien (aperçu **en texte seul**), croquis (vectoriel, « FIG. n »), séparateur.
- **Aucune image** : ni photo, ni couverture, ni vignette de lien, ni pièce jointe. Tout autre fichier glissé est refusé avec un message clair.
- Graphe : 4 dispositions, ajout, renommage, rattachement par glisser, liens libres, repli, épinglage manuel + « Réorganiser », export SVG/PNG. Fluide jusqu'à 500 nœuds.
- Calendrier (mois, semaine, agenda), notifications Web Push, pastille d'icône.
- Recherche locale, import/export Markdown & OPML, sauvegarde zip, partage en lecture seule par lien privé, modèles de départ.
- Synchro iPhone ↔ ordinateur par appairage (QR / code), **chiffrée de bout en bout**, avec une clé de secours.
- Contraintes : 0 €/mois (offres gratuites Cloudflare et GitHub, aucune carte bancaire), hors ligne complet, ouverture à froid < 1,5 s, pas de tracking.

## Brand Commitments

- Nom : **Isoligne**.
- Interface en français, formats français : « jeu. 19.11 », « J-3 », « Calque 01 », « 2 faites ».
- Ton sobre et technique, le moins de mots possible. Jamais marketing ni enthousiaste, jamais d'emoji.
- Direction visuelle imposée par le propriétaire : Blueprint épuré (spec §8, maquettes `design/maquettes/v2-*.png`).

## Evidence on Hand

- Spec complète : `docs/spec.md`. Plan et décisions : `docs/plan.md`.
- Maquettes de référence : `design/maquettes/v2-accueil-sombre.png`, `v2-projet-sombre.png`, `v2-graphe-sombre.png`, `v2-calendrier-clair.png` (et la v1, plus chargée).
- Exemples de contenu des maquettes : projets « Café Orge », « Mémoire M2 », « Déménagement », « Marée basse », « Jardin partagé ». Ce sont des données de démonstration, pas des données réelles.

## Product Principles

1. **Moins de texte, plus d'espace.** Si l'on enlève un élément et que rien ne manque, il part. Le détail s'ouvre au toucher.
2. **Ce qui presse d'abord.** Une seule redline visible à la fois : l'échéance la plus urgente.
3. **Une donnée, plusieurs vues.** Liste, graphe, frise et calendrier montrent les mêmes nœuds ; toute action est possible depuis la liste.
4. **Mes données m'appartiennent.** Local d'abord, chiffré, exportable à tout moment, aucune perte.
5. **iPhone d'abord, ordinateur au complet.** En cas de compromis, l'iPhone fait référence.

## Accessibility & Inclusion

Contraste AA dans les deux modes, cibles tactiles ≥ 44 px, VoiceOver sur les parcours principaux, alternative clavier à tout glisser-déposer, la couleur jamais seule (toujours avec un numéro de calque ou un libellé), animations coupées avec `prefers-reduced-motion`.

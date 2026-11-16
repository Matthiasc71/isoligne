# Audit technique : graphe (jalon 2, 16.11.2026)

| # | Dimension | Note | Point clé |
|---|---|---|---|
| 1 | Accessibilité | 3 | axe 0 violation sur le graphe (rôle `img` et libellé numéroté sur chaque nœud, `application` avec un résumé). Le lecteur d'écran passe par la liste, qui permet toutes les actions (WCAG 2.5.7). |
| 2 | Performance | 3 | 500 nœuds, au ralenti ×4 : défilement sans image perdue en radial et en arbre, 13 en libre. Ouverture 1,5 à 2,5 s (premier chargement compris), libre ~3 s hors du fil principal. |
| 3 | Thèmes | 4 | Tous les traits passent par les tokens ; l'export SVG/PNG lit le thème courant. |
| 4 | Responsive | 3 | iPhone : graphe plein écran. Ordinateur : 3 colonnes redimensionnables (souris et clavier). Gestes tactiles testés en émulation Chromium seulement. |
| 5 | Intégrité | 4 | `impeccable detect` : 0 anti-pattern dans `src/` et sur la page rendue. React Flow 12.12.1 (stable), mention de la bibliothèque conservée. |
| **Total** | | **17/20** | **Bon** |

## Constats
- **[P1] Gestes tactiles du graphe (glisser, pincer) non testés sur un vrai iPhone.** Les tests WebKit de la CI couvrent le parcours iPhone (sélection, panneau, retour), mais pas le glisser au doigt. À faire au jalon 7.
- **[P2] Libre : calcul ~3 s pour 500 nœuds au ralenti ×4.** Il tourne dans un Web Worker. Piste : moins d'itérations au-delà de 300 nœuds.
- **[P2] Ouverture du radial : 2,5 s au premier chargement** (React Flow chargé à la demande, 60 Ko compressés). Piste : précharger le module en tâche de fond après l'ouverture de la page.
- **[P3] Pas de message en cas d'échec de l'export PNG** (WebKit très ancien). À ajouter avec les messages d'erreur du jalon 6.

## Tests ajoutés
- Unitaires (`tests/unit/graphe.test.ts`, 9 tests) :
  - liens libres (boucles, doublons, extrémités supprimées) ;
  - épinglage et Réorganiser ;
  - radial (cercles), branche repliée, branche ouverte au centre ;
  - arbre (niveaux alignés) ;
  - libre (déterministe, sans chevauchement, les liens rapprochent) ;
  - frise (ordre, couloirs, aller-retour date ↔ x, heure d'été) ;
  - 500 nœuds.
- Bout en bout (`tests/e2e/graphe.spec.ts`, 4 tests) :
  - liste ↔ graphe : ajouter, renommer, rattacher par glisser, épingler, Réorganiser ;
  - frise : glisser change la date ;
  - relier, puis export SVG (polices embarquées) et PNG ;
  - iPhone : plein écran, sélection, panneau, retour.
- Accessibilité : le graphe ajouté au contrôle axe et à celui des cibles tactiles.

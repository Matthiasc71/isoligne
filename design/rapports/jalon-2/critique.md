⚠️ DEGRADED: single-context (la session interdit de lancer des sous-agents sans demande explicite du propriétaire ; évaluation A faite d'abord, puis le détecteur B)

# Critique : graphe et frise (jalon 2, 16.11.2026)

Cibles : `src/graph/Graphe.tsx`, `src/graph/Noeuds.tsx`, `src/graph/dispositions.ts`. Référence : `design/maquettes/v2-graphe-sombre.png`. Brief : `design/briefs/graphe.md`.

## Score (heuristiques de Nielsen)

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | Visibilité de l'état | 3 | Pendant un glisser, la cible de rattachement prend les repères rouges et la date de la frise s'affiche en direct. Rien n'indique encore qu'un nœud est épinglé, à part le bouton Réorganiser. |
| 2 | Correspondance avec le monde réel | 4 | Cercles de construction, axe du temps, couloirs : un vrai plan. |
| 3 | Contrôle et liberté | 3 | Chaque glisser, ajout ou suppression forme une étape d'annulation ; Réorganiser revient à l'automatique. |
| 4 | Cohérence et standards | 4 | Même nœud, même numéro, même redline dans la liste et le graphe. |
| 5 | Prévention des erreurs | 3 | Un rattachement qui créerait une boucle est refusé, et il faut rester 0,3 s au-dessus de la cible. |
| 6 | Reconnaissance plutôt que rappel | 3 | Le double-toucher pour renommer ne se devine pas. Le panneau « › » reste le chemin visible. |
| 7 | Souplesse et efficacité | 4 | Clavier complet sur ordinateur (flèches, Entrée, Tab, Suppr, Cmd+→), mini-carte. |
| 8 | Esthétique et minimalisme | 4 | Libellés seuls, une date (la redline), 4 icônes. |
| 9 | Récupération après erreur | 3 | Annuler après suppression. Un export qui échoue n'affiche encore aucun message. |
| 10 | Aide et documentation | 2 | Les raccourcis du graphe ne sont pas encore dans l'aide `?`. |
| **Total** | | **33/40** | **Bon** |

## Verdict de spécificité

**Évaluation A** : très spécifique. Le radial avec cercles de construction, l'arbre à connecteurs orthogonaux et la frise par couloirs sont des dessins de plan, pas une carte mentale générique (aucune bulle colorée, aucun arrondi décoratif). Les tâches faites estompées, avec leur croix, gardent l'historique visible sans bruit.

**Détecteur (B)** :
- `impeccable detect src/` : 0 anti-pattern.
- Page rendue (393×852 et 1280×800) : 0 anti-pattern.
- Le hook d'Impeccable a signalé « Archivo Variable » comme police non déclarée. C'était juste : `DESIGN.md` utilisait un nom de famille inexact, je l'ai corrigé.
- axe-core (WCAG 2.2 AA) : 0 violation sur le graphe, dans les deux thèmes, après corrections (rôle des nœuds, contraste et taille de la mention React Flow).

## Problèmes prioritaires

1. **[P1] Disposition libre lente sur gros projet**
   - Constat : 500 nœuds, ~3 s au ralenti ×4 (Web Worker, sans bloquer l'écran ; le radial s'affiche pendant le calcul).
   - Correctif : acceptable pour ce jalon. À surveiller sur l'iPhone réel ; réduire encore les itérations si nécessaire.
   - Commande : `/impeccable optimize`.
2. **[P2] Raccourcis du graphe absents de l'aide `?`**
   - Correctif : les ajouter au jalon 6 (palette et aide).
   - Commande : `/impeccable clarify`.
3. **[P2] Renommer en double-toucher, invisible**
   - Correctif : le panneau « › » permet déjà de renommer. Un indice pourra s'afficher à la première utilisation.
   - Commande : `/impeccable onboard`.
4. **[P2] Frise : nœuds sans date absents**
   - « 9 sans date » le signale, mais aucun geste ne permet de dater depuis la frise. Correctif : toucher ce compte ouvrira la liste des nœuds sans date (jalon 5, avec le calendrier).

## Corrigé pendant la critique
- **Frise** : l'échelle de temps dépassait la colonne du graphe sur ordinateur (largeur fixe de 1 100 px). Elle suit maintenant la largeur réelle de la toile, et la frise s'ouvre à l'échelle 1, défilable.
- **Recadrage** : il tient compte des libellés, qui ne sont plus coupés au bord.
- **Mini-carte** : celle de React Flow ignorait les nœuds contrôlés. Remplacée par une mini-carte maison (points et cadre visible, un clic recentre).
- **Rattachement par glisser** : la cible est calculée selon la forme réelle des nœuds (cercle, rectangle, carré), au lieu du chevauchement de React Flow, faussé par le centrage des nœuds.
- **Sélection** : chevron « › » comme sur la maquette, étiquettes un peu éloignées des repères d'angle.
- **Transitions** : coupées au-delà de 150 nœuds.

## Questions à se poser
- Un nœud épinglé devrait-il porter un petit repère, une punaise en trait, pour qu'on sache qu'il ne bouge plus tout seul ?
- La frise doit-elle aussi montrer les échéances des blocs « Échéance » de la page (aujourd'hui, seulement celles des nœuds) ?

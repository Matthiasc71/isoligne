# Audit technique (jalon 1, 16.11.2026)

## Score

| # | Dimension | Note | Point clé |
|---|---|---|---|
| 1 | Accessibilité | 3 | axe-core WCAG 2.2 AA : 0 violation dans les deux thèmes. Cibles de 44 px au moins sur iPhone (test automatique). VoiceOver non testé sur appareil. |
| 2 | Performance | 3 | 500 nœuds (build de production, processeur ralenti 4 fois) : ouverture 0,8 s, ~48 ms par frappe. Encore quelques images perdues au défilement. |
| 3 | Thèmes | 4 | Tous les styles passent par les tokens de `tokens.css` ; clair, sombre et thème forcé (Réglages) ; `theme-color` suit le thème. |
| 4 | Responsive | 3 | 393 px et 1440 px vérifiés, pas de défilement horizontal. Le glisser au doigt est codé avec `touch-action` mais n'a été testé qu'en émulation Chromium, pas sur un vrai écran tactile. |
| 5 | Intégrité de l'implémentation | 4 | `impeccable detect` : 0 anti-pattern dans `src/` et sur la page rendue. Icônes maison, polices auto-hébergées, aucun script tiers. |
| **Total** | | **17/20** | **Bon** |

## Verdict d'intégrité

**Réussi.** Le système est cohérent et propre au produit :
- tokens uniques ;
- composants signature réutilisés (cote, nuage, calque, case) ;
- aucun gabarit générique.

Le détecteur ne remonte rien. J'ai vérifié qu'il détecte bien ce qu'il doit : il trouve 4 anti-patterns sur une page piège.

## Résumé

- Problèmes : **P0 : 0 · P1 : 1 · P2 : 3 · P3 : 1**.
- Corrigés pendant l'audit :
  - violation ARIA sur le repère de calque ;
  - 4 cibles tactiles trop petites (titre, numéros, listes du cartouche) ;
  - frappe trop lente avec 500 nœuds (lignes mémoïsées, hauteur des champs calculée en CSS) ;
  - annulation qui fusionnait plusieurs opérations de structure.

## Constats

- **[P1] VoiceOver non vérifié sur iPhone**
  - *Où* : `src/outliner/Nomenclature.tsx`, motif `tree` / `treeitem` avec champs éditables.
  - *Catégorie* : accessibilité.
  - *Impact* : la lecture et la navigation peuvent différer de ce que suppose le motif ARIA.
  - *Norme* : WCAG 4.1.2.
  - *Recommandation* : test manuel sur l'iPhone au jalon 7. Si VoiceOver gère mal le motif, passer à `list` / `listitem` avec `aria-level`.
  - *Commande* : `/impeccable audit` après le test.
- **[P2] Images perdues au défilement de 500 lignes**
  - *Où* : `nomenclature.css` (`content-visibility: auto`).
  - *Catégorie* : performance.
  - *Impact* : léger à-coup au premier passage sur des lignes encore jamais dessinées.
  - *Recommandation* : liste virtualisée (`@tanstack/react-virtual`, déjà installé) au jalon 2, quand le graphe partagera la même liste.
  - *Commande* : `/impeccable optimize`.
- **[P2] Éditeur riche lourd**
  - *Où* : `EditeurRiche` (TipTap), 138 Ko compressés.
  - *Catégorie* : performance.
  - *Impact* : aucun sur l'ouverture, car il est chargé à la demande. Il ralentit seulement le premier bloc texte affiché.
  - *Recommandation* : surveiller. Le précharger en tâche de fond après l'ouverture.
- **[P2] Glisser au doigt testé seulement en émulation**
  - *Catégorie* : responsive.
  - *Recommandation* : test manuel sur l'iPhone. Les alternatives sans glisser (panneau : monter, descendre, indenter, rattacher) sont testées automatiquement.
- **[P3] Les champs de date suivent la langue du système**
  - *Recommandation* : aucune. En français sur l'iPhone.

## Problèmes récurrents

Aucun problème systémique. Les cibles trop petites venaient toutes de contrôles « inline » (titre, numéros, listes), et la règle est maintenant vérifiée à chaque passage des tests (`tests/e2e/accessibilite.spec.ts`).

## Points positifs

- Contrastes calculés et figés dans un script (`scripts/contrastes.py`), et vérifiés à l'exécution par axe.
- Hors ligne testé de bout en bout : service worker, rechargement sans réseau.
- `prefers-reduced-motion` coupe toutes les durées par les tokens, sans couper les changements d'état.

## Actions recommandées

1. **[P1] `/impeccable audit`** : après le test VoiceOver sur l'iPhone (jalon 7).
2. **[P2] `/impeccable optimize`** : virtualisation de la liste au jalon 2.
3. **`/impeccable polish`** : fait pour ce jalon (voir `polish.md`).

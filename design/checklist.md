# Checklist avant livraison (d'après UI UX Pro Max, adaptée à Isoligne)

À cocher pour chaque écran, à chaque jalon. Rapports dans `design/rapports/`.

## Blueprint (spec §8)
- [ ] Rayon 0, aucune ombre, aucun dégradé, aucun flou.
- [ ] 3 tailles de texte au plus à l'écran.
- [ ] Une seule ligne grise d'information secondaire par élément.
- [ ] Aucune étiquette au-dessus d'une valeur évidente.
- [ ] Une seule redline visible.
- [ ] Chaque couleur de calque accompagnée de son numéro ou du titre.
- [ ] Tous les chiffres en B612 Mono.
- [ ] Marges de 28 px (iPhone), 28 à 40 px entre sections, lignes ≥ 46 px.
- [ ] Icônes maison (1,5 px, angles vifs), aucun emoji.
- [ ] Textes sobres, en français, formats « jeu. 19.11 », « J-3 ».

## Accessibilité
- [ ] Contraste AA mesuré dans les deux modes (texte ≥ 4,5:1, graphique ≥ 3:1).
- [ ] Cibles ≥ 44 px, 8 px entre deux cibles.
- [ ] `aria-label` sur chaque bouton icône, info-bulle sur ordinateur.
- [ ] Parcours complet au clavier, focus visible et jamais masqué par la barre du bas.
- [ ] Alternative sans glisser pour chaque glisser-déposer.
- [ ] VoiceOver : ordre de lecture logique, rôles corrects (arbre, liste, onglets).
- [ ] `prefers-reduced-motion` : aucune animation.

## Technique
- [ ] Clair / sombre automatiques, `theme-color` à jour.
- [ ] Responsive : 375, 393 (iPhone), 768, 1024, 1440 px ; pas de défilement horizontal.
- [ ] Zones de sécurité iOS respectées.
- [ ] `cursor: pointer` sur les éléments cliquables (ordinateur).
- [ ] Fonctionne hors ligne.
- [ ] `npx impeccable detect src/` : zéro anti-pattern.
- [ ] `/impeccable audit` : aucun P0 ni P1.
- [ ] Captures clair et sombre dans `design/rapports/`.

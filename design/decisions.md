# Décisions de design

Ordre de priorité : spec (`docs/spec.md` §8.0 à 8.5) > Impeccable > UI UX Pro Max. Chaque écart ou rejet est noté ici avec sa raison.

## 16.11.2026 : socle (jalon 1)

### Référence visuelle
- **Blueprint v2** retenue (`design/maquettes/v2-*.png`). La v1 (plus chargée : « + 2 faites » sans repli, nuage sur la liste) et les directions « Contour lines » et « ASCII » sont écartées.

### Ajustements de contraste (spec §8.1 et §8.2)
Mesurés contre le fond nu **et** le fond au croisement de la grille majeure, pire cas. Outil : `python3 scripts/contrastes.py`.

| Token | Spec | Retenu | Raison |
|---|---|---|---|
| redline (nuit) | `#FF6B4A` | **`#FF8064`** | 3,99:1 au croisement de la grille, sous le seuil de 4,5:1 du texte (« J-3 », dates en retard). Retenu : 4,56:1. |
| orange (nuit) | `#FF9A6B` | **`#FFA552`** | ΔE 14 avec la redline : on confondait le calque orange et l'alerte. Décalé vers l'ambre (ΔE 28). |
| orange (jour) | `#E0703F` | **`#B0601E`** | 2,5:1, sous le minimum graphique de 3:1, et trop proche de la redline. Retenu : 3,66:1, ΔE 26. |
| ocre (jour) | `#C9A227` | **`#8F741C`** | 1,9:1. Retenu : 3,55:1. |
| vert (jour) | `#4E9A4A` | **`#448540`** | 2,75:1. Retenu : 3,56:1. |
| vert d'eau (jour) | `#2F8F7A` | **`#2C8572`** | 3,12:1, trop juste. Retenu : 3,53:1. |
| les autres | | inchangés | Conformes. |

Conséquence : en mode jour, les couleurs de calque sont des **repères graphiques** (≥ 3:1), jamais du texte.

### Typographie
- Échelle à 5 rôles (display 44, title 28, body 16, label 12, cote 12), avec la règle « 3 tailles au plus par écran » de la spec.
- Archivo en version variable (`@fontsource-variable/archivo`, axe `wdth` 62–125 %), pour obtenir le `font-stretch: 125%` demandé.

### Propositions d'UI UX Pro Max écartées
Requête : « outil de projets personnel, style blueprint/cyanotype, très épuré, mode clair et sombre ».

| Proposition | Décision | Raison |
|---|---|---|
| Palette sarcelle `#0D9488` / orange `#EA580C`, fond `#F0FDFA` | Rejetée | Contraire aux tokens de la spec §8.1. |
| Police Plus Jakarta Sans via Google Fonts | Rejetée | Spec §8.3 : Archivo / B612 / B612 Mono auto-hébergées ; aucun appel à Google Fonts (vie privée, hors ligne). |
| Schéma « Product Demo + Features » (hero, vidéo, CTA) | Rejeté | Schéma de page marketing ; Isoligne est un outil (mode Operate). |
| Animation « Scroll Reveal » GSAP (fondu + glissement) | Rejetée | Spec §8.4.7 : seuls les traits se dessinent ; pas de GSAP. |
| « Sharp shadows if any », transitions de survol 200–250 ms | Ombres rejetées ; survol réduit au changement de remplissage, sans animation | Spec §8.1 : aucune ombre. |
| Checklist : « icônes SVG Heroicons/Lucide » | Rejetée en partie | Icônes SVG oui, mais dessinées sur mesure (spec §8.4.8). |
| Squelettes `animate-pulse` pour le chargement | Rejetés | Animation continue décorative ; les données locales s'affichent sans attente. Pour la synchro, un trait de cote immobile + `aria-busy`. |
| États vides « No items yet. Create one! » | Ton rejeté, principe gardé | Un état vide a une action, mais en mots sobres (« Aucun projet » + bouton +). |

### Règles d'UI UX Pro Max retenues
- Style « Minimalism & Swiss » : grille, espace blanc, hiérarchie par le type. Compatible.
- Cibles tactiles de 44 pt sur iOS (on vise 48 px), 8 px au moins entre deux cibles.
- Alternative à un seul pointeur pour tout glisser (WCAG 2.2 AA, 2.5.7) : boutons « monter / descendre / rattacher à… » dans le panneau de sélection et la liste.
- Navigation complète au clavier, ordre de tabulation = ordre visuel, focus visible (trait de 2 px, décalage de 2 px).
- `aria-label` sur chaque bouton icône ; jamais de champ sans libellé (libellé visuellement masqué si besoin).
- `overscroll-behavior: contain` hors des listes, pour éviter les rafraîchissements accidentels de la PWA.
- La barre du bas fixe ne masque jamais le contenu ni le focus (marge basse = hauteur de barre + zone de sécurité).
- 1 ou 2 éléments animés par vue au plus ; aucune animation infinie.
- Checklist avant livraison (adaptée) : `design/checklist.md`.

## 16.11.2026 : graphes (jalon 2)
- **React Flow épinglé en 12.12.1** (sortie le 02.11.2026). La 13.0.0 est sortie le jour même : trop récente pour la stabilité visée. La montée de version se fera plus tard, en connaissant ses changements.
- **Disposition libre dans un Web Worker** : 460 ms de calcul pour 500 nœuds sur cette machine, donc davantage sur un iPhone. Le graphe affiche d'abord le radial, puis s'anime vers le résultat.

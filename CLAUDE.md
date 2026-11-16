# Isoligne : règles pour toute session

App personnelle de projets (PWA iPhone + ordinateur), style **Blueprint épuré**. Spec complète : `docs/spec.md`. Plan et décisions : `docs/plan.md`.

## Non négociable
1. **0 €/mois.** GitHub (dépôt public, Pages, Actions) + Cloudflare Workers et D1 en offre gratuite. Aucun service qui demande une carte bancaire. Aucune dépendance payante.
2. **Local d'abord.** Tout marche hors ligne. Yjs + y-indexeddb sont la source de vérité. Une modification ne quitte la file d'envoi qu'après accusé de réception. Jamais de perte de données.
3. **Chiffrement de bout en bout.** Tout ce qui part au Worker est chiffré sur l'appareil (AES-256-GCM, clé d'espace). Le Worker ne calcule rien de lourd (10 ms de CPU) et ne lit jamais le contenu.
4. **Pas de photos, pas de pièces jointes.** Croquis vectoriels uniquement. Aperçus de liens en texte seul.
5. **Vie privée.** Pas de compte tiers, pas de tracking, pas d'analytics, aucun script tiers. Télémétrie Impeccable coupée (`DO_NOT_TRACK=1`). Ne jamais lancer `impeccable login`.
6. **Accessible.** Contraste AA dans les deux modes, cibles ≥ 44 px, VoiceOver, alternative clavier/liste à chaque geste du graphe, la couleur n'est jamais le seul repère.

## Design
- Ordre de priorité : **spec (sections 8.0 à 8.5) > Impeccable > UI UX Pro Max**. Toute suggestion contraire (dégradés, arrondis, ombres, Inter…) est ignorée et notée dans `design/decisions.md`.
- **Toute modification d'interface passe par les skills** : `/impeccable shape` avant de coder un écran ; après : `distill`, `quieter` si besoin, `critique`, `audit`, corriger P0/P1, `polish`. Rapports dans `design/rapports/`.
- Références visuelles : `design/maquettes/v2-*.png` (Blueprint v2). Tokens : `DESIGN.md`.
- Moins de texte, plus d'espace. Rayon 0, aucune ombre, traits 1 px. Archivo élargi / B612 / B612 Mono, auto-hébergées.
- `npx impeccable detect src/` doit renvoyer zéro anti-pattern (bloquant en CI).

## Travail
- Interface et commits en français. Commits petits et clairs. Aucun secret dans le dépôt (GitHub Secrets / `wrangler secret`).
- Demander avant toute action irréversible ou payante (carte bancaire, suppression de données, changement de domaine).
- Ne jamais inventer une limite d'offre gratuite ni un comportement d'iOS : vérifier dans la doc officielle et signaler l'incertitude.
- Si un service est bloqué par le réseau de la session, le dire au lieu de contourner.
- TypeScript strict. Tests : Vitest (unitaires, propriétés), Playwright (WebKit 393×852, Chromium ordinateur).

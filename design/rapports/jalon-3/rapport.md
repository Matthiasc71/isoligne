⚠️ DEGRADED: single-context (la session interdit de lancer des sous-agents sans demande explicite du propriétaire)

# Jalon 3 : croquis et liens (16.11.2026)

Brief validé : `design/briefs/croquis-lien.md`. Captures : `planche-*.png` et `page-medias-*.png`, dans les deux thèmes.

## Critique (heuristiques de Nielsen) : 32/40

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | Visibilité de l'état | 3 | Le trait suit le doigt en direct. Un lien en attente montre son site, et un échec l'annonce sobrement (« aperçu indisponible »). |
| 2 | Monde réel | 4 | « FIG. 1 — légende », repères d'angle : une figure de plan. |
| 3 | Contrôle et liberté | 4 | Annuler et Rétablir à chaque trait ; « Effacer tout » confirmé et annulable. |
| 4 | Cohérence | 3 | Le menu « ··· » de la planche reprend celui de la page. Les encres sont des carrés de couleur ; c'est l'un des rares endroits où la couleur porte le choix (chaque bouton a un nom pour VoiceOver). |
| 5 | Prévention des erreurs | 3 | Deux doigts ne dessinent pas. Une adresse invalide est refusée sur place. |
| 6 | Reconnaissance | 3 | Encres et épaisseurs visibles, sans étiquette. |
| 7 | Efficacité | 3 | Coller une adresse sur ordinateur propose directement de l'ajouter. Pas encore de raccourcis clavier dans la planche (à part Cmd+Z). |
| 8 | Minimalisme | 4 | Lien : titre et une ligne grise. Figure : sans cadre, seulement des repères. |
| 9 | Récupération | 3 | Un aperçu en échec peut être relancé depuis le détail. |
| 10 | Aide | 2 | Rien n'explique les deux doigts dans la planche. |

**Spécificité** : forte. La figure numérotée et légendée, les repères d'angle et les encres limitées au thème donnent une identité de plan, pas celle d'un tableau blanc générique.

**Détecteur** :
- `impeccable detect src/` : 0 anti-pattern. Page rendue : 0.
- J'ai moi-même remplacé une grille en `linear-gradient` dans la planche par la grille SVG commune (interdiction des dégradés).
- axe-core (WCAG 2.2 AA) : 0 violation sur la planche et sur les blocs Croquis et Lien, dans les deux thèmes.

### Corrigé pendant la critique
- **[P0] Lien non validable** : le champ `type="url"` déclenchait la validation native du navigateur, qui exige « https:// ». Il bloquait donc la saisie « exemple.fr » que l'app devait compléter. Passé en texte avec clavier « url », sans validation native.
- **[P1] Barre de la planche sur deux lignes** sur iPhone : boutons de 44 px dans cette rangée, qui tient désormais sur une ligne.
- **[P1] Encre « calque » sans la couleur du projet** dans la planche : la couleur est maintenant transmise.
- **[P2] Tracés recalculés à chaque frappe** ailleurs dans la page : les traits sont désormais lus par abonnement au tableau Yjs.

### À faire
- **[P2]** Indice « deux doigts pour défiler » à la première ouverture de la planche (jalon 6, aide).
- **[P2]** Raccourcis de la planche sur ordinateur : C (crayon), G (gomme), 1, 2, 3 (épaisseurs).

## Audit technique : 17/20

| # | Dimension | Note | Point clé |
|---|---|---|---|
| 1 | Accessibilité | 3 | Figure nommée par sa légende et son nombre de traits ; boutons de 44 px au moins ; champ d'adresse avec message d'erreur annoncé (`role="alert"`). |
| 2 | Performance | 4 | Traits compacts (environ 1 Ko par seconde de dessin), événements de pointeur regroupés pour une saisie fine, tracé mémoïsé. |
| 3 | Thèmes | 4 | Encres = tokens ; un croquis change de couleur avec le thème. |
| 4 | Responsive | 3 | Planche plein écran, figure au format 2,5:1 partout. Stylet et pression non testés sur appareil réel. |
| 5 | Intégrité | 3 | Le Worker est testé (39 tests de sécurité) et essayé en local avec `wrangler dev`. Il n'est **pas encore déployé** : ce sera fait au jalon 4, avec le jeton d'appareil. |

### Sécurité du Worker `/unfurl`
- **Refusé** : IP privées, locales, réservées et multicast (IPv4, IPv6, formes déguisées comme `2130706433` ou `[::ffff:127.0.0.1]`), noms internes (`.local`, `.internal`…), ports non standard, identifiants dans l'URL, schémas autres que http(s).
- **Résolution DNS vérifiée** (DoH 1.1.1.1) avant chaque requête et à chaque redirection (3 au plus).
- **Limites** : 5 s, 512 Ko, HTML seulement. Lecture par HTMLRewriter (natif, peu de CPU). Réponse en texte nettoyé : entités décodées, balises et caractères de contrôle retirés, longueurs bornées.
- **CORS** limité aux origines de l'app ; en-têtes CSP, `nosniff` et `no-referrer`.
- **Aucun journal Cloudflare.** Seul un cache d'un jour garde l'aperçu.
- **Limite connue (documentée)** : un nom qui change d'adresse entre la vérification DNS et la requête (« DNS rebinding ») n'est pas couvert. Le risque est faible ici : usage personnel, réponse limitée à du texte. Il sera encore réduit au jalon 4, quand `/unfurl` exigera un jeton d'appareil.
- **Non vérifié** : le CPU réel de 10 ms par requête. `wrangler dev` ne l'impose pas ; mesure à faire après le déploiement.

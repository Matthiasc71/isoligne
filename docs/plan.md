# Isoligne : plan de construction (jalon 0)

Statut : **validé le 16.11.2026** (réponses en section 7). Jalon 1 livré le 16.11.2026 (voir section 9).

---

## 1. Constats du jalon 0

### Outils de design
| Outil | Version installée | Emplacement | Remarques |
|---|---|---|---|
| Impeccable | CLI/skill **4.9.1**, moteur **v0.1.24** (épinglé) | `.claude/skills/impeccable/`, `.claude/agents/impeccable-*.md` | La v0.1.24 existe : c'est la version du **moteur** (binaire `@impeccable/cli-*`, publié le 13.11.2026), livrée avec la 4.9.1. La 4.9.2 (moteur 0.1.25) n'ajoute que « Loop » et la connexion à un compte. |
| UI UX Pro Max | `ui-ux-pro-max-cli` **2.15.0** | `.claude/skills/ui-ux-pro-max/` | Moteur Python en bibliothèque standard uniquement, hors ligne. Installé avec `--offline` (fichiers embarqués). |

- **Hook Impeccable** : l'installeur l'a mis dans `.claude/settings.local.json`. Je l'ai déplacé dans `.claude/settings.json` (versionné), donc il se recharge à chaque session cloud.
- **Binaire du moteur (26 Mo)** : exclu du dépôt (`.gitignore`). Le lanceur `scripts/impeccable` le retélécharge depuis les publications GitHub de `pbakaus/impeccable` et vérifie son empreinte SHA-256 dans `engine-checksums.txt` (empreinte contrôlée : conforme).
- **Sous-skills retirés** : l'installeur d'UI UX Pro Max ajoute aussi `banner-design`, `brand`, `design`, `design-system`, `slides` et `ui-styling`. Je les ai supprimés parce qu'ils sont hors sujet ou contraires à la spec : génération de logos et d'images via l'API Gemini, shadcn/Tailwind, contenus marketing. `ui-ux-pro-max` n'en dépend pas.

### Ce qui sort du dépôt ou du réseau attendu (audit des scripts)
- **Télémétrie Impeccable active par défaut**, vers `api.impeccable.style` (API « roll » de tirage de directions de design). Je l'ai coupée avec `DO_NOT_TRACK=1` et `IMPECCABLE_NO_TELEMETRY=1` dans `.claude/settings.json`. Ces variables seront aussi posées dans la CI.
- **Impeccable `login` / `health` / `critiques`** : si on se connecte à un compte, le CLI envoie le contenu de `DESIGN.md` et des rapports de critique. **Je ne me connecterai jamais.** D'après le changelog, rien n'est envoyé depuis la CI.
- **Mode « live » d'Impeccable** : serveur local sur `localhost`, références à `fonts.googleapis.com`. Je ne l'utiliserai pas.
- **Hooks Impeccable** (SessionStart, PostToolUse sur Edit/Write, Stop) : ils exécutent le binaire local (`impeccable hook`). Au premier lancement d'une session, ils peuvent télécharger le moteur depuis `github.com`.
- **UI UX Pro Max** : `search.py` et `core.py` n'ouvrent aucune connexion. Le CLI `uipro` n'interroge `api.github.com` qu'en mode `--legacy`, que je n'ai pas utilisé.

### Limites gratuites vérifiées (docs Cloudflare, mises à jour fin oct. / nov. 2026)
| Limite | Valeur | Conséquence |
|---|---|---|
| Workers : requêtes | 100 000/jour | Synchro toutes les 30 s ≈ 2 880 req/jour par appareil ouvert en continu : large marge. |
| Workers : CPU | **10 ms/requête et par Cron** | Aucun calcul lourd dans le Worker : pas de fusion Yjs, pas de redimensionnement d'image. Tout ça se fait côté appareil. |
| Workers : sous-requêtes | 50/requête (D1 compris) | Les requêtes D1 sont regroupées avec `batch()`. |
| Cron Triggers | 5 par compte | 1 seul utilisé. |
| D1 : écritures | 100 000 lignes/jour | Une écriture par projet modifié et par cycle, sinon rien. |
| D1 : lectures | 5 M lignes/jour | Requêtes toujours indexées. |
| D1 : stockage | **500 Mo par base**, 5 Go par compte, 10 bases max | Sans photos, une seule base suffit très largement. |
| D1 : taille max d'une ligne / BLOB | **2 000 000 octets** | Un état compacté de projet plus gros est découpé en morceaux de 1 Mo. |
| D1 : dépassement | Les requêtes renvoient des erreurs jusqu'à 00:00 UTC | L'app reste 100 % fonctionnelle hors ligne : la synchro attend simplement le lendemain. |

- **Non confirmé** : la mention « appliqué strictement depuis septembre 2026 ». Je ne l'ai pas trouvée dans la doc, mais le comportement en cas de dépassement (refus des requêtes) y est bien décrit.
- **À vérifier à l'inscription** : qu'un compte Cloudflare gratuit se crée sans carte bancaire.

### Polices
`@fontsource-variable/archivo` couvre l'axe de largeur de 62 à 125 % : le `font-stretch: 125%` demandé est possible. `@fontsource/b612` et `@fontsource/b612-mono` existent aussi (v5.3.0).

---

## 2. Architecture

```
iPhone (PWA) / Ordinateur (navigateur)          Cloudflare (gratuit)
┌───────────────────────────────────┐          ┌────────────────────────────┐
│ React + TipTap + React Flow       │          │ Worker isoligne-api        │
│ ── Yjs (1 doc/projet)             │  HTTPS   │  /pair  /sync  /img        │
│    └ y-indexeddb (source de vérité)│ ───────► │  /unfurl  /push  /s/<jeton>│
│ ── Dexie : index, file d'envoi,   │  CORS    │  Cron */10 → Web Push      │
│    réglages, recherche            │  strict  │ D1 : isoligne-data         │
│ ── Service Worker (Workbox, push) │          │  (tout chiffré côté client)│
└───────────────────────────────────┘          └────────────────────────────┘
        GitHub Pages (statique)                  wrangler deploy via Actions
```

**Principe** : l'appareil est la source de vérité. Le serveur n'est qu'un relais et une boîte de stockage : il ne fusionne rien et ne calcule rien de coûteux (CPU de 10 ms).

### Arborescence du dépôt (npm workspaces)
```
isoligne/
├─ CLAUDE.md  PRODUCT.md  DESIGN.md  README.md
├─ design/            decisions.md, rapports/, captures/
├─ docs/              plan.md
├─ src/               PWA (Vite + React + TS strict)
│  ├─ app/            routes, mise en page (barre du bas / 3 colonnes), palette Cmd+K
│  ├─ design/         tokens.css, typo, icônes SVG maison, composants Blueprint
│  ├─ data/           Yjs (schéma, accès), Dexie, migrations locales
│  ├─ tree/           opérations d'arbre, indexation fractionnaire, réparation
│  ├─ outliner/       liste virtualisée, clavier, gestes
│  ├─ editor/         TipTap (blocs texte, notes)
│  ├─ graph/          React Flow, dispositions radial/arbre/libre/frise, export
│  ├─ media/          croquis, liens
│  ├─ time/           échéances, rappels, calendrier, badges
│  ├─ sync/           client de synchro, file d'envoi, appairage
│  ├─ search/         MiniSearch
│  ├─ io/             Markdown, OPML, sauvegarde zip (fflate)
│  └─ sw/             service worker (push, cache)
├─ shared/            types et protocole partagés app ↔ Worker
├─ worker/            Worker Cloudflare (TS) + migrations/ D1 versionnées
├─ tests/             e2e Playwright (WebKit 393×852, Chromium ordinateur)
└─ .github/workflows/ ci.yml (tests → build → detect → déploiements)
```

---

## 3. Modèle de données

### Document Yjs (un par projet)
| Clé | Type Yjs | Contenu |
|---|---|---|
| `meta` | `Y.Map` | id, titre, type, couleur (clé de palette), calque (01…), statut, épinglé, créé, modifié, révision |
| `blocks` | `Y.Map<id, Y.Map>` | `kind` (texte, lien, croquis, arborescence, deadline, séparateur), `order` (index fractionnaire), contenu propre au bloc : texte = `Y.XmlFragment` (TipTap via y-prosemirror) ; croquis = traits vectoriels + légende (« FIG. n »), miniature calculée sur l'appareil ; lien = url + aperçu ; arborescence = id du nœud racine de la branche ; deadline = id du nœud |
| `nodes` | `Y.Map<id, Y.Map>` | parent, order, texte (`Y.Text`), tâche, fait, échéance (date et heure optionnelle), rappels[], couleur?, replié, note (`Y.XmlFragment`), `deleted` (pierre tombale) |
| `links` | `Y.Map<id, Y.Map>` | de, vers, libellé, style (trait, pointillé) |
| `positions` | `Y.Map<disposition, Y.Map<nodeId, {x,y}>>` | nœuds épinglés à la main, par disposition |

- **Un seul arbre par projet**, dont la racine est le projet lui-même (le nœud central du graphe). Un bloc « arborescence » de la page affiche **une branche** de cet arbre. Le graphe montre l'arbre entier, la liste montre la branche, et ce sont les mêmes données.
- **Ordre** : indexation fractionnaire (bibliothèque `fractional-indexing` + suffixe aléatoire, pour que deux insertions simultanées ne tombent jamais sur la même clé).
- **Intégrité sous concurrence** : avec Yjs, deux déplacements hors ligne peuvent créer un cycle, et une suppression peut laisser des enfants orphelins. La lecture de l'arbre passe donc par une **réparation déterministe** : même règle sur tous les appareils, donc même résultat. Un cycle est cassé au nœud au plus petit id, qui est rattaché à son dernier parent valide connu, sinon à la racine. Un orphelin est rattaché à son plus proche ancêtre vivant. Tests de propriétés (fast-check) : toute suite d'opérations, y compris concurrentes, donne un arbre valide.
- **Numérotation 1 / 1.1 / 1.2** : calculée à l'affichage, jamais stockée.

### Dexie (IndexedDB)
`projects` (index de l'accueil : titre, couleur, prochaine échéance, avancement), `deadlines` (index du calendrier et des rappels), `outbox` (mises à jour Yjs chiffrées à envoyer), `syncState` (dernier numéro de séquence serveur par projet), `settings`, `searchIndex` (MiniSearch sérialisé).

### D1 (versionné dans `worker/migrations/`)
`devices` (id, hash du jeton, nom, créé, vu, révoqué), `pairing` (hash du code, expiration, tentatives), `rate_limit`, `updates` (projet, seq, morceau, blob chiffré, appareil), `projects_head` (projet, seq max), `push_subs`, `reminders` (date d'envoi, texte chiffré), `shares` (hash du jeton, expiration, instantané chiffré), `usage`.

---

## 4. Synchro

1. **Envoi** : chaque modification locale va dans `outbox`. Toutes les 30 s (et à l'ouverture, au retour au premier plan, au retour du réseau), les mises à jour en attente d'un projet sont fusionnées **sur l'appareil** (`Y.mergeUpdates`) et envoyées en **une seule ligne D1**.
2. **Réception** : `GET /sync/heads` renvoie le numéro de séquence max de chaque projet, en une lecture indexée. Seuls les projets en retard sont téléchargés (`seq > dernier connu`).
3. **Compactage** : au-delà de 50 mises à jour pour un projet, un appareil envoie l'état complet (`encodeStateAsUpdate`) qui remplace les lignes ≤ seq dans un `batch()` atomique. Le calcul est fait côté appareil, pas dans le Worker.
4. **Garantie anti-perte** : une mise à jour ne quitte `outbox` qu'après accusé de réception du serveur. Yjs rend les renvois idempotents.
5. **Jauge** : `GET /usage` renvoie la taille des bases (avec `PRAGMA` ou le cumul de la table `usage`). Alerte affichée à 80 %.

**Appairage** :
- Le premier appareil appelle `POST /space` et reçoit son jeton.
- Pour ajouter un appareil, l'iPhone affiche un code de 8 caractères (Crockford base32, valable 5 min, stocké haché) et un QR code qui contient l'URL avec ce code.
- L'ordinateur saisit le code (`POST /pair/claim`) et reçoit son propre jeton de 256 bits.
- Débit limité : 5 essais / 10 min / IP, et le code est invalidé après 5 échecs.

---

## 5. Points techniques sensibles et choix proposés

| Sujet | Choix |
|---|---|
| Aperçus de liens (`/unfurl`) | Le Worker refuse les IP littérales privées et locales, `localhost`, `.local` et `.internal`, et résout le nom via DoH (`1.1.1.1`) pour refuser une adresse privée. Il suit 3 redirections au plus (`redirect: 'manual'`, contrôle à chaque saut), avec un délai de 5 s et une limite de 512 Ko de HTML. Il extrait titre, site et description (balises OG) en texte brut, sans image. Il ne stocke rien. |
| Web Push | VAPID et chiffrement aes128gcm (RFC 8291) écrits avec WebCrypto, sans dépendance Node, et testés contre les vecteurs de la RFC. Le Cron toutes les 10 min n'envoie qu'un petit nombre de notifications par exécution, pour tenir dans les 10 ms de CPU (à mesurer au jalon 5). |
| Partage en lecture seule | **L'instantané est calculé et chiffré sur l'appareil** (JSON de la page + SVG du graphe et des croquis). Le Worker sert `/s/<jeton>` : une page de lecture statique qui déchiffre avec la clé du fragment `#`, avec une CSP stricte, `noindex` et `X-Robots-Tag`. |
| Rappels | Calculs dans le fuseau Europe/Paris avec `@date-fns/tz`, testés autour des changements d'heure. L'appareil pousse la liste des rappels à venir dans la table D1 `reminders`, lue par le Cron. |
| Graphe 500 nœuds | Nœuds React Flow mémoïsés, `onlyRenderVisibleElements`, simulation d'un d3-force dans un Web Worker, transitions de 300 ms via des interpolations de positions (désactivées si « réduire les animations »). |
| Recherche | MiniSearch avec normalisation NFD (accents ignorés), `fuzzy: 0.2` et `prefix: true`. Index mis à jour à chaque modification, en différé. |
| Markdown / OPML | Les listes Markdown portent leurs métadonnées en fin de ligne `{#id due=2026-11-19 color=orange}`, et les liens libres sont regroupés dans un bloc final. En OPML, attributs `isoligne:*`. Tests d'aller-retour sans perte. |
| Sécurité HTTP | Front : CSP par `<meta>`, car GitHub Pages n'accepte pas d'en-têtes personnalisés (limite de Pages, pas un choix). Worker : CSP, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, CORS limité à `https://matthiasc71.github.io`. |
| CI | `npm test` → `vitest` → `playwright` → `vite build` → `npx impeccable@4.9.1 detect src/` (zéro anti-pattern, sinon échec) → déploiement Pages → `wrangler d1 migrations apply` → `wrangler deploy`. Les déploiements ne tournent que sur `main` et si les secrets sont présents. |

---

## 6. Étapes (jalons du document, détaillés)

0. **Fait** : outils de design installés, audit, ce plan. → validation.
1. **Socle local**
   - `CLAUDE.md` (règles), `/impeccable init` → `PRODUCT.md`, design system UI UX Pro Max → `DESIGN.md` + `/impeccable document`, `design/decisions.md`. Proposition des 8 couleurs de calque finales, avec leurs rapports de contraste.
   - `/impeccable shape` de l'accueil et de la page projet, que je te montre avant de coder.
   - Échafaudage Vite/PWA, tokens, polices, icônes, composants (cartouche, cote, redline/nuage, nomenclature, figure).
   - Yjs + Dexie, opérations d'arbre et tests de propriétés, outliner (clavier + gestes iPhone), page à blocs (texte, arborescence, tâches, deadlines), accueil.
   - Hors ligne (Workbox), captures clair/sombre, `critique`, `audit` et `polish`.
2. **Graphes** : 4 dispositions, édition dans les deux sens, mode « Relier », épinglage et « Réorganiser », mini-carte, export SVG/PNG, test des 500 nœuds.
3. **Médias** : croquis (perfect-freehand, FIG. n), liens (Worker `/unfurl`, premier déploiement du Worker en local avec `wrangler dev`).
4. **Synchro** : Worker + D1, appairage par QR / code, file d'envoi, chiffrement de bout en bout, clé de secours, tests de convergence à deux appareils hors ligne, jauge.
5. **Temps** : calendrier (mois, semaine, agenda, glisser), rappels, Web Push + Cron, API Badging, demande d'autorisation au bon moment.
6. **Bonus** : recherche, import/export Markdown & OPML, sauvegarde zip, partage en lecture seule, modèles de départ, Cmd+K, aide `?`.
7. **Mise en ligne** : GitHub Pages + Worker via Actions, README (sauvegarder, restaurer, révoquer, quotas), guide d'installation iPhone.

À chaque jalon : captures clair/sombre dans `design/rapports/`, résumé des rapports Impeccable, état des tests.

---

## 7. Décisions du 16.11.2026 (réponses aux questions)

| # | Question | Réponse | Conséquence |
|---|---|---|---|
| 1 | Maquettes | Fichier « 3 directions de style » fourni | Référence : **Blueprint v2** (accueil sombre, projet sombre, graphe sombre, calendrier clair), captures dans `design/maquettes/`. Les autres directions (Contour lines, ASCII) sont écartées. |
| 2 | Dépôt public | Oui | GitHub Pages gratuit. Aucune donnée dans le dépôt. |
| 3 | Images | **On oublie les photos** | Pas de bloc image, pas de couverture, pas d'ajout de photo, pas de stockage de blobs dans D1 : **une seule base D1**. Les croquis restent (vectoriels, dans Yjs ; « FIG. n » s'applique aux croquis). Aperçus de liens en texte seul (titre, site, description). |
| 4 | Chiffrement de bout en bout | Oui | Voir section 8. |
| 5 | Compte Cloudflare | Existe déjà | Utilisé à partir du jalon 3. |
| 6 | Un arbre par projet | Oui, **avec des branches dans les branches, en poupée russe** | Profondeur illimitée. Tout nœud peut être **ouvert** : la liste et le graphe se recentrent sur lui (fil d'Ariane pour remonter), et il peut porter sa propre note en texte riche. Le graphe radial dessine ses cercles de construction à partir du nœud ouvert. |

## 8. Chiffrement de bout en bout

- **Clé d'espace** : 256 bits, créée par le premier appareil, conservée dans IndexedDB (`CryptoKey` non extractible pour l'usage courant, plus une copie chiffrée pour la transmission à un nouvel appareil).
- **Tout ce qui part au serveur est chiffré** (AES-256-GCM, nonce aléatoire de 96 bits) : mises à jour Yjs, états compactés, textes des rappels, instantanés partagés. Le serveur ne voit que des identifiants aléatoires, des tailles et des dates d'envoi des rappels.
- **Appairage** :
  - **QR code** : il contient l'URL avec la clé dans le fragment `#` (jamais envoyé au serveur) et le code d'appairage. C'est le chemin sûr par défaut.
  - **Code à 8 caractères saisi à la main** : le nouvel appareil envoie une clé publique éphémère (ECDH P-256). Les deux écrans affichent une **empreinte de 6 chiffres à comparer**, puis l'iPhone chiffre la clé d'espace pour le nouvel appareil. Sans cette comparaison, le serveur pourrait s'interposer.
- **Notifications** : le Cron n'envoie qu'un texte chiffré. Le service worker de l'appareil le déchiffre et affiche « J-1 · Repérages ».
- **Liens partagés** : `/s/<jeton>#<clé>`. Le Worker sert une page de lecture statique qui déchiffre l'instantané dans le navigateur ; le serveur ne peut pas le lire.
- **Aperçus de liens** : seule exception. Le Worker voit l'URL demandée, sans la stocker.
- **Clé de secours** : 24 mots ou un QR imprimable, proposés dès la création de l'espace et dans les Réglages. Sans elle, si tous les appareils sont perdus et qu'il n'y a pas de sauvegarde zip, les données ne sont plus récupérables. L'app le dit clairement, une fois.

## 9. Suivi des jalons

### Jalon 1 : socle local (livré le 16.11.2026)
- Fait : `PRODUCT.md`, `DESIGN.md`, palette vérifiée, modèle Yjs + index Dexie, arbre réparé et testé (convergence hors ligne), accueil, page projet (cartouche, cote, nomenclature, blocs texte, échéance et séparateur), poupée russe, panneau du nœud, gestes iPhone et barre du clavier, hors ligne (service worker), aide `?`, CI.
- Rapports : `design/rapports/jalon-1/` (critique 30/40, audit 17/20, 0 anti-pattern, 0 violation axe).
- Reporté :
  - test VoiceOver et tactile sur iPhone réel (jalon 7) ;
  - liste virtualisée (jalon 2) ;
  - agenda, recherche et réglages complets (jalons 5 et 6) ;
  - onglets Graphe et Frise (jalon 2).

### Jalon 2 : graphes (livré le 16.11.2026)
- Fait :
  - liens libres et positions épinglées par disposition ;
  - radial (cercles de construction), arbre (horizontal ; vertical prévu dans le code), libre (force dirigée dans un Web Worker), frise (couloirs, aujourd'hui, glisser = nouvelle date) ;
  - édition dans les deux sens : ajouter, renommer, rattacher par glisser, épingler, Réorganiser, relier, replier, supprimer avec Annuler ;
  - export SVG et PNG dans le thème ;
  - clavier ; mini-carte ; 3 colonnes redimensionnables sur ordinateur ; transitions de 300 ms.
- Rapports : `design/rapports/jalon-2/` (critique 33/40, audit 17/20, 0 anti-pattern, 0 violation axe).
- Reporté :
  - gestes tactiles du graphe sur iPhone réel (jalon 7) ;
  - raccourcis du graphe dans l'aide (jalon 6) ;
  - option d'arbre vertical dans l'interface.

### Jalon 3 : médias (livré le 16.11.2026)
- Fait :
  - croquis : planche plein écran, perfect-freehand, pression du stylet, 3 épaisseurs, 4 encres du thème, gomme, annuler, rétablir, légende, FIG. n, couverture ;
  - liens : saisie (Coller, adresse complétée), aperçu en texte seul, relance au retour du réseau, détail ;
  - ajout rapide « Lien dans un projet », et coller une adresse sur ordinateur ;
  - Worker `/unfurl` (SSRF, DoH, redirections, limites, HTMLRewriter, CORS, cache), testé et essayé en local.
- Rapport : `design/rapports/jalon-3/rapport.md` (critique 32/40, audit 17/20, 0 anti-pattern, 0 violation axe).
- Reporté :
  - déploiement du Worker et jeton d'appareil sur `/unfurl` (jalon 4) ;
  - stylet et pression sur appareil réel (jalon 7).

### Jalon 4 : synchro (livré et déployé le 16.11.2026)
- Fait :
  - chiffrement de bout en bout : secret maître, clé d'espace, AES-256-GCM ;
  - appairage par code de 8 caractères et empreinte à 6 chiffres (ECDH P-256) ;
  - clé de secours (13 groupes, affichage, copie, impression) et restauration ;
  - Worker de synchro + D1 : espace, appareils, révocation, envoi par parties, têtes, tirage paginé, compactage, jauge d'usage ;
  - moteur par vecteur d'état confirmé : une modification n'est considérée comme partie qu'après accusé de réception ;
  - section Synchro des Réglages, témoin redline sur l'accueil, « Quitter l'espace » après révocation ;
  - `/unfurl` exige désormais un jeton d'appareil.
- Tests : convergence hors ligne (unitaires et propriétés), intégration avec une D1 locale, parcours complet à deux navigateurs (`npm run e2e:synchro`, en CI).
- Rapport : `design/rapports/jalon-4/rapport.md` (critique 33/40, audit 18/20, 0 anti-pattern, 0 violation axe).
- Déploiement : Worker `isoligne-api` en ligne sur `https://isoligne-api.matthias-cordier71.workers.dev`, base D1 « isoligne » (Europe de l'Ouest), sel généré dans la CI. Workflow `Déployer le Worker`, lancé à la main ; secrets GitHub `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`. Vérifié : le service répond, un faux jeton est refusé en 401.
- Reporté :
  - bouton « Nouveau code » après expiration ;
  - build de l'app avec `VITE_WORKER_URL` et mise en ligne sur Pages (jalon 7) ;
  - mesure du CPU réel par requête, une fois l'app en ligne (tableau de bord Cloudflare, Metrics du Worker) ;
  - retirer les origines `localhost` de `ORIGINES` en production (jalon 7) ;
  - essai sur iPhone réel (jalon 7).


# Prompt — Construire « Isoligne », mon app personnelle de projets (style Blueprint)

Tu es un développeur front-end senior doublé d'un designer d'interface exigeant (spécialiste des éditeurs, des outils de pensée et de la visualisation de graphes). Tu vas construire de A à Z, puis mettre en ligne gratuitement, une app personnelle appelée **Isoligne**. Elle s'utilise sur iPhone et sur ordinateur, avec synchronisation entre les deux.

**Avant d'écrire la moindre ligne de code :**
1. Lis tout ce document.
2. Pose-moi tes questions s'il reste des zones floues.
3. Présente-moi ton plan (architecture, modèle de données, arborescence, étapes).
4. Attends mon feu vert.

Ensuite, avance jalon par jalon (section 11) et montre-moi le résultat à la fin de chacun. Si les compétences, plugins ou connecteurs de ta session t'aident, utilise-les : Playwright pour tester, Firecrawl ou la recherche web pour vérifier la documentation à jour des bibliothèques, et surtout les deux outils de design de la section 0.

---

## 0. Outils de design à installer en premier : UI UX Pro Max + Impeccable

Je veux que le design Blueprint soit généré et contrôlé avec **deux skills de design** :
- **UI UX Pro Max** (`nextlevelbuilder/ui-ux-pro-max-skill`, MIT) : moteur de design system (styles, palettes, paires de polices, règles UX, checklist avant livraison) ;
- **Impeccable** (`pbakaus/impeccable`, Apache 2.0) : vocabulaire de design, commandes `/impeccable …` et détecteur d'anti-patterns « IA ».

### 0.1 Installation (je travaille dans Claude Code **sur navigateur** : `/plugin` n'y est pas disponible)
Pas de plugins, donc. Installe les deux outils comme **skills dans le dépôt** (dossier `.claude/skills/`), **au tout début**, avant le plan. Toute session cloud les recharge alors automatiquement.

1. **Impeccable** : je l'ai déjà installé avec `npx impeccable install`.
   - Vérifie que ses fichiers sont bien **dans ce dépôt** (`.claude/skills/impeccable/` ou l'emplacement qu'il utilise) et qu'ils sont **commités**.
   - S'ils manquent (installé dans une autre session ou un autre dossier), relance `npx impeccable install` à la racine du dépôt et choisis l'installation **projet**, pas globale.
   - Le « design hook » d'Impeccable s'installe normalement dans les réglages utilisateur, qui ne survivent pas d'une session cloud à l'autre. S'il propose une variante projet (`.claude/settings.json`), prends-la. Sinon, saute le hook : le contrôle est assuré par `npx impeccable detect` dans la CI (section 0.2, étape 6).
2. **UI UX Pro Max** : installe-le avec sa CLI officielle (paquet npm `ui-ux-pro-max-cli`, commande `uipro`), en version **projet** :
   ```
   npx -y -p ui-ux-pro-max-cli uipro init --ai claude
   ```
   Son moteur de recherche est en Python 3 : vérifie que `python3` répond.
3. **Commite et pousse** les dossiers `.claude/skills/` créés, avec un commit dédié (« chore: skills de design Impeccable + UI UX Pro Max »).
4. Vérifie que les deux skills sont reconnus dans la session (`/impeccable` doit lister ses commandes). Si ce n'est pas le cas, dis-le-moi : j'ouvrirai une nouvelle session sur le dépôt pour qu'ils se chargent au démarrage.

**Version d'Impeccable** : j'ai demandé la **v0.1.24**, mais elle n'apparaît pas dans les publications de `pbakaus/impeccable` (la dernière « engine » trouvée est la v0.1.16, le skill est en 4.x).
- Vérifie le changelog et `npx impeccable --version`.
- Si une v0.1.24 existe pour un composant d'Impeccable, épingle-la.
- Sinon, installe la **dernière version stable** et dis-moi laquelle.

Avant d'utiliser chaque skill, parcours ses scripts et hooks : ils peuvent exécuter du code. Signale-moi tout ce qui sort du dépôt ou du réseau attendu.

### 0.2 Comment t'en servir pour le design Blueprint

**Ordre de priorité : ce document (sections 8.0 à 8.5) > Impeccable > UI UX Pro Max.**
- Les deux skills **affinent et contrôlent** le style Blueprint épuré. Ils ne le remplacent pas.
- Si l'un d'eux propose quelque chose de contraire à ma spec (glassmorphism, dégradés, coins arrondis, Inter…), ignore la suggestion et note-le dans `design/decisions.md`.

**Étapes, dans cet ordre :**
1. **`/impeccable init`** : crée `PRODUCT.md` (qui je suis, l'usage perso, les 4 types de projets, le ton sobre et technique).
2. **UI UX Pro Max, génération du design system** (`search.py --design-system` ou équivalent du skill) avec comme brief : « outil de projets personnel, style blueprint/cyanotype, très épuré, mode clair et sombre ». Garde uniquement ce qui renforce ma spec : échelle d'espacements, rythme typographique, règles UX, checklist avant livraison.
3. Fusionne le tout dans **`DESIGN.md`** à la racine (tokens de la section 8, composants, règles d'espace et de texte de la section 8.0), puis lance **`/impeccable document`** pour qu'Impeccable s'aligne dessus.
4. **`/impeccable shape`** pour chaque écran de la section 7, **avant** de le coder. Montre-moi le résultat.
5. Après chaque écran codé :
   - **`/impeccable distill`** (épurer) ;
   - **`/impeccable quieter`** (calmer) si besoin ;
   - **`/impeccable critique`** et **`/impeccable audit`** (accessibilité, performance, thèmes, responsive) ;
   - corrige tous les points P0 et P1 ;
   - termine par **`/impeccable polish`**.
6. **`npx impeccable detect src/`** tourne dans la CI GitHub Actions et doit renvoyer **zéro anti-pattern** pour qu'un déploiement passe.

Range les rapports dans `design/rapports/` et résume-les-moi à chaque jalon.

---

## 1. Ce que fait l'app

Isoligne range **tous mes projets** : créatifs, pro / clients / études, vie perso, idées et réflexion. Chaque projet est une page qui mélange :
- **texte** riche ;
- **images** ;
- **deadlines** ;
- **tâches à cocher** ;
- **liens** avec aperçu ;
- **croquis** au doigt ou au stylet ;
- surtout, des **bullet points en arborescence** que je peux **afficher et éditer comme un graphe** (carte mentale radiale, arbre, graphe libre avec liens, frise des deadlines).

Chaque projet a **sa couleur**, pour le repérer d'un coup d'œil dans le menu.

## 2. Décisions déjà prises

| Sujet | Décision |
|---|---|
| Usage | **Personnel uniquement**, 100 % gratuit, code sur GitHub (comme mon app précédente). |
| Appareils | **iPhone + ordinateur**, avec **synchronisation**. L'iPhone utilise l'app installée sur l'écran d'accueil (PWA). |
| Matériel | Pas de Mac : web app (PWA), pas d'app native. |
| Style | **Blueprint** (section 8), en **clair et sombre automatiques** selon le réglage de l'appareil. |
| Graphes | Radial, arbre, libre avec liens, frise. **Éditables dans les deux sens** : modifier le graphe met à jour la liste, et inversement. |
| Deadlines | **Vue calendrier**, **notifications push**, **badges** (« J-3 », « en retard »). |
| Bonus | **Recherche partout**, **import / export Markdown & OPML**, **partage en lecture seule** par lien privé. |
| Couleurs | Une **couleur par projet**, visible sur l'accueil, l'en-tête du projet, le nœud central du graphe et le calendrier. |
| Stockage | **Pas de Cloudflare R2** : il demande une carte bancaire et je n'en veux pas. **Pas de pièces jointes** (PDF, audio, documents). Images et croquis sont synchronisés via **D1**. |
| Langue | Interface en français, formats français (« jeu. 19.11 », « J-3 »). |

## 3. Contraintes non négociables

1. **0 € par mois.** Uniquement des offres gratuites, sans abonnement :
   - GitHub (dépôt + GitHub Pages + Actions) ;
   - Cloudflare Workers et D1 (offres gratuites). **Aucun service qui demande une carte bancaire**, même pour une simple vérification.
2. **Local d'abord.** Tout fonctionne **hors ligne**. La synchro rattrape le retard dès que le réseau revient. Aucune perte de données, jamais.
3. **Mes données m'appartiennent.**
   - Pas de compte tiers, pas de tracking, pas d'analytics.
   - Export complet possible à tout moment.
   - Les photos partagées sont **nettoyées de leurs métadonnées** (EXIF, GPS).
4. **Rapide et très épuré.**
   - Ouverture à froid en moins d'1,5 s sur iPhone récent.
   - Graphe fluide (60 i/s) jusqu'à 500 nœuds.
   - **Moins de texte, plus d'espace** (règles de la section 8.0) : aucune fonction ne doit alourdir l'interface, et les options avancées restent cachées jusqu'à ce qu'on en ait besoin.
5. **Accessible.**
   - Contraste AA dans les deux modes, cibles tactiles ≥ 44 px, VoiceOver.
   - Toutes les actions du graphe sont aussi faisables depuis la liste.
   - La couleur n'est **jamais le seul repère** : toujours accompagnée d'un numéro de calque ou d'un libellé.

## 4. Architecture et stack

### 4.1 Front (PWA sur GitHub Pages)
- **Vite + React + TypeScript** (strict), **vite-plugin-pwa** (Workbox).
  - iOS : `apple-touch-icon`, safe areas, écran de démarrage, `theme-color` selon le mode.
  - `navigator.storage.persist()` pour protéger les données locales.
- **Données locales** :
  - **Yjs** (un document CRDT par projet) persisté via **y-indexeddb**, pour fusionner sans conflit les modifications faites hors ligne sur deux appareils ;
  - **Dexie** pour les index, les métadonnées, la file d'envoi des images et les réglages.
- **Texte riche** : **TipTap** (ProseMirror), avec titres, gras / italique, listes, citations, code, liens.
- **Arborescence (outliner)** : composant maison, rapide et virtualisé.
  - **Ordinateur** :
    - Entrée = nouvel élément ;
    - Tab / Maj+Tab = indenter / désindenter ;
    - Alt+↑/↓ = déplacer ;
    - Cmd/Ctrl+Entrée = cocher ;
    - Retour arrière sur un élément vide = fusionner ;
    - Cmd/Ctrl+. = replier.
  - **iPhone** :
    - glisser vers la droite / gauche = indenter / désindenter ;
    - appui long = déplacer ;
    - petite barre d'outils au-dessus du clavier (indenter, désindenter, cocher, date, couleur).
- **Graphes** : **React Flow** (`@xyflow/react`) pour la toile éditable, avec ces dispositions :
  - **d3-hierarchy** pour l'arbre et le radial ;
  - **d3-force** pour le graphe libre ;
  - une **frise** maison.
  - Transitions animées entre les dispositions (300 ms, désactivées si « réduire les animations »).
- **Croquis** : **perfect-freehand** + Pointer Events (pression du stylet si disponible).
  - Stockés en vectoriel (JSON) + une miniature PNG.
  - Gomme, annuler, 3 épaisseurs, couleurs du thème.
- **Images** :
  - compressées côté appareil avant tout stockage (≈ 1600 px max, JPEG ou WebP selon le support, cible ≈ 300 Ko) ;
  - orientation corrigée, **EXIF supprimées** ;
  - + une miniature ≈ 30 Ko pour les listes.
- **Recherche** : **MiniSearch**, en local, insensible aux accents et aux fautes légères. Elle couvre le texte, les bullet points, les légendes d'images et les titres de liens.
- **Import / export** : Markdown, OPML et **sauvegarde complète** (zip avec **fflate** : JSON + images + croquis).
- Tests : **Vitest** et **Playwright** (WebKit au format iPhone 393×852 et Chromium au format ordinateur).

### 4.2 Back (Cloudflare, offre gratuite)
Un **Worker** (TypeScript, déployé avec `wrangler`) sur un sous-domaine `workers.dev`, en CORS strict limité à l'origine GitHub Pages. Il fournit :
1. **Appairage des appareils**.
   - Le premier appareil crée l'espace.
   - Pour ajouter l'ordinateur : l'iPhone affiche un **QR code / code à 8 caractères** valable 5 min.
   - Chaque appareil reçoit un jeton long et aléatoire, stocké **haché** en base, que je peux révoquer dans les Réglages.
   - Pas de mot de passe, pas de compte externe.
2. **Synchro** :
   - mises à jour Yjs stockées dans **D1**, groupées pour économiser les écritures, avec compactage périodique. Les croquis (vectoriels, légers) passent dans Yjs ;
   - **images dans D1** : colonnes BLOB, découpées en morceaux sous la taille maximale d'une ligne D1 (vérifie la limite actuelle dans la doc), adressées par leur empreinte SHA-256 pour ne jamais stocker deux fois la même ;
   - envoi en arrière-plan avec reprise. Synchro à l'ouverture, au retour au premier plan, puis toutes les 30 s quand l'app est ouverte.
3. **Aperçus de liens** (`/unfurl`) :
   - lit les balises Open Graph de l'URL collée ;
   - **protégé contre les abus** : refus des IP privées et locales, délai max, taille max, redirections limitées ;
   - garde l'image d'aperçu sous forme de **miniature ≈ 30 Ko** dans D1.
4. **Notifications push** (Web Push, clés VAPID) envoyées par un **Cron Trigger** toutes les 5 à 10 min. Le Worker lit les rappels à venir dans D1 et pousse vers les appareils abonnés (iPhone installé sur l'écran d'accueil, navigateur de l'ordinateur).
5. **Partage en lecture seule** : génère un lien `/s/<jeton>` qui affiche un **instantané** du projet (page + graphe), sans possibilité d'édition.
   - Révocable, expiration optionnelle (7 j / 30 j / jamais), `noindex`.
   - Images servies par le Worker uniquement avec le jeton du lien, sans EXIF.

**Respecte les limites gratuites** (vérifie-les dans la doc officielle à jour avant de coder) :
- Workers : 100 000 requêtes/jour et 10 ms de CPU par requête ;
- D1 : quotas quotidiens de lectures et d'écritures, appliqués strictement depuis septembre 2026, et stockage total limité (≈ 5 Go) ;
- Cron Triggers : 5 par compte.

Conçois la synchro pour en rester très loin : regroupement, déduplication, compactage, images compressées. Affiche dans les Réglages une petite jauge d'usage (stockage D1 utilisé / disponible). Préviens-moi à 80 %.

### 4.3 Hébergement et déploiement
- Dépôt GitHub (je choisis public ou privé). Front sur **GitHub Pages**, `base` Vite réglé en conséquence.
- **GitHub Actions** : tests → build → déploiement Pages + `wrangler deploy` du Worker.
- **Secrets** uniquement dans GitHub Secrets et `wrangler secret`, **jamais dans le dépôt** : clé VAPID privée, jeton API Cloudflare, sel de hachage.
- Les migrations D1 sont versionnées dans le dépôt.

## 5. Modèle de données (dans un document Yjs par projet)

- **Projet** : `id`, `titre`, `type` (créatif / pro-client-études / perso / idées), `couleur` (clé de palette, section 8.2), `numéro de calque` (01, 02…), `statut` (idée, en cours, en pause, terminé, archivé), `épinglé`, `couverture` (image), `créé / modifié`.
- **Blocs de la page** (ordonnés) : `texte`, `image` (+ légende « FIG. n »), `lien`, `croquis`, `arborescence`, `deadline`, `séparateur`. **Pas de bloc fichier ni audio.**
- **Nœud d'arborescence** :
  - `id`, `parent`, `ordre` (indexation fractionnaire), `texte` ;
  - `tâche` (oui/non, fait/pas fait), `échéance` (date, heure optionnelle) ;
  - `rappels` (J-7, J-1, le jour J à 9 h, 1 h avant, personnalisé) ;
  - `couleur` optionnelle, `replié`, `note` (texte riche court) ;
  - images liées.
- **Lien libre** entre deux nœuds (même hors de la hiérarchie) : `de`, `vers`, `libellé`, `style` (trait, pointillé).
- **Positions par disposition** : pour chaque disposition (radial, arbre, libre, frise), positions manuelles optionnelles des nœuds que j'ai déplacés à la main (« épinglés »). Les autres sont placés automatiquement.
- **Numérotation automatique** façon nomenclature : 1, 1.1, 1.2, 2…

## 6. Arborescence ↔ graphe : l'édition dans les deux sens

La liste et le graphe sont **deux vues des mêmes données**. Toute action dans l'une apparaît instantanément dans l'autre.

**Dans le graphe, je peux :**
- ajouter un nœud enfant ou frère ;
- renommer en double-tap ;
- **glisser un nœud sur un autre pour le rattacher** (changement de parent) ;
- réordonner les frères ;
- replier / déplier une branche ;
- supprimer (avec annulation) ;
- créer un **lien libre** (mode « Relier » : toucher un nœud puis un autre, puis libellé optionnel) ;
- mettre une échéance et une couleur ;
- cocher une tâche ;
- ouvrir le nœud (panneau d'inspection) ;
- déplacer librement un nœud (il devient « épinglé » dans cette disposition), puis bouton « Réorganiser » pour revenir à l'auto.

**Les 4 dispositions :**
1. **Radial** : le projet au centre, avec des **cercles de construction** en pointillé pour chaque niveau (comme sur un plan).
2. **Arbre** : de gauche à droite (vertical en option), connecteurs orthogonaux.
3. **Libre** : force dirigée, idéal pour les liens transversaux ; les liens libres pèsent dans la disposition.
4. **Frise** : axe du temps (aujourd'hui marqué), les nœuds datés placés dessus, regroupés par branche. Glisser un nœud sur la frise **change sa date**.

**Navigation** : pincer pour zoomer, glisser pour se déplacer, double-tap sur le fond pour recadrer, mini-carte sur ordinateur.

**Export du graphe** en SVG et PNG, dans le style du thème.

Tests de propriétés : quelle que soit la suite d'opérations (dans la liste ou le graphe), l'arborescence reste un arbre valide (aucun cycle, aucun orphelin). Les allers-retours Markdown et OPML ne perdent rien (texte, tâches, dates, couleurs, liens libres en métadonnées).

## 7. Les écrans

**Navigation principale** (barre du bas sur iPhone, colonne latérale sur ordinateur) : **Projets · Calendrier · Recherche · +**.

1. **Accueil / Projets** :
   - en tête, **la prochaine échéance en grand** (« J-3 », titre, date, couleur du projet), et c'est tout ;
   - liste des projets : couleur, titre, prochaine date, fin trait d'avancement. Le type, le pourcentage et le numéro de calque s'affichent dans le projet ;
   - tri par échéance, récent ou nom ; filtres par type et statut ; épinglés en haut ; archives à part.
2. **Page projet** :
   - en-tête **cartouche** : couleur, titre, type, échéance finale, révision et date de modification ;
   - blocs empilés ; bouton **+** pour ajouter un bloc (texte, image, tâche/arborescence, deadline, lien, croquis) ;
   - sélecteur de vue **Page · Graphe · Frise** en bas.
3. **Graphe** :
   - sélecteur **Radial · Arbre · Libre · Frise** en simples onglets soulignés ;
   - barre d'outils en **4 icônes** (ajouter, relier, replier, exporter) ;
   - sur les nœuds, seulement le libellé (et la date de la redline). Le reste s'affiche dans le panneau de sélection, au toucher.
4. **Calendrier** :
   - vues mois, semaine et agenda, avec toutes les échéances de tous les projets (pastille de couleur du projet) ;
   - « en retard » mis en évidence ; glisser pour replanifier ;
   - toucher une échéance ouvre le nœud dans son projet.
5. **Recherche** : un seul champ. Résultats groupés par projet, extrait surligné ; filtres (texte, tâches, images, liens, en retard).
6. **Réglages** :
   - appareils appairés (ajouter / révoquer) ;
   - notifications (rappels par défaut, résumé quotidien optionnel à l'heure de mon choix) ;
   - liens partagés actifs (révoquer) ;
   - import / export, sauvegarde ;
   - jauge des quotas gratuits ;
   - thème (auto / clair / sombre) ;
   - à propos et licences.
7. **Ajout rapide** : depuis n'importe où, le **+** central permet de créer un projet ou d'ajouter une idée, une photo ou un lien à un projet existant.
   - Coller une image ou une URL depuis le presse-papiers est détecté et proposé.
   - Sur ordinateur : glisser-déposer d'images. Tout autre type de fichier est refusé avec un message clair.
8. **Modèles de départ** (optionnels, à la création d'un projet) : court-métrage / projet créatif, client, mémoire / études, déménagement / événement, brainstorm. Chacun est une petite arborescence pré-remplie et modifiable.
9. **Ordinateur** : mise en page en 3 colonnes (projets · page · graphe côte à côte), redimensionnables. Palette de commandes (Cmd/Ctrl+K) et raccourcis clavier documentés (`?`).

**Notifications et badges** :
- demande d'autorisation **au bon moment** (à la création de la première échéance), avec explication ;
- sur iPhone, rappel que l'app doit être ouverte depuis l'écran d'accueil pour recevoir les notifications ;
- **pastille sur l'icône** (API Badging) = nombre d'échéances du jour + en retard.

## 8. Direction artistique : Blueprint

L'app doit ressembler à un **tirage de plan d'architecte** : précise, calme, technique, **jamais à une app générée par IA**. Référence : mes maquettes Blueprint **version épurée** (je te joindrai des captures). Respecte-les fidèlement.

### 8.0 Épuré avant tout (règle n° 1, prioritaire sur tout le reste)
**Moins de texte, plus d'espace.** Chaque écran doit respirer.

**Espace :**
- marges latérales de **28 px** sur iPhone ;
- **28 à 40 px** entre les sections ;
- lignes de liste d'au moins **46 px** ;
- le vide est un élément de design, ne le remplis pas.

**Texte :**
- **un seul niveau d'info secondaire** par élément (une ligne grise au maximum) ;
- pas d'étiquettes quand le contenu parle de lui-même (pas de « AVANCEMENT », « NOMENCLATURE », « TYPE » au-dessus des valeurs) ;
- pas de méta-infos décoratives (numéro de feuille, révision…) ;
- au maximum **3 tailles de texte** par écran ;
- les boutons de barre d'outils et de navigation sont des **icônes seules** (avec `aria-label` et une info-bulle sur ordinateur), sauf le sélecteur Page / Graphe / Frise.

**Révélation progressive :**
- tout le détail (dates secondaires, notes, pièces jointes, sous-tâches) s'ouvre **au toucher**, dans un panneau ;
- les **tâches faites se replient** (« 2 faites ») ;
- une seule **redline** visible à la fois (l'échéance la plus urgente) ;
- sur l'accueil, **la prochaine échéance en grand** et rien d'autre en tête ; les suivantes sont dans le calendrier.

**Densité de l'accueil** : par projet, seulement la couleur, le titre, la prochaine date et un fin trait d'avancement. Pas de type, pas de pourcentage.

Teste chaque écran avec cette question : « Si j'enlève cet élément, est-ce que quelque chose manque vraiment ? » Si non, enlève-le.

### 8.1 Couleurs (tokens CSS)

| Token | Sombre (cyanotype) | Clair (tirage diazo) | Usage |
|---|---|---|---|
| `--fond` | `#0F2D52` | `#EEF1EC` | fond |
| `--trait` | `#D6E4F0` | `#1F4E8C` | texte, traits, bordures |
| `--trait-2` | `#8FB0CF` | `#44658C` | texte secondaire, cotes (≥ 4,5:1) |
| `--grille-majeure` | `rgba(214,228,240,.08)` | `rgba(31,78,140,.07)` | grille tous les 60 px (discrète) |
| `--grille-mineure` | `rgba(214,228,240,.03)` | `rgba(31,78,140,.025)` | grille tous les 12 px (à peine visible) |
| `--redline` | `#FF6B4A` | `#B8321C` | deadlines proches, retards, action « ajouter » |

- **Fond quadrillé** permanent (deux grilles superposées, 60 px et 12 px).
- **Aucun arrondi** (rayon 0), **aucune ombre**, traits de 1 px.
- Les états actifs sont **remplis** : fond = couleur du trait, texte = couleur du fond.

### 8.2 Palette des projets : 8 « crayons de calque »
Chaque couleur a une version sombre et une version claire, toutes vérifiées en contraste. Propose-moi les 8 valeurs finales en partant de :

| Couleur | Sombre | Clair |
|---|---|---|
| orange | `#FF9A6B` | `#E0703F` |
| vert d'eau | `#7FD1B9` | `#2F8F7A` |
| lilas | `#C3A6FF` | `#7A5CC2` |
| ocre | `#FFD166` | `#C9A227` |
| vert | `#9BD38A` | `#4E9A4A` |
| ciel | `#9AD0FF` | `#2F6FB0` |
| rose | `#FF9FB2` | `#C24D6A` |
| craie | `#E6E6E6` | `#5A5F66` |

La couleur apparaît comme un **petit carré plein** (avec contour décalé en mode clair), **toujours accompagné du numéro de calque**. Pas de bordure colorée à gauche des cartes.

### 8.3 Typographie (auto-hébergée via `@fontsource`)
- **Archivo** élargi (`font-stretch: 125%`, 700–800, capitales, interlettrage 0,04 à 0,14 em) : titres, étiquettes de cartouche, boutons.
- **B612** : texte courant et interface.
- **B612 Mono** : dates, numéros, chiffres, cotes.
- Interdits : Inter, Roboto, SF par défaut, Poppins, Montserrat, Space Grotesk.

### 8.4 Éléments signature
1. **En-tête de projet minimal** : carré de couleur + numéro de calque (« 01 »), grand titre en capitales, **une seule ligne** grise (« Créatif · fin 26.02.27 »). Le cartouche complet (type, échéance, dates de modification) ne s'affiche qu'en touchant le titre.
2. **Cotes** : l'avancement est une **ligne de cote** (flèches aux extrémités, trait épais jusqu'à l'avancement), suivie seulement de « 39 % ».
3. **Redlines** : l'échéance la plus proche, ou en retard, est entourée d'un **nuage de révision** (contour festonné) rouge, comme une correction d'architecte. Les autres échéances sont en pointillé.
4. **Nomenclature** : l'arborescence est numérotée (1, 1.1, 1.2), avec des **lignes de points** entre le libellé et l'info à droite.
5. **Figures** : chaque image a des **repères d'angle** et une légende « FIG. n — … ».
6. **Graphe** :
   - nœuds rectangulaires bordés, petits carrés pleins pour les feuilles ;
   - **cercles de construction** en pointillé (radial) et **axes** fins ;
   - sélection = **4 repères d'angle** rouges ;
   - liens libres en pointillé couleur du projet, avec libellé.
7. **Animations** :
   - les traits **se dessinent** (stroke-dashoffset, 150 à 250 ms) à l'apparition d'un bloc ou d'un nœud ;
   - cocher une tâche trace une **croix** ;
   - rien ne rebondit ;
   - tout est désactivé avec `prefers-reduced-motion`.
8. **Icônes** au trait 1,5 px, angles vifs, dessinées sur mesure. Jamais d'emoji.

### 8.5 Interdits (pour que ça ne fasse pas « IA »)
- dégradés, glassmorphism, ombres floues ;
- coins arrondis « bulle », cartes avec bordure colorée à gauche ;
- illustrations 3D, emoji comme icônes ;
- textes d'interface marketing ou enthousiastes.

Le ton est sobre et technique, et **le moins de mots possible** : « Calque 01 », « 2 faites », « J-3 ».

## 9. Sécurité et confidentialité
- Jetons d'appareil et de partage : 256 bits aléatoires, **hachés** en base, comparaison à temps constant, révocables. Limitation de débit sur l'appairage.
- `/unfurl` protégé contre les requêtes vers des adresses internes (SSRF). Le contenu distant est **assaini** avant affichage (aucun HTML injecté).
- Les images ne sont jamais publiques : le Worker ne les sert qu'avec un jeton d'appareil ou de partage valide.
- En-têtes de sécurité stricts (CSP, `Referrer-Policy`, `X-Content-Type-Options`). Aucun script tiers.
- Les photos sont **débarrassées de leurs EXIF** (dont le GPS) à l'import, avec l'orientation corrigée.

## 10. Qualité : ce que tu vérifies toi-même
- **Tests unitaires** (Vitest) :
  - opérations sur l'arbre ;
  - indexation fractionnaire ;
  - allers-retours Markdown et OPML ;
  - calcul des rappels (fuseau Europe/Paris, heure d'été) ;
  - palette et contrastes.
- **Tests de synchro** : deux appareils simulés éditent le même projet **hors ligne**, puis se reconnectent. Les deux convergent vers le même état, sans perte.
- **Tests Playwright** :
  - créer un projet → ajouter texte, image, tâches, échéance → passer en graphe → rattacher un nœud par glisser → vérifier la liste ;
  - frise : glisser une date ;
  - recherche ;
  - export / import ;
  - partage en lecture seule ;
  - captures d'écran clair / sombre à chaque jalon.
- **Performance** : graphe de 500 nœuds fluide, liste virtualisée, Lighthouse ≥ 90 sur mobile, PWA installable, hors ligne fonctionnel.
- **Accessibilité** : VoiceOver sur les parcours principaux, contrastes AA vérifiés automatiquement, alternatives clavier au glisser-déposer.
- **Design** :
  - `npx impeccable detect src/` sans aucun anti-pattern ;
  - `/impeccable audit` sans point P0 ni P1 ;
  - checklist « avant livraison » d'UI UX Pro Max cochée ;
  - captures avant/après dans `design/rapports/`.

## 11. Jalons (montre-moi le résultat à la fin de chacun)
0. **Outils de design installés (section 0) + questions + plan** : tu attends mon accord.
1. **Socle local** :
   - `PRODUCT.md` et `DESIGN.md` validés avec moi ;
   - modèle de données Yjs, projets, page à blocs (texte, tâches, arborescence, deadlines) ;
   - design system Blueprint complet (tokens, typo, composants, clair/sombre), passé à `/impeccable critique` ;
   - hors ligne.
2. **Graphes** : radial, arbre, libre, frise, édition dans les deux sens, export SVG/PNG.
3. **Médias** : images, croquis, liens (Worker `/unfurl`).
4. **Synchro** : Worker, appairage par QR code, D1 (données + images découpées), file d'envoi, tests de convergence.
5. **Temps** : calendrier, rappels, notifications push (Cron), pastille d'icône.
6. **Bonus** : recherche partout, import/export Markdown & OPML, sauvegarde zip, partage en lecture seule, modèles de départ.
7. **Mise en ligne** : GitHub Pages + Worker déployé par GitHub Actions.
   - Donne-moi l'URL et les étapes pour l'installer sur l'iPhone (Safari → Partager → « Sur l'écran d'accueil »), activer les notifications et appairer mon ordinateur.
   - README : sauvegarder, restaurer, révoquer un appareil, surveiller les quotas.

## 12. Règles de travail
- Crée un **`CLAUDE.md`** qui résume ces règles pour les prochaines sessions : gratuité, local d'abord, Blueprint épuré, sécurité, et **toujours passer par Impeccable + UI UX Pro Max pour toute modification d'interface**.
- Commits petits et clairs. Aucune clé ni aucun secret dans le dépôt.
- **Demande-moi avant toute action irréversible ou payante** : ajouter une carte bancaire, rendre le dépôt public, supprimer des données, changer de domaine.
- N'invente jamais une limite d'offre gratuite ou un comportement d'iOS : vérifie dans la documentation officielle à jour et dis-moi quand un point est incertain.
- Si un service ou un site est bloqué par le réseau de ta session, dis-le-moi au lieu de contourner.

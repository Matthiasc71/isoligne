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

## 16.11.2026 : médias (jalon 3)
- **Pas de miniature PNG des croquis** (validé par le propriétaire) : le SVG vectoriel sert partout, plus léger et net à toute taille. Un PNG n'est produit qu'à l'export (jalon 6). Écart assumé avec la spec §4.1.
- **Croquis au format fixe 2,5:1**, dessinés sur une planche en plein écran.
- **Aperçus de liens en texte seul** : titre et site dans la page ; la description n'apparaît que dans le détail (une seule ligne grise par élément).
- **Worker : wrangler 4.156.2 et workers-types du 02.11.2026** (au moins deux semaines). Journaux Cloudflare désactivés (`observability.enabled: false`) : aucune adresse consultée n'est conservée.

## 16.11.2026 : synchro (jalon 4)
- **Pas de QR code d'appairage** (validé par le propriétaire), contrairement à la spec §4.2. Sur iOS, scanner un QR avec l'appareil photo ouvre Safari, et une app de l'écran d'accueil ne partage aucune donnée avec Safari (WebKit, bug 181849). Le code de 8 caractères, suivi de l'empreinte à 6 chiffres, est le seul chemin.
- **Secret maître unique** : il donne par dérivation la clé des données, l'identifiant de l'espace et le jeton de secours. La clé de secours (52 caractères et 2 de contrôle) restaure tout. Elle est affichée et imprimable, jamais enregistrée ailleurs que sur les appareils.
- **File d'envoi remplacée par un vecteur d'état confirmé** : un renvoi en double ne coûte rien, et un envoi interrompu repart de lui-même au cycle suivant.
- **Blocs chiffrés stockés en base64 (texte)** dans D1 : D1 relit un BLOB sous forme de tableau de nombres, trop coûteux à convertir en 10 ms de CPU.

## Clé de secours : 13 groupes, contrôle sur 4 bits (16.11.2026)
- Le brief annonce 13 groupes de 4. Avec 2 caractères de contrôle, la clé en faisait 13 et demi.
- Les 256 bits du secret occupent 51,2 caractères base32 : le 52ᵉ porte 4 bits libres, qui servent de contrôle (SHA-256). 13 groupes pile.
- Une faute de frappe est détectée localement 15 fois sur 16. Sinon, le serveur refuse la clé : elle ne correspond à aucun espace.

## Déploiement du Worker par GitHub Actions (16.11.2026)
- Depuis la session cloud, l'API Cloudflare répond 429 (code 971, « ralentissez ») dès la première requête, avec un délai qui se renouvelle : l'adresse de sortie partagée est limitée. Pas de contournement.
- Déploiement par un workflow lancé à la main (`deployer-worker.yml`). Il crée la base D1 au premier passage (Europe de l'Ouest), applique les migrations, déploie, puis génère le sel une seule fois dans la CI : jamais affiché ni versionné.
- Il vérifie ensuite que le Worker répond et qu'un faux jeton est refusé en 401 : preuve que D1 et le sel fonctionnent.
- Secrets GitHub : `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

## Instance personnelle : un seul espace (16.11.2026)
- L'adresse du Worker est publique (dépôt public, et une page Pages privée exige GitHub Enterprise Cloud, payant). N'importe qui pouvait donc ouvrir son propre espace et consommer le quota gratuit.
- `ESPACES_MAX = "1"` en production : la création d'un espace est refusée (403) dès qu'un espace existe. La restauration et l'appairage vers cet espace restent possibles. Les tests locaux relèvent le plafond (`--var ESPACES_MAX:1000`).
- Si un inconnu créait le premier espace avant vous, il suffirait de vider la table `espaces` en tant qu'administrateur (`wrangler d1 execute`). On ne perd rien : vos données ne sont pas encore sur le serveur.

## Notifications chiffrées sur l'appareil (16.11.2026)
- Le serveur ne doit rien lire. Chaque appareil calcule donc les rappels des 14 prochains jours, puis chiffre le texte de chacun pour chaque abonnement (RFC 8291, aes128gcm). Le Worker ne garde que l'heure et un bloc illisible ; il signe (VAPID, RFC 8292) et envoie.
- Les abonnements (adresse, clés publiques) sont dans l'espace chiffré. Ainsi, l'iPhone peut programmer un rappel qui sonnera aussi sur l'ordinateur.
- Le planning d'un espace tient en **une ligne D1** (liste JSON) : une écriture par mise à jour, une lecture par passage du Cron. On reste loin des 50 requêtes par invocation de l'offre gratuite.
- Cron toutes les 5 minutes (1 des 5 Cron Triggers gratuits), au plus 40 envois par passage (limite de 50 sous-requêtes). Au-delà d'une heure de retard, un rappel est abandonné.
- Adresses de push acceptées : `web.push.apple.com`, `fcm.googleapis.com`, `updates.push.services.mozilla.com`, `*.notify.windows.com`. Ce sont les seuls hôtes que le Worker contacte. En test, un faux service local est autorisé par `PUSH_TEST`, une variable absente en production.
- Le « sub » des jetons VAPID est l'adresse du dépôt, jamais une adresse e-mail.
- Le service worker est généré par Workbox ; les notifications y sont ajoutées par `importScripts('sw-push.js')`. Ce script affiche chaque push (exigence de Safari), ouvre le nœud au toucher et recalcule la pastille depuis l'index local, sans jamais créer la base.
- Tests : la permission et l'abonnement du navigateur sont simulés, car Chromium sans interface refuse les notifications. Tout le reste est réel.

## Rappels : défauts et horaires (16.11.2026)
- J-7 et J-1 à 9 h, jour J à 9 h, sauté si l'échéance est plus tôt ce jour-là. « 1 h avant » seulement avec une heure.
- Les défauts sont écrits sur l'échéance à sa première date. Les changer dans les Réglages ne touche pas les échéances existantes.

## Partage en lecture seule : la clé dans le fragment (17.11.2026)
- La spec prévoyait une page `/s/<jeton>` servie par le Worker. Le serveur ne pouvant rien lire (E2E), c'est l'app qui affiche l'instantané, à l'adresse `…/isoligne/#/s/<id>/<clé>`. Les navigateurs n'envoient jamais le fragment : ni GitHub Pages ni Cloudflare ne voient la clé.
- L'instantané est le projet sous sa forme d'échange (JSON), compressé (fflate) puis chiffré (AES-256-GCM). Le graphe est redessiné chez le destinataire.
- Les partages actifs (identifiant, clé, projet, dates) sont rangés dans l'espace chiffré : chaque appareil peut les mettre à jour ou les révoquer.

## Échange : Markdown, OPML, sauvegarde (17.11.2026)
- Une forme d'échange unique (`ProjetEch`) sert au Markdown, à l'OPML, aux modèles de départ et au partage.
- Markdown : ce qui n'a pas d'équivalent (type, rappels, tracés, liens libres) va dans des commentaires HTML. Les liens libres désignent les nœuds par leur numéro (« 1.2 »), puisque les identifiants changent à l'import. L'italique s'écrit `_`.
- Sauvegarde : états Yjs exacts + copie lisible. La restauration fusionne : la sauvegarde fait foi pour ses projets, même supprimés depuis.
- Noms de fichiers translittérés en ASCII : Chromium ignore un nom accentué pour un téléchargement de blob.

## Recherche (17.11.2026)
- Textes cherchables extraits à chaque indexation dans une table Dexie (`textes`). MiniSearch construit l'index à l'ouverture de l'écran, sans ouvrir les projets. Une faute tolérée à partir de 4 lettres. Tous les mots sont requis.

## Frappe juste après Entrée sous WebKit automatisé (17.11.2026)
- En CI, sous WebKit, la première lettre tapée juste après Entrée finit parfois en fin de ligne (« ournageT »). Ce n'est pas systématique.
- Écarté : le focus voulu, appliqué en retard (garde-fou ajouté) ; le champ contrôlé par le seul Yjs (valeur locale ajoutée) ; le décalage dû aux indices (déplacés).
- Expérience en CI : avec 30 ms entre les touches (un pouce rapide en met 100 ou plus), le test échoue encore parfois au premier essai et passe au second. Cause non identifiée. Le test tape à 30 ms, et la CI accepte une seconde tentative pour les e2e.
- **À vérifier sur iPhone réel** : taper vite juste après « Retour ».

## Ouverture, titre, retrait, glisser (17.11.2026)
- Ouverture « Construction » dans `index.html` (style en ligne : la CSP autorise les styles en ligne, pas les scripts). Retrait piloté par `main.tsx` : projets prêts + animation jouée, plafond 1,5 s, toucher pour passer.
- Thème mémorisé aussi dans `localStorage` et posé par un petit script externe (`theme-initial.js`) : la CSP interdit les scripts en ligne.
- Courbes de niveau du titre : chemins périodiques dessinés sur deux périodes et glissés d'une période (transform CSS), pour une boucle sans couture et sans calcul par image.
- Retrait : `padding-left` de la ligne = min(profondeur, 5) × 20 px.
- Glisser : départ dès 10 px de mouvement franchement vertical sur le numéro.

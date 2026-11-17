# Isoligne

Une app personnelle de projets, pensée comme un plan d'architecte : arborescence numérotée (1, 1.1, 1.2), graphe, échéances en redline, croquis, liens. Elle fonctionne hors ligne et se synchronise entre l'iPhone et l'ordinateur, avec un chiffrement de bout en bout. Elle coûte 0 € par mois et ne demande aucun compte tiers.

**Adresse : https://matthiasc71.github.io/isoligne/**

---

## Installer sur l'iPhone

1. Ouvrez l'adresse dans **Safari**. Les autres navigateurs d'iOS ne savent pas installer l'app.
2. Touchez **Partager** (le carré avec une flèche), puis **Sur l'écran d'accueil**, puis **Ajouter**.
3. Ouvrez désormais Isoligne **depuis son icône**.

L'app installée et l'onglet Safari sont deux mondes séparés : chacun a ses propres données (comportement d'iOS). Travaillez dans l'app installée. Elle y est aussi protégée contre l'effacement automatique : **Réglages → Données sur cet appareil** l'indique.

## Premier lancement : créer votre espace

**Réglages → Synchro → Activer la synchro.**

- Donnez un nom à l'appareil (« iPhone »).
- La **clé de secours** s'affiche aussitôt : 13 groupes de 4 caractères. **Imprimez-la ou notez-la**, puis rangez-la à l'abri. Sans elle, si tous vos appareils sont perdus, vos données sont irrécupérables : personne, pas même le serveur, ne peut les déchiffrer.
- Elle reste consultable ensuite : Réglages → Synchro → Clé de secours.

> Le serveur n'accepte **qu'un seul espace** : le premier créé. Créez le vôtre dès la mise en ligne. Si quelqu'un l'avait fait avant vous, il suffirait de vider la table `espaces` de la base (voir « Dépannage »).

## Activer les notifications

- À la création de votre première échéance, l'app propose les rappels. Touchez **Activer**, puis **Autoriser**.
- Ou bien : **Réglages → Notifications → Activer les notifications**.
- **Envoyer un essai** vérifie toute la chaîne. La notification arrive en quelques secondes.

Points à connaître :
- Sur iPhone, les notifications et la pastille de l'icône n'existent que dans l'app **installée** (iOS 16.4 et suivants).
- Rappels par défaut : J-7, J-1 et le jour J à 9 h (heure de Paris). « 1 h avant » s'ajoute si l'échéance a une heure. Tout se règle échéance par échéance, et les défauts dans les Réglages.
- Un rappel peut arriver **jusqu'à 5 minutes après l'heure** : le serveur passe toutes les 5 minutes.
- Le texte des rappels est chiffré sur l'appareil. Le serveur ne voit qu'une heure d'envoi.
- Pour les couper : Réglages de l'iPhone → Notifications → Isoligne.

## Relier l'ordinateur

1. Sur l'ordinateur, ouvrez l'adresse dans votre navigateur. Chrome et Edge proposent de l'installer comme une app (icône dans la barre d'adresse).
2. Sur l'**iPhone** : Réglages → Synchro → **Ajouter un appareil**. Un code de 8 caractères s'affiche, valable 5 minutes.
3. Sur l'**ordinateur** : Réglages → Synchro → **Rejoindre un espace**, puis saisissez le code. Minuscules et tirets sont acceptés.
4. Les deux écrans affichent **6 chiffres**. S'ils sont **identiques**, confirmez sur l'iPhone. S'ils diffèrent, refusez : quelqu'un s'est interposé.

La synchro démarre seule : à l'ouverture, au retour au premier plan, au retour du réseau, puis toutes les 30 s quand l'app est ouverte. Hors ligne, tout continue de fonctionner, et les modifications partent au retour du réseau.

## Sauvegarder et restaurer

- **Sauvegarder** : Réglages → Données → **Sauvegarder tout**.
  - Vous obtenez `isoligne-AAAA-MM-JJ.zip` : l'état exact de chaque projet, plus une copie lisible hors de l'app (Markdown et croquis en SVG).
  - Le fichier **n'est pas chiffré** : rangez-le en lieu sûr.
  - Les Réglages rappellent la date de la dernière sauvegarde et la conseillent au-delà de 30 jours.
- **Restaurer** : Réglages → Données → **Restaurer une sauvegarde**.
  - La restauration **fusionne** : rien n'est écrasé, aucun doublon.
  - Un projet supprimé depuis la sauvegarde revient.
- **Tous les appareils perdus** :
  1. Sur un nouvel appareil, Réglages → Synchro → **Restaurer avec la clé de secours**. Tout revient du serveur.
  2. Une sauvegarde zip peut compléter, si le serveur avait été vidé.
- **Un projet seul** : « ··· » du projet → **Exporter en Markdown** ou **en OPML**. Réglages → Données → **Importer un fichier** crée un projet à partir d'un fichier Markdown ou OPML.

## Révoquer un appareil

- Réglages → Synchro → liste des appareils → **Révoquer**, puis confirmez.
- L'appareil révoqué ne peut plus synchroniser ni recevoir de notifications. Ses données locales restent sur lui.
- Sur l'appareil révoqué, **Quitter l'espace** le remet à zéro (les projets restent), et il peut de nouveau rejoindre un espace.
- **Téléphone perdu** : révoquez-le depuis l'ordinateur. Si tout est perdu, utilisez la clé de secours (voir plus haut).

## Partager un projet en lecture seule

- « ··· » du projet → **Partager en lecture seule**, puis choisissez la durée : 7 jours, 30 jours ou jamais.
- Le destinataire voit un **instantané** (page et graphe), sans compte et sans rien pouvoir modifier.
- Le lien contient la clé de déchiffrement après le `#`. Cette partie n'est jamais envoyée à un serveur, donc le serveur ne peut pas lire l'instantané.
- **Mettre à jour** remplace l'instantané en gardant le lien.
- **Révoquer** (Réglages → Liens partagés) l'éteint aussitôt.

## Surveiller les quotas gratuits

| Service | Limite gratuite | Où regarder |
|---|---|---|
| Base D1 (synchro) | 500 Mo par base · 5 Go au total · 5 millions de lignes lues et 100 000 écrites par jour | Dans l'app : Réglages → Synchro → « Stockage x Mo / 500 Mo » (en rouge à partir de 80 %). Cloudflare : Storage & Databases → D1 → `isoligne`. |
| Worker | 100 000 requêtes par jour · 10 ms de CPU par requête · 5 Cron Triggers par compte (1 utilisé) | Cloudflare : Workers & Pages → `isoligne-api` → Metrics. |
| GitHub Pages | Site de 1 Go au plus · 100 Go de bande passante par mois · 10 publications par heure | GitHub : Settings → Pages. |

Si une limite quotidienne de D1 est atteinte, la synchro s'interrompt jusqu'au lendemain. L'app continue de fonctionner localement et rattrape ensuite. Aucun service ne demande de carte bancaire.

## Vie privée et sécurité

- **Chiffrement de bout en bout** : tout ce qui part au serveur (projets, rappels, partages) est chiffré sur l'appareil (AES-256-GCM). Le serveur ne garde que des blocs illisibles, des empreintes salées de jetons et des heures d'envoi.
- **Appairage** : le secret de l'espace passe d'un appareil à l'autre chiffré pour le seul destinataire (ECDH P-256), après comparaison des 6 chiffres.
- **Aucun compte, aucun pistage**, aucun script tiers, aucune analyse d'audience. Les polices sont hébergées avec l'app.
- **Secrets**, jamais dans le dépôt :
  - GitHub Secrets : `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` ;
  - secrets Cloudflare : `SEL` et `VAPID_JWK`, générés une seule fois par la CI et jamais affichés.

## Mise en ligne (pour mémoire)

- **CI** (`.github/workflows/ci.yml`) : typage, tests unitaires, Worker (sécurité, intégration avec une base D1 locale), détecteur de design, e2e WebKit et Chromium, synchro de bout en bout, build.
- **Mettre en ligne l'app** (`pages.yml`) : publie sur GitHub Pages après chaque CI verte sur `main`, puis vérifie la page en ligne.
  - **Une seule fois** : Settings → Pages → Build and deployment → Source : **GitHub Actions**.
- **Déployer le Worker** (`deployer-worker.yml`, lancé à la main : Actions → Déployer le Worker → Run workflow) :
  - crée la base au premier passage et applique les migrations ;
  - déploie, pose les secrets manquants, puis vérifie le service en ligne.

## Développement

```bash
npm ci
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run e2e
```

```bash
npm run e2e:synchro
```

Worker en local : `cd worker && npm ci`, puis un fichier `worker/.dev.vars` (jamais versionné) qui contient `SEL=` (16 caractères au moins) et `ORIGINES=http://localhost:5173`. Ensuite `npm run dev`. L'app en développement l'appelle si l'on définit `VITE_WORKER_URL=http://127.0.0.1:8787`.

## Dépannage

- **« Synchro indisponible dans cette version »** : l'app a été construite sans `VITE_WORKER_URL`.
- **« Appareil révoqué »** : Réglages → Synchro → Quitter l'espace, puis rejoindre de nouveau.
- **Espace créé par quelqu'un d'autre avant vous** : depuis votre ordinateur, avec `wrangler` connecté à votre compte (`npx wrangler login` dans le dossier `worker`), videz les tables de l'espace. **À ne faire que si vous n'avez encore rien synchronisé** : la commande efface tout ce que le serveur garde. Puis recréez votre espace dans l'app.

  ```bash
  npx wrangler d1 execute isoligne --remote --command "DELETE FROM appairages; DELETE FROM appareils; DELETE FROM majs; DELETE FROM tetes; DELETE FROM abonnements; DELETE FROM plannings; DELETE FROM partages; DELETE FROM espaces;"
  ```

## Licence

Code sous licence MIT (voir `LICENSE`). Polices Archivo, B612 et B612 Mono sous SIL Open Font License 1.1. Bibliothèques : React, Yjs, Dexie, TipTap, React Flow, d3, perfect-freehand, MiniSearch, fflate, Workbox, date-fns… (licences MIT, ISC, Apache 2.0, CC0 ; liste dans l'app, Réglages → À propos).

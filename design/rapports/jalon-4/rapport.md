⚠️ DEGRADED: single-context (la session interdit de lancer des sous-agents sans demande explicite du propriétaire)

# Jalon 4 : synchro (16.11.2026)

Brief validé : `design/briefs/synchro.md` (code seul, sans QR ; clé de secours affichée et imprimable). Captures dans les deux thèmes : `mac-*` (ordinateur 1440 × 900), `iphone-*` (393 × 852), `impression-cle.png` (aperçu A4).

Elles sont tirées d'un vrai parcours : deux navigateurs, un Worker `wrangler dev` et une base D1 locale neuve (`npm run e2e:synchro`, aussi lancé en CI).

## Ce que prouve le test de bout en bout
1. Mac : « Activer la synchro » ; la clé de secours apparaît tout de suite (13 groupes).
2. Mac : « Ajouter un appareil » affiche un code de 8 caractères. L'iPhone le saisit en minuscules, avec un tiret.
3. Les deux écrans affichent la **même empreinte** à 6 chiffres. Le Mac confirme.
4. Le projet du Mac arrive sur l'iPhone. Un projet créé sur l'iPhone remonte sur le Mac.
5. Le Mac révoque l'iPhone. Au cycle suivant, l'iPhone affiche « révoqué » et le témoin redline sur « ··· » ; ses projets restent. « Quitter l'espace » le remet à zéro.
6. Un troisième navigateur restaure tout avec la clé de secours, saisie en minuscules.
7. axe (WCAG 2.2 AA) dans les deux thèmes à chaque étape, et cibles de 44 px au moins sur iPhone.

## Critique (heuristiques de Nielsen) : 33/40

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | Visibilité de l'état | 4 | Une ligne de cote dit tout : « À jour · il y a 2 min », hors ligne, révoqué. Compte à rebours du code. |
| 2 | Monde réel | 3 | « Code », « clé de secours » et « empreinte » restent des mots techniques. Seul « empreinte » n'apparaît pas à l'écran : on dit « les mêmes chiffres ». |
| 3 | Contrôle et liberté | 3 | Refuser à tout moment ; révocation confirmée ; quitter un espace après révocation. Pas d'annulation d'une révocation (il faut réappairer). |
| 4 | Cohérence | 4 | Feuilles, choix et boutons repris des autres écrans ; code et empreinte en display B612 Mono. |
| 5 | Prévention des erreurs | 4 | Bouton inactif tant que le code n'a pas 8 caractères ou la clé 52. Lecture tolérante (O→0, I/L→1, tirets, espaces). L'empreinte déjoue un intermédiaire. |
| 6 | Reconnaissance | 3 | Chaque feuille dit où aller sur l'autre appareil (« Réglages, Synchro, Rejoindre un espace »). |
| 7 | Efficacité | 3 | Parcours en 3 étapes. Pas de raccourci pour copier le code. |
| 8 | Minimalisme | 4 | Aucun indicateur quand tout va bien. Pas de jargon de chiffrement à l'écran. |
| 9 | Récupération | 3 | Messages qui nomment la suite (« Code inconnu ou expiré. Affichez un nouveau code… »). Un code expiré oblige à fermer la feuille et à la rouvrir. |
| 10 | Aide | 2 | Rien n'explique la clé de secours au-delà d'une phrase. |

**Spécificité** : la clé de secours est une grille de cartouche, avec sa case de titre « Isoligne · clé de secours ». Imprimée, la feuille se suffit à elle-même.

**Détecteur** : `impeccable detect src/` : 0 anti-pattern, 0 avis. Le noir d'impression est documenté dans DESIGN.md (`encre-impression`).

### Corrigé pendant la critique
- **[P0] Clé de secours non affichée après « Activer »** (une fois sur deux) : React réutilisait le dialogue ouvert d'une branche dans l'autre, et sa fermeture refermait la clé. Chaque branche a maintenant sa propre clé de rendu. Le test passe de façon stable.
- **[P1] Clé de 14 groupes, dont un de 2**, contre 13 dans le brief : les 4 bits de contrôle tiennent désormais dans le 52ᵉ caractère, qui n'en portait qu'un d'utile. Une faute de frappe est détectée localement 15 fois sur 16, et le serveur refuse toute clé qui ne correspond à aucun espace.
- **[P1] Impression décalée et coupée** : la grille était positionnée dans le dialogue. Un bloc d'impression dédié est maintenant rendu sous `<body>` : clé en noir, plus une phrase.
- **[P1] Appareil révoqué sans issue** : ajout de « Quitter l'espace ». Les projets restent et l'appareil peut rejoindre de nouveau.
- **[P2] Cases vides** en fin de grille : remplacées par la case de titre du cartouche.
- **[P2] « Identiques » plus étroit que « Refuser »** : largeurs égales.
- **[P2] « 500,0 Mo »** devient « 500 Mo ».

### À faire
- **[P2]** Bouton « Nouveau code » quand le code a expiré, plutôt que fermer et rouvrir.
- **[P2]** Aide sur la clé de secours (jalon 6, aide).

## Audit technique : 18/20

| # | Dimension | Note | Point clé |
|---|---|---|---|
| 1 | Accessibilité | 4 | 0 violation axe à chaque étape, dans les deux thèmes. État en `role="status"`, erreurs en `role="alert"`. Le témoin est aussi dans le libellé VoiceOver (« synchro à vérifier »). Code et empreinte lus chiffre par chiffre. |
| 2 | Performance | 4 | Un cycle à la fois. Seule la différence depuis le dernier état confirmé est envoyée. Synchro à l'ouverture, au retour au premier plan, au retour du réseau et toutes les 30 s (premier plan seulement). |
| 3 | Thèmes | 4 | Tokens partout ; seul le noir d'impression est littéral, et documenté. |
| 4 | Responsive | 3 | Feuilles du bas sur iPhone, centrées sur ordinateur. Pas encore essayé sur un iPhone réel (jalon 7). |
| 5 | Intégrité | 3 | Chiffrement de bout en bout, empreinte, convergence hors ligne et révocation testés (unitaires, intégration D1, e2e). Le CPU réel du Worker (10 ms) reste à mesurer après le déploiement. |

## Sécurité
- Le Worker ne reçoit que des blocs chiffrés (AES-256-GCM, lié à l'espace et au projet), des empreintes salées de jetons et des noms d'appareil.
- Le secret maître ne quitte un appareil que chiffré pour un seul destinataire (ECDH P-256), après comparaison de l'empreinte par la personne. Il n'est jamais affiché, sauf sous forme de clé de secours, à la demande.
- Le jeton d'appareil n'est remis qu'une fois, après confirmation. Révocation immédiate (401, puis arrêt de la synchro sur l'appareil).
- Codes d'appairage : 40 bits, 5 minutes, usage unique, tentatives limitées par IP.

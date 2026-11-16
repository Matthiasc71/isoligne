⚠️ DEGRADED: single-context (la session interdit de lancer des sous-agents sans demande explicite du propriétaire)

# Jalon 5 : temps (16.11.2026)

Brief validé : `design/briefs/temps.md`. Choix :
- titre complet sur l'écran verrouillé ;
- rappels par défaut J-7, J-1 et jour J à 9 h ;
- résumé quotidien désactivé par défaut.

Captures dans les deux thèmes (`-jour`, `-nuit`) :
- `iphone-mois`, `-semaine`, `-agenda`, `-actions` (« ··· » : ouvrir, replanifier) ;
- `iphone-panneau-rappels` ;
- `ordi-mois`, `-semaine`, `-agenda` ;
- `iphone-reglages-notifications-jour` (tirée du test e2e).

## Ce que prouvent les tests
- **Rappels** (unitaires) :
  - J-7, J-1 et jour J à 9 h à Paris, aux deux changements d'heure 2027 ;
  - « 1 h avant » seulement avec une heure, en instant absolu (y compris la nuit du changement d'heure) ;
  - « jour J » sauté si l'échéance tombe plus tôt ce jour-là ;
  - défauts posés sur une nouvelle échéance seulement ;
  - planning identique quel que soit l'ordre des données (propriété), résumé quotidien.
- **Chiffrement Web Push** : octets identiques au vecteur de la RFC 8291 (annexe A), et aller-retour.
- **Worker, contre `wrangler dev` et un faux service de push** :
  - refus des hôtes inconnus (pas de requête vers un hôte choisi par le client) ;
  - signature VAPID valide (vérifiée avec la clé publique servie) ;
  - message lisible par le seul abonnement ;
  - le Cron envoie les rappels échus, garde les suivants, retire un abonnement disparu (410).
- **App, de bout en bout** :
  - activation des notifications, puis essai reçu et déchiffré ;
  - une nouvelle échéance fait partir un planning chiffré : « J-1 · Maquette » et « Aujourd'hui · Maquette », **aucun texte en clair** dans la requête ;
  - demande d'autorisation à la première échéance, une seule fois.
  - Le service de push du navigateur et la permission système sont simulés : Chromium sans interface n'y a pas accès.
- **Calendrier** (iPhone et ordinateur) :
  - jour choisi, clavier (flèches, le focus suit) ;
  - replanifier par « ··· » puis Annuler ;
  - glisser à la souris, et appui long puis glisser au doigt (vrais événements tactiles) ;
  - ouvrir le nœud ;
  - vue mémorisée ;
  - axe (WCAG 2.2 AA) dans les deux thèmes, pour les vues Mois, Semaine et Agenda, et pour les Réglages.

## Critique (heuristiques de Nielsen) : 33/40

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | Visibilité de l'état | 4 | Carré tracé pour aujourd'hui, plein pour le jour choisi ; jour survolé encadré pendant un glisser ; « Déplacée au … » ; état des notifications en une ligne. |
| 2 | Monde réel | 4 | Mois en titre, initiales L à D, « J-3 » : un calendrier de bureau d'études. |
| 3 | Contrôle et liberté | 4 | Chaque déplacement s'annule ; les rappels se règlent un par un ; notifications désactivables par appareil. |
| 4 | Cohérence | 4 | Onglets soulignés comme le graphe, lignes comme l'accueil, « ··· » partout. |
| 5 | Prévention des erreurs | 3 | Un relâcher hors d'un jour n'a aucun effet. L'heure est gardée. Pas de garde-fou contre une date passée (voulu : on peut noter un retard). |
| 6 | Reconnaissance | 3 | Les carrés de couleur disent le projet, et le nom est dans la liste du jour. Les rappels actifs ne se voient pas dans le calendrier lui-même. |
| 7 | Efficacité | 3 | Clavier complet dans la grille (flèches, Page préc. et suiv., T). Pas encore de raccourci global vers le calendrier (palette, jalon 6). |
| 8 | Minimalisme | 4 | Aucune barre d'événement, aucun indicateur quand tout va bien. |
| 9 | Récupération | 3 | Chaque état bloquant dit la suite : installer l'app, activer la synchro, réautoriser. |
| 10 | Aide | 1 | L'appui long pour déplacer n'est expliqué nulle part (aide des gestes, jalon 6). |

**Détecteur** : `impeccable detect src/` : 0 anti-pattern, 0 avis.

### Corrigé pendant la critique
- **[P1] Glisser à la souris inopérant** : le glisser-déposer natif des liens annulait le geste. Désactivé sur les lignes.
- **[P1] Vue Semaine sur ordinateur** : une colonne s'élargissait au détriment des autres, et la ligne d'échéance y était écrasée (« P… »). Désormais 7 colonnes égales, et la ligne s'empile : carré et « ··· », titre sur deux lignes, projet, compte à rebours.
- **[P1] Cases de rappel de 40 px** : passées à 44 px, dans un composant partagé (panneau du nœud, bloc Échéance, Réglages).
- **[P2] Liste du jour vide** : « Rien ce jour-là », plutôt qu'un vide.

### Écarts au brief, assumés
- Dans le panneau du nœud, les rappels sont des cases directement sous la date, pas une feuille de plus : le panneau est déjà une feuille. Dans le bloc Échéance, une ligne « Rappels · J-7 · J-1 · 9 h » ouvre la feuille, comme prévu.
- J-7 et J-1 sonnent à 9 h, comme le jour J : le matin, pas à l'heure de l'échéance.

### À faire
- **[P2]** Aide des gestes : appui long pour déplacer (jalon 6).
- **[P2]** Raccourci vers le calendrier dans la palette Cmd+K (jalon 6).
- **[P2]** Essai sur iPhone réel : notification, pastille, toucher qui ouvre le nœud (jalon 7, avec l'app en ligne).

## Audit technique : 18/20

| # | Dimension | Note | Point clé |
|---|---|---|---|
| 1 | Accessibilité | 4 | Grille ARIA avec focus mobile ; chaque jour annoncé avec ses échéances ; « en retard » écrit ; chaque geste a une alternative (« ··· », clavier). |
| 2 | Performance | 4 | Planning recalculé localement et envoyé seulement s'il change (empreinte). Cron : une lecture D1 par passage quand rien n'est dû ; au plus 40 envois. |
| 3 | Thèmes | 4 | Tokens partout. |
| 4 | Responsive | 3 | Mois et liste sur iPhone, semaine sur 7 colonnes sur ordinateur. Le sélecteur de date et d'heure est celui du système. |
| 5 | Intégrité | 3 | Chaîne complète testée, sauf le vrai service de push et la pastille sur iPhone réel. Le CPU du Cron reste à mesurer en ligne. |

## Vie privée et limites
- Le Worker ne voit que des heures et des blocs chiffrés pour chaque abonnement. Les adresses des abonnements ne sont acceptées que vers Apple, Google, Mozilla et Microsoft.
- La clé privée VAPID est générée une seule fois dans la CI, en secret Cloudflare : jamais affichée ni versionnée.
- Un rappel peut arriver jusqu'à 5 minutes après l'heure (Cron toutes les 5 minutes). Un rappel en retard de plus d'une heure n'est plus envoyé.
- Une échéance modifiée hors ligne n'est reprogrammée qu'au retour du réseau.
- iOS : notifications et pastille seulement dans l'app installée sur l'écran d'accueil (iOS 16.4 et suivants, vérifié dans la documentation WebKit).

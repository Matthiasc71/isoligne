⚠️ DEGRADED: single-context (la session interdit de lancer des sous-agents sans demande explicite du propriétaire ; évaluation A faite d'abord, puis le détecteur B)

# Critique : accueil et page projet (jalon 1, 16.11.2026)

Cibles : `src/screens/Accueil.tsx`, `src/screens/Projet.tsx`, `src/outliner/Nomenclature.tsx`. Référence : `design/maquettes/v2-*.png`. Captures : ce dossier.

## Score (heuristiques de Nielsen)

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | Visibilité de l'état du système | 3 | Enregistrement local silencieux, ce qui est voulu. La synchro et son état arrivent au jalon 4. |
| 2 | Correspondance avec le monde réel | 4 | Le vocabulaire du plan (nomenclature, cote, cartouche, calque, redline) est cohérent et français. |
| 3 | Contrôle et liberté | 3 | Annuler après une suppression de nœud ou de bloc, Cmd+Z partout. Pas encore de corbeille de projets. |
| 4 | Cohérence et standards | 3 | La case du bloc échéance n'était pas alignée sur l'arborescence (corrigé). |
| 5 | Prévention des erreurs | 3 | Suppression de projet confirmée et dite définitive. Un nœud ne peut pas être rattaché à son propre descendant. |
| 6 | Reconnaissance plutôt que rappel | 2 | Le panneau du nœud s'ouvre en touchant le numéro, ce qui ne se devine pas. Corrigé en partie : bouton « Détails » dans la barre du clavier. Les gestes (balayer, appui long) restent invisibles. |
| 7 | Souplesse et efficacité | 3 | Raccourcis complets au clavier, Cmd+K pour ajouter. La palette de commandes complète arrive au jalon 6. |
| 8 | Esthétique et minimalisme | 4 | Fidèle à Blueprint v2 : 3 tailles de texte, une seule redline, aucune étiquette superflue. |
| 9 | Récupération après erreur | 3 | Projet introuvable signalé sobrement. Pas encore de messages d'échec de synchro (jalon 4). |
| 10 | Aide et documentation | 2 | Aide `?` des raccourcis ajoutée sur ordinateur. Rien encore pour expliquer les gestes sur iPhone. |
| **Total** | | **30/40** | **Bon** |

## Verdict de spécificité

**Évaluation A** : l'interface ne pourrait pas appartenir à un autre produit. La nomenclature numérotée, la ligne de cote d'avancement, le nuage de révision autour de la seule échéance urgente, les carrés de calque et le cartouche en grille de plan forment un vocabulaire propre à Isoligne. Rien de générique : pas de cartes, pas de pastilles arrondies, pas de compteurs « dashboard ». Seul risque de banalité : les feuilles du bas (choix en liste), proches d'un menu iOS standard. C'est acceptable en mode Operate.

**Détecteur (B)** : `impeccable detect src/` renvoie 0 anti-pattern (une remarque corrigée : 14 px hors échelle dans l'éditeur). L'analyse de la page rendue (`detect URL`, en 1280×800 et 393×852) renvoie 0 anti-pattern. J'ai vérifié que l'analyse d'URL fonctionne vraiment : 4 anti-patterns trouvés sur une page piège. `axe-core` (WCAG 2.2 AA) passe dans les deux thèmes sur l'accueil, le projet, le cartouche et le panneau.

## Impression générale

Le socle tient la promesse « tirage de plan » : on lit l'état d'un projet sans rien toucher. La plus grande marge de progrès est la **découvrabilité des actions sur l'iPhone** (panneau, gestes), aujourd'hui portée par des conventions invisibles.

## Ce qui fonctionne

- **La hiérarchie de l'accueil** : « J-3 » est le seul élément fort de l'écran, la cote « 3 j » le mesure, et la liste ne dit que l'essentiel.
- **La nomenclature** : numéros, branches en capitales, tâches faites repliées en « + 2 faites » ; c'est dense sans être chargé.
- **Les deux thèmes** : même structure, contrastes vérifiés, contour décalé des calques en mode clair.

## Problèmes prioritaires

1. **[P1] Actions du nœud peu découvrables sur iPhone** : toucher le numéro, balayer, appui long.
   - *Pourquoi* : le parcours principal sur iPhone (date, rappel, déplacement) dépend d'un geste qu'on ne devine pas.
   - *Correctif appliqué* : bouton « Détails » dans la barre du clavier, qui s'affiche dès qu'on édite une ligne.
   - *À faire* : au jalon 2, un indice discret à la première utilisation (une seule fois), ou un appui long sur le texte qui ouvre aussi le panneau.
   - *Commande* : `/impeccable onboard`.
2. **[P1] Onglets Graphe et Frise vides** : ils mènent à un écran « jalon 2 ».
   - *Pourquoi* : cul-de-sac temporaire.
   - *Correctif* : livrés au jalon 2. En attendant, le message est sobre et propose de revenir à la Page.
   - *Commande* : `/impeccable shape` du graphe.
3. **[P2] Bloc échéance désaligné de l'arborescence** : corrigé (case alignée sur la colonne des cases).
   - *Commande* : `/impeccable layout`.
4. **[P2] Aucune aide pour les gestes** : `?` n'existe que sur ordinateur.
   - *Correctif* : ajouter les gestes à la feuille d'aide, accessible depuis les Réglages, au jalon 6 (palette et aide).
   - *Commande* : `/impeccable clarify`.

## Signaux d'alerte par persona

- **Le propriétaire, sur iPhone, dans le métro** : il ajoute une idée par « + » puis « Idée dans un projet » en 3 touchers, c'est bien. Pour mettre une date, il doit éditer la ligne puis toucher l'icône date, ou toucher le numéro : il ne le saura pas sans essayer. La barre du clavier le guide maintenant.
- **Le propriétaire, sur ordinateur, en session de structuration** : tout se fait au clavier. Mais Ctrl/Cmd+Entrée transforme d'abord en tâche, puis coche : il faut deux appuis sur un élément neuf. Ce choix est documenté dans l'aide `?`.
- **VoiceOver** : la nomenclature est un `tree` dont les éléments contiennent des champs éditables. axe ne signale rien, mais le comportement réel de VoiceOver sur iPhone reste **à vérifier sur l'appareil** : impossible dans cet environnement.

## Observations mineures

- Les champs de date natifs prennent la langue du système. Ils s'afficheront en français sur l'iPhone, mais en anglais dans le navigateur de test.
- Dans le cartouche, révision, création et modification sont regroupées sur une rangée de trois cases.
- Un trait d'avancement à 0 % n'est plus affiché sur l'accueil : seul l'avancement réel apparaît.

## Questions à se poser

- Un appui long sur le *texte* d'une ligne devrait-il ouvrir le panneau, plutôt que l'appui long sur le numéro qui sert à déplacer ?
- Les tâches faites repliées doivent-elles aussi disparaître de la frise, ou y rester en pointillé ?

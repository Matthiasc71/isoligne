⚠️ DEGRADED: single-context (la session interdit de lancer des sous-agents sans demande explicite du propriétaire)

# Jalon 6 : bonus (17.11.2026)

Brief validé : `design/briefs/bonus.md`. Choix :
- liens de partage valables 30 jours par défaut ;
- indice au premier usage pour les gestes ;
- rappel mensuel discret pour la sauvegarde.

Captures dans les deux thèmes (`-jour`, `-nuit`) :
- iPhone : `iphone-recherche`, `iphone-modele`, `iphone-projet-modele-indice`, `iphone-reglages-donnees`, `iphone-gestes` ;
- ordinateur : `ordi-palette`, `ordi-palette-filtre`, `ordi-recherche` ;
- vue du destinataire d'un partage : `iphone-partage-page`, `iphone-partage-graphe`.

## Ce que prouvent les tests
- **Recherche** (unitaires et e2e) :
  - insensible aux accents et à la casse, par préfixe, une faute tolérée (« scenarion » trouve « scénario ») ;
  - filtres Texte, Tâches, Croquis, Liens, En retard ;
  - extrait centré sur le mot trouvé ; résultat qui ouvre le nœud ; recherches récentes.
- **Markdown et OPML** :
  - un projet complet revient identique : arborescence, tâches, dates et heures, couleurs, rappels, notes en texte riche, blocs texte, échéances, liens, croquis, liens libres ;
  - **propriétés** sur 150 projets aléatoires par format, avec des caractères piégeux (`@ { } [ ] < > \ - # * _ \``, retours) : aucune perte ;
  - un Markdown ou un OPML d'un autre outil est accepté.
- **Texte riche ↔ Markdown** : 300 cas aléatoires, même texte et mêmes marques caractère par caractère.
- **Sauvegarde zip** :
  - restauration identique sur un appareil vierge ;
  - fusion sans doublon, deux fois de suite ; un projet supprimé depuis revient ;
  - les ajouts récents restent ;
  - un fichier étranger est refusé.
- **Partage**, de bout en bout entre deux navigateurs :
  - lien créé, ouvert sans compte, en lecture seule (aucune barre de navigation, aucun champ éditable) ;
  - axe sans violation dans les deux thèmes ; graphe dessiné ;
  - révocation, puis « Ce lien n'est plus valable ».
  - Côté Worker : identifiant haché, un autre espace ne peut ni écraser ni révoquer, `noindex`.
- **Palette** : faute légère (inversion comprise), clavier, commandes du projet ouvert, axe. **Modèles** : chaque modèle crée son arborescence, les actions en tâches, sans dates. **Indice** : affiché une fois, puis plus jamais.

## Critique (heuristiques de Nielsen) : 34/40

| # | Heuristique | Note | Point clé |
|---|---|---|---|
| 1 | Visibilité de l'état | 4 | « 3 résultats dans 2 projets », « Dernière sauvegarde il y a 34 jours », « Instantané du … · lecture seule », expiration de chaque lien. |
| 2 | Monde réel | 4 | Le destinataire voit un cartouche et une nomenclature : un plan, pas une page web. |
| 3 | Contrôle et liberté | 4 | La restauration fusionne : rien n'est écrasé. Un lien se met à jour ou se révoque. L'indice se ferme d'un toucher. |
| 4 | Cohérence | 4 | Puces 44 px communes (filtres, rappels), « ··· » du projet pour exporter et partager, onglets soulignés partout. |
| 5 | Prévention des erreurs | 3 | Format inconnu refusé en le nommant ; révocation confirmée ; durée par défaut. Pas d'aperçu avant import. |
| 6 | Reconnaissance | 4 | La palette affiche toutes les commandes groupées sans rien taper ; recherches récentes. |
| 7 | Efficacité | 4 | Cmd+K pour tout ; recherche instantanée (index tenu à jour) ; modèles de départ. |
| 8 | Minimalisme | 4 | Aucun surligneur coloré ; un indice d'une ligne, une fois. |
| 9 | Récupération | 3 | Lien expiré annoncé clairement ; message précis au-delà de 2 Mo. Une sauvegarde importée par erreur ne s'annule pas (mais n'écrase rien). |
| 10 | Aide | 3 | Page « Gestes et raccourcis » et indices au premier usage. |

**Détecteur** : `impeccable detect src/` : 0 anti-pattern, 0 avis.

### Corrigé pendant la critique et les tests
- **[P0] Texte effacé dans la recherche** : un `<` saisi dans une note faisait disparaître le texte qui suivait, car l'index retirait les balises à l'expression régulière. Le texte est désormais lu morceau par morceau.
- **[P1] Noms de fichiers accentués ignorés** par Chromium (« download ») : noms translittérés (« maree-basse.md »). Le même défaut touchait l'**export SVG/PNG du graphe** depuis le jalon 2, corrigé aussi.
- **[P1] Ambiguïtés Markdown** trouvées par les tests de propriétés :
  - italique collé au gras (« *a*** ») : l'italique s'écrit désormais `_` ;
  - délimiteurs à l'intérieur du code ;
  - paragraphe qui commence par « - », « # », « > » ou « 1. » : échappé ;
  - paragraphe vide : omis.
- **[P1] « il y a -1 jours »** juste après une sauvegarde (horloge de l'écran en retard d'une minute) : borné à zéro.
- **[P1] Palette** : le focus partait sur « Fermer » et une inversion de lettres n'était pas tolérée. Corrigé, et la croix reste à droite quand le titre est masqué.
- **[P2] Licences** : React Flow, d3 et perfect-freehand ajoutés dans À propos (oubli depuis le jalon 2).

### Écarts au brief, assumés
- Le partage n'est pas une page servie par le Worker (`/s/<jeton>` dans la spec), mais l'app elle-même, sur `#/s/<id>/<clé>`. C'est le seul moyen que le serveur ne lise rien, puisque la clé reste dans le fragment. Le graphe est redessiné chez le destinataire, dans son thème, plutôt qu'envoyé en image.
- L'OPML ne porte que l'arborescence, ses notes et ses liens libres (pas les blocs texte ou croquis) : le format ne connaît que des lignes. Le Markdown et la sauvegarde portent tout.

### À faire
- **[P2]** Aperçu avant import (nombre de branches, titre) et « Annuler » après un import.
- **[P2]** Indice « deux doigts » de la planche : à vérifier sur iPhone réel (jalon 7).

## Audit technique : 18/20

| # | Dimension | Note | Point clé |
|---|---|---|---|
| 1 | Accessibilité | 4 | Combobox et listbox pour la palette ; décompte des résultats annoncé ; mots trouvés en gras et soulignés ; graphe partagé avec texte alternatif. 0 violation axe (recherche, palette, partage, Réglages). |
| 2 | Performance | 4 | Index de recherche dans Dexie, tenu à jour à chaque modification ; MiniSearch et fflate chargés seulement par les écrans qui en ont besoin. |
| 3 | Thèmes | 4 | Tokens partout ; le graphe partagé suit le thème du destinataire. |
| 4 | Responsive | 3 | Filtres sur deux lignes sur iPhone ; palette sur ordinateur seulement (choix du brief). |
| 5 | Intégrité | 3 | Allers-retours prouvés par propriétés. La feuille de partage du système (iPhone) n'est pas testable ici : vue sur iPhone réel au jalon 7. |

## Sécurité et vie privée
- **Partage** :
  - identifiant de 256 bits stocké haché ;
  - instantané compressé puis chiffré (AES-256-GCM) avec une clé neuve, qui n'est que dans le lien après le `#` et n'est jamais envoyée à un serveur ;
  - révocable, expiration purgée par le Cron ; 2 Mo et 50 liens au plus ;
  - le destinataire n'exécute rien du contenu : texte rendu par React, liens limités à http(s), graphe en image.
- **Sauvegarde** : non chiffrée, et l'app le dit. Elle contient les états exacts et une copie lisible.
- **Import** : 50 Mo au plus, formats reconnus seulement.

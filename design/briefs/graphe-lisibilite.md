# Brief : lisibilité du graphe (radial et arbre) avec beaucoup de niveaux

Retouche de l'écran Graphe (brief d'origine : `graphe.md`). Mode **Operate**. Confirmé le 18.11.

- **Problème constaté** (projet « Parafoudre », 3 niveaux, libellés longs) : cadres de niveau 2 posés sur ceux du niveau 1, libellés qui se chevauchent, arêtes qui traversent les cadres ; le recadrage rétrécit tout pour tenir à l'écran, texte illisible sur iPhone. Tous les niveaux se ressemblent.
- **Hiérarchie par profondeur** (relative au centre affiché, poupée russe comprise) :
  - niveau 1 (point principal) : cadre bordé, Label capitales, plus grand qu'aujourd'hui, même s'il n'a pas d'enfant ;
  - niveau 2 : carré plein de 9 px + texte body ;
  - niveau 3 et plus : carré de 6 px + texte en cote (12 px), couleur secondaire (`--trait-2`, AA).
  La couleur n'est jamais seule : la taille et la forme portent la hiérarchie.
- **Place réelle des libellés** : libellés longs coupés sur 2 lignes (largeur bornée) ; anneaux du radial et colonnes de l'arbre calculés à partir des dimensions estimées des étiquettes, sans chevauchement ; libellés **horizontaux** (choix confirmé).
- **Téléphone** : recadrage à une **taille lisible minimale** ; s'il ne tient pas, le graphe s'ouvre centré sur le projet et l'on glisse ou pince pour voir le reste (choix confirmé). Ordinateur : même règle, seuil plus bas.
- **Intouché** : dispositions libre et frise, gestes, épinglage, liens libres, export (suit la même hiérarchie), vue partagée. Anti-objectifs : ombres, arrondis, couleurs par niveau, texte de biais.

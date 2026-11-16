# Brief : synchro, appairage, clé de secours

Statut : **validé le 16.11.2026** : code seul (pas de QR), clé de secours affichée et imprimable. Spec : §4.2 (appairage, synchro), §7.6 (Réglages), §9.

## 1. Rôle
Mode **Operate**, écran rare. On le traverse une fois pour relier l'iPhone et l'ordinateur, puis on ne le revoit presque plus. Il doit inspirer confiance (« mes données restent à moi ») sans jargon ni alarme.

## 2. Ce qui est déjà prouvé par les tests
- Chiffrement de bout en bout.
- Appairage par code, avec empreinte identique sur les deux écrans.
- Convergence hors ligne, restauration par clé de secours, révocation.
- Jauge d'usage.

L'interface ne fait qu'exposer ces actions.

## 3. Structure (Réglages → section « Synchro »)

### Pas encore de synchro
Une ligne grise : « Les projets restent sur cet appareil. » Trois choix :
- **Activer la synchro** : cet appareil crée l'espace ;
- **Rejoindre un espace** : saisir le code affiché sur l'autre appareil ;
- **Restaurer** : saisir la clé de secours.

### Création de l'espace
1. Nom de l'appareil, prérempli (« iPhone », « Mac », « PC ») et modifiable.
2. **Clé de secours** affichée tout de suite : 13 groupes de 4 caractères en B612 Mono, sur une grille de cartouche.
   - Actions : « Imprimer », « Copier ».
   - Une phrase sobre : « Sans cette clé, si tous vos appareils sont perdus, les données ne sont plus récupérables. »
   - Bouton « Je l'ai notée ». Elle reste consultable ensuite dans les Réglages.

### Ajouter un appareil (sur l'appareil déjà relié)
1. « Ajouter un appareil » affiche le **code** en display (« 7K2M QX9P »), avec un compte à rebours de 5 minutes en cote.
2. Quand l'autre appareil a saisi le code : « Ordinateur demande à rejoindre », puis l'**empreinte à 6 chiffres** en display.
   - Choix : « Les chiffres sont identiques » ou « Refuser ».
   - Si les chiffres diffèrent, quelqu'un s'est interposé : on refuse.

### Rejoindre (sur le nouvel appareil)
Champ du code (8 caractères, tolérant aux minuscules et aux tirets), puis la même empreinte à 6 chiffres, puis « En attente de confirmation sur l'autre appareil ». Une fois la confirmation reçue, la première synchro démarre.

### Synchro active
- **État**, une ligne en cote :
  - « À jour · il y a 2 min » ;
  - « Hors ligne : les modifications partiront au retour du réseau » ;
  - « Appareil révoqué ».
- **Appareils** : liste (nom, « cet appareil », vu le…), chacun avec « Révoquer » (confirmé).
- **Stockage** : une ligne de cote, « 12,4 Mo / 500 Mo », avec le pourcentage. À partir de 80 %, la ligne passe en redline avec un message court.
- **Clé de secours** : « Afficher » (après un appui de confirmation).

## 4. Témoin global
Aucun indicateur de synchro sur les autres écrans quand tout va bien. Seulement en cas de problème durable (révoqué, erreur depuis plus de 10 minutes) : un petit carré redline sur l'icône « ··· » de l'accueil.

## 5. Contraintes
- Textes sobres : jamais « Synchronisation réussie ! ». Les erreurs nomment la situation et la suite (« Code inconnu ou expiré. Affichez un nouveau code sur l'autre appareil. »).
- 3 tailles de texte : display (code, empreinte), body, cote.
- Le secret maître n'est jamais affiché, sauf sous la forme de la clé de secours, à la demande.
- **iOS** : une app de l'écran d'accueil est isolée de Safari (WebKit). L'appairage se fait donc **dans l'app installée**, par le code de 8 caractères. Le QR code est abandonné.

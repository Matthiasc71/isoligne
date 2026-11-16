# Brief : calendrier, rappels, notifications, pastille

Statut : **à valider**. Choix du 16.11.2026 :
- titre complet sur l'écran verrouillé ;
- rappels par défaut J-7, J-1 et jour J à 9 h ;
- résumé quotidien désactivé par défaut.

Spec : §7.4, §7 (notifications et badges), §4.2 point 4, §8. Référence visuelle : `design/maquettes/v2-calendrier-clair.png`.

## 1. Rôle
Mode **Operate**. Le calendrier répond à « qu'est-ce qui arrive, et quand ? » et permet de déplacer une échéance. Les rappels viennent à vous sans ouvrir l'app. Rien de plus : aucune vue de planning, aucune barre de durée.

## 2. Calendrier

### En-tête (maquette)
- L'année en cote, puis le mois en titre (« NOVEMBRE »), avec les chevrons ‹ › à droite.
- Sous le titre, trois onglets soulignés, comme le sélecteur du graphe : **Mois · Semaine · Agenda**. La vue choisie est mémorisée.
- Sur iPhone, la vue par défaut est **Mois**, comme la maquette.

### Mois
- Grille L à D, les jours en body, ceux des mois voisins en gris (trait-2).
- **Aujourd'hui** : un carré tracé (1 px). **Jour choisi** : un carré plein (trait), le chiffre en fond.
- Sous le chiffre, **un petit carré par échéance**, à la couleur du calque du projet, au plus 3. Au-delà, « +n » en cote.
- Un jour qui porte une échéance en retard a un carré redline. La couleur n'est pas le seul repère : la liste du jour dit « en retard ».
- Sous la grille, **la liste du jour choisi**, comme dans la maquette :
  - le jour en label (« JEU. 19.11 ») ;
  - une ligne par échéance : carré calque, titre en body, projet en cote, compte à rebours à droite (« J-3 », en redline si c'est la plus proche ou si elle est en retard).
- Glisser horizontalement sur la grille change de mois ; les chevrons font de même.

### Semaine
- Sur iPhone, 7 lignes (une par jour). Chacune porte le jour en label à gauche et ses échéances empilées à droite. Sur ordinateur, 7 colonnes.
- Aujourd'hui est marqué par le même carré tracé que dans la vue Mois.

### Agenda
- La liste actuelle, groupée par jour.
- Un groupe **« En retard »** en tête, en redline, s'il y a lieu.

### Toucher, replanifier
- **Toucher une échéance** ouvre le projet, sur la branche qui la contient, avec le nœud sélectionné et son panneau ouvert.
- **Replanifier** :
  - sur iPhone : appui long sur une ligne de la liste, puis glisser sur un jour de la grille (Mois) ou une ligne (Semaine). Le jour survolé est encadré, et un retour haptique se fait là où iOS le permet ;
  - sur ordinateur : glisser la ligne ou le carré ;
  - **alternative sans geste**, partout : le « ··· » de la ligne, puis « Replanifier », ouvre le choix de date. L'heure éventuelle est gardée.
  - Après un déplacement, une barre « Déplacée au mar. 24.11 · Annuler » s'affiche 5 s.
- **Clavier (ordinateur)** : les flèches parcourent la grille, Entrée choisit le jour, Page préc. et Page suiv. changent de mois, T revient à aujourd'hui.

## 3. Rappels d'une échéance
- Dans le panneau du nœud et le bloc Échéance, une ligne **« Rappels »** en cote résume les rappels actifs (« J-7 · J-1 · 9 h »). Un toucher ouvre une feuille de choix (cases cochables, 44 px) :
  - **J-7**, **J-1** et **Le jour J à 9 h**, cochés par défaut ;
  - **1 h avant**, seulement si l'échéance a une heure ;
  - **Personnalisé** : une date et une heure.
- Un rappel déjà passé n'est jamais envoyé après coup. Une tâche cochée « faite » ne sonne plus.
- Fuseau Europe/Paris, heure d'été comprise : « 9 h » reste 9 h à Paris en mars comme en octobre.

## 4. Autorisation, au bon moment
- **Quand ?** À la création de la première échéance, une feuille sobre s'ouvre : « Recevoir les rappels sur cet appareil ? », une phrase d'explication, et deux boutons, **Activer** (principal) et **Plus tard**. La demande du système ne part qu'au toucher d'« Activer » : iOS l'exige.
- **Sur iPhone, dans Safari** (app non installée) : « Les rappels arrivent seulement dans l'app installée : Partager, puis Sur l'écran d'accueil. »
- **Sans synchro** : « Les rappels passent par votre serveur de synchro. Activez d'abord la synchro. » Le message renvoie aux Réglages.
- **Refusée** : on ne redemande pas. Les Réglages expliquent comment réautoriser dans les réglages d'iOS ou du navigateur.

## 5. Réglages, section « Notifications »
- **État** en cote : « Activées sur cet appareil », « Bloquées dans les réglages du système », ou « Indisponibles : ouvrez l'app depuis l'écran d'accueil ».
- **Rappels par défaut** : J-7, J-1, Jour J 9 h, 1 h avant (cases). Ils ne s'appliquent qu'aux nouvelles échéances.
- **Résumé quotidien** : désactivé. Activé, il propose une heure (8 h 30 par défaut) et ne part que s'il y a une échéance ce jour-là ou un retard.
- **« Envoyer un essai »** : une notification immédiate, pour vérifier la chaîne.

## 6. La notification
- **Titre** : « J-1 · Présentation du logo ». **Texte** : « Café Orge · jeu. 19.11 ». **Résumé quotidien** : « Aujourd'hui · 2 échéances, 1 en retard ».
- Toucher la notification ouvre le nœud, comme dans le calendrier.
- La **pastille d'icône** compte les échéances non faites du jour et celles en retard. Elle est mise à jour à l'ouverture de l'app, à chaque synchro et à chaque notification, et effacée à 0.

## 7. Contraintes et architecture (aucune donnée lisible par le serveur)
- **Abonnements** : chaque appareil qui active les notifications crée un abonnement push. Ses clés publiques sont rangées dans l'espace chiffré, donc chaque appareil connaît tous les abonnements.
- **Planification** : après chaque synchro, l'appareil calcule les rappels des **14 prochains jours**. Il **chiffre lui-même** le texte de chacun pour chaque abonnement (RFC 8291), puis l'envoie au Worker, qui ne garde que l'heure, l'abonnement et un bloc illisible. Le résultat est le même quel que soit l'appareil qui calcule ; une empreinte évite les envois inutiles.
- **Envoi** : un Cron toutes les **5 minutes** envoie les rappels échus, avec la signature VAPID. Un rappel peut donc arriver jusqu'à 5 minutes après l'heure. Un abonnement expiré (404 ou 410) est retiré.
- **Clés VAPID** : la privée est un secret Cloudflare, jamais dans le dépôt.
- **Limite honnête** : une échéance modifiée hors ligne n'est reprogrammée qu'au retour du réseau.
- **Appareils** : les rappels sonnent sur chaque appareil où les notifications sont activées (iPhone et ordinateur).
- **Accessibilité** :
  - grille en `grid` ARIA, chaque jour annoncé avec ses échéances (« jeudi 19 novembre, 1 échéance, Présentation du logo ») ;
  - cibles de 44 px ;
  - « en retard » toujours écrit, jamais seulement en rouge ;
  - aucun geste sans alternative.
- **Textes sobres** : jamais « 🔔 N'oubliez pas ! ». Trois tailles de texte par écran : titre (mois), body, cote.

## 8. États et volumes
- **Mois sans échéance** : la grille seule, et « Aucune échéance ce mois-ci » en cote sous la grille.
- **Volumes** : de 0 à environ 10 échéances par jour, environ 300 au total. Un titre long est coupé par des points de suspension et lu en entier par VoiceOver.
- **Projets archivés** : leurs échéances sont absentes du calendrier et ne sonnent plus.

# EN VRILLE ! — REFONTE DU MINI-JEU « VENDS-MOI CETTE MERDE ! »

## 1. Objectif

Je souhaite améliorer le mini-jeu « Vends-moi cette Merde ! » pour en faire une véritable expérience de téléachat humoristique, avec une création collaborative d'objets absurdes, une mise en scène télévisée, des présentations orales, des votes et des points.

Je souhaite notamment intégrer une mécanique inspirée du principe des **House Decoys de Use Your Words**, mais adaptée de manière originale à mon mini-jeu.

Le joueur doit pouvoir inventer son propre objet, mais également demander au jeu de lui en proposer un automatiquement lorsqu'il manque d'inspiration.

## 2. Deux modes de jeu

### Mode A — Objets générés par le jeu

Le serveur génère automatiquement les objets à vendre depuis sa bibliothèque.

Chaque joueur reçoit un produit absurde qu'il devra présenter et essayer de vendre aux autres.

Ce mode ne nécessite aucune création d'objet par les joueurs.

### Mode B — Objets créés par les joueurs

**C'est le mode à privilégier pour l'expérience entre amis.**

La première phase consiste à demander à chaque joueur d'inventer un produit ou service complètement absurde.

Le joueur doit renseigner :
- Le nom de l'objet.
- Une courte description de son fonctionnement ou de son utilité.
- Éventuellement une caractéristique ridicule supplémentaire.

Exemples :
- « Le Frigo Dépressif » : un réfrigérateur qui pleure chaque fois qu'on l'ouvre.
- « Le Parapluie Inversé » : protège de la pluie uniquement lorsqu'il fait beau.
- « La Souris Fuyante » : une souris d'ordinateur qui s'échappe dès qu'on travaille.
- « Le Réveil Diplomatique » : un réveil qui négocie avec toi pour ne pas sonner.

Le joueur doit pouvoir saisir librement son idée.

## 3. Bouton HOUSE DECOY — Génération automatique d'un objet

C'est une fonctionnalité essentielle.

Pendant la première phase de création des objets, ajouter sur le téléphone du joueur un bouton intitulé provisoirement :

**🎲 HOUSE DECOY — J'AI PAS D'IDÉE !**

Ce bouton doit permettre de générer immédiatement un produit absurde sans que le joueur ait besoin de l'inventer.

Pour conserver une identité originale sur Steam, prévoir la possibilité de renommer ce bouton « Trouve-moi une idée ! » ou « L'idée du studio ».

### Fonctionnement

1. Le joueur arrive sur l'écran de création.
2. Il peut écrire librement le nom et la description de son objet.
3. S'il n'a pas d'idée, il appuie sur House Decoy.
4. Le serveur sélectionne aléatoirement un objet dans une bibliothèque dédiée.
5. Le nom et la description apparaissent automatiquement dans le formulaire.
6. Le joueur peut accepter cette proposition, la modifier ou en demander une autre.
7. Il valide ensuite son objet comme les autres participants.

### Règles

- Le joueur peut utiliser House Decoy plusieurs fois.
- Chaque utilisation propose un nouvel objet, dans la mesure du contenu disponible.
- Éviter de proposer plusieurs fois le même objet pendant une soirée.
- Si le joueur a déjà écrit quelque chose, demander confirmation avant de remplacer son texte.
- Le contenu généré est modifiable.
- La génération ne valide pas automatiquement l'objet.
- Le joueur doit confirmer son choix.
- Le bouton doit fonctionner sans API d'intelligence artificielle payante.
- Les créations générées et les créations humaines suivent exactement les mêmes règles de distribution.

### Confidentialité

Les autres joueurs ne doivent pas savoir pendant la partie qu'un objet a été proposé automatiquement par le serveur.

Il ne faut afficher aucune mention « généré par le jeu » sur l'objet attribué au vendeur.

Ce détail peut éventuellement être révélé dans les statistiques finales à des fins humoristiques.

## 4. Bibliothèque d'objets House Decoy

Créer une bibliothèque contenant au minimum 150 produits absurdes différents.

Les objets doivent être :
- Originaux.
- Drôles.
- Improbables.
- Faciles à comprendre.
- Intéressants à présenter oralement.
- Suffisamment variés pour éviter les répétitions.

Chaque produit contient :
- Un identifiant.
- Un nom.
- Une description.
- Une catégorie.
- Des mots-clés.
- Une éventuelle accroche publicitaire.

Prévoir plusieurs catégories :
- Technologie inutile.
- Objets du quotidien.
- Inventions catastrophiques.
- Produits de luxe absurdes.
- Services improbables.
- Maison et jardin.
- Bureau et travail.
- Animaux.
- Cuisine.
- Science-fiction.

La sélection doit être effectuée côté serveur.

Prévoir une interface d'administration permettant d'ajouter de nouveaux objets sans modifier le code.

## 5. Interface mobile de création

Je ne veux pas d'un simple formulaire brut.

Créer une interface ressemblant à un atelier d'inventeur ou à un studio de téléachat humoristique.

Elle doit afficher :
- Le titre « INVENTE LE PROCHAIN PRODUIT RÉVOLUTIONNAIRE ! »
- Un champ pour le nom.
- Un champ pour la description.
- Une carte présentant le produit en cours.
- Un bouton House Decoy particulièrement visible.
- Un bouton « Générer une autre idée » après une proposition automatique.
- Un bouton « Valider mon invention ».
- Un chronomètre.
- Une indication du nombre de joueurs ayant terminé.

Le bouton House Decoy doit disposer d'une animation originale : machine à idées, roue de l'absurde ou effet de fabrication.

Quand le jeu propose un objet, le nom et la description doivent apparaître avec une animation amusante.

## 6. Écran principal pendant la création

Pendant que les joueurs inventent leurs objets, la télévision ne doit pas montrer leurs créations.

Afficher un décor de studio de téléachat avec le présentateur virtuel.

Exemple :

**LES INVENTEURS SONT AU TRAVAIL !**

**OBJETS CRÉÉS : 3 / 8**

Afficher :
- Un compteur X / Z en temps réel.
- Une barre de progression.
- Le temps restant.
- Des animations de fabrication.
- Des interventions humoristiques du présentateur.

Exemples :

« Les ingénieurs travaillent. Aucun diplôme n'a été vérifié. »

« On nous annonce déjà plusieurs inventions qui devraient être interdites. »

Lorsqu'un joueur valide son objet, le compteur augmente.

Lorsque tous les joueurs ont terminé, passer automatiquement à la distribution.

Prévoir également une gestion des joueurs qui n'ont pas répondu avant la fin du chronomètre : l'hôte peut les relancer ou autoriser l'attribution d'un objet de secours généré par le serveur.

## 7. Distribution aléatoire des objets

Une fois tous les objets créés :

1. Le serveur récupère les objets validés.
2. Il les mélange.
3. Il attribue un objet à chaque joueur.
4. Aucun joueur ne reçoit son propre objet.
5. Chaque objet est attribué une seule fois.
6. Chaque joueur reçoit exactement un objet à vendre.

Utiliser un algorithme de permutation sans point fixe.

Les objets générés par House Decoy sont traités comme les autres objets.

L'identité de leur créateur doit rester secrète jusqu'à la révélation finale.

## 8. Présentations orales

Après la distribution, chaque joueur devient un commercial.

Il découvre sur son téléphone le produit qu'il doit vendre.

Prévoir un temps de préparation configurable, par exemple 30 à 60 secondes.

Puis le présentateur virtuel appelle les commerciaux un par un.

La télévision affiche :
- Le nom du produit.
- Sa description.
- Une carte produit visuellement travaillée.
- Le pseudonyme du commercial.
- Un chronomètre de présentation.
- Des animations de téléachat.

Le joueur doit improviser son argumentaire.

Il peut inventer des qualités, un prix, un slogan ou des arguments absurdes.

L'hôte doit pouvoir contrôler le début et la fin de chaque présentation, pour permettre aux joueurs de discuter ou de rire sans être interrompus brutalement.

## 9. Votes et points

Après chaque présentation, les autres joueurs attribuent une note selon trois critères :

- **Humour** : de 1 à 5.
- **Conviction** : de 1 à 5.
- **Créativité** : de 1 à 5.

Le vendeur ne peut pas noter sa propre présentation.

Afficher sur le grand écran :

**ÉVALUATIONS REÇUES : X / Z**

Lorsque tous les votes sont enregistrés, révéler les notes avec une animation.

Le meilleur vendeur gagne des points.

Prévoir également un bonus pour le créateur de l'objet lorsque son invention obtient un excellent résultat.

Une création House Decoy ne doit pas désavantager son utilisateur.

Les scores doivent être intégrés au leaderboard général d'EN VRILLE !, avec une pondération équitable par rapport aux autres mini-jeux.

## 10. Révélation finale

Une fois tous les produits présentés :

- Afficher les meilleurs vendeurs.
- Révéler les créateurs des objets.
- Présenter les inventions les plus appréciées.
- Afficher le gagnant du mini-jeu.
- Attribuer les points.
- Actualiser le classement général.

Option humoristique : révéler le nombre de produits créés grâce à House Decoy pendant la manche.

Exemple :

« Sur 8 inventions, 5 ont nécessité l'aide du jeu. Le futur de l'humanité est rassurant. »

## 11. Exigences de développement

Implémenter réellement :
- La création manuelle des objets.
- La génération automatique via House Decoy.
- La possibilité de modifier un objet proposé.
- La régénération d'une proposition.
- L'enregistrement côté serveur.
- Le compteur X / Z.
- La distribution aléatoire sans auto-attribution.
- La préparation et la présentation des objets.
- Les votes.
- Le scoring.
- La révélation des créateurs.
- Les transitions et animations.

Tester plusieurs scénarios :
- Tous les joueurs créent manuellement leurs objets.
- Tous les joueurs utilisent House Decoy.
- Certains joueurs créent leur objet et d'autres utilisent House Decoy.
- Un joueur régénère plusieurs propositions.
- Un joueur modifie un objet généré.
- Un joueur se déconnecte pendant la création.
- Un joueur ne valide pas à temps.

Conserver la compatibilité avec le moteur multijoueur Socket.IO, le client PC destiné à Steam, les téléphones Web et le déploiement via Docker/Portainer.

## Résultat attendu

Je veux un véritable mini-jeu de téléachat humoristique, pas un simple formulaire suivi d'un vote.

L'invention des objets doit déjà être amusante.

Le bouton House Decoy doit permettre aux personnes qui manquent d'imagination de participer aussi facilement que les autres.

Les produits inventés par les joueurs et ceux proposés par le jeu doivent pouvoir devenir aussi absurdes et intéressants les uns que les autres.

**Le principe fondamental est que tout le monde puisse participer, même sans inspiration, et que les meilleurs moments viennent ensuite des présentations orales et des réactions entre amis.**
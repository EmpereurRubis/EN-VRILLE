# EN VRILLE ! — REFONTE DU MENU DE SÉLECTION DES MINI-JEUX

## 1. Objectif principal

Je souhaite que l'interface de sélection des mini-jeux d'EN VRILLE ! ressemble à un véritable menu de jeu vidéo, avec une qualité visuelle comparable dans son approche à Mario Party ou aux Jackbox Party Packs.

Actuellement, le problème est que les mini-jeux sont présentés trop simplement, essentiellement avec leur nom et leur description.

**Je veux que chaque mini-jeu possède une identité graphique immédiatement reconnaissable, une illustration originale, un logo et des animations qui donnent réellement envie de jouer.**

Il ne faut pas créer une interface ressemblant à un catalogue Web ou à une liste de boutons.

## 2. Parcours utilisateur

Lorsqu'un joueur lance `EN-VRILLE.exe`, il arrive sur le menu principal animé du jeu.

Il choisit :

**DÉMARRER**

Cela ouvre la plateforme `https://envrille.erubis.fr` dans l'application.

Il accède ensuite à :
- CRÉER UNE PARTIE
- REJOINDRE UNE PARTIE

En choisissant CRÉER UNE PARTIE, il sélectionne le mode :
- Soirée personnalisée.
- Soirée aléatoire.

Dans le mode personnalisé, il doit accéder à un **véritable écran de sélection visuel des mini-jeux**.

Dans le mode aléatoire, ces mêmes illustrations doivent être utilisées pour présenter les jeux sélectionnés et leur tirage.

## 3. Identité visuelle de chaque mini-jeu

Créer une véritable identité graphique pour les cinq jeux.

Chaque mini-jeu doit posséder :
- Une illustration principale originale (key art).
- Un logo ou titre stylisé spécifique.
- Une couleur dominante.
- Un décor thématique.
- Des éléments graphiques caractéristiques.
- Une animation de sélection.
- Un effet sonore court.
- Une illustration ou animation de présentation des règles.

### Le Plateau des Mythos

Univers : émission télévisée humoristique, plateau de discussion absurde.

Illustration : un animateur complètement dépassé, un plateau de télévision coloré, des microphones et des éléments de décor exagérés.

Couleurs dominantes : violet et jaune.

Ambiance : humour, improvisation et mauvaise foi.

### Vends-moi cette Merde !

Univers : téléachat délirant.

Illustration : un vendeur surexcité qui tente de présenter un objet complètement absurde devant un public.

Couleurs dominantes : orange et turquoise.

Ambiance : publicité ridicule, arguments invraisemblables, produits improbables.

Faire clairement comprendre à travers l'illustration qu'il faut inventer puis vendre des objets.

### Tribunal du N'importe Quoi

Univers : salle d'audience théâtrale et humoristique.

Illustration : un juge caricatural avec son marteau, un accusé paniqué et une salle de tribunal exagérément dramatique.

Couleurs dominantes : rouge, bordeaux et or.

Ambiance : accusation, défense, humour et improvisation.

### Qui parmi nous ?

Univers : émission de sondage entre amis.

Illustration : plusieurs personnages qui se pointent mutuellement du doigt, avec des réactions excessives et un décor de jeu télévisé.

Couleurs dominantes : bleu électrique et rose.

Ambiance : révélations, votes, rivalités amicales et humour.

### Sous-titres Interdits

Univers : cinéma vintage et studio de doublage.

Illustration : un ancien projecteur, une pellicule de film, un écran de cinéma et des personnages de film aux expressions particulièrement dramatiques.

Couleurs dominantes : noir, rouge cinéma et doré.

Ambiance : détournement de scènes cinématographiques, dialogues absurdes et humour collaboratif.

L'illustration doit évoquer l'esprit des scènes cinématographiques rétro utilisées par le mini-jeu, comme dans Sub The Title, sans réutiliser ses ressources.

## 4. Présentation des cartes de mini-jeux

Chaque carte de sélection doit contenir :

- Une grande illustration occupant la majeure partie de la carte.
- Le logo ou nom stylisé du mini-jeu.
- Une accroche humoristique courte.
- Le nombre de joueurs compatibles.
- Une durée estimée.
- Une indication du type d'expérience : écriture, improvisation, votes, oral, cinéma.
- Un indicateur de sélection.
- Un bouton ou une interaction permettant de consulter les détails.

Les éléments d'information doivent être discrets et ne pas écraser l'illustration.

**L'image doit être la première chose que l'utilisateur remarque, pas le texte.**

Prévoir une interface avec une disposition adaptée aux grands écrans, affichant plusieurs mini-jeux simultanément.

## 5. Animations et interactions

Lorsque l'utilisateur survole une carte :
- Elle s'agrandit légèrement.
- Son illustration réagit ou s'anime.
- Un effet de lumière apparaît.
- Un son de survol discret est joué.
- Son logo peut être mis en valeur.

Lorsqu'il sélectionne un mini-jeu :
- Une animation confirme la sélection.
- La carte change d'état visuel.
- Un effet sonore est joué.
- Le mini-jeu est ajouté à la programmation de soirée.

Lorsqu'il désélectionne :
- Une animation inverse est jouée.
- La programmation est immédiatement actualisée.

Prévoir un mode réduit en animations.

## 6. Écran de détail d'un mini-jeu

En cliquant sur une carte, l'hôte peut ouvrir un panneau de présentation visuel.

Ce panneau doit afficher :
- La grande illustration du mini-jeu.
- Son logo.
- Une courte description amusante.
- Le principe du jeu.
- Un exemple concret de manche.
- Les règles principales.
- Le nombre de joueurs.
- La durée estimée.
- Les modes spécifiques.
- Les paramètres disponibles.

Pour Vends-moi cette Merde ! :
- Objets générés automatiquement.
- Objets inventés par les joueurs, avec bouton d'aide House Decoy.

Pour Sous-titres Interdits :
- Création collaborative des dialogues.
- Nombre de diapositives et de tours.
- Mode diaporama.
- Mode cinéma lorsqu'il sera disponible.

Permettre de choisir le nombre de manches avant d'ajouter le jeu à la soirée.

## 7. Programmation visuelle de la soirée

Dans le mode personnalisé, l'hôte doit pouvoir construire sa programmation.

Lorsqu'un mini-jeu est ajouté, sa carte miniature apparaît dans une zone dédiée.

Exemple :

1. Le Plateau des Mythos — 3 manches.
2. Sous-titres Interdits — 1 partie collaborative.
3. Vends-moi cette Merde ! — 2 manches.

La programmation doit être représentée visuellement, avec les illustrations des mini-jeux, et non comme une simple liste de texte.

L'hôte peut :
- Réorganiser les mini-jeux.
- Modifier le nombre de manches.
- Modifier leurs paramètres.
- Ajouter plusieurs fois le même mini-jeu.
- Retirer un mini-jeu.
- Visualiser la durée totale approximative.

Utiliser un système de glisser-déposer lorsque pertinent, avec des boutons de déplacement accessibles au clavier.

## 8. Mode soirée aléatoire

Le mode aléatoire doit également être spectaculaire.

Lorsque le serveur sélectionne les mini-jeux :
- Faire défiler leurs illustrations.
- Mettre en scène un tirage au sort.
- Afficher le nom du jeu retenu.
- Jouer un effet sonore.
- Ajouter le jeu à la programmation.
- Répéter jusqu'à obtenir la soirée complète.

Le résultat du tirage doit être déterminé côté serveur ; l'animation ne fait que présenter ce résultat.

Prévoir un bouton pour passer l'animation.

Éviter les répétitions excessives selon les paramètres de l'hôte.

## 9. Introduction des mini-jeux pendant la soirée

Réutiliser les illustrations et logos de chaque mini-jeu pour leurs écrans d'introduction.

Quand un mini-jeu commence :
1. L'écran principal quitte le classement ou le lobby.
2. Une transition spécifique au mini-jeu se déclenche.
3. Son illustration apparaît en grand.
4. Son logo est présenté avec une animation.
5. Un effet musical annonce le jeu.
6. Le présentateur virtuel intervient.
7. Les règles sont expliquées visuellement.
8. La première manche commence.

Chaque mini-jeu doit avoir un véritable écran-titre, comme un mini-jeu indépendant à l'intérieur d'EN VRILLE !.

## 10. Création et gestion des ressources graphiques

Les illustrations doivent être de véritables ressources graphiques et non simplement des emojis agrandis ou des dégradés CSS.

Prévoir :
- Illustrations originales.
- Logos de mini-jeux.
- Versions miniatures.
- Arrière-plans.
- Éléments décoratifs.
- Animations ou sprites lorsque pertinents.
- Ressources optimisées pour Steam et le Web.

Utiliser SVG, PNG, WebP ou un format d'animation adapté aux ressources.

Créer une architecture permettant de remplacer facilement les illustrations ultérieurement sans modifier la logique métier.

Si les ressources finales ne peuvent pas être produites automatiquement, mettre en place un système de chargement d'assets et identifier clairement celles restant à créer, sans prétendre que des visuels provisoires sont définitifs.

Ne pas utiliser d'images sans droits commerciaux.

## 11. Interface PC et téléphone

La sélection des mini-jeux s'effectue principalement sur le grand écran PC lors de la création de partie.

Le menu doit être pensé pour :
- Un écran PC.
- Une télévision.
- La souris.
- Le clavier.
- Une manette ultérieurement.

Sur téléphone, les joueurs peuvent voir le nom et éventuellement l'illustration du mini-jeu qui va commencer, mais ne doivent pas avoir besoin de parcourir tout le catalogue pour participer.

## 12. Critères d'acceptation

Le résultat est satisfaisant si :

1. Chaque mini-jeu possède une illustration originale et identifiable.
2. Chaque mini-jeu possède son propre logo ou titre stylisé.
3. Les cartes sont visuellement engageantes.
4. Les cartes réagissent au survol et à la sélection.
5. Les jeux peuvent être ajoutés à une programmation personnalisée.
6. L'ordre et le nombre de manches sont configurables.
7. Le mode aléatoire présente un tirage animé.
8. Les écrans d'introduction réutilisent les visuels des mini-jeux.
9. Les interfaces sont adaptées à un grand écran.
10. Les animations et les illustrations sont fluides.
11. Les réglages et la sélection sont réellement synchronisés avec la partie.
12. L'expérience ressemble à un menu de véritable jeu vidéo, et non à une simple page Web.

## OBJECTIF FINAL

**Je veux que lorsqu'un joueur arrive sur la sélection des mini-jeux, il ait immédiatement envie de tous les essayer.**

Chaque jeu doit avoir une personnalité et une identité propre.

Le catalogue doit être amusant à parcourir, les animations doivent donner de la vie aux interfaces, et les transitions doivent renforcer l'impression de participer à un véritable jeu d'ambiance commercialisable sur Steam.

Ne te contente pas d'ajouter une petite icône à côté du nom des jeux : repense toute leur présentation comme de véritables mini-jeux Mario Party, avec une illustration, une identité, une animation et une mise en scène spécifiques.
# EN VRILLE ! — OBJECTIF : VÉRITABLE JEU PC COMMERCIALISABLE SUR STEAM

## Mission principale

Tu développes **EN VRILLE !**, un véritable jeu vidéo d'ambiance multijoueur destiné à être publié sur Steam.

Le projet existe déjà sur GitHub :

https://github.com/EmpereurRubis/EN-VRILLE

**ATTENTION : ce projet ne doit plus être considéré comme une simple application Web.**

L'objectif final est de pouvoir proposer EN VRILLE ! sur Steam, avec une véritable application Windows installable et exécutable, une interface de jeu immersive, des animations, une bande-son, un présentateur virtuel, cinq mini-jeux et une expérience multijoueur complète.

Il doit offrir une expérience aussi soignée dans sa conception que les jeux d'ambiance commerciaux tels que Use Your Words ou Jackbox Party Pack, tout en conservant son identité originale.

## 1. Trois composants complémentaires

### A. Le véritable jeu PC — Steam

Créer une application Windows native ou empaquetée, possédant :

- Un exécutable `EN-VRILLE.exe`.
- Une installation indépendante du navigateur.
- Une fenêtre de jeu et un mode plein écran.
- Un affichage adapté aux télévisions.
- Un menu principal animé.
- Une introduction cinématique originale.
- Un présentateur virtuel animé.
- Une bande-son et des effets sonores.
- Des interfaces graphiques de véritable jeu vidéo.
- Les cinq mini-jeux complets.
- Des transitions entre les scènes.
- Un système de salons multijoueurs.
- Des votes et scores synchronisés.
- Un classement animé.
- Un podium final.
- Un menu de paramètres accessible à tout moment.

Le jeu doit pouvoir être installé, lancé, fermé et relancé comme n'importe quel jeu PC.

**L'interface PC et ses ressources principales doivent être incluses dans l'installation.** Ne pas simplement ouvrir le site `vrille.erubis.fr` dans une fenêtre de navigateur.

Le serveur en ligne peut rester nécessaire pour créer et gérer les parties.

Prévoir un écran de connexion, de reconnexion et d'indisponibilité du serveur propre et intégré au jeu.

### B. Le serveur multijoueur — Docker/Portainer

Le serveur gère :

- Les salons.
- Les participants.
- Les sessions.
- Les phases de jeu.
- Les chronomètres.
- Les réponses.
- Les votes.
- Les rôles secrets éventuels.
- Les points.
- Les classements.
- La synchronisation en temps réel.
- Les reconnexions.

L'ensemble des services nécessaires doit être déployable avec **une seule stack Portainer**, comprenant l'application serveur et sa base de données.

Les images Docker doivent pouvoir être construites automatiquement depuis GitHub Actions et publiées sur GitHub Container Registry.

Ne pas imposer Docker ou des dépendances serveur aux joueurs qui installent le jeu Steam.

### C. Les manettes Web — Smartphones

Les amis rejoignent depuis :

https://vrille.erubis.fr

Ils saisissent un code de salon ou scannent un QR code affiché dans le jeu Steam.

Ils peuvent ensuite :
- Choisir un pseudonyme et un avatar.
- Recevoir leurs instructions.
- Proposer des réponses.
- Inventer des objets.
- Participer aux votes.
- Consulter leur score.
- Envoyer des réactions.

Ils n'ont pas besoin d'installer le jeu Steam ni de posséder un compte Steam.

Dans la première version commerciale, seul l'hôte doit posséder le jeu PC pour créer et présenter une soirée. Les autres participants rejoignent gratuitement par navigateur.

Prévoir un écran spectateur synchronisé pour les amis à distance qui ne peuvent pas voir le PC de l'hôte.

## 2. Architecture de l'application PC

Analyser le code existant et déterminer la meilleure solution pour distribuer une véritable application Windows.

Si le frontend actuel utilise React, TypeScript et Vite, privilégier une architecture permettant de réutiliser ce code.

Étudier prioritairement Electron et Tauri.

Pour une première version Steam, privilégier la solution qui permet le plus fiablement :
- La création d'un exécutable Windows.
- L'intégration des ressources graphiques et sonores.
- L'affichage plein écran.
- Une navigation locale fluide.
- Les connexions WebSocket sécurisées.
- La gestion du clavier et de la souris.
- Le contrôle audio.
- La stabilité en production.
- L'intégration future de Steamworks.

Ne pas migrer automatiquement l'ensemble du jeu vers Unity, Unreal ou Godot sans justifier ce choix et ses conséquences.

Ne pas reconstruire tout le projet si le code existant peut être réutilisé proprement.

## 3. Un véritable menu de jeu vidéo

Au lancement de l'exécutable :

1. Afficher une séquence d'introduction.
2. Présenter le logo EN VRILLE ! avec une animation.
3. Introduire l'univers graphique et sonore.
4. Faire apparaître un présentateur virtuel.
5. Afficher le menu principal animé.

Boutons :
- JOUER
- REJOINDRE UNE PARTIE, lorsque ce mode est disponible
- COMMENT JOUER
- PARAMÈTRES
- CRÉDITS
- QUITTER

Le menu doit pouvoir être utilisé en plein écran.

Prévoir des effets au survol, des animations de sélection, une musique de menu et des effets sonores originaux.

Ne pas utiliser une interface de type tableau de bord SaaS.

## 4. Présentateur virtuel et mise en scène

Créer une véritable identité de jeu télévisé humoristique.

Un présentateur animé intervient pendant la soirée :

- Accueil des joueurs.
- Introduction de la soirée.
- Présentation des mini-jeux.
- Explication des règles.
- Annonce des questions.
- Gestion des temps d'attente.
- Lancement des votes.
- Révélation des résultats.
- Commentaires sur les scores.
- Transitions.
- Annonce du champion.

Prévoir des animations du personnage, ses différentes expressions et une bibliothèque de répliques originales.

Les présentations doivent être accompagnées de sous-titres.

Prévoir une solution de narration vocale française fiable, sans obligation d'API payante pour jouer.

## 5. Cinq mini-jeux complets

Conserver et améliorer les jeux existants :

**Le Plateau des Mythos :** réponses humoristiques anonymes, votes, révélations, points.

**Vends-moi cette Merde ! :** vente d'objets absurdes, avec un mode d'objets générés par le jeu et un mode où les joueurs créent les objets attribués aléatoirement aux autres.

**Tribunal du N'importe Quoi :** procès absurde, distribution des rôles, prises de parole, verdict et points.

**Qui parmi nous ? :** votes humoristiques entre amis, graphiques de résultats et récompenses.

**Sous-titres Interdits :** sous-titrage d'images, GIF ou vidéos, votes anonymes et révélations.

Chaque mini-jeu doit disposer de :
- Son propre décor visuel.
- Son introduction animée.
- Ses règles expliquées par le présentateur.
- Son interface de participation.
- Son chronomètre.
- Son compteur d'avancement X / Z.
- Sa séquence de vote.
- Son animation de résultats.
- Ses règles de scoring.

Tous les mini-jeux doivent utiliser un moteur multijoueur commun et un leaderboard global cohérent.

## 6. Deux modes de soirée

### Soirée personnalisée

L'hôte sélectionne les jeux, leur ordre, le nombre de manches et les paramètres.

### Soirée aléatoire

Le jeu choisit les mini-jeux et leur enchaînement selon les paramètres définis.

Dans les deux modes, l'expérience doit se dérouler naturellement, comme une émission de télévision.

## 7. Synchronisation et attentes

Pendant chaque phase de participation, afficher sur le grand écran :

« Réponses reçues : 4 / 8 »

« Votes enregistrés : 6 / 8 »

« Joueurs prêts : 5 / 8 »

Le compteur doit évoluer en temps réel.

Sur le téléphone d'un joueur ayant terminé, afficher un écran d'attente animé, avec confirmation que son action a bien été enregistrée.

Lorsque tous les joueurs éligibles ont terminé, passer automatiquement à la phase suivante, sauf si une présentation orale ou une séquence contrôlée par l'hôte nécessite une validation.

Le serveur reste l'autorité pour les phases, timers, votes et scores.

## 8. Gamification et qualité commerciale

L'application doit avoir une finition compatible avec une véritable sortie publique.

Prévoir :
- Écrans de chargement cohérents.
- Transitions graphiques soignées.
- Effets sonores.
- Musiques de fond.
- Animations des avatars.
- Réactions envoyées depuis les smartphones.
- Présentations de questions spectaculaires.
- Révélation progressive des votes.
- Animations des points.
- Classement animé.
- Récompenses humoristiques.
- Podium final.
- Statistiques de soirée.
- Possibilité de rejouer.

Ne pas remplacer les assets définitifs par des emojis ou des composants Web génériques.

Utiliser des assets originaux ou sous licence autorisant explicitement la distribution commerciale.

Prévoir des réglages d'accessibilité, de volume, de sous-titres et de réduction des animations.

## 9. Préparation de la publication Steam

Mettre en place la structure nécessaire à une future distribution via Steamworks.

### Application Windows

Prévoir :
- Build Windows x64.
- Exécutable installable ou distribuable.
- Icône de l'application.
- Nom et métadonnées.
- Numéro de version.
- Gestion des erreurs.
- Logs exploitables.
- Démarrage depuis Steam.
- Fermeture propre.
- Gestion de la perte de connexion.
- Absence de dépendances à installer manuellement.

### Steamworks

Préparer une architecture permettant d'ajouter :
- Initialisation Steamworks.
- Vérification de l'environnement Steam lorsque nécessaire.
- Intégration de l'identité Steam de l'hôte.
- Succès Steam éventuels.
- Overlay Steam si techniquement compatible et testé.
- Statistiques de jeu éventuelles.
- Branches de test et de production.

Ne pas rendre ces fonctionnalités indispensables au lancement du jeu tant que leur intégration n'est pas validée.

Ne pas inventer d'identifiant Steam AppID ou de clés privées.

### SteamPipe

Prévoir un processus documenté pour :
- Construire une version Windows.
- Générer les fichiers de distribution.
- Préparer les dépôts Steam.
- Téléverser une build avec SteamPipe.
- Tester une version sur une branche privée.
- Distribuer les mises à jour.

Les fichiers Steamworks nécessaires doivent être ajoutés légalement à partir des SDK et accès officiels.

La publication effective doit rester sous le contrôle du développeur.

### Page Steam

Préparer les éléments nécessaires à une future fiche produit :
- Description courte et longue.
- Liste de fonctionnalités.
- Captures d'écran réelles.
- Visuels de présentation.
- Capsule Steam aux dimensions requises.
- Icônes.
- Bande-annonce ultérieure.
- Configuration minimale.
- Informations sur la connexion Internet requise.
- Explication du fonctionnement des smartphones.

La fiche doit préciser que l'hôte possède le jeu Steam et que les participants utilisent leurs navigateurs.

## 10. GitHub et CI/CD

Conserver le dépôt :

https://github.com/EmpereurRubis/EN-VRILLE

Mettre en place deux pipelines distincts.

**Pipeline serveur :**
- Tests.
- Build Docker.
- Publication GHCR.
- Déploiement Portainer.

**Pipeline jeu PC :**
- Tests.
- Build Windows.
- Création des fichiers de distribution.
- Archivage des artefacts.
- Préparation à SteamPipe.

Une modification du backend ne doit pas nécessiter une nouvelle publication Steam si le protocole reste compatible.

Une modification importante du client PC doit produire une nouvelle version du jeu.

Documenter la compatibilité des versions client/serveur et les mises à jour.

## 11. Tests indispensables

Tester :
- Le lancement de l'exécutable Windows.
- Le menu principal en plein écran.
- Les paramètres audio et graphiques.
- La connexion au serveur public.
- La création d'un salon.
- Le scan d'un QR code.
- La connexion simultanée de plusieurs smartphones.
- Le lancement des cinq mini-jeux.
- Les réponses et compteurs en temps réel.
- Les présentations orales contrôlées.
- Les votes.
- Les scores.
- Le leaderboard.
- La reconnexion.
- Le podium final.
- Le retour au menu.
- La fermeture du jeu.
- La compatibilité du build Windows avec une distribution SteamPipe.

Prévoir des tests automatisés et des tests manuels reproductibles.

## 12. Méthode de travail

Analyse d'abord le code existant.

Préserve les mécaniques déjà développées.

Identifie ce qui doit devenir :
- Du code partagé.
- Du code spécifique au client PC.
- Du code spécifique aux smartphones.
- Du code serveur.

Commence par obtenir un premier build Windows exécutable, réellement connecté au backend Docker.

Ensuite, améliore le rendu jusqu'à obtenir une expérience de qualité commerciale.

Ne te contente pas d'empaqueter le site existant et d'annoncer que le jeu est prêt pour Steam.

Le jeu doit disposer d'une véritable identité, d'une expérience cohérente et d'un niveau de finition suffisant pour être présenté au public.

## OBJECTIF FINAL

**Je veux pouvoir télécharger EN VRILLE ! sur Steam, le lancer comme un véritable jeu vidéo, créer un salon et organiser une soirée complète avec mes amis.**

Ils doivent rejoindre la partie depuis leur navigateur, participer sur leur téléphone et profiter d'un jeu présenté et animé sur un grand écran.

Le jeu doit être suffisamment abouti pour être commercialisé et ne pas ressembler à une application Web déguisée.

L'infrastructure reste hébergée sur mon serveur Docker/Portainer, tandis que Steam distribue l'application PC.

Développe le projet en gardant cet objectif comme priorité absolue.
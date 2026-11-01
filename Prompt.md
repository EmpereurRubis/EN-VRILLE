# EN VRILLE ! — Mise à jour du gameplay

## 1. TA MISSION

Tu es un développeur senior spécialisé dans les jeux multijoueurs, les expériences interactives, les interfaces de jeux télévisés et le game design.

Je développe un jeu d'ambiance multijoueur intitulé **EN VRILLE !**, accessible depuis un navigateur Web, hébergé sur mon infrastructure Docker via Portainer et maintenu sur GitHub.

Le projet possède cinq mini-jeux :

1. Le Plateau des Mythos
2. Vends-moi cette Merde !
3. Tribunal du N'importe Quoi
4. Qui parmi nous ?
5. Sous-titres Interdits

Je souhaite maintenant améliorer radicalement l'expérience utilisateur, l'animation du jeu et son aspect ludique.

**Le problème à résoudre :** je ne veux pas d'un simple site Web où les joueurs remplissent des formulaires, cliquent sur des boutons et attendent les résultats.

Je veux une véritable expérience de jeu d'ambiance, inspirée dans son rythme et son côté spectaculaire de jeux comme Use Your Words, Jackbox Party Pack et des émissions télévisées humoristiques.

Il ne faut pas copier leur interface, leurs graphismes, leurs personnages ou leurs éléments protégés. Crée une identité originale pour EN VRILLE !.

### OBJECTIF ABSOLU

**EN VRILLE ! doit donner l'impression de participer à une véritable émission de jeu télévisé déjantée, avec un présentateur, des animations, de la musique, des transitions, du suspense, des révélations et des interactions permanentes.**

Le jeu doit être amusant dès son ouverture, avant même le lancement d'une partie.

Il doit être accessible aux joueurs qui n'ont aucune expérience informatique.

---

# 2. DEUX INTERFACES COMPLÈTEMENT DIFFÉRENTES

Il faut impérativement distinguer deux expériences.

## A. L'ÉCRAN PRINCIPAL — LA SCÈNE

C'est le cœur du jeu.

Cet écran s'affiche sur :
- Un PC.
- Un écran de télévision.
- Un vidéoprojecteur.
- Un navigateur partagé sur Discord.
- Un navigateur distant en mode spectateur.

C'est lui qui présente et anime la soirée.

Il doit afficher :
- Les animations.
- Le présentateur.
- Les règles.
- Les questions.
- Les chronomètres.
- La progression des joueurs.
- Les réponses révélées.
- Les votes et résultats.
- Les scores.
- Le classement général.
- Les transitions entre mini-jeux.
- Le podium final.

Il doit être conçu prioritairement pour le format 16:9, avec adaptation aux résolutions différentes.

Prévoir un véritable mode plein écran.

L'écran principal ne doit jamais ressembler à une interface d'administration.

Il doit être beau, vivant et amusant, même lorsqu'aucun joueur n'interagit.

## B. L'ÉCRAN JOUEUR — LA MANETTE

Chaque joueur rejoint la partie depuis son smartphone ou son PC.

Il accède à une interface privée où il peut :
- Choisir son pseudonyme.
- Choisir un avatar.
- Indiquer qu'il est prêt.
- Consulter son rôle éventuel.
- Lire sa consigne.
- Écrire sa réponse.
- Inventer un objet.
- Voter.
- Noter une présentation.
- Participer aux interactions.
- Consulter son score personnel.
- Envoyer des réactions.

L'interface mobile doit être simple et ergonomique.

Un joueur doit immédiatement comprendre ce qu'il doit faire sans intervention de l'hôte.

**Règle fondamentale : l'écran principal sert à vivre le spectacle, le téléphone sert à participer.**

Les informations secrètes ne doivent jamais apparaître sur l'écran principal avant leur révélation.

---

# 3. PAGE D'ACCUEIL IMMERSIVE ET ANIMÉE

Actuellement, je souhaite que l'accueil ressemble davantage au menu principal d'un vrai jeu vidéo qu'à un site Internet traditionnel.

## Séquence d'ouverture

Lorsqu'un utilisateur arrive sur EN VRILLE ! :

1. L'écran affiche une animation d'introduction.
2. Le logo EN VRILLE ! apparaît progressivement.
3. Une courte animation humoristique ou spectaculaire accompagne son apparition.
4. Un effet sonore original marque l'arrivée du logo.
5. Le menu principal apparaît avec une transition fluide.
6. Une ambiance musicale peut commencer, si autorisée par le navigateur et les préférences de l'utilisateur.

L'introduction doit pouvoir être ignorée.

Elle ne doit pas bloquer le chargement ou ralentir excessivement les appareils modestes.

## Menu principal

Créer une véritable composition graphique plein écran.

Afficher :
- Le logo EN VRILLE ! en grand.
- Un arrière-plan animé.
- Des éléments visuels liés à l'univers du jeu.
- Un personnage ou présentateur animé.
- Des effets lumineux subtils.
- Des sons d'interface.
- Des boutons de navigation animés.

### Boutons principaux

**JOUER / CRÉER UNE PARTIE**

Ouvre l'interface de création de soirée.

**REJOINDRE UNE PARTIE**

Permet de saisir un code de salon.

**COMMENT JOUER**

Présente un tutoriel interactif accessible aux nouveaux joueurs.

**PARAMÈTRES**

Ouvre le menu des préférences.

**CRÉDITS**

Affiche les informations du projet et ses contributeurs.

Prévoir un bouton de plein écran facilement accessible.

## Animations des menus

Les menus doivent posséder :
- Des transitions animées.
- Des effets au survol.
- Des effets sonores discrets.
- Des animations de validation.
- Des changements de scène.
- Des mouvements de caméra simulés en 2D lorsque pertinents.

Éviter les transitions brutales entre les pages.

Utiliser des animations modernes, fluides et cohérentes avec l'identité graphique.

---

# 4. UN VÉRITABLE PRÉSENTATEUR VIRTUEL

C'est l'une des fonctionnalités les plus importantes.

Je souhaite qu'EN VRILLE ! possède **un présentateur virtuel original et récurrent**, capable d'accompagner les joueurs pendant toute la soirée.

Il doit avoir une personnalité humoristique, légèrement moqueuse, énergique, mais jamais inutilement agressive.

Ce présentateur doit donner vie à la partie.

## Apparence

Créer un personnage stylisé, reconnaissable et cohérent avec l'identité du jeu.

Il pourrait être :
- Un animateur de télévision caricatural.
- Une mascotte absurde.
- Un présentateur virtuel de dessin animé.

Prévoir plusieurs expressions :
- Heureux.
- Surpris.
- Moqueur.
- Impatient.
- Déçu.
- Enthousiaste.
- Suspense.
- Victoire.

Des animations simples en 2D sont acceptables si elles sont soignées.

Il n'est pas nécessaire de créer un personnage 3D complexe.

## Présentation des règles

Lorsqu'un mini-jeu commence, le présentateur explique automatiquement :
- Le nom du jeu.
- Son objectif.
- Les règles principales.
- Les actions attendues des joueurs.
- La durée approximative.
- Le fonctionnement des votes.
- La manière de gagner des points.

Cette présentation doit être dynamique.

Ne pas afficher un grand paragraphe statique.

Préférer une succession d'écrans animés avec des exemples et des illustrations.

### Exemple — Le Plateau des Mythos

Le présentateur pourrait dire :

« Bienvenue sur le Plateau des Mythos ! Ici, raconter n'importe quoi est une compétence professionnelle. »

« Une question va apparaître. Votre mission ? Inventer la réponse la plus drôle possible. »

« Quand tout le monde aura répondu, vous voterez pour votre préférée. Et non, vous ne pourrez pas voter pour vous-même. Bande de tricheurs. »

Puis une animation lance la première manche.

## Voix du présentateur

Prévoir une architecture permettant :
- Une voix de synthèse en français.
- Des fichiers audio préenregistrés.
- Des sous-titres synchronisés.
- Un mode sans voix.
- Le contrôle du volume.

La voix ne doit pas dépendre obligatoirement d'une API payante.

Si une voix n'est pas disponible, l'interface doit rester parfaitement fonctionnelle grâce aux sous-titres, aux animations et aux effets sonores.

Prévoir une option permettant de passer les explications déjà entendues, notamment lorsqu'un mini-jeu revient au cours de la soirée.

## Interventions pendant les parties

Le présentateur doit aussi intervenir :
- Au lancement d'une manche.
- Pendant les périodes d'attente.
- À quelques secondes de la fin.
- Lors de la révélation des réponses.
- Pendant les votes.
- Lorsqu'un résultat inattendu arrive.
- Lorsqu'un joueur dépasse un autre au classement.
- Lors de la victoire finale.

Prévoir une bibliothèque de répliques aléatoires pour ne pas répéter constamment les mêmes phrases.

---

# 5. CRÉATION DE PARTIE — UNE EXPÉRIENCE GUIDÉE

Quand l'hôte clique sur « Créer une partie », il arrive dans une interface dédiée.

Le jeu doit guider progressivement l'hôte au lieu de lui présenter immédiatement une énorme page de paramètres.

## Étape 1 — Choix du mode de soirée

Présenter deux grandes cartes animées.

### MODE PERSONNALISÉ

L'hôte choisit :
- Les mini-jeux.
- Leur ordre.
- Le nombre de manches.
- Les options spécifiques à chaque jeu.
- Les conditions de vote.
- Le moment d'affichage du classement.

Il doit pouvoir ajouter plusieurs fois le même mini-jeu et modifier l'ordre de la soirée.

Prévoir un aperçu de la programmation sous forme de playlist animée.

### MODE ALÉATOIRE

L'hôte choisit :
- Le nombre de mini-jeux.
- Le nombre de manches ou la durée estimée.
- Les jeux autorisés.
- L'autorisation de répétitions.
- Les catégories de contenus.
- Les options générales.

Le serveur génère ensuite une soirée aléatoire équilibrée.

L'enchaînement doit éviter les répétitions excessives.

## Étape 2 — Paramètres

Prévoir :
- Durée des réponses.
- Durée des votes.
- Durée des présentations.
- Affichage du classement après chaque manche ou chaque mini-jeu.
- Affichage du classement uniquement à la fin.
- Mode avec ou sans points.
- Mode classique ou humour adulte.
- Activation des rôles secrets compatibles.
- Activation de la voix du présentateur.
- Activation des musiques.
- Activation des effets sonores.
- Durée des transitions.
- Passage manuel ou automatique à certaines étapes.
- Autorisation des réactions des joueurs.

Prévoir des paramètres par défaut équilibrés afin de permettre une partie rapide sans configuration complexe.

## Étape 3 — Création du salon

Lorsque l'hôte valide, une transition animée mène au lobby.

---

# 6. UN LOBBY MULTIJOUEUR VIVANT

Le lobby est un élément majeur de l'expérience.

Il doit ressembler à une salle d'attente d'émission télévisée, pas à une liste de connexions réseau.

Afficher :
- Le code du salon en grand.
- Un QR code de connexion.
- Le lien permettant de rejoindre la partie.
- Les avatars des joueurs.
- Leurs pseudonymes.
- Leur statut « prêt ».
- Le nombre de joueurs connectés.
- Le mode de soirée sélectionné.

## Animation des connexions

Lorsqu'un joueur rejoint :
- Son avatar arrive avec une animation.
- Son pseudonyme apparaît.
- Un effet sonore d'accueil retentit.
- Le présentateur peut annoncer son arrivée.
- Le compteur de joueurs augmente.

Exemple :

« Thomas vient d'arriver. La soirée vient officiellement de perdre en intelligence. »

Les messages doivent rester bienveillants et personnalisables.

## Joueurs prêts

Chaque joueur peut appuyer sur « Je suis prêt ».

L'écran principal affiche par exemple :

**JOUEURS PRÊTS : 5 / 8**

Les joueurs prêts reçoivent une animation de validation.

L'hôte conserve le contrôle du lancement.

## Démarrage de la soirée

Lorsqu'on appuie sur « Lancer la soirée » :

1. Les interfaces passent en mode jeu.
2. Le présentateur annonce le début.
3. Une animation d'introduction générale se lance.
4. La programmation du mode personnalisé ou le premier tirage aléatoire est révélée.
5. Le premier mini-jeu est présenté.
6. Les règles sont expliquées.
7. Une courte animation de compte à rebours lance la première manche.

---

# 7. SYSTÈME GLOBAL DE PROGRESSION DES JOUEURS

C'est une fonctionnalité indispensable.

Pendant les phases de réponses et de votes, **l'écran principal doit constamment afficher combien de joueurs ont terminé**.

## Exemple

Si huit joueurs participent à une manche et que trois ont envoyé leur réponse :

**RÉPONSES REÇUES : 3 / 8**

Lorsqu'un quatrième termine :

**RÉPONSES REÇUES : 4 / 8**

Le compteur doit s'actualiser instantanément grâce à Socket.IO.

## Affichage souhaité

Créer un composant visuel animé comprenant :
- Le nombre de joueurs ayant terminé.
- Le nombre total de joueurs attendus.
- Une barre de progression.
- Des avatars ou indicateurs de participation si cela ne compromet pas l'anonymat.
- Un chronomètre.
- Des effets de validation progressifs.

Le libellé doit s'adapter au contexte :

- Réponses reçues : X / Z
- Votes enregistrés : X / Z
- Objets créés : X / Z
- Joueurs prêts : X / Z
- Évaluations terminées : X / Z
- Jurés ayant voté : X / Z

**Important : Z correspond au nombre de participants éligibles à l'action en cours, pas systématiquement au nombre total de joueurs connectés.**

Par exemple, dans le Tribunal du N'importe Quoi, seuls les jurés doivent être comptabilisés lors du vote du verdict.

## Côté smartphone

Lorsqu'un joueur a envoyé sa réponse :

Afficher une confirmation animée :

« Réponse enregistrée ! »

Puis :

« En attente des autres joueurs : 3 / 8 »

Le joueur doit pouvoir continuer à voir que la partie progresse.

Prévoir une petite animation d'attente ou un message humoristique.

## Fin anticipée

Lorsque tous les joueurs attendus ont terminé :
- Fermer automatiquement la phase.
- Jouer un effet sonore.
- Déclencher une transition.
- Passer à l'étape suivante.

Ne jamais laisser un chronomètre tourner inutilement si tout le monde a terminé.

## Déconnexions et absences

Si un joueur se déconnecte :
- Conserver son état pendant un délai de reconnexion.
- Permettre à l'hôte de passer son tour.
- Prévoir une expiration raisonnable.
- Empêcher qu'une personne absente bloque la partie définitivement.
- Mettre à jour correctement le nombre de participants attendus si le joueur est retiré de la phase.

Le compteur doit être calculé côté serveur.

Il ne doit pas être manipulable par le navigateur.

---

# 8. TRANSFORMER CHAQUE MANCHE EN VÉRITABLE SPECTACLE

Chaque manche doit se dérouler comme une séquence télévisée.

## Phase A — Introduction

- Animation du titre de la manche.
- Intervention du présentateur.
- Affichage de la question ou de la consigne.
- Apparition du chronomètre.
- Transition vers la saisie sur les smartphones.

## Phase B — Participation

L'écran principal présente :
- La consigne.
- Une animation adaptée au mini-jeu.
- Le chronomètre.
- Le compteur X / Z.
- Une barre de progression.
- Des messages humoristiques occasionnels.

Les téléphones présentent les champs et actions nécessaires.

## Phase C — Dernières secondes

À l'approche de la fin :
- Le chronomètre devient visuellement plus intense.
- Un son de compte à rebours peut être joué.
- Le présentateur commente la fin imminente.
- Des animations accentuent légèrement la tension.

Ne pas rendre ces effets obligatoires pour les personnes sensibles aux animations ou aux sons.

## Phase D — Clôture

Lorsque tout le monde a terminé ou que le temps est écoulé :
- Afficher une animation de fin de phase.
- Masquer progressivement les zones de saisie.
- Confirmer les réponses reçues.
- Passer à la présentation.

## Phase E — Révélation

C'est un moment important.

Ne jamais simplement afficher une liste de réponses sans animation.

Les réponses doivent pouvoir apparaître :
- Une par une.
- Avec des transitions.
- Avec des effets sonores.
- Avec une mise en scène.
- En conservant l'anonymat lorsque les règles l'exigent.

Le présentateur peut introduire chaque nouvelle réponse.

## Phase F — Vote

Afficher clairement :
- Les propositions.
- Les règles du vote.
- Le temps restant.
- Le nombre de votes reçus.
- Une indication lorsque tout le monde a voté.

Les joueurs votent sur leur téléphone.

## Phase G — Résultats

Révéler les résultats progressivement.

Mettre en scène :
- Les votes.
- Les réponses gagnantes.
- L'identité des auteurs.
- Les bonus.
- Les points attribués.

Les révélations doivent laisser le temps aux joueurs de réagir.

## Phase H — Classement

Selon les préférences de la soirée :
- Afficher le classement après chaque manche.
- Afficher le classement après chaque mini-jeu.
- Ou masquer les scores jusqu'à la finale.

Ne pas casser les réactions du groupe avec des transitions trop rapides.

---

# 9. MINI-JEUX ET EXPÉRIENCES SPÉCIFIQUES

Conserver les cinq mini-jeux existants, mais revoir leur présentation pour les rendre plus spectaculaires.

## JEU 1 — LE PLATEAU DES MYTHOS

Le présentateur explique que les joueurs doivent inventer la réponse la plus drôle à une question absurde.

Exemples :
- Pourquoi les pigeons surveillent-ils les parkings ?
- Pourquoi les imprimantes tombent-elles toujours en panne au mauvais moment ?
- Quelle est la véritable raison de la disparition des dinosaures ?

### Expérience

1. La question apparaît avec une animation.
2. Les joueurs rédigent leur réponse sur leur téléphone.
3. L'écran principal affiche « Réponses reçues : X / Z ».
4. Lorsque les réponses sont terminées, le présentateur lance la révélation.
5. Chaque proposition apparaît anonymement.
6. Les joueurs votent pour leur réponse favorite sans pouvoir voter pour eux-mêmes.
7. Les votes sont dévoilés progressivement.
8. Les auteurs sont révélés.
9. Les points sont distribués.
10. Une animation met en valeur le vainqueur.

Le jeu doit ressembler à un véritable plateau humoristique.

## JEU 2 — VENDS-MOI CETTE MERDE !

Ce mini-jeu doit ressembler à une émission de téléachat complètement absurde.

Prévoir deux modes.

### Mode A — Produits générés par le jeu

Le serveur sélectionne aléatoirement les objets à vendre.

Exemples :
- Un parapluie qui fonctionne uniquement à l'intérieur.
- Une brosse à dents qui insulte son utilisateur.
- Une chaise qui refuse qu'on s'assoie dessus.

### Mode B — Produits inventés par les joueurs

Chaque participant crée un produit ou service absurde.

Le jeu attribue ensuite aléatoirement les créations aux autres joueurs.

**Un joueur ne doit jamais recevoir son propre produit.**

Chaque joueur doit recevoir exactement un produit à vendre, et chaque création doit être attribuée une fois dans la distribution classique.

### Mise en scène

- Une animation présente chaque produit.
- Le présentateur appelle un vendeur.
- Le joueur dispose d'un temps de préparation.
- L'écran principal affiche le produit en grand.
- Le vendeur présente son argumentaire oralement.
- Un chronomètre discret indique la durée.
- Le présentateur annonce la fin de la présentation.
- Les autres joueurs notent l'humour, la conviction et la créativité.
- Les évaluations sont collectées et affichées sous la forme X / Z.
- Les scores sont révélés.
- Le créateur du produit est dévoilé à la fin du mode B.

**Important : ne pas enchaîner automatiquement les présentations orales avant que l'hôte ou le présentateur contrôlé par l'hôte ait donné le signal de fin.**

Les tours de parole doivent être compréhensibles et fluides, y compris à distance sur Discord.

## JEU 3 — TRIBUNAL DU N'IMPORTE QUOI

Créer une véritable mise en scène de tribunal humoristique.

Exemples :
- Avoir mis de l'ananas sur une pizza.
- Avoir répondu « vu » à un message important.
- Avoir réchauffé du poisson dans le micro-ondes du bureau.

### Rôles

- Accusé.
- Procureur.
- Avocat de la défense.
- Juge ou maître de cérémonie.
- Jurés.
- Témoins éventuels.

Adapter les rôles au nombre de joueurs et définir un minimum compatible.

### Expérience

1. Le présentateur annonce une affaire.
2. Le crime apparaît à l'écran comme un dossier judiciaire.
3. Les rôles sont distribués.
4. Une animation présente les principaux intervenants.
5. Le procureur expose son accusation.
6. L'avocat défend l'accusé.
7. Les témoins et jurés peuvent intervenir selon les règles.
8. Le juge clôt les débats.
9. Les jurés votent secrètement.
10. L'écran affiche « Verdicts reçus : X / Z ».
11. Le présentateur annonce le verdict.
12. Une animation de condamnation ou d'acquittement apparaît.
13. Les points et éventuels bonus d'argumentation sont attribués.

L'interface doit ressembler à un faux procès télévisé.

Prévoir des séquences de prise de parole contrôlées par l'hôte pour éviter que le jeu coupe brutalement les participants.

## JEU 4 — QUI PARMI NOUS ?

Ce jeu doit ressembler à une émission de sondages absurdes.

Exemples :
- Qui parmi nous pourrait devenir président par accident ?
- Qui parmi nous survivrait le moins longtemps sur une île déserte ?
- Qui parmi nous serait capable de se faire arnaquer par son propre reflet ?

### Expérience

1. Le présentateur lit la question.
2. Les joueurs choisissent la personne correspondante sur leur téléphone.
3. L'écran principal affiche « Votes enregistrés : X / Z ».
4. Les votes sont révélés progressivement.
5. Un graphique animé présente la répartition.
6. Le joueur le plus désigné est mis en avant.
7. Le présentateur fait un commentaire humoristique.
8. Les points sont attribués selon les règles choisies.

Prévoir un mode sans points, purement destiné à provoquer des discussions.

Ne pas traiter les joueurs désignés de manière humiliante. Permettre de passer une question et de désactiver certaines catégories.

## JEU 5 — SOUS-TITRES INTERDITS

Ce jeu doit posséder une ambiance inspirée d'un plateau de cinéma humoristique.

### Expérience

1. Le présentateur annonce le défi.
2. Une image, un GIF ou une courte vidéo apparaît.
3. Chaque joueur invente un sous-titre.
4. L'écran affiche « Sous-titres reçus : X / Z ».
5. Les sous-titres apparaissent un à un avec le média.
6. Le présentateur lance le vote.
7. Les joueurs choisissent leur proposition favorite.
8. Le jeu révèle les résultats.
9. Les auteurs et les points sont dévoilés.

Prévoir des médias intégrés, utilisables légalement, et une architecture permettant d'en ajouter.

L'expérience doit être suffisamment dynamique pour provoquer des réactions et des rires pendant les révélations.

---

# 10. GAMIFICATION GLOBALE

Je veux que toute l'expérience soit gamifiée, y compris les moments habituellement statiques.

## Classement général

Chaque joueur possède :
- Un score global.
- Un nombre de victoires.
- Un historique de points.
- Une évolution dans le classement.
- Des statistiques par mini-jeu.

Le scoring reste contrôlé par le serveur.

Prévoir une normalisation des scores afin que les différents mini-jeux contribuent équitablement au classement général.

## Classement animé

Lorsqu'un classement apparaît :
- Les joueurs arrivent progressivement à l'écran.
- Les points sont ajoutés avec une animation.
- Les positions évoluent visuellement.
- Un joueur qui dépasse un autre déclenche un effet particulier.
- Les trois premiers joueurs sont mis en valeur.

Prévoir une révélation progressive des points pour créer du suspense.

## Transitions entre les mini-jeux

Après chaque mini-jeu :

1. Le présentateur annonce la fin.
2. Une animation montre les résultats.
3. Le classement apparaît si activé.
4. Le prochain mini-jeu est annoncé.
5. Une animation de transition se lance.
6. Les règles du jeu suivant sont présentées.
7. La nouvelle manche commence.

## Réactions des joueurs

Ajouter un système de réactions rapides accessible sur téléphone.

Exemples :
- 😂
- 😱
- 👏
- 💀
- 🤡
- ❤️

Les réactions apparaissent brièvement sur l'écran principal.

Prévoir des limitations pour empêcher le spam et une option pour désactiver cette fonction.

## Récompenses humoristiques

À la fin d'un jeu ou d'une soirée, afficher des distinctions :

- Le Roi du Mythos.
- Le Commercial de l'Enfer.
- L'Avocat du Diable.
- Le Champion du N'importe Quoi.
- Le Sous-titreur Fou.

Ces distinctions doivent être attribuées selon des statistiques réelles ou des règles explicites, pas arbitrairement.

---

# 11. UN PODIUM FINAL SPECTACULAIRE

La fin d'une soirée doit être un véritable événement.

Ne pas simplement afficher un tableau de classement.

Créer une séquence finale :

1. Le présentateur annonce la fin de la compétition.
2. Une animation de suspense se lance.
3. Les joueurs découvrent le classement progressivement.
4. Le troisième est révélé.
5. Le deuxième est révélé.
6. Un effet de suspense précède la première place.
7. Le gagnant est annoncé.
8. Un podium animé apparaît.
9. Une musique de victoire et des confettis peuvent accompagner la scène.
10. Le classement complet et les statistiques deviennent accessibles.

Afficher également :
- Les points totaux.
- Les mini-jeux remportés.
- Les récompenses humoristiques.
- Les meilleures performances.

Prévoir les boutons :
- Rejouer avec les mêmes joueurs.
- Nouvelle soirée.
- Retour au menu principal.

---

# 12. PARAMÈTRES D'ACCESSIBILITÉ ET DE CONFORT

L'expérience doit rester inclusive et accessible.

Prévoir :
- Volume général.
- Volume de la musique.
- Volume du présentateur.
- Volume des effets sonores.
- Activation ou désactivation de la voix.
- Sous-titres du présentateur.
- Vitesse des textes.
- Réduction des animations.
- Contrastes suffisants.
- Navigation au clavier.
- Boutons tactiles suffisamment grands.
- Instructions lisibles sur smartphone.
- Mode plein écran.
- Possibilité de passer certaines introductions.
- Possibilité de revoir les règles.
- Mode sans points et options de confort pour les groupes qui le souhaitent.

Ne jamais rendre une information importante accessible uniquement par le son, la couleur ou une animation.

Respecter les préférences système de réduction des mouvements lorsque disponibles.

---

# 13. ARCHITECTURE TECHNIQUE

Conserver autant que possible l'architecture actuelle du projet.

Technologies souhaitées :
- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- Framer Motion ou Motion.
- Node.js.
- Socket.IO.
- PostgreSQL.
- Prisma, si déjà utilisé ou pertinent.

Utiliser une architecture modulaire.

## Machine à états

Le moteur doit posséder des phases explicites :

MENU → CONFIGURATION → LOBBY → INTRODUCTION_GÉNÉRALE → INTRODUCTION_MINI_JEU → EXPLICATION_RÈGLES → PRÉPARATION → PARTICIPATION → ATTENTE → RÉVÉLATION → VOTE → RÉSULTATS → CLASSEMENT → TRANSITION → PROCHAIN_JEU → PODIUM_FINAL.

Chaque mini-jeu peut définir des sous-phases spécifiques.

Les transitions doivent être pilotées par l'état réel de la partie, pas uniquement par des animations ou timers côté navigateur.

## Synchronisation multijoueur

Tous les clients doivent recevoir les événements Socket.IO appropriés.

Prévoir :
- Début de partie.
- Changement de mini-jeu.
- Introduction des règles.
- Début de manche.
- Mise à jour du chronomètre.
- Réponse validée.
- Mise à jour X / Z.
- Fin de phase.
- Début des votes.
- Vote enregistré.
- Résultats.
- Mise à jour des scores.
- Classement.
- Transition.
- Reconnexion d'un joueur.

Les timers et transitions de jeu doivent avoir une source de vérité côté serveur.

Le serveur doit savoir exactement quels joueurs sont éligibles pour chaque action.

Les données publiques et privées doivent être séparées.

Ne jamais diffuser les réponses cachées, les votes secrets ou les rôles confidentiels avant le moment autorisé.

## Reconnexion et robustesse

Un rechargement de page ne doit pas détruire la partie.

Prévoir :
- Récupération de session.
- Restauration de l'état du joueur.
- État complet de la scène transmis au client reconnecté.
- Gestion des joueurs absents.
- Timers synchronisés.
- Prévention des doubles votes.
- Prévention des doubles attributions de points.
- Gestion des actions hors phase.
- Sécurité et validation côté serveur.

---

# 14. GRAPHISMES, SONS ET ANIMATIONS

Créer une direction artistique cohérente et reconnaissable.

Privilégier :
- Un univers télévisé cartoon moderne.
- Des couleurs dynamiques.
- Des typographies expressives.
- Des interfaces lisibles à distance.
- Des avatars animés.
- Des titres spectaculaires.
- Des effets de lumière.
- Des transitions de scène.
- Des animations de réponses.
- Des écrans de suspense.
- Des confettis.
- Des effets sonores de validation.
- Des animations de classement.

Prévoir des assets réels et exploitables, plutôt que remplacer tous les visuels par des emojis.

Les emojis peuvent servir aux réactions, mais ne doivent pas constituer toute l'identité graphique du jeu.

Utiliser des ressources graphiques et sonores originales ou bénéficiant d'une licence compatible.

Ne pas dépendre de services payants pour rendre les scènes essentielles.

Optimiser les animations pour éviter de faire chauffer inutilement les appareils mobiles.

---

# 15. DÉPLOIEMENT GITHUB ET PORTAINER

Le projet est destiné au dépôt :

https://github.com/EmpereurRubis/EN-VRILLE

L'application doit être déployable sur mon serveur Linux via Docker et Portainer.

**Exigence impérative : une seule stack Portainer doit suffire à héberger tous les services indispensables au jeu.**

Prévoir :
- Dockerfiles optimisés.
- Docker Compose compatible avec Portainer.
- Frontend et backend.
- Base PostgreSQL.
- Volumes persistants.
- Variables d'environnement.
- Healthchecks.
- Redémarrage automatique.
- Logs exploitables.
- Configuration HTTPS derrière un reverse proxy.
- Support correct de Socket.IO et des WebSockets.

Utiliser de préférence une image applicative unique contenant le frontend compilé et le backend, plus le service PostgreSQL, si cette architecture simplifie le déploiement.

Ne pas imposer Redis ou d'autres services tant qu'ils ne sont pas nécessaires.

## CI/CD

Prévoir GitHub Actions pour :
- Installer les dépendances.
- Exécuter les tests.
- Construire les images.
- Publier les images dans GitHub Container Registry (GHCR).

Le déploiement doit pouvoir utiliser des images déjà construites, sans compiler manuellement sur le serveur.

Documenter le déploiement depuis Portainer avec une stack basée sur le dépôt Git ou un fichier Compose.

Documenter clairement les mises à jour et le re-téléchargement des nouvelles images.

## Domaine

Prévoir l'accès public via :

https://vrille.erubis.fr

Favoriser une architecture où le frontend, les routes API et Socket.IO peuvent être servis depuis le même domaine, éventuellement avec des chemins distincts.

L'application doit fonctionner correctement derrière un reverse proxy HTTPS.

Ne jamais publier de secrets, mots de passe ou clés API sur GitHub.

---

# 16. COMMENT TU DOIS MODIFIER LE PROJET

**Très important : le projet EN VRILLE ! existe déjà et je souhaite l'améliorer, pas le remplacer par un prototype sans rapport.**

Commence par analyser le code existant du dépôt.

Identifie :
- Les interfaces actuelles.
- Le fonctionnement du lobby.
- Les cinq mini-jeux.
- Le moteur de manche.
- Les événements Socket.IO.
- Le système de vote.
- Le scoring.
- Le leaderboard.
- La structure Docker.

Conserve les fonctionnalités qui fonctionnent déjà.

Refactorise les éléments nécessaires pour permettre cette nouvelle expérience.

Ne supprime pas les règles métier existantes sans justification.

Ne laisse pas de boutons fictifs, de fausses données ou d'animations qui ne correspondent pas à l'état réel du serveur.

## Ordre de développement

### PHASE 1 — Expérience d'accueil

- Créer le menu principal plein écran.
- Ajouter l'animation d'introduction.
- Créer les boutons animés.
- Ajouter les paramètres.
- Définir l'identité visuelle.
- Mettre en place la structure du présentateur.

### PHASE 2 — Lobby et création de partie

- Revoir l'interface de création.
- Mettre en valeur les modes personnalisé et aléatoire.
- Créer le lobby animé.
- Ajouter les avatars.
- Afficher les arrivées.
- Ajouter le compteur de joueurs prêts.
- Ajouter l'introduction générale.

### PHASE 3 — Présentateur et moteur d'animation

- Implémenter les explications des règles.
- Ajouter les sous-titres.
- Ajouter les transitions de mini-jeux.
- Développer le système de répliques.
- Synchroniser les animations avec la machine à états.

### PHASE 4 — Gamification des mini-jeux

Pour chacun des cinq jeux :
- Présentation animée.
- Explication des règles.
- Compteur X / Z.
- Chronomètre.
- Interface joueur adaptée.
- Mise en scène des réponses.
- Vote animé.
- Résultats et récompenses.

### PHASE 5 — Classement et finale

- Classement animé.
- Évolution des positions.
- Transitions entre les manches.
- Récompenses.
- Podium final.
- Écrans de statistiques.

### PHASE 6 — Fiabilité et déploiement

- Tests multijoueurs.
- Tests de reconnexion.
- Tests de synchronisation.
- Tests des scores et votes.
- Vérification des interfaces mobiles.
- Vérification Docker et Portainer.
- Optimisation des performances.

---

# 17. CRITÈRES DE RÉUSSITE OBLIGATOIRES

Le projet sera considéré comme satisfaisant lorsque :

1. L'ouverture du jeu affiche une véritable page d'accueil animée.
2. Le menu principal fonctionne en plein écran sur une télévision.
3. Un hôte peut créer une partie personnalisée ou aléatoire.
4. Huit joueurs peuvent rejoindre le même salon depuis différents appareils.
5. Leur arrivée est visible et animée sur l'écran principal.
6. Le lancement déclenche une introduction de soirée.
7. Un présentateur virtuel explique les règles des mini-jeux.
8. Les joueurs reçoivent leurs instructions privées sur leur téléphone.
9. Les compteurs de participation s'actualisent réellement en temps réel, par exemple 3 / 8 puis 4 / 8.
10. Un joueur qui a terminé voit un écran d'attente adapté.
11. La phase se termine automatiquement lorsque tous les participants attendus ont fini, sauf si une séquence orale nécessite le contrôle de l'hôte.
12. Les réponses sont révélées avec des animations.
13. Les votes sont synchronisés et sécurisés.
14. Les résultats sont mis en scène.
15. Les scores sont correctement calculés.
16. Le leaderboard évolue avec des animations.
17. Les transitions permettent de passer naturellement d'un mini-jeu à l'autre.
18. Le présentateur accompagne la soirée sans bloquer ou ralentir inutilement le jeu.
19. La finale comporte un véritable podium animé.
20. Le projet fonctionne en local, en ligne et en hybride.
21. Le tout est déployable depuis GitHub via une seule stack Portainer.
22. Aucun mini-jeu existant ne doit être rendu inutilisable par la refonte.

Tester au minimum une soirée complète impliquant plusieurs mini-jeux, plusieurs manches, des votes, une déconnexion suivie d'une reconnexion et le podium final.

---

# 18. RÉSULTAT ATTENDU

Je veux que tu transformes EN VRILLE ! en **une véritable expérience de jeu d'ambiance multijoueur**, et non en un simple site de questionnaires.

L'application doit avoir une identité visuelle forte, un présentateur attachant, une mise en scène humoristique, une progression fluide et un vrai sentiment de participation.

L'écran principal doit être suffisamment vivant et intéressant pour être diffusé sur une télévision pendant toute une soirée.

Les téléphones doivent être utilisés comme de véritables manettes interactives.

Les animations doivent apporter du rythme sans ralentir la partie.

Les temps d'attente doivent être gérés intelligemment.

Les votes et les scores doivent provoquer des réactions entre joueurs.

**La priorité est l'expérience de soirée : amusement, improvisation, accessibilité, suspense, interactions et convivialité.**

Ne te contente pas de proposer un design ou une description technique.

Analyse l'existant, établis un plan d'implémentation cohérent, puis développe les changements nécessaires pour obtenir une application réellement jouable.

Conserve un projet exécutable, testable et compatible avec le déploiement Docker/Portainer tout au long du développement.
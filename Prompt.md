# PROMPT — Développement d'un jeu d'ambiance multijoueur PC/Web

## 1. Présentation du projet

Tu es un développeur full-stack senior spécialisé dans les jeux multijoueurs en temps réel, les applications Web interactives, l'UX/UI et les systèmes de jeux d'ambiance.

Je souhaite que tu développes un **véritable jeu d'ambiance multijoueur**, inspiré dans son approche de Jackbox Party Pack, Use Your Words et Undercover, mais avec des concepts, une identité graphique et des mécaniques originales.

Le jeu doit permettre à un groupe d'amis de participer à plusieurs mini-jeux humoristiques, basés sur l'improvisation, l'écriture, le bluff, les débats et les votes.

Le projet doit être fonctionnel et jouable, pas simplement une maquette.

### Objectifs principaux

- Jouable depuis un PC, avec possibilité de diffusion sur une télévision.
- Jouable en local, en ligne et en mode hybride.
- Chaque joueur utilise son smartphone ou son navigateur PC comme manette interactive.
- L'hôte crée un salon multijoueur accessible par un code ou QR code.
- Les joueurs choisissent un pseudonyme et éventuellement un avatar.
- Les parties peuvent contenir un ou plusieurs mini-jeux.
- Deux modes de sélection des mini-jeux : personnalisé ou aléatoire.
- Système de votes, points, scores et leaderboard général.
- Animations humoristiques, révélations des réponses, résultats et podium final.
- Interface entièrement en français.
- Expérience fluide, conviviale et accessible à des joueurs non informaticiens.

## 2. Architecture technique

Utiliser prioritairement les technologies suivantes :

**Frontend :**
- React avec TypeScript.
- Vite.
- Tailwind CSS.
- Framer Motion pour les animations.
- Design responsive pour PC, tablette et smartphone.

**Backend :**
- Node.js avec TypeScript.
- Socket.IO pour la communication multijoueur en temps réel.
- Architecture serveur autoritaire pour les scores, votes, timers et transitions.
- PostgreSQL pour les données persistantes.
- Prisma comme ORM, si pertinent.

**Déploiement — contrainte obligatoire :**
- Le code source doit être hébergé dans le dépôt GitHub `https://github.com/EmpereurRubis/EN-VRILLE`.
- Déploiement du jeu entier par **une seule stack Portainer** basée sur un fichier `docker-compose.yml` versionné dans ce dépôt.
- La stack comprend les services nécessaires (frontend, backend Socket.IO, base PostgreSQL, et seulement les services supplémentaires réellement utiles).
- Les images applicatives sont construites automatiquement par GitHub Actions et publiées dans GitHub Container Registry (GHCR) afin que Portainer n'ait pas à compiler le projet.
- Configuration par variables d'environnement saisies dans Portainer ; ne jamais commiter les secrets.
- Données persistantes dans des volumes Docker nommés, hors du dossier cloné depuis GitHub.
- Hébergement sur un serveur Linux avec Docker et Portainer.
- Compatibilité HTTPS, reverse proxy et WebSocket pour l'URL publique `https://vrille.erubis.fr`.
- Application installable sur PC via Tauri dans une étape ultérieure.

Prévoir une structure modulaire pour ajouter facilement de nouveaux mini-jeux.

Le jeu doit fonctionner sans dépendre obligatoirement d'une IA externe ou d'une API payante. Les questions, scénarios et objets aléatoires doivent pouvoir être sélectionnés depuis des bibliothèques intégrées.

## 3. Système de salon multijoueur

Un joueur crée une partie et devient hôte.

Il accède à un lobby contenant :
- Le code du salon.
- Un QR code pour rejoindre la partie.
- Le lien d'invitation.
- La liste des joueurs.
- Le pseudonyme, la couleur et l'avatar de chaque joueur.
- Le statut prêt ou non prêt.
- Le compteur de joueurs.
- Les paramètres de la partie.
- Le bouton de démarrage.

Les participants rejoignent depuis leur navigateur sans création de compte obligatoire.

### Trois modes de connexion

**Mode local :** un PC ou une télévision affiche le jeu. Chaque joueur interagit sur son téléphone.

**Mode en ligne :** chaque joueur se connecte depuis chez lui. Tous peuvent accéder à un écran de jeu synchronisé. La communication vocale peut se faire via Discord ou un autre service externe.

**Mode hybride :** certains joueurs sont ensemble physiquement et d'autres à distance, tout en participant à la même partie.

Prévoir la reconnexion automatique des joueurs avec récupération de leur identité, score et état de jeu.

Un joueur déconnecté ne doit pas bloquer toute une partie. Prévoir des délais d'expiration et des actions de remplacement.

## 4. Modes de partie

### Mode A — Soirée personnalisée

L'hôte choisit précisément les jeux et manches qu'il souhaite organiser.

Exemple :
1. Le Plateau des Mythos — 3 manches.
2. Vends-moi cette Merde ! — 2 manches.
3. Tribunal du N'importe Quoi — 1 procès.
4. Qui parmi nous ? — 5 questions.
5. Sous-titres Interdits — 3 manches.

L'hôte peut modifier l'ordre des jeux, supprimer un jeu, ajouter plusieurs fois le même jeu et définir des paramètres propres à chaque mini-jeu.

Prévoir une interface de programmation de soirée simple, avec une liste ordonnable.

### Mode B — Soirée aléatoire

L'hôte définit :
- Une durée approximative.
- Un nombre de mini-jeux.
- Le nombre de manches par jeu, fixe ou aléatoire.
- Les jeux autorisés dans la sélection.
- L'autorisation ou non de répéter un mini-jeu.
- Les paramètres de score et de vote.

Le serveur génère une playlist de mini-jeux de manière aléatoire.

Éviter la répétition excessive d'un même jeu.

### Paramètres communs

- Nombre de joueurs : viser 3 à 12, avec minimum spécifique selon le mini-jeu.
- Durée des réponses et des votes.
- Durée des présentations orales.
- Vote anonyme ou non.
- Affichage du classement après chaque manche ou après chaque mini-jeu.
- Activation ou non des rôles secrets compatibles.
- Mode humour classique ou humour adulte.
- Nombre de points attribués.
- Option pour masquer temporairement les scores afin d'entretenir le suspense.

## 5. Les cinq mini-jeux à développer

### MINI-JEU 1 — LE PLATEAU DES MYTHOS

**Concept :** un jeu d'écriture et d'improvisation dans lequel les joueurs doivent inventer les réponses les plus drôles, absurdes ou convaincantes à des questions improbables.

Exemples :
- Pourquoi les pigeons marchent-ils comme s'ils étaient propriétaires de la ville ?
- Pourquoi les imprimantes tombent-elles en panne uniquement lorsqu'on est pressé ?
- Quelle est la véritable raison de la disparition des dinosaures ?
- Pourquoi ton collègue a-t-il été convoqué par les ressources humaines ?

**Déroulement :**

1. Le jeu présente une question à tous les joueurs.
2. Chaque participant dispose d'un temps limité pour rédiger sa réponse.
3. Le serveur collecte les propositions.
4. Toutes les réponses sont affichées anonymement.
5. Les joueurs votent pour leur réponse préférée, sans pouvoir voter pour eux-mêmes.
6. Les scores sont calculés.
7. Les auteurs sont révélés.
8. La manche se termine avec un classement ou un récapitulatif.

**Points :**
- Chaque vote reçu rapporte 100 points.
- La réponse ayant reçu le plus de votes obtient un bonus de 150 points.
- En cas d'égalité à la première place, les joueurs concernés reçoivent chacun le bonus.

Prévoir plusieurs catégories de questions : absurde, quotidien, informatique, relations sociales, monde professionnel et humour adulte.

### MINI-JEU 2 — VENDS-MOI CETTE MERDE !

**Concept :** les joueurs deviennent des commerciaux chargés de vendre à leurs amis un produit absurde, inutile ou complètement improbable.

Exemples :
- Une brosse à dents qui t'insulte.
- Un parapluie qui ne fonctionne que lorsqu'il fait beau.
- Une souris d'ordinateur qui fuit son utilisateur.
- Un réfrigérateur qui juge tes choix alimentaires.
- Un aspirateur qui déplace la poussière au lieu de l'aspirer.

Il doit posséder **deux modes distincts**.

#### Mode 1 — Produit aléatoire généré par le jeu

1. Le serveur sélectionne un objet absurde dans sa bibliothèque.
2. L'objet est attribué à un joueur, ou plusieurs objets sont distribués à différents joueurs.
3. Les participants disposent de 30 à 60 secondes pour préparer leur argumentaire.
4. Chaque joueur présente son produit à l'oral.
5. Les autres joueurs votent à la fin de chaque présentation ou à la fin du passage de tous les commerciaux.
6. Les scores sont calculés et les meilleurs vendeurs récompensés.

Prévoir une carte produit affichant son nom, une courte description et éventuellement une illustration.

#### Mode 2 — Produits imaginés par les joueurs

Ce mode est particulièrement important.

1. Chaque joueur invente un objet, un service ou une invention absurde.
2. Il renseigne son nom et une courte description.
3. Tous les objets sont envoyés au serveur.
4. Le serveur mélange les objets et les attribue aléatoirement aux joueurs.
5. Un joueur ne doit jamais recevoir son propre objet.
6. Chaque joueur doit vendre l'objet inventé par un autre.
7. À la fin, on révèle le créateur de chaque produit.

Pour une distribution classique, chaque produit doit être attribué une seule fois et chaque joueur doit recevoir exactement un produit.

Prévoir un algorithme de permutation sans point fixe.

**Vote et notation :**

Les joueurs évaluent les présentations selon trois critères :
- Humour.
- Conviction.
- Créativité.

Chaque critère est noté de 1 à 5.

Un joueur ne peut pas noter sa propre présentation.

Le score de chaque vendeur est calculé à partir de la moyenne des évaluations reçues, puis converti en points.

Le créateur de l'objet peut également recevoir un bonus lorsque son invention obtient un excellent score.

Prévoir une révélation finale amusante associant chaque produit à son créateur et à son vendeur.

### MINI-JEU 3 — TRIBUNAL DU N'IMPORTE QUOI

**Concept :** un procès humoristique pour juger un crime totalement ridicule.

Exemples :
- Avoir mis de l'ananas sur une pizza.
- Avoir répondu « vu » à un message important.
- Avoir utilisé Internet Explorer volontairement.
- Avoir appelé son chien « Monsieur le Directeur ».
- Avoir réchauffé du poisson au micro-ondes du bureau.

**Rôles de procès :**
- Un accusé.
- Un procureur.
- Un avocat de la défense.
- Un juge ou maître de cérémonie.
- Des jurés.
- Éventuellement des témoins lorsque le nombre de joueurs le permet.

Les rôles doivent tourner entre les procès afin que tous les joueurs puissent participer activement.

**Déroulement :**
1. Présentation du crime.
2. Attribution des rôles.
3. Présentation de l'accusation.
4. Plaidoirie de la défense.
5. Questions et témoignages.
6. Derniers arguments.
7. Vote secret des jurés.
8. Verdict et distribution des points.

Les jurés doivent choisir coupable ou non coupable.

Prévoir également un vote pour la meilleure intervention ou le meilleur argument.

**Scoring :**
- Le procureur gagne des points si l'accusé est condamné.
- L'avocat et l'accusé gagnent des points si l'accusé est acquitté.
- Les interventions les plus appréciées rapportent des points bonus.
- Le juge assure principalement l'animation, mais peut recevoir un bonus via un vote des participants.

Les jurés ne reçoivent pas automatiquement plus de points simplement parce qu'ils ont voté avec la majorité.

En cas d'égalité, prévoir une règle définie à l'avance, par exemple acquittement.

L'interface doit reprendre visuellement les codes d'un tribunal humoristique, avec verdict animé et effets sonores.

### MINI-JEU 4 — QUI PARMI NOUS ?

**Concept :** répondre à des questions sur les joueurs présents.

Exemples :
- Qui parmi nous survivrait le moins longtemps sur une île déserte ?
- Qui parmi nous pourrait vendre son ordinateur pour acheter une baguette ?
- Qui parmi nous deviendrait président par accident ?
- Qui parmi nous pourrait se faire arnaquer par son propre reflet ?
- Qui parmi nous serait le pire agent secret ?

**Déroulement :**
1. Une question s'affiche.
2. Chaque joueur sélectionne un autre participant, ou lui-même selon les paramètres.
3. Les votes restent secrets pendant la sélection.
4. Le jeu révèle les résultats.
5. Les joueurs découvrent qui a reçu le plus de votes.
6. L'interface présente une animation humoristique et éventuellement un titre ridicule.

**Système de points :**

Il faut distinguer ce mini-jeu des jeux d'écriture.

Proposer une règle originale :
- Les joueurs qui désignent la personne la plus citée gagnent 100 points.
- La personne la plus citée reçoit 50 points bonus.
- En cas d'égalité, les réponses arrivées en tête sont toutes acceptées.

Prévoir un mode purement humoristique sans points pour les groupes qui souhaitent simplement discuter.

Ajouter des questions légères par défaut, avec possibilité de désactiver des catégories sensibles et de passer une question.

### MINI-JEU 5 — SOUS-TITRES INTERDITS

**Concept :** les joueurs doivent inventer le dialogue, le sous-titre ou la légende la plus drôle pour une image, un GIF ou une courte vidéo.

**Déroulement :**
1. Le serveur affiche une image, un GIF ou une vidéo courte.
2. Chaque joueur invente un sous-titre.
3. Les réponses sont envoyées au serveur.
4. Le jeu présente chaque sous-titre avec le média original.
5. Les joueurs votent pour leurs favoris.
6. Les auteurs sont révélés et les points distribués.

**Points :**
- 100 points par vote reçu.
- 150 points bonus pour le sous-titre gagnant.
- Gestion explicite des égalités.

**Options :**
- Plusieurs catégories de médias.
- Possibilité d'afficher une même image avec plusieurs propositions.
- Animations d'apparition des sous-titres.
- Banque de médias administrable.
- Possibilité ultérieure d'ajouter des médias envoyés par l'hôte.

Ne pas dépendre de vidéos ou d'images protégées sans autorisation. Prévoir des médias de démonstration libres ou créés spécifiquement pour le projet.

## 6. Système global de votes

Développer un système de vote réutilisable dans tous les mini-jeux.

Il doit gérer :
- Vote pour une réponse.
- Vote pour un joueur.
- Vote sur plusieurs critères.
- Vote binaire.
- Vote anonyme.
- Limite de temps.
- Confirmation ou modification du vote avant la clôture, selon les règles.
- Interdiction de voter pour soi lorsque nécessaire.
- Interdiction de voter plusieurs fois.
- Gestion des joueurs absents ou déconnectés.
- Gestion des égalités.
- Résultats calculés côté serveur.

Les votes doivent être associés à l'identité de session du joueur, sans se baser sur des valeurs modifiables par le navigateur.

Chaque mini-jeu doit pouvoir définir ses propres règles de vote sans recréer tout le système.

## 7. Points et leaderboard général

Développer un moteur de score centralisé.

Chaque joueur possède :
- Un score global pour la soirée.
- Un historique des points gagnés.
- Un classement actuel.
- Des statistiques par mini-jeu.
- Un nombre de victoires de manches.
- Un nombre de victoires de mini-jeux.

### Mise à jour du classement

Prévoir trois comportements configurables :
1. Afficher le classement à chaque fin de manche.
2. Afficher le classement seulement à la fin de chaque mini-jeu.
3. Masquer le classement intermédiaire et le révéler à la fin de la soirée.

Même lorsque le classement est masqué, les scores doivent continuer d'être enregistrés.

### Pondération des scores

Les mini-jeux utilisant des mécaniques différentes, prévoir un système de normalisation ou de pondération configurable pour éviter qu'un jeu avec beaucoup de votes rapporte disproportionnellement plus de points qu'un autre.

Prévoir un mode de score équilibré par défaut et une configuration avancée permettant à l'hôte de personnaliser les coefficients.

### Interface de classement

Afficher :
- Rang.
- Avatar.
- Pseudonyme.
- Total de points.
- Points gagnés dans la manche ou le jeu précédent.
- Variation du classement.
- Écart avec le joueur précédent.

Ajouter des animations quand un joueur dépasse un autre.

Le classement doit être calculé côté serveur et synchronisé avec tous les participants.

## 8. Écran de transition entre les jeux

Après chaque mini-jeu, afficher un écran de transition présentant :
- Le nom du mini-jeu terminé.
- Le gagnant du jeu.
- Les points récemment gagnés.
- Le classement général, si activé.
- Le prochain mini-jeu.
- Un compte à rebours configurable.

Prévoir des textes humoristiques aléatoires.

Exemples :
- « Le classement vient de changer. Certaines amitiés aussi. »
- « Bravo au gagnant. Les autres ont participé, c'est déjà ça. »
- « Le jury a décidé. Personne ne respecte sa décision. »

L'hôte peut passer l'animation ou avancer manuellement.

## 9. Système de rôles secrets — optionnel

Prévoir une architecture permettant d'activer des rôles cachés dans certains mini-jeux.

Rôles envisageables :
- **Le Manipulateur :** doit faire gagner un participant désigné.
- **Le Saboteur :** reçoit un objectif secret qui perturbe un défi.
- **Le Mythomane :** doit intégrer un élément imposé dans sa réponse.
- **Le Joker :** reçoit un objectif humoristique supplémentaire.

Ces rôles doivent être compatibles avec les règles de chaque mini-jeu et ne pas casser le système de vote.

Leur présence doit pouvoir être désactivée.

Implémenter d'abord les cinq mini-jeux et leur scoring de base. Ajouter les rôles comme module secondaire une fois le socle multijoueur stable.

## 10. Identité graphique et expérience utilisateur

Je souhaite une interface moderne, immersive, dynamique et humoristique.

Direction artistique :
- Univers de jeu télévisé décalé.
- Couleurs expressives.
- Typographies lisibles.
- Grandes cartes interactives.
- Boutons accessibles sur smartphone.
- Animations fluides.
- Transitions inspirées des émissions de jeux.
- Effets sonores humoristiques.
- Confettis et podiums.
- Chronomètres animés.
- Présentations visuelles différentes selon les mini-jeux.

Chaque mini-jeu doit posséder sa propre identité visuelle, mais tous doivent rester cohérents avec l'interface principale.

Prévoir un réglage du volume, un mode réduit en animations et une interface utilisable sans son.

Le jeu doit être visuellement abouti, pas une simple interface d'administration.

## 11. Gestion des manches et moteur de partie

Développer une machine à états claire :

LOBBY → CONFIGURATION → DÉMARRAGE → INTRODUCTION DU JEU → PRÉPARATION → RÉPONSES OU PRÉSENTATIONS → VOTES → RÉSULTATS → CLASSEMENT → PROCHAINE MANCHE OU PROCHAIN JEU → PODIUM FINAL.

Chaque mini-jeu peut définir des sous-états spécifiques.

Les timers doivent être gérés côté serveur et rester synchronisés chez tous les joueurs.

Prévoir :
- Mise en pause par l'hôte.
- Reprise de partie.
- Passage manuel à la prochaine étape.
- Gestion des réponses manquantes.
- Gestion des égalités.
- Vérification que tous les joueurs autorisés ont voté.
- Gestion des déconnexions.
- Gestion des arrivées tardives, en spectateur jusqu'à une étape compatible.
- Protection contre les actions envoyées hors de leur phase.
- Prévention des doubles soumissions et des scores comptés deux fois.

Une partie doit pouvoir aller du lobby jusqu'au podium final sans intervention technique.

## 12. Podium final et statistiques

À la fin de la soirée, présenter un écran de victoire spectaculaire.

Afficher :
- Le champion de la soirée.
- Les trois premiers joueurs sur un podium animé.
- Le classement complet.
- Le total des points.
- Le nombre de manches remportées.
- Le mini-jeu dans lequel chaque joueur a été le meilleur.
- Des récompenses humoristiques.

Exemples de récompenses :
- Le Roi du Mythos.
- Le Commercial de l'Enfer.
- L'Avocat du Diable.
- Le Sous-titreur Fou.
- Le Joueur le Plus Suspect.

Prévoir un bouton « Rejouer avec le même groupe » et un bouton « Nouvelle soirée ».

## 13. Bibliothèque de contenus et administration

Prévoir des fichiers ou tables de données facilement modifiables contenant les questions, objets absurdes, accusations, situations et médias.

Fournir une bibliothèque de départ comprenant au minimum :
- 100 questions pour Le Plateau des Mythos.
- 100 produits pour Vends-moi cette Merde !
- 60 accusations pour Tribunal du N'importe Quoi.
- 100 questions pour Qui parmi nous ?
- 20 médias utilisables légalement pour Sous-titres Interdits.

Ces éléments doivent être suffisamment variés, rédigés en français et éviter les répétitions dans une même partie.

Prévoir une interface d'administration basique et protégée pour ajouter, modifier, supprimer et catégoriser les contenus.

Les contenus personnalisés des joueurs ne doivent pas être exposés à d'autres salons.

## 14. Sécurité et fiabilité

Implémenter :
- Codes de salon non prévisibles.
- Identifiants de session sécurisés.
- Validation des entrées côté serveur.
- Protection XSS.
- Limites de taille des réponses.
- Limitation des requêtes et événements.
- Protection contre les votes frauduleux.
- Isolation stricte des salons.
- Autorisation des actions réservées à l'hôte.
- Gestion sûre des contenus personnalisés.
- Aucune exposition des réponses ou rôles secrets avant les révélations autorisées.

Ne jamais faire confiance au client pour attribuer les points ou décider des résultats.

## 15. Déploiement GitHub + Portainer — UNE SEULE STACK OBLIGATOIRE

Il s'agit d'une contrainte majeure du projet : je veux développer en local, pousser mon code sur GitHub, puis déployer ou mettre à jour l'intégralité du jeu depuis Portainer, via une unique stack Docker Compose. Ne pas proposer une procédure nécessitant la création manuelle de plusieurs conteneurs ou de plusieurs stacks.

### 15.1. Dépôt GitHub et images Docker

- Dépôt du projet : `https://github.com/EmpereurRubis/EN-VRILLE` (branche `main`).
- Conserver à la racine du dépôt un fichier `docker-compose.yml` directement exploitable par la fonction **Stacks → Add stack → Repository** de Portainer.
- Créer des Dockerfiles de production multi-stage pour le frontend et le backend ; embarquer le build frontend et la configuration Nginx dans les images pour ne pas dépendre de bind mounts du dépôt Git.
- Prévoir un `.dockerignore`, un `.gitignore` et un fichier `.env.example` documenté.
- Ajouter un workflow GitHub Actions sous `.github/workflows/` qui, à chaque push validé sur `main` (ou lors d'une release), teste le projet, construit les images Docker, puis les publie sur GHCR.
- Utiliser les noms d'image `ghcr.io/empereurrubis/en-vrille-web` et `ghcr.io/empereurrubis/en-vrille-api`, ou documenter précisément les noms réellement retenus ; utiliser une stratégie de tags reproductible (SHA/version) et un tag stable de déploiement.
- Configurer les permissions minimales de GitHub Actions, notamment `packages: write` pour la publication GHCR.
- Prévoir un fonctionnement simple avec des images GHCR publiques. Si les images sont privées, expliquer la connexion du registre GHCR à Portainer sans placer un token dans le dépôt.
- **Le déploiement Portainer doit tirer des images déjà compilées via `image:`. Il ne doit pas dépendre d'un `build:` exécuté sur le serveur Portainer.**

### 15.2. La stack Docker Compose unique

La stack nommée `en-vrille` devra contenir, au minimum :

1. `web` : application frontend React compilée, servie via Nginx, et point d'entrée HTTP du jeu.
2. `api` : serveur Node.js / Socket.IO, chargé des salons, manches, votes, scores, sessions et événements en temps réel.
3. `db` : base PostgreSQL avec volume Docker persistant et healthcheck.
4. `redis` uniquement si nécessaire, par exemple pour une architecture multiréplicas ; ne pas le rendre obligatoire sans raison technique.
5. Si nécessaire, une étape d'initialisation / migration de base de données intégrée à cette même stack et sûre à rejouer.

Exigences :
- Une seule commande **Deploy the stack** doit lancer tous les composants de l'application, une fois les variables renseignées et les images GHCR publiées.
- Le frontend et le backend doivent communiquer avec les noms de services Docker sur un réseau interne ; ne jamais utiliser `localhost` pour désigner un autre conteneur.
- La base de données ne doit pas être exposée sur Internet ; ne pas publier le port PostgreSQL sur l'hôte.
- N'exposer que le port réellement nécessaire au reverse proxy (par exemple, le port HTTP de `web`).
- Faire passer les routes `/api` et `/socket.io` par le frontend / reverse proxy sous le **même domaine public**, pour faciliter HTTPS, CORS et l'utilisation depuis un mobile.
- Activer correctement les en-têtes WebSocket (`Upgrade`, `Connection`), les délais d'attente et le transfert des requêtes.
- Prévoir `restart: unless-stopped`, healthchecks, réseau Docker, volumes nommés et conditions de démarrage adaptées.
- Les données PostgreSQL et les médias ajoutés par l'administration doivent survivre à la recréation des conteneurs et aux mises à jour.
- Les joueurs d'une soirée en cours ne doivent pas perdre leur score à cause d'un simple rafraîchissement du navigateur ; documenter les limites d'une mise à jour applicative en pleine partie.
- Le déploiement doit rester compatible avec Docker Compose sur un hôte Docker Standalone administré par Portainer, sans dépendance Kubernetes ou Swarm.

### 15.3. Domaine et reverse proxy

L'adresse publique cible est : **`https://vrille.erubis.fr`**.

- Prévoir une configuration compatible avec un reverse proxy externe déjà installé, tel que Nginx Proxy Manager ou Traefik, sans imposer l'installation d'un deuxième reverse proxy global sur les ports 80/443.
- Documenter la création de l'enregistrement DNS et la configuration du certificat TLS.
- Vérifier que la création des salons, leur accès par code ou QR code et la connexion Socket.IO fonctionnent aussi depuis Internet.
- Prévoir une variable `PUBLIC_URL=https://vrille.erubis.fr`, et gérer proprement les origines autorisées si nécessaire.
- Ne pas coder le domaine en dur : permettre de le changer plus tard vers un nom de domaine indépendant.

### 15.4. Variables d'environnement et sécurité

- Fournir `.env.example` contenant des valeurs factices et des explications pour `PUBLIC_URL`, `APP_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, les secrets de session, les noms/tags d'images si besoin et les paramètres applicatifs utiles.
- Permettre de renseigner les secrets directement dans la section **Environment variables** de Portainer.
- Ne jamais commiter `.env`, mots de passe, tokens GitHub, clés JWT, identifiants de base de données, sauvegardes ou clés de webhook.
- Éviter les secrets exposés dans les variables frontend compilées ; seules les valeurs publiques y sont permises.
- Prévoir des contrôles de santé `GET /health` et éventuellement `/ready` côté backend.
- Prévoir la sauvegarde/restauration du volume PostgreSQL et des médias persistants.

### 15.5. Déploiement et mises à jour

Documenter précisément ce parcours :

1. Je travaille sur EN-VRILLE en local sous Windows/VS Code et pousse les modifications dans le dépôt GitHub.
2. GitHub Actions lance les tests puis construit/publie les images de production sur GHCR.
3. Dans Portainer : **Stacks → Add stack → Repository** ; saisir l'URL du dépôt, choisir la branche `main`, indiquer `docker-compose.yml`, définir les variables d'environnement, puis cliquer sur **Deploy the stack**.
4. Portainer télécharge les images et démarre tous les services dans **une seule stack**.
5. Je configure mon reverse proxy et le DNS pour ouvrir `https://vrille.erubis.fr`.
6. Pour une mise à jour, GitHub Actions publie les nouvelles images, puis Portainer doit pouvoir les récupérer via **Pull and redeploy / Re-pull image** ou un mécanisme GitOps/webhook documenté et testé.

Attention : les mises à jour GitOps déclenchées par un changement de dépôt et les nouvelles images publiées sous un tag identique sont deux mécanismes différents. Ne pas supposer qu'un push de code provoque toujours un redéploiement si `docker-compose.yml` n'a pas changé. Si le redéploiement automatique est activé, configurer explicitement le déclenchement après la publication des images, le re-pull, et les paramètres de force-redeploy nécessaires selon la version de Portainer. Garder un redéploiement manuel fiable comme solution de secours.

### 15.6. Livrables spécifiques de déploiement

Fournir impérativement :

- `docker-compose.yml` utilisable tel quel dans Portainer depuis le dépôt Git.
- Dockerfiles de production pour les images web et API.
- `.github/workflows/docker-publish.yml` (ou équivalent) réellement fonctionnel.
- `.env.example`, `.dockerignore`, `.gitignore`.
- Configuration Nginx embarquée dans l'image web, assurant la prise en charge de `/api` et des WebSockets `/socket.io`.
- Script/stratégie de migration Prisma et création des tables au premier démarrage.
- Documentation `README.md` contenant une section « Déployer depuis GitHub dans Portainer en une seule stack », avec les champs exacts à remplir, la configuration du proxy, la procédure de mise à jour, les sauvegardes et le dépannage.
- Vérifications de démarrage : application chargée, création de salon, connexion multi-joueurs à distance, votes synchronisés, classement mis à jour, persistance des données après redémarrage.

**Critère d'acceptation non négociable : après publication des images GHCR, un utilisateur ayant Portainer et Docker opérationnels doit pouvoir déployer le jeu complet depuis ce dépôt GitHub, avec une seule stack et sans commande shell manuelle de compilation ou création de conteneurs.**

## 16. Livrables attendus

Je veux un vrai projet structuré et exécutable, contenant :

1. Le code complet du frontend.
2. Le code complet du backend.
3. Le moteur multijoueur Socket.IO.
4. Les cinq mini-jeux jouables.
5. Les deux modes de sélection de soirée.
6. Le système de salon, votes, scores et classement.
7. Les écrans de transition et le podium final.
8. Les bibliothèques de contenus de départ.
9. Les fichiers Docker et Docker Compose, ainsi que le déploiement GitHub Actions → GHCR → Portainer en une seule stack.
10. Un fichier `.env.example`.
11. Un README expliquant l'installation et l'exploitation.
12. Des tests unitaires du scoring, des votes, des permutations et des règles de partie.
13. Des tests de parcours multijoueurs, du lobby au podium final.
14. Les instructions exactes pour déployer le dépôt `EmpereurRubis/EN-VRILLE` depuis Portainer, avec un seul fichier Compose et une seule stack.

### Méthode de développement attendue

Commence par définir brièvement l'architecture du dépôt, les modèles de données, les événements Socket.IO et les contrats des mini-jeux.

Ensuite, implémente réellement le projet, fichier par fichier, plutôt que de fournir uniquement du pseudocode ou un cahier des charges.

Priorité de développement :

**Phase 1 — Socle jouable**
- Application frontend/backend.
- Création et connexion aux salons.
- Lobby multijoueur.
- Mode personnalisé et aléatoire.
- Système de manches.
- Votes et scoring.
- Leaderboard.
- Le Plateau des Mythos fonctionnel de bout en bout.

**Phase 2 — Mini-jeux**
- Vends-moi cette Merde ! et ses deux modes.
- Qui parmi nous ?
- Tribunal du N'importe Quoi.
- Sous-titres Interdits.

**Phase 3 — Expérience complète**
- Écrans de transition.
- Animations.
- Podium.
- Contenus enrichis.
- Administration.
- Réglages.
- Améliorations graphiques.

**Phase 4 — Fonctionnalités avancées**
- Rôles secrets.
- Statistiques avancées.
- Extensions de contenu.
- Application PC Tauri.

À chaque phase, veiller à conserver un projet compilable et testable.

Ne pas remplacer une fonctionnalité demandée par un bouton fictif ou une interface sans logique.

Lorsque des fonctionnalités avancées ne sont pas encore implémentées, les isoler explicitement des fonctionnalités réellement opérationnelles.

## 17. Résultat final souhaité

Je veux pouvoir pousser le code sur GitHub, laisser GitHub Actions publier les images sur GHCR, puis déployer le projet complet dans Portainer via **une seule stack** issue du dépôt Git. Une fois déployé sur mon serveur et exposé à `https://vrille.erubis.fr`, je veux pouvoir ouvrir le jeu depuis un PC, créer un salon, transmettre un code à mes amis, configurer une soirée et jouer immédiatement.

Les joueurs doivent pouvoir participer avec leur smartphone ou leur ordinateur, voter, proposer leurs réponses et découvrir les résultats synchronisés.

À chaque manche ou mini-jeu, les points doivent être calculés automatiquement et un classement général doit évoluer.

Le jeu doit être amusant, fluide, évolutif et suffisamment abouti pour être utilisé lors de véritables soirées entre amis, en présentiel comme à distance.

**Important : construis une véritable application fonctionnelle. Ne te limite pas à expliquer comment la développer.**
# EN VRILLE

Le jeu où tes amis sont tes pires ennemis. Cinq mini-jeux en français, un jeu Windows avec sa scène TV, une soirée personnalisée ou aléatoire et un téléphone par joueur. Le présentateur anime la scène tandis que chaque manette conserve ses réponses, produits, notes et missions privés. Le client PC embarque son interface ; les salons utilisent le serveur Docker.

## Application Windows

Sur Windows, `npm ci` puis `npm run desktop:dist` produisent l’installateur, la version portable et `apps/desktop/release/win-unpacked/EN-VRILLE.exe`. Le dossier complet peut être lancé sans Node.js ni navigateur installé. Le serveur se règle dans les paramètres du jeu ; sa valeur initiale est `https://envrille.erubis.fr`. Les invités rejoignent gratuitement dans leur navigateur.

Le guide [PC et Steam](docs/PC-Steam.md) décrit la construction, les tests, les deux pipelines, la compatibilité réseau et la préparation SteamPipe. La [fiche produit et les visuels](marketing/Steam.md) sont préparés dans `marketing`. La publication Steam nécessite les identifiants officiels et une validation par l’éditeur ; aucune publication Steam automatique n’est configurée.

## Démarrer sur Windows / VS Code

Prérequis : **Node.js 22.12 ou supérieur**, npm et Git. Aucun compte joueur, aucune clé d’IA et aucun service payant ne sont nécessaires.

```powershell
git clone https://github.com/EmpereurRubis/EN-VRILLE.git
cd EN-VRILLE
npm ci
npm run dev
```

Ouvrir **http://localhost:5173**, préparer le programme, choisir un pseudo et créer un salon. Pour tester seul les interactions, ouvrir trois onglets et rejoindre avec des identités différentes. Pour jouer, prévoir **3 à 12 participants**, ou **5 minimum au Tribunal**. Le créateur peut participer ou rester animateur. Le lien « Écran TV » permet de rejoindre avec une session spectateur indépendante.

Pour les téléphones sur le même Wi-Fi, utiliser `http://ADRESSE_IP_LAN_DU_PC:5173` sur **tous** les appareils, y compris le PC qui crée le salon. Autoriser les connexions à Node sur le réseau privé Windows. Les invitations utilisent l’origine publique configurée ; copier `.env.example` vers `.env` puis régler `PUBLIC_URL=http://ADRESSE_IP_LAN_DU_PC:5173`. Le mode local fonctionne sans Internet une fois les dépendances installées.

Sans PostgreSQL configuré, le serveur de développement enregistre les parties dans un fichier privé local, ignoré par Git. Ne jamais exposer ce mode de développement sur Internet. En production, PostgreSQL et des secrets propres à l’installation sont obligatoires.

```powershell
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Les tests navigateur utilisent Chrome déjà installé sous Windows ; ailleurs, lancer `npx playwright install chromium` avant `npm run test:e2e`. Pour vérifier PostgreSQL, définir `TEST_DATABASE_URL` vers une **base réservée aux tests** avant `npm test`. GitHub Actions exécute ces tests avec PostgreSQL et Chromium.

## Jouer

1. L’hôte choisit Sur mesure ou Surprise, prépare les jeux et options, puis crée le salon et partage son code, son lien ou son QR code.
2. Les joueurs choisissent leur pseudo et leur avatar, puis se déclarent prêts.
3. L’hôte prépare une playlist : ajout, répétition, ordre et nombre de manches ; ou sélectionne le mode aléatoire et ses jeux autorisés.
4. Le bouton « Afficher la scène » transforme le PC en plateau public ; « Afficher ma manette » retrouve les actions privées. Un spectateur utilise directement la scène. Les présentations et débats se font à voix haute, en présentiel ou avec votre outil vocal habituel.
5. Le serveur compte les participants réellement concernés : réponses, préparations, notes complètes ou seuls jurés pour le verdict. Les actions complètes clôturent l’attente. Après une déconnexion, un délai de dix secondes permet de reprendre sa session avant l’exclusion du quorum courant ; l’hôte peut aussi passer un joueur.
6. Les réponses sont révélées anonymement avant le vote, puis les auteurs et points apparaissent aux résultats. Les prises de parole du Tribunal et des vendeurs attendent toujours le signal de l’hôte, même lorsque leur minuteur est terminé. L’hôte peut mettre en pause et contrôler l’enchaînement automatique des autres séquences.

Le Plateau des Mythos et Sous-titres Interdits rapportent 100 points par vote et un bonus de 150 aux gagnants ex æquo. Qui parmi nous récompense la prédiction du choix majoritaire (100 points) et la personne désignée (50), avec un mode sans points. Les vendeurs sont notés sur humour, conviction et créativité (1 à 5) ; le mode « inventions » redistribue les produits sans qu’un joueur reçoive le sien. Au Tribunal, les jurés votent le verdict : une égalité acquitte l’accusé. Le procureur ou la défense gagnent selon le verdict ; les jurés ne gagnent pas automatiquement pour avoir suivi la majorité. Les coefficients et l’équilibrage sont configurables.

Un rafraîchissement conserve l’identité grâce à une session privée propre à l’onglet. Ne partagez pas votre jeton de reconnexion. Un nouveau participant arrivé pendant une manche attend une étape compatible en spectateur. L’écran TV peut rester spectateur et afficher la soirée sans devenir une manette.

Le thème clair, sombre ou système est mémorisé sur l’appareil ; le logo conserve sa palette rouge et noir. Les réglages proposent les volumes général, musique, voix et effets, les sous-titres, la vitesse du texte et les animations réduites. La voix utilise les voix françaises disponibles dans le navigateur, sans service payant ; les sous-titres assurent le relais si aucune voix n’est disponible. L’audio s’active après une interaction avec la page. Les réactions peuvent être désactivées par l’hôte et sont limitées à une toutes les deux secondes par joueur.

Le mode global sans points conserve les actions et résultats sans modifier les scores. Les missions secrètes optionnelles demandent de glisser un mot dans une réponse ou une invention compatible et rapportent un bonus fixe de 50 points ; leur consigne reste sur la manette du joueur. Ce bonus est lui aussi annulé dans le mode sans points.

## Architecture et contrats

```text
apps/web/                 React + TypeScript + Vite + Tailwind + Framer Motion
apps/desktop/             Electron, ressources locales, build Windows et SteamPipe
apps/api/                 Express + Socket.IO, moteur autoritaire, stockage
packages/shared/          Types, catalogue des jeux et événements communs
packages/content/         Questions, produits, accusations et médias SVG originaux
deploy/                   Dockerfiles et configuration Nginx
tests/e2e/                Parcours Playwright
.github/workflows/        Tests, builds et publication GHCR
marketing/                Fiche Steam, sources graphiques et captures Windows réelles
docker-compose.yml        L’unique stack Portainer de production
```

Le modèle **Room** contient la configuration, la playlist, la phase, les échéances, les participants et l’historique de la soirée. **Player** contient l’identité, le hash du jeton de session, la présence et les statistiques. **Round** contient les réponses, produits, votes, notes, rôles du tribunal et résultats. Les contenus administrables sont séparés des propositions privées des joueurs.

Le client reçoit un `RoomSnapshot` filtré selon son identité. Les auteurs, votes et produits privés restent masqués avant la révélation. Les scores et le classement sont toujours calculés côté serveur ; le masquage intermédiaire concerne aussi les données envoyées aux clients. Les mutations sont validées et sérialisées, les phases et permissions vérifiées, les soumissions et décomptes protégés contre les doublons.

Les événements Socket.IO sont définis dans `packages/shared/src/index.ts` :

| Événement client | Action |
| --- | --- |
| `room:create`, `room:join`, `room:resume` | Créer, rejoindre, retrouver une session |
| `room:ready`, `room:configure`, `room:start` | Préparer et démarrer la soirée |
| `room:action` | Réponse, produit, préparation terminée, vote, notation ou verdict |
| `room:advance`, `room:pause` | Commandes réservées à l’hôte |
| `room:skip-player` | Passer un participant pour l’action courante, réservé à l’hôte |
| `room:react` | Réaction éphémère avec limite par joueur |
| `room:replay`, `room:leave` | Rejouer ou quitter |

Chaque requête reçoit un acquittement `{ ok, error?, session?, room? }`. Le serveur émet `room:state` individuellement après les changements. Les clients transmettent une intention ; aucun identifiant de votant fourni dans une action ne fait autorité.

La machine suit `lobby → party-intro → intro → rules → writing / prepare / presenting → reveal → voting → results → leaderboard → transition → podium`. Chaque jeu utilise les étapes adaptées : plusieurs présentations pour les ventes, interventions successives au Tribunal, vote direct pour Qui parmi nous. `phaseStartedAt`, les échéances et `progress` viennent du serveur ; les révélations et compteurs de la scène s’appuient sur ces données. Chaque jeu définit sa préparation, les entrées autorisées, le vote et le calcul des points. Pour ajouter un jeu, étendre le catalogue et le contrat partagé, le moteur, la bibliothèque et sa vue React.

Le stockage PostgreSQL utilise **pg et des migrations SQL idempotentes**, sans imposer Prisma. Il conserve les états de salon en JSONB, y compris les scores, sessions et manches, et les contenus administrés dans une table distincte. L’initialisation est intégrée au démarrage de l’API ; aucune commande de migration manuelle n’est requise dans Portainer.

## Déployer depuis GitHub dans Portainer en une seule stack

### 1. Publier les images

Le dépôt cible est **https://github.com/EmpereurRubis/EN-VRILLE**, branche **main**. Après vos modifications :

```powershell
git add .
git commit -m "Améliorer EN VRILLE"
git push origin main
```

Le workflow `docker-publish.yml` vérifie TypeScript, les règles de jeu, PostgreSQL et les parcours multijoueurs dans Chromium. Il construit ensuite les deux images, démarre la stack Compose réelle, vérifie les cinq jeux à travers Nginx et les WebSockets, redémarre l’API et contrôle la conservation des scores. La publication est autorisée seulement après ces contrôles :

- `ghcr.io/empereurrubis/en-vrille-web:stable`
- `ghcr.io/empereurrubis/en-vrille-api:stable`

Chaque publication porte aussi un tag immuable `sha-<SHA complet du commit>`. Les tags Git `vX.Y.Z` publient le tag d’image `X.Y.Z`. Le tag `stable` correspond uniquement à `main`. Les images ciblent **Linux amd64**. Pour un serveur ARM, ajouter `linux/arm64` à la matrice des plateformes et une étape QEMU avant de publier.

Dans GitHub, autoriser les workflows à publier les packages (`packages: write` est déclaré sur le seul job concerné). La première publication GHCR peut créer des packages privés : ouvrir chaque package et régler **Package settings → Change visibility → Public**. C’est indépendant de la visibilité du dépôt.

Si vous gardez les images privées, ajouter `ghcr.io` dans **Portainer → Registries → Add registry → Custom registry**, avec votre identifiant GitHub et un jeton ayant `read:packages`. Le renseigner uniquement dans Portainer. Si le dépôt Git est privé, renseigner aussi l’authentification du dépôt dans la création de stack.

### 2. Créer la stack

Dans un environnement **Docker Standalone** de Portainer, sélectionner **Stacks → Add stack → Repository** puis renseigner :

| Champ | Valeur |
| --- | --- |
| Name | `en-vrille` |
| Repository URL | `https://github.com/EmpereurRubis/EN-VRILLE` |
| Repository reference | `refs/heads/main` |
| Compose path | `docker-compose.yml` |

Dans **Environment variables**, saisir :

| Variable | Valeur |
| --- | --- |
| `PUBLIC_URL` | `https://envrille.erubis.fr` |
| `APP_BIND` | `127.0.0.1` si le proxy tourne sur l’hôte ; sinon IP LAN de l’hôte accessible au proxy |
| `APP_PORT` | `8080` (ou un autre port libre) |
| `POSTGRES_DB` | `en_vrille` |
| `POSTGRES_USER` | `en_vrille` |
| `POSTGRES_PASSWORD` | Mot de passe fort, unique, généré |
| `SESSION_SECRET` | Secret aléatoire d’au moins 32 caractères |
| `ADMIN_TOKEN` | Un autre secret aléatoire d’au moins 32 caractères |
| `IMAGE_TAG` | `stable`, ou `sha-<SHA complet>` pour figer une version |

`WEB_IMAGE` et `API_IMAGE` permettent de changer le registre ; les valeurs par défaut sont celles ci-dessus. Les secrets sont exclusivement côté API/DB et ne sont pas compilés dans le frontend. Ne pas utiliser les exemples factices en production.

Cliquer **Deploy the stack**. Portainer tire les images **déjà compilées**, initialise PostgreSQL et les tables, attend les contrôles de santé et lance les trois services. Il n’y a ni `build:`, ni bind mount sur le clone Git, ni seconde stack, ni Redis obligatoire, ni port PostgreSQL/API publié.

Les volumes nommés **en-vrille-postgres** et **en-vrille-media** restent indépendants du clone et des conteneurs. Ne pas les supprimer lors d’une mise à jour. Cette stack vise une seule instance API : ne pas la répliquer sans adapter le stockage partagé, les timers et l’adaptateur Socket.IO.

### 3. DNS, HTTPS et reverse proxy existant

Créer l’enregistrement DNS **A** `envrille.erubis.fr` vers l’IPv4 publique du serveur. Ajouter un AAAA uniquement si IPv6 fonctionne aussi. Votre proxy existant conserve la terminaison TLS sur 80/443 ; aucun second proxy global n’est installé.

Avec **Nginx Proxy Manager**, ajouter un Proxy Host :

- Domain names : `envrille.erubis.fr`.
- Scheme : `http` ; Forward hostname/IP : adresse de l’hôte Docker ; Forward port : `APP_PORT`.
- Activer **Websockets Support**.
- SSL : demander un certificat Let’s Encrypt, activer **Force SSL**.

Si NPM est lui-même dans un conteneur, `127.0.0.1` désigne ce conteneur : utiliser l’IP LAN de l’hôte Docker et mettre `APP_BIND` à cette IP. Restreindre ce port par le pare-feu au réseau/proxy souhaité. Avec Traefik, configurer un service HTTP vers le même port et une route TLS vers votre domaine. Le Nginx embarqué transmet `/api`, `/media`, `/uploads` et `/socket.io` à `api:3001` sur le réseau Docker ; le navigateur reste sous un seul domaine.

Après mise en service, ouvrir le domaine depuis un PC, créer un salon et rejoindre depuis un téléphone **en 4G/5G**, puis un autre navigateur. Vérifier les réponses privées, les votes synchronisés, le classement, le rafraîchissement et le QR code. Tester l’Internet réel ne peut pas être remplacé par une vérification sur localhost. Depuis le checkout local, `npm run smoke -- https://envrille.erubis.fr` crée un salon de test à huit joueurs et vérifie les cinq jeux, les deux modes de vente et la reconnexion via de vraies connexions WebSocket.

### 4. Mettre à jour et revenir en arrière

1. Pousser sur `main` et attendre la réussite complète du workflow GitHub Actions.
2. Dans Portainer, ouvrir la stack et utiliser **Pull and redeploy / Re-pull image**, selon la version. Avec une stack Git, activer l’option de téléchargement des nouvelles images lors du redéploiement.
3. Vérifier que **web et api** portent le même tag/version et que les trois services sont sains.

Un push Git et un changement d’image derrière `stable` sont deux signaux distincts. Un polling Git ne suffit pas si le Compose reste identique. Le parcours manuel avec **re-pull explicite** est la méthode fiable fournie. Aucun webhook de production n’est déclenché par défaut. Pour automatiser, déclencher votre webhook Portainer **après les deux publications**, avec re-pull/force-redeploy configurés selon votre version ; tester ce mécanisme avant de l’utiliser en soirée.

Pour un retour arrière, renseigner `IMAGE_TAG=sha-<ancien commit validé>` pour les deux images, puis redéployer. Sauvegarder la base avant toute migration future qui changerait son format.

Les rafraîchissements de navigateur préservent la session. Un redémarrage API recharge les salons sauvegardés **en pause** : l’hôte clique sur Reprendre une fois les joueurs reconnectés. Une mise à jour interrompt temporairement les sockets et peut interrompre une prise de parole. Privilégier les déploiements entre deux soirées ou mettre la soirée en pause avant l’opération ; les futures versions doivent conserver la compatibilité de leurs snapshots. Changer `SESSION_SECRET` invalide les sessions existantes : conserver le même secret pendant une soirée.

### 5. Sauvegarder et restaurer

Conserver une sauvegarde PostgreSQL et du volume média hors du serveur. Pour une sauvegarde cohérente, mettre les soirées en pause puis arrêter **api** depuis Portainer. Depuis la console du conteneur **db**, exécuter `pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/en-vrille.dump`, puis exporter ce fichier vers un emplacement externe sécurisé. Alternative depuis l’hôte :

```sh
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > en-vrille.dump
docker run --rm -v en-vrille-media:/data:ro -v "$PWD":/backup alpine tar czf /backup/en-vrille-media.tgz -C /data .
```

Pour restaurer, arrêter **api**, conserver la sauvegarde de l’état courant, puis importer le dump dans **db** avec `pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"`. Restaurer l’archive dans le même volume média et relancer l’API. Tester régulièrement la restauration sur une installation séparée. Ne pas commiter ces fichiers.

### Dépannage

- **Image not found / denied** : attendre le workflow, vérifier les tags, la visibilité GHCR et le registre sélectionné dans Portainer.
- **DB unhealthy** : vérifier les variables et les logs PostgreSQL. Changer `POSTGRES_PASSWORD` ne change pas le mot de passe d’un volume déjà initialisé : faire une rotation SQL et mettre l’API en accord.
- **API unhealthy** : vérifier la connexion à `db:5432`, les secrets et les logs de migration. `/health` et `/ready` sont accessibles dans le conteneur API ; `/api/health` traverse le web.
- **502 après recréation API** : redémarrer aussi `web` pour renouveler la résolution du nom Docker si nécessaire.
- **Socket déconnecté** : activer WebSocket sur le proxy externe, conserver les routes `/socket.io`, vérifier HTTPS et `PUBLIC_URL`. N’exposer aucun port API supplémentaire.
- **QR code inaccessible** : utiliser une URL atteignable depuis le téléphone ; `localhost` sur le téléphone désigne le téléphone.
- **Scores perdus sur un nouvel onglet** : reprendre l’onglet de la session existante. Un nouveau navigateur n’est pas automatiquement la même personne.

Les mécanismes de healthcheck et `depends_on: service_healthy` suivent la [documentation Docker Compose](https://docs.docker.com/compose/how-tos/startup-order/). Le proxy WebSocket suit les [directives officielles Nginx](https://nginx.org/en/docs/http/websocket.html). Le parcours Repository et les variables sont décrits dans la [documentation Portainer](https://docs.portainer.io/user/docker/stacks/add). La publication utilise les [actions GHCR recommandées par GitHub](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images).

## Contenus et administration

Les bibliothèques de départ et leurs catégories sont dans `packages/content/src/`. Les illustrations SVG sont des créations originales du projet et ne dépendent d’aucun CDN. La bibliothèque contient **410 entrées** : 120 questions Mythos (100 classiques et 20 adultes), 100 produits, 60 accusations, 110 questions Qui parmi nous (100 classiques et 10 adultes) et 20 médias.

L’administration est accessible depuis l’interface et protégée par `ADMIN_TOKEN`. L’API exige `Authorization: Bearer <ADMIN_TOKEN>` pour les lectures et mutations administratives. Garder ce secret pour les administrateurs et le saisir uniquement sur une connexion HTTPS. Les personnalisations des joueurs restent limitées à leur salon et ne deviennent pas des contenus publics.

## Périmètre de cette version

Cette version comprend le client Windows Electron, les interfaces scène et manette, le présentateur, les cinq jeux, les deux modes de vente, les missions secrètes, la persistance, les contenus et le déploiement en une stack. Les conversations vocales se font en présentiel ou via un service externe. Les **envois de vidéos par l’hôte**, les fonctionnalités **Steamworks** et l’**hébergement à plusieurs réplicas** restent à intégrer ; aucun bouton ne prétend les activer.

La compilation et les tests locaux ne prouvent pas le déploiement sur votre serveur. La publication effective GHCR, le certificat TLS, la configuration du DNS/proxy et le test depuis Internet nécessitent les accès à vos services et doivent être vérifiés sur leur environnement.

Licence MIT, voir [LICENSE](LICENSE). Les contributions et contenus originaux sont livrés avec le projet ; consulter les crédits spécifiques des médias dans `packages/content`.

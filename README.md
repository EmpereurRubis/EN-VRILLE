# EN VRILLE

Le jeu où tes amis sont tes pires ennemis. Cinq mini-jeux, une interface en français et en anglais, une scène TV et un téléphone par joueur. Le présentateur anime la scène tandis que chaque manette conserve ses réponses, produits, notes et missions privés. Le client Windows démarre sur un menu local hors ligne ; « DÉMARRER » ouvre la plateforme du serveur dans la même fenêtre.

Le jeu PC crée et présente la soirée ; le site public sert à rejoindre un salon et retrouver sa session. Steam assure la vente, la distribution et les mises à jour de l'exécutable, sans SDK Steamworks, DRM personnalisé ni vérification de licence intégrés. Les invités et le maître de soirée mobile n'ont besoin ni de Steam, ni d'une installation.

## Application Windows

Sur Windows, `npm ci` puis `npm run desktop:dist` produisent l’installateur, la version portable et `apps/desktop/release/win-unpacked/EN-VRILLE.exe`. Le dossier complet peut être lancé sans Node.js ni navigateur installé. Le serveur se règle dans les paramètres du jeu ; sa valeur initiale est `https://envrille.erubis.fr`. Les invités rejoignent gratuitement dans leur navigateur.

Le guide [PC et Steam](deploy/docs/PC-Steam.md) décrit la construction, les deux pipelines, la compatibilité réseau et la préparation SteamPipe. La [fiche produit et les visuels](marketing/Steam.md) sont préparés dans `marketing`. La publication Steam nécessite les identifiants officiels et une validation par l’éditeur ; aucune publication Steam automatique n’est configurée.

## Démarrer sur Windows / VS Code

Prérequis : **Node.js 22.12 ou supérieur**, npm et Git. Aucun compte joueur, aucune clé d’IA et aucun service payant ne sont nécessaires.

```powershell
git clone https://github.com/EmpereurRubis/EN-VRILLE.git
cd EN-VRILLE
npm ci
npm run dev
```

Ouvrir **http://localhost:5173** pour rejoindre un salon. La création se fait depuis le client Windows ; un paramètre `display=1` dans un navigateur ne propose pas la création. Le salon commence avec **zéro joueur**. Prévoir **3 à 12 participants**, ou **5 minimum au Tribunal**. Chaque participant rejoint sur son téléphone avec le QR code, le lien ou le code du salon. Un téléphone devient maître de soirée en saisissant le code d'association à usage unique affiché séparément sur le PC. La configuration et le lancement se font ensuite sur ce téléphone.

Pour lancer le client PC localement : `npm run dev -w @en-vrille/desktop`, puis régler son serveur sur `http://localhost:5173`. Aucune configuration Steam, clé éditeur ou installation de SDK n'est nécessaire pour jouer ou développer.

Pour les téléphones sur le même Wi-Fi, utiliser `http://ADRESSE_IP_LAN_DU_PC:5173` ; le client Windows conserve `http://localhost:5173`. Autoriser les connexions à Node sur le réseau privé Windows. Les invitations utilisent l’origine publique configurée ; copier `.env.example` vers `.env` puis régler `PUBLIC_URL=http://ADRESSE_IP_LAN_DU_PC:5173`. Le mode local fonctionne sans Internet une fois les dépendances installées.

Sans PostgreSQL configuré, le serveur de développement enregistre les parties dans un fichier privé local, ignoré par Git. Ne jamais exposer ce mode de développement sur Internet. En production, PostgreSQL et des secrets propres à l’installation sont obligatoires.

```powershell
npm run typecheck
npm run build
```

`npm run typecheck` compile les contrats TypeScript sans produire de distribution. `npm run build` produit le serveur et les ressources Web ; `npm run desktop:dist` ajoute leur empaquetage Windows.

## Jouer

1. Le PC crée le salon et affiche le spectacle. Son identité `DISPLAY_CLIENT` ne figure jamais parmi les joueurs et ne peut ni répondre, ni voter, ni configurer la soirée.
2. Les joueurs choisissent leur pseudo et leur avatar sur leurs téléphones, puis se déclarent prêts. Le premier arrivé ne reçoit aucun droit de contrôle.
3. Un joueur saisit le code d'association privé pour devenir maître de soirée. Ce code est consommé immédiatement ; il n'apparaît jamais dans l'URL ou le QR public. Le maître choisit Sur mesure ou Surprise, les jeux, leur ordre et les options, puis lance la soirée depuis son téléphone.
4. Le maître de soirée joue comme les autres. Son panneau de commande contextualisé reste distinct de sa saisie. Les présentations et débats se font à voix haute, en présentiel ou avec votre outil vocal habituel.
5. Le serveur compte seulement les joueurs éligibles à chaque action. Quand X = Z, la collecte se ferme et attend le signal du maître de soirée. Une déconnexion n'exclut jamais automatiquement un joueur ; le maître peut explicitement passer sa participation. Son propre départ suspend la soirée, sans révélation automatique.
6. Mythos révèle une seule réponse anonyme par clic, puis ouvre le vote et révèle les auteurs/résultats un par un. Les notes des vendeurs, verdicts, classements et transitions restent à l'écran jusqu'au signal suivant. Le mode automatique est désactivé, y compris pour les anciens salons qui l'avaient activé.

Le Plateau des Mythos rapporte 100 points par vote et un bonus de 150 aux gagnants ex æquo. Qui parmi nous rapporte **100 points à chaque votant ayant choisi une personne arrivée en tête**, égalités comprises ; la personne désignée ne reçoit aucun bonus. Une variante permet de jouer sans points. Au Tribunal, les jurés votent le verdict : une égalité acquitte l’accusé. Le procureur ou la défense gagnent selon le verdict ; les jurés ne gagnent pas automatiquement pour avoir suivi la majorité. Les coefficients et l’équilibrage sont configurables.

Dans Vends-moi cette Merde !, chacun invente un produit ou demande une idée privée à House Decoy, puis peut la modifier avant validation. Aucun objet manquant n'est remplacé secrètement : les absences sont traitées explicitement. Les textes exacts sont redistribués sans retour à leur créateur, une fois chacun. La roue représente l'ordre choisi par le serveur ; le maître déclenche la roue, la présentation puis les votes. Chaque vendeur est noté sur humour, conviction et créativité (1 à 5). « Ouvrir les rideaux » révèle ses notes, y compris pour le dernier vendeur, et les conserve jusqu'au clic suivant. Les scores et le bonus du créateur sont attribués une seule fois en fin de manche ; les idées House Decoy n'attribuent pas de bonus créateur. Le mode produits aléatoires reste séparé.

Dans Le Scénario part en vrille (anciennement Sous-titres Interdits), chaque joueur commence un film et ajoute un dialogue à un autre film à chaque tour. Les versions courtes comptent jusqu’à 4 ou 5 moments ; la version complète compte un moment par joueur. La manette montre uniquement le photogramme courant et les dialogues précédents. L’écran TV garde les films secrets pendant l’écriture. Après la préparation privée, chacun présente une vidéo en doublage oral, avec les sous-titres synchronisés aux timecodes. Le maître pilote lecture, pause, reprise et retour au début depuis son téléphone ; le diaporama reste disponible en repli. La fin du clip ne termine jamais la prise de parole. Trois prix distinguent le film collectif (distinction sans points), l’interprète (300 points) et la réplique (250 points à son auteur), avant coefficients et équilibrage.

Les sessions privées sont mémorisées durablement sur l'appareil, séparément pour l'écran et le joueur. La reprise retrouve la même identité, ses réponses, ses votes, son score et ses droits. Un seul onglet reste actif pour une identité ; reprendre ailleurs déconnecte le précédent. Sur un nouvel appareil, code et pseudo créent seulement une demande : le maître doit l'approuver et le jeton précédent est alors invalidé. Ne partagez pas votre jeton de reconnexion. Un nouvel invité arrivé pendant une manche attend une étape compatible. Le protocole **5** distingue la présence de l'écran : mettre à jour serveur, web et client Windows ensemble.

Le départ de l'écran principal suspend la salle et conserve temporairement ses réponses et scores. Le PC retrouve son salon avec sa session privée dans le délai `DISPLAY_RECONNECT_SECONDS` (120 secondes par défaut). Cette reconnexion ne demande aucun compte Steam. Les sessions d'écran et les permissions du maître de soirée restent distinctes.

La création est réservée au type de client PC déclaré, avec au plus 15 créations par adresse IP et par heure, un seul salon par connexion et une limite globale de salons. La validation des entrées, l'antiflood et les origines autorisées restent contrôlés par le serveur. Le type de client est une barrière d'usage contournable, pas une authentification forte ni une protection antipiratage.

Le thème clair, sombre ou système est mémorisé sur l’appareil ; le logo conserve sa palette rouge et noir. Les réglages proposent les volumes général, musique, voix et effets, les sous-titres, la vitesse du texte et les animations réduites. Le menu, le lobby et les cinq jeux disposent d'arrangements originaux synthétisés localement, avec fondus et baisse du volume pendant une prise de parole ou une projection. Le tic-tac est optionnel et limité aux dix dernières secondes d'un vrai timer de collecte. Les téléphones restent silencieux. La voix utilise les voix françaises ou anglaises disponibles dans le navigateur, sans service payant ; les sous-titres assurent le relais si aucune voix n’est disponible. La langue de la manette est indépendante de celle du plateau. Les textes libres des joueurs ne sont jamais traduits. L’audio s’active après une interaction avec la page. Les réactions peuvent être désactivées par le maître et sont limitées à une toutes les deux secondes par joueur.

Le mode global sans points conserve les actions et résultats sans modifier les scores. Les missions secrètes optionnelles demandent de glisser un mot dans une réponse ou une invention compatible et rapportent un bonus fixe de 50 points ; leur consigne reste sur la manette du joueur. Ce bonus est lui aussi annulé dans le mode sans points.

L'équilibrage distingue points du mini-jeu et points de soirée : un bon pronostic reste annoncé **+100 au jeu**, puis sa contribution au classement est affichée séparément. Un budget théorique de 1000 points par type de jeu est réparti sur ses manches et tient compte de son plafond de score ; ajouter des manches ou des votants ne lui donne pas mécaniquement plus de poids. Les coefficients permettent un choix volontaire différent. Désactiver l'équilibrage conserve les barèmes bruts dans le classement.

## Architecture et contrats

```text
apps/web/                 React + TypeScript + Vite + Tailwind + Framer Motion
apps/desktop/             Electron, ressources locales, build Windows et SteamPipe
apps/api/                 Express + Socket.IO, moteur autoritaire, stockage
packages/shared/          Types, catalogue des jeux et événements communs
packages/content/         Questions, produits House Decoy et scènes cinéma créditées
deploy/                   Dockerfiles et configuration Nginx
.github/workflows/        Builds Windows et publication des images GHCR
marketing/                Fiche Steam, sources graphiques et captures Windows réelles
docker-compose.yml        L’unique stack Portainer de production
```

Le modèle **Room** contient la configuration, la playlist, la phase, les échéances, les participants et l’historique de la soirée. **Player** contient l’identité, le hash du jeton de session, la présence et les statistiques. **Round** contient les réponses, produits, votes, notes, rôles du tribunal et résultats. Les contenus administrables sont séparés des propositions privées des joueurs.

Le client reçoit un `RoomSnapshot` filtré selon son identité. Les auteurs, votes et produits privés restent masqués avant la révélation. Les scores et le classement sont toujours calculés côté serveur ; le masquage intermédiaire concerne aussi les données envoyées aux clients. Les mutations sont validées et sérialisées, les phases et permissions vérifiées, les soumissions et décomptes protégés contre les doublons.

Les événements Socket.IO sont définis dans `packages/shared/src/index.ts` :

| Événement client | Action |
| --- | --- |
| `room:create`, `room:join`, `room:resume` | Créer, rejoindre, retrouver une session |
| `room:claim-control`, `room:transfer-control` | Association à usage unique et transfert explicite du maître de soirée |
| `room:recovery-request`, `room:approve-recovery` | Demande d'identité sur nouvel appareil puis approbation privée |
| `room:ready`, `room:configure`, `room:start` | Préparer et démarrer la soirée |
| `room:action` | Réponse, produit, préparation terminée, vote, notation ou verdict |
| `room:product-suggestion` | Idée House Decoy privée et modifiable, sans validation automatique |
| `room:caption-control` | Lecture/pause/retour début, vidéo/diaporama et images, protégés par une révision |
| `room:advance`, `room:pause` | Commandes du maître ; `transitionId` obligatoire pour avancer |
| `room:reopen-collection` | Rouvrir explicitement une collecte expirée incomplète sans effacer les contributions |
| `room:skip-player` | Passer un participant pour l’action courante, réservé à l’hôte |
| `room:react` | Réaction éphémère avec limite par joueur |
| `room:replay`, `room:leave` | Rejouer ou quitter |

Chaque requête reçoit un acquittement `{ ok, error?, session?, room? }`. Le serveur émet `room:state` individuellement après les changements et `room:recovered` sur le nouvel appareil approuvé. Les clients transmettent une intention ; aucun identifiant de votant fourni dans une action ne fait autorité.

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

Le workflow `docker-publish.yml` compile les applications, construit les deux images Docker et les publie dans GHCR :

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
| `DISPLAY_RECONNECT_SECONDS` | Délai de retour de l'écran principal, 120 par défaut (5 à 3600) |
| `TRUST_PROXY` | `2` avec le proxy HTTPS existant et le Nginx de la stack ; `1` si Nginx est exposé directement |

`WEB_IMAGE` et `API_IMAGE` permettent de changer le registre ; les valeurs par défaut sont celles ci-dessus. Les secrets sont exclusivement côté API/DB et ne sont pas compilés dans le frontend. Ne pas utiliser les exemples factices en production.

`TRUST_PROXY` indique le nombre de proxys devant l'API pour appliquer les limites à l'adresse du joueur. Le port Web doit rester accessible uniquement par le proxy déclaré ; les ports API et PostgreSQL ne sont pas publiés.

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

Après mise en service, lancer le client Windows, créer un salon puis rejoindre depuis un téléphone **en 4G/5G** et un autre navigateur. Contrôler les réponses privées, les votes synchronisés, le classement, le rafraîchissement et le QR code sur cette installation publique.

### 4. Mettre à jour et revenir en arrière

1. Pousser sur `main` et attendre la réussite complète du workflow GitHub Actions.
2. Dans Portainer, ouvrir la stack et utiliser **Pull and redeploy / Re-pull image**, selon la version. Avec une stack Git, activer l’option de téléchargement des nouvelles images lors du redéploiement.
3. Vérifier que **web et api** portent le même tag/version et que les trois services sont sains.

Un push Git et un changement d’image derrière `stable` sont deux signaux distincts. Un polling Git ne suffit pas si le Compose reste identique. Le parcours manuel avec **re-pull explicite** est la méthode fournie. Aucun webhook de production n’est déclenché par défaut. Pour automatiser, déclencher votre webhook Portainer **après les deux publications**, avec re-pull/force-redeploy configurés selon votre version.

Pour un retour arrière, renseigner `IMAGE_TAG=sha-<ancien commit validé>` pour les deux images, puis redéployer. Sauvegarder la base avant toute migration future qui changerait son format.

Les rafraîchissements de navigateur préservent la session. Un redémarrage API recharge les salons sauvegardés **en pause** : l’hôte clique sur Reprendre une fois les joueurs reconnectés. Une mise à jour interrompt temporairement les sockets et peut interrompre une prise de parole. Privilégier les déploiements entre deux soirées ou mettre la soirée en pause avant l’opération ; les futures versions doivent conserver la compatibilité de leurs snapshots. Changer `SESSION_SECRET` invalide les sessions existantes : conserver le même secret pendant une soirée.

### 5. Sauvegarder et restaurer

Conserver une sauvegarde PostgreSQL et du volume média hors du serveur. Pour une sauvegarde cohérente, mettre les soirées en pause puis arrêter **api** depuis Portainer. Depuis la console du conteneur **db**, exécuter `pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/en-vrille.dump`, puis exporter ce fichier vers un emplacement externe sécurisé. Alternative depuis l’hôte :

```sh
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > en-vrille.dump
docker run --rm -v en-vrille-media:/data:ro -v "$PWD":/backup alpine tar czf /backup/en-vrille-media.tgz -C /data .
```

Pour restaurer, arrêter **api**, conserver la sauvegarde de l’état courant, puis importer le dump dans **db** avec `pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"`. Restaurer l’archive dans le même volume média et relancer l’API. Effectuer les restaurations préparatoires sur une installation séparée. Ne pas commiter ces fichiers.

### Dépannage

- **Image not found / denied** : attendre le workflow, vérifier les tags, la visibilité GHCR et le registre sélectionné dans Portainer.
- **DB unhealthy** : vérifier les variables et les logs PostgreSQL. Changer `POSTGRES_PASSWORD` ne change pas le mot de passe d’un volume déjà initialisé : faire une rotation SQL et mettre l’API en accord.
- **API unhealthy** : vérifier la connexion à `db:5432`, les secrets et les logs de migration. `/health` et `/ready` sont accessibles dans le conteneur API ; `/api/health` traverse le web.
- **502 après recréation API** : redémarrer aussi `web` pour renouveler la résolution du nom Docker si nécessaire.
- **Socket déconnecté** : activer WebSocket sur le proxy externe, conserver les routes `/socket.io`, vérifier HTTPS et `PUBLIC_URL`. N’exposer aucun port API supplémentaire.
- **QR code inaccessible** : utiliser une URL atteignable depuis le téléphone ; `localhost` sur le téléphone désigne le téléphone.
- **Reprendre une identité** : utiliser « Reprendre ma partie » sur le même appareil ; sur un autre, demander sa récupération et la faire approuver sur le téléphone du maître.

Les mécanismes de healthcheck et `depends_on: service_healthy` suivent la [documentation Docker Compose](https://docs.docker.com/compose/how-tos/startup-order/). Le proxy WebSocket suit les [directives officielles Nginx](https://nginx.org/en/docs/http/websocket.html). Le parcours Repository et les variables sont décrits dans la [documentation Portainer](https://docs.portainer.io/user/docker/stacks/add). La publication utilise les [actions GHCR recommandées par GitHub](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images).

## Contenus et administration

Les bibliothèques de départ et leurs catégories sont dans `packages/content`. Les cinq affiches et logotypes de jeux sont des SVG originaux livrés localement. House Decoy propose 150 produits en dix catégories, en français et en anglais. Le cinéma utilise douze séquences chronologiques avec de vrais acteurs issues de *Tears of Steel*, avec attribution CC BY 3.0. Les extraits sont muets : la bande-son originale, sous licence distincte, est exclue. Voir les [licences cinéma](packages/content/cinema/LICENSE.md) pour les sources et modifications.

L’administration est accessible depuis l’interface et protégée par `ADMIN_TOKEN`. L’API exige `Authorization: Bearer <ADMIN_TOKEN>` pour les lectures et mutations administratives. Garder ce secret pour les administrateurs et le saisir uniquement sur une connexion HTTPS. Les personnalisations des joueurs restent limitées à leur salon et ne deviennent pas des contenus publics.

Le studio cinéma accepte les vidéos MP4 et WebM jusqu’à 250 Mo. Choisir un extrait de 1 à 90 secondes, 2 à 12 images, leurs timecodes et la position des sous-titres ; prévisualiser puis publier. Les originaux restent dans le volume privé de l’API. Les extraits muets et images compressées sont mis en cache et servis depuis ce volume. L’image Docker API inclut FFmpeg et FFprobe ; en développement, les installer dans le PATH. Chaque scène exige une source, une licence ou autorisation, des territoires, une attribution et une déclaration explicite d’usage commercial. Ces informations documentent la vérification de l’administrateur ; elles ne constituent pas une validation juridique automatique.

## Périmètre de cette version

Cette version comprend le client Windows Electron avec accueil hors ligne, les interfaces scène et manette FR/EN, le présentateur, les cinq jeux, les deux modes de vente, House Decoy, le cinéma collaboratif, l’import vidéo administrateur et le déploiement en une stack. Les conversations vocales se font en présentiel ou via un service externe. Steam sert à distribuer le binaire Windows : aucune fonctionnalité Steamworks n'est nécessaire au fonctionnement du jeu. L'hébergement à plusieurs réplicas reste hors de cette version.

La compilation locale et le déploiement sont deux opérations distinctes. La publication GHCR, le certificat TLS et la configuration du DNS/proxy se suivent dans GitHub et sur votre installation Portainer.

Licence MIT, voir [LICENSE](LICENSE). Les contributions et contenus originaux sont livrés avec le projet ; consulter les crédits spécifiques des médias dans `packages/content`.

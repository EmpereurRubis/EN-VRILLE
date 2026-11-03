# Client Windows et préparation Steam

Le client PC est livré dans `apps/desktop`. Electron démarre sous `app://game` avec le menu, les illustrations, la musique, les langues, les crédits et les paramètres locaux. Aucune connexion multijoueur ni requête de contenu n’est ouverte avant « DÉMARRER ». Après ce bouton, le jeu vérifie la compatibilité du serveur puis ouvre sa plateforme dans la même fenêtre Electron, sans navigateur externe. Aucun serveur ni Docker n’est installé chez les joueurs.

## Construire les distributions

Sur Windows x64 avec Node.js 22.12 ou supérieur :

```powershell
npm ci
npm run desktop:dist
npm run steam:prepare
```

Les livrables se trouvent dans `apps/desktop/release` : installateur NSIS, exécutable portable et dossier `win-unpacked`. Le lancement Steam utilise **tout le contenu de `win-unpacked`**, avec `EN-VRILLE.exe` comme exécutable de départ. Ne distribuer jamais ce seul fichier : Chromium et les ressources sont nécessaires à son fonctionnement. Les exécutables de développement ne sont pas signés ; une signature de l’éditeur peut être configurée dans le processus de publication sans enregistrer de certificat dans Git.

Le workflow `desktop-windows.yml` compile sur Windows et archive les distributions et la préparation SteamPipe. Le workflow serveur compile les applications, construit les images Docker et les publie indépendamment. Aucun des deux ne publie sur Steam.

## Choix d’architecture

Electron embarque la même version de Chromium pour tous les hôtes et réutilise le moteur d’affichage existant, les animations et l’audio. Tauri aurait produit une installation plus légère, avec une chaîne Rust et une dépendance au WebView du système. Pour cette première version Windows, la reproductibilité de l’affichage a été privilégiée. Les règles du jeu restent dans l’API ; aucun second moteur de scoring n’existe dans le PC.

Le renderer est isolé et sandboxé, sans Node.js. Le preload expose seulement les commandes définies pour les paramètres serveur, la fenêtre, le plein écran et la fermeture. Les navigations sont contrôlées et le protocole local refuse les chemins sortant du dossier de ressources. Ces décisions suivent les [recommandations Electron](https://www.electronjs.org/docs/latest/tutorial/security).

Le serveur par défaut est `https://envrille.erubis.fr`. Il peut être modifié dans les paramètres du jeu. L’adresse doit être une origine HTTP(S) sans identifiants, paramètres ou chemin. Les invitations utilisent le `PUBLIC_URL` du serveur, jamais `app://game`. Chaque origine serveur possède une session PC indépendante pour éviter de transmettre le jeton d’un ancien serveur à un nouveau.

La plateforme et les WebSockets utilisent l’origine du serveur choisi ; le reverse proxy doit conserver leur prise en charge. Une erreur de connexion ou de version ramène au menu local avec Réessayer et les paramètres. Le bouton de retour au menu recharge `app://game`. La langue, les volumes, le thème et les animations réduites traversent les deux origines grâce à une préférence native validée ; aucune réponse privée ne transite dans ce stockage de réglages.

## Versions et mises à jour

Le protocole courant est `PROTOCOL_VERSION = 5`, défini dans le paquet partagé et annoncé par `/api/health` et `/api/ready`. Le PC et le Web présentent ce numéro à Socket.IO. Les versions précédentes, y compris un client sans numéro, reçoivent une erreur explicite demandant la mise à jour. Déployer ensemble les nouvelles images Web et API et le client PC compatible. Aucune authentification Steam n'intervient dans la création ou la reprise d'une partie.

Une modification serveur compatible avec ce protocole ne demande pas de mise à jour Steam : l’interface de la plateforme est chargée après « DÉMARRER ». Les ressources du menu d’accueil sont embarquées et nécessitent une nouvelle distribution pour être mises à jour. Pour une rupture de protocole, préparer une migration des clients avant la mise à jour de production. La version du PC est celle de `apps/desktop/package.json`.

Les préférences et journaux se trouvent dans le dossier utilisateur Electron, hors de l’installation. Les salons, scores et sessions restent dans PostgreSQL. Conserver `SESSION_SECRET` entre les mises à jour serveur. Une reconnexion automatique retrouve la partie ; un redémarrage API restaure les salons en pause.

## Publication SteamPipe

Steam sert uniquement à vendre, distribuer et mettre à jour le binaire Windows. Le jeu et la création de salons fonctionnent sans SDK Steamworks, DRM personnalisé, ticket d'authentification, clé Publisher ou compte Steam actif. Les téléphones ne demandent aucune installation et le site public ne crée pas de partie.

Le serveur conserve les protections élémentaires de création (type de client déclaré, limite par IP, antiflood et quota global). Elles limitent les abus sans prétendre authentifier l'acheteur. La déconnexion de l'écran suspend la salle ; `DISPLAY_RECONNECT_SECONDS` définit son délai de récupération et la session privée du PC permet son retour.

1. Créer l’application et le dépôt Windows dans le compte Steamworks de l’éditeur ; relever leurs vrais identifiants.
2. Construire le jeu avec `npm run desktop:dist`. Seul l'outil officiel SteamPipe/SteamCMD est nécessaire pour téléverser ensuite les fichiers, pas pour jouer ni pour compiler le client.
3. Définir `STEAM_APP_ID` et `STEAM_DEPOT_ID` dans l’environnement de préparation, puis exécuter `npm run steam:prepare`.
4. Inspecter `apps/desktop/steam/output/content` et le manifeste. Les deux fichiers VDF restent en mode **Preview** ; sans identifiants, leurs valeurs sont des marqueurs explicitement non utilisables.
5. Utiliser le `steamcmd` officiel pour lancer `+run_app_build` avec le chemin absolu du fichier `app_build.vdf`. Ouvrir une session Steam Guard avec le compte de build ; ne pas stocker de mot de passe dans un script ou la CI.
6. Contrôler les fichiers et journaux de cette prévisualisation. Pour un véritable téléversement, travailler sur une copie relue du VDF et passer `Preview` à `0`.
7. Dans Steamworks, associer la build à une branche privée et configurer `EN-VRILLE.exe` comme lancement Windows. Installer cette version depuis Steam avant de décider la mise en ligne.

Le générateur ne renseigne pas `SetLive` et ne téléverse rien. Les formats VDF et le fonctionnement de la prévisualisation sont décrits dans la [documentation SteamPipe officielle](https://partner.steamgames.com/doc/sdk/uploading). La publication effective, les branches, les prix et les validations restent sous le contrôle de l’éditeur.

## Vérification manuelle avant publication

Installer sur un Windows x64 propre, lancer depuis Steam puis depuis l’exécutable, passer en plein écran et revenir en fenêtre, changer les volumes et la voix, couper puis rétablir Internet, rejoindre avec huit téléphones dont un réseau mobile, parcourir les cinq jeux et les deux modes de vente. Contrôler le scan du QR, les compteurs, les notes privées, le rôle des jurés, le signal manuel des orateurs, le classement final, le retour au menu et la fermeture sans processus restant. Installer une seconde build depuis la branche privée et s’assurer que les paramètres et la reconnexion sont conservés.

L’accès public nécessite que le DNS, le certificat et le proxy de `envrille.erubis.fr` soient opérationnels. Rejoindre une partie depuis un réseau mobile permet de confirmer que les invitations et les connexions passent par cette installation publique.

La fiche produit, les visuels et les captures sont préparés dans [`marketing`](../../marketing/Steam.md). Les performances minimales, la signature de l’éditeur et la validation commerciale restent à confirmer sur les machines et le compte de publication concernés.

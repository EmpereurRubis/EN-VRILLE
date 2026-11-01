# Client Windows et préparation Steam

Le client PC est livré dans `apps/desktop`. Electron lance les ressources React, les styles, le présentateur et les illustrations depuis l’installation sous `app://game`. Le menu et les paramètres restent accessibles lorsque le serveur est indisponible. Seuls les salons et contenus administrés utilisent le serveur distant ; aucun serveur ni Docker n’est installé chez les joueurs.

## Construire et tester

Sur Windows x64 avec Node.js 22.12 ou supérieur :

```powershell
npm ci
npm run desktop:dist
npm run test -w @en-vrille/desktop
npm run test:packaged -w @en-vrille/desktop
npm run steam:prepare
```

Les livrables se trouvent dans `apps/desktop/release` : installateur NSIS, exécutable portable et dossier `win-unpacked`. Le lancement Steam utilise **tout le contenu de `win-unpacked`**, avec `EN-VRILLE.exe` comme exécutable de départ. Ne distribuer jamais ce seul fichier : Chromium et les ressources sont nécessaires à son fonctionnement. Les exécutables de développement ne sont pas signés ; une signature de l’éditeur peut être configurée dans le processus de publication sans enregistrer de certificat dans Git.

Le workflow `desktop-windows.yml` construit sur Windows et archive les distributions, les preuves de test et la préparation SteamPipe. Le workflow serveur construit et publie les images Docker indépendamment. Aucun des deux ne publie sur Steam.

## Choix d’architecture

Electron embarque la même version de Chromium pour tous les hôtes et réutilise le moteur d’affichage existant, les animations et l’audio. Tauri aurait produit une installation plus légère, avec une chaîne Rust et une dépendance au WebView du système. Pour cette première version Windows, la reproductibilité de l’affichage et du test de l’exécutable a été privilégiée. Les règles du jeu restent dans l’API ; aucun second moteur de scoring n’existe dans le PC.

Le renderer est isolé et sandboxé, sans Node.js. Le preload expose seulement les commandes définies pour les paramètres serveur, la fenêtre, le plein écran et la fermeture. Les navigations sont contrôlées et le protocole local refuse les chemins sortant du dossier de ressources. Ces décisions suivent les [recommandations Electron](https://www.electronjs.org/docs/latest/tutorial/security).

Le serveur par défaut est `https://envrille.erubis.fr`. Il peut être modifié dans les paramètres du jeu. L’adresse doit être une origine HTTP(S) sans identifiants, paramètres ou chemin. Les invitations utilisent le `PUBLIC_URL` du serveur, jamais `app://game`. Chaque origine serveur possède une session PC indépendante pour éviter de transmettre le jeton d’un ancien serveur à un nouveau.

Les illustrations livrées avec le jeu restent locales. Les nouveaux médias administrés et téléchargements proviennent du serveur choisi. Les WebSockets utilisent sa même origine ; le reverse proxy doit conserver leur prise en charge. Le serveur accepte l’origine Electron exacte `app://game` en plus de son origine Web.

## Versions et mises à jour

Le protocole courant est `PROTOCOL_VERSION = 1`, défini dans le paquet partagé et annoncé par `/api/health` et `/api/ready`. Le PC et le Web présentent ce numéro à Socket.IO. Une version incompatible reçoit une erreur explicite. L’absence du numéro reste compatible avec les anciens clients.

Une modification serveur compatible avec ce protocole ne demande pas de mise à jour Steam. Pour une rupture, augmenter le numéro, tester l’ancien client et prévoir la période de migration avant la mise à jour de production. La version du PC est celle de `apps/desktop/package.json`. Steam distribue les mises à jour de son dépôt ; le jeu n’installe pas de mise à jour distante de son code React.

Les préférences et journaux se trouvent dans le dossier utilisateur Electron, hors de l’installation. Les salons, scores et sessions restent dans PostgreSQL. Conserver `SESSION_SECRET` entre les mises à jour serveur. Une reconnexion automatique retrouve la partie ; un redémarrage API restaure les salons en pause.

## Steamworks et SteamPipe

`steam.mjs` fournit le point d’intégration du SDK sans rendre Steam nécessaire au lancement. Aucun AppID, SDK privé, succès, overlay ou contrôle de possession n’est inventé. L’identité Steam et la validation des tickets d’hôte restent à brancher avec les accès officiels avant une commercialisation qui exigerait une preuve de possession. Les téléphones ne demandent aucun compte Steam. La création Web reste disponible pour le développement et le déploiement actuel.

1. Créer l’application et le dépôt Windows dans le compte Steamworks de l’éditeur ; relever leurs vrais identifiants.
2. Télécharger le SDK officiel avec ce compte et conserver ses outils hors du dépôt Git.
3. Définir `STEAM_APP_ID` et `STEAM_DEPOT_ID` dans l’environnement de préparation, puis exécuter `npm run steam:prepare`.
4. Inspecter `apps/desktop/steam/output/content` et le manifeste. Les deux fichiers VDF restent en mode **Preview** ; sans identifiants, leurs valeurs sont des marqueurs explicitement non utilisables.
5. Utiliser le `steamcmd` officiel pour lancer `+run_app_build` avec le chemin absolu du fichier `app_build.vdf`. Ouvrir une session Steam Guard avec le compte de build ; ne pas stocker de mot de passe dans un script ou la CI.
6. Contrôler les fichiers et journaux de cette prévisualisation. Pour un véritable téléversement, travailler sur une copie relue du VDF et passer `Preview` à `0`.
7. Dans Steamworks, associer la build à une branche de test privée et configurer `EN-VRILLE.exe` comme lancement Windows. Tester l’installation depuis Steam avant de décider la mise en ligne.

Le générateur ne renseigne pas `SetLive` et ne téléverse rien. Les formats VDF et le fonctionnement de la prévisualisation sont décrits dans la [documentation SteamPipe officielle](https://partner.steamgames.com/doc/sdk/uploading). La publication effective, les branches, les prix et les validations restent sous le contrôle de l’éditeur.

## Vérification manuelle avant publication

Installer sur un Windows x64 propre, lancer depuis Steam puis depuis l’exécutable, tester le plein écran et le retour fenêtre, changer les volumes et la voix, couper puis rétablir Internet, rejoindre avec huit téléphones dont un réseau mobile, vérifier les cinq jeux et les deux modes de vente. Contrôler le scan du QR, les compteurs, les notes privées, le rôle des jurés, le signal manuel des orateurs, le classement final, le retour au menu et la fermeture sans processus restant. Installer une seconde build depuis la branche de test et vérifier que paramètres et reconnexion sont conservés.

Les tests automatiques du client lancent un véritable exécutable packagé et un serveur de test isolé. Le smoke Docker teste l’origine PC à travers Nginx, les huit participants, la persistance et le redémarrage de l’API. Un essai public réel nécessite que le DNS, le certificat et le proxy de `envrille.erubis.fr` soient opérationnels ; un test local ne remplace pas cet essai.

La fiche produit, les visuels et les captures réelles sont préparés dans [`marketing`](../marketing/Steam.md). Les performances minimales, la signature de l’éditeur, les fonctionnalités Steamworks et la validation commerciale restent à confirmer sur les machines et le compte de publication concernés.

# EN VRILLE ! — client Windows

Le client PC embarque un menu React local, le présentateur, les décors et les sons synthétisés. Ce menu se charge depuis `app://game/` et fonctionne sans serveur. **DÉMARRER** vérifie la disponibilité et le protocole du serveur, puis ouvre l’interface de salle de `https://envrille.erubis.fr` dans la même fenêtre. Aucun navigateur externe ne s’ouvre. Le PC présente la soirée et les invités participent depuis leur navigateur sur téléphone.

Le protocole 5 sépare `DISPLAY_CLIENT` et `PLAYER_CLIENT`. Le PC n’a aucune identité de joueur ; la commande de la soirée s’associe à un joueur sur téléphone. Les jetons de salon protègent la reprise de l'écran et des joueurs. Mettre à jour API, Web et client Windows ensemble.

## Construire et lancer

Depuis la racine du dépôt, avec Node 22.12 ou plus récent :

```powershell
npm ci
npm run dev -w @en-vrille/desktop
npm run dist:win -w @en-vrille/desktop
npm run steam:prepare -w @en-vrille/desktop
```

Le build Windows x64 produit dans `release/` un installateur NSIS, un exécutable portable et `win-unpacked/EN-VRILLE.exe`. Le dossier complet `win-unpacked` est nécessaire pour exécuter cette dernière version : ne distribuez pas son seul fichier EXE. La version portable, elle, embarque tous ses fichiers. Le workflow GitHub `desktop-windows.yml` construit et archive ces distributions séparément des images serveur.

La commande `dev` installe le binaire Electron s’il n’est pas déjà présent. `npm run desktop:build` compile uniquement le menu embarqué ; cela ne constitue pas un test de lancement Windows ou de packaging.

Le jeu démarre en plein écran. F11 bascule le plein écran ; Échap revient à la fenêtre. Le bouton Quitter ferme proprement le processus. `--windowed` démarre directement en fenêtre.

Le serveur par défaut est `https://envrille.erubis.fr`. Les réglages du menu local permettent de changer cette origine. Une origine HTTPS est requise ; `http://127.0.0.1:3001` est autorisée pour le développement. Les opérateurs peuvent employer `ENVRILLE_SERVER_URL` ou `--server-url=https://...` au lancement. Si le serveur ne répond pas ou si sa version de protocole est incompatible, le client revient à un écran local avec **Réessayer / Retour au menu**. Aucune clé d’administration ni clé Steam n’est intégrée au client.

Le dossier utilisateur Electron contient `settings.json` et `logs/desktop.log`. Les sessions de partie restent dans le stockage local et survivent à la fermeture puis à la relance du jeu. `ENVRILLE_USER_DATA_DIR` définit un dossier de profil distinct. Ne supprimez pas votre dossier utilisateur pour corriger un problème de serveur : consultez d’abord les journaux et l’écran de reconnexion.

## Architecture et limites de publication

Electron fournit une version homogène de Chromium et réutilise directement le rendu React, les animations, l’audio Web et les connexions Socket.IO. Tauri produirait un téléchargement plus petit, mais dépendrait de WebView2 et demanderait une validation supplémentaire des voix et du rendu sur chaque système. Electron est retenu pour ce premier client ; le moteur autoritaire Node/PostgreSQL reste sur le serveur.

L’audio est généré par des compositions et synthèses présentes dans le code du projet : arrangements de menu, lobby, talk-show Mythos, téléachat, tribunal, sondage et cinéma. Les changements d’ambiance se font en fondu, la musique baisse pendant les prises de parole et projections, et le tic-tac ne s’applique qu’aux dix dernières secondes d’un vrai délai actif. Les téléphones restent silencieux par défaut. Les volumes général, musique, effets et voix sont séparés ; le tic-tac peut être désactivé indépendamment. La voix optionnelle repose sur les voix système disponibles, sans enregistrement de personnage final distribué.

Le renderer est isolé : sandbox, `contextIsolation`, aucune intégration Node, aucune WebView, aucune fenêtre distante. Le protocole local limite les chemins au bundle ; la CSP limite scripts et connexions aux ressources locales et à l’origine du serveur sélectionné. Le preload expose uniquement la configuration d’origine, le plein écran, la fermeture et l’ouverture de liens de l’origine publique autorisée. Ces choix suivent la [documentation sécurité Electron](https://www.electronjs.org/docs/latest/tutorial/security) et son [protocole local](https://www.electronjs.org/docs/latest/api/protocol).

Le jeu se lance directement et ne demande aucune configuration Steam pour jouer. La connexion au serveur EN VRILLE, les sessions de salon et les permissions du maître de soirée assurent le fonctionnement multijoueur. Le client n'intègre aucun SDK d'authentification, vérification de licence ou DRM personnalisé.

`steam:prepare` concerne uniquement la préparation d'une publication sur Steam : il copie les fichiers Windows et génère deux fichiers VDF en mode **Preview**. Les identifiants officiels `STEAM_APP_ID` et `STEAM_DEPOT_ID` sont des paramètres de publication ; sans eux, le générateur conserve des marqueurs à remplacer. Le manifeste indique `publicationIdsConfigured` et `previewOnly`. Cette commande ne publie rien et ne conditionne pas le lancement du jeu. La documentation de publication du dépôt décrit la suite des opérations SteamPipe.

Les builds de développement ne sont pas signés. La publication sur Steam utilise le compte éditeur et ses identifiants de publication ; le workflow ne publie pas automatiquement. La signature Windows, la fiche magasin, le prix, les régions, les contrats et la validation Valve restent sous le contrôle du développeur.

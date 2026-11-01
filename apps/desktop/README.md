# EN VRILLE ! — client Windows

Le client PC embarque le code React, le présentateur, les décors, les sons générés et les vingt illustrations originales. Il charge `app://game/`, sans télécharger l’interface du site. Seuls les données multijoueurs et les médias ajoutés par l’administrateur viennent du serveur. Les invités utilisent gratuitement leurs navigateurs ; aucun serveur ni Docker n’est installé sur leur téléphone ou sur le PC de l’hôte.

## Construire et essayer

Depuis la racine du dépôt, avec Node 22 :

```powershell
npm ci
npm run test -w @en-vrille/desktop
npm run dev -w @en-vrille/desktop
npm run dist:win -w @en-vrille/desktop
npm run test:packaged -w @en-vrille/desktop
npm run steam:prepare -w @en-vrille/desktop
```

Le build Windows x64 produit dans `release/` un installateur NSIS, un exécutable portable et `win-unpacked/EN-VRILLE.exe`. Le dossier complet `win-unpacked` est nécessaire pour exécuter cette dernière version : ne distribuez pas son seul fichier EXE. La version portable, elle, embarque tous ses fichiers. Le workflow GitHub `desktop-windows.yml` construit et archive ces distributions séparément des images serveur.

Le jeu démarre en plein écran. F11 bascule le plein écran ; Échap revient à la fenêtre. Le bouton Quitter ferme proprement le processus. `--windowed` démarre directement en fenêtre.

Le serveur par défaut est `https://envrille.erubis.fr`. Les réglages du jeu permettent de changer cette origine, puis rechargent les ressources locales. Une origine HTTPS est requise ; `http://127.0.0.1:3001` est autorisée pour le développement. Les opérateurs et tests peuvent employer `ENVRILLE_SERVER_URL` ou `--server-url=https://...` au lancement. Aucune clé d’administration ni clé Steam n’est intégrée au client.

Le dossier utilisateur Electron contient `settings.json` et `logs/desktop.log`. Les sessions de partie restent dans le stockage local de la fenêtre et survivent à son rechargement. `ENVRILLE_USER_DATA_DIR` isole les données des tests. Ne supprimez pas votre dossier utilisateur pour corriger un problème de serveur : consultez d’abord les journaux et l’écran de reconnexion.

## Architecture et limites de publication

Electron fournit une version homogène de Chromium et réutilise directement le rendu React, les animations, l’audio Web et les connexions Socket.IO. Tauri produirait un téléchargement plus petit, mais dépendrait de WebView2 et demanderait une validation supplémentaire des voix et du rendu sur chaque système. Electron est retenu pour ce premier client ; le moteur autoritaire Node/PostgreSQL reste sur le serveur.

Le renderer est isolé : sandbox, `contextIsolation`, aucune intégration Node, aucune WebView, aucune fenêtre distante. Le protocole local limite les chemins au bundle ; la CSP limite scripts et connexions aux ressources locales et à l’origine du serveur sélectionné. Le preload expose uniquement la configuration d’origine, le plein écran, la fermeture et l’ouverture de liens de l’origine publique autorisée. Ces choix suivent la [documentation sécurité Electron](https://www.electronjs.org/docs/latest/tutorial/security) et son [protocole local](https://www.electronjs.org/docs/latest/api/protocol).

`steam.mjs` est le point d’intégration futur du SDK Steamworks officiel. Il annonce explicitement toutes les fonctionnalités Steam indisponibles, et n’empêche jamais le lancement. Aucun AppID, compte Steam ou SDK n’est inventé. Le build fonctionne depuis Steam comme tout exécutable Windows, mais identité Steam, vérification de licence, overlay, succès et statistiques Steam ne sont pas implémentés ni validés.

`steam:prepare` copie les vrais fichiers Windows et génère deux fichiers VDF en mode **Preview**. Fournissez vos identifiants officiels via `STEAM_APP_ID` et `STEAM_DEPOT_ID`, ou remplacez les marqueurs. Cette commande ne publie rien et ne télécharge aucun SDK propriétaire. La documentation de publication du dépôt décrit la suite des opérations SteamPipe.

Les builds de développement ne sont pas signés : le certificat de signature Windows et l’accès Steamworks restent des prérequis de la publication commerciale. Le workflow ne publie pas automatiquement sur Steam. La conformité finale, la fiche magasin, le prix, les régions, les contrats et la validation Valve restent sous le contrôle du développeur.

## Validation reproductible

`test:packaged` lance réellement `EN-VRILLE.exe` avec un profil temporaire et un backend du projet en mémoire. Il vérifie l’origine locale, les illustrations embarquées, la CSP, l’absence d’API Node dans la page, le plein écran, la création d’un salon, le lien public pour les smartphones, la reprise de session, le changement de serveur et la fermeture propre. Les captures se trouvent dans `release/test-evidence/`. Les scénarios complets des cinq jeux sont validés par les tests multijoueurs et navigateur du dépôt.

Avant une sortie : installer et désinstaller avec un compte Windows standard ; tester le portable sur un PC sans Node ; vérifier la connexion au vrai serveur HTTPS, les voix françaises disponibles sur Windows, les volumes et sous-titres, une partie avec huit téléphones, un écran distant et le retrait puis retour du réseau ; tester enfin le dépôt sur une branche Steam privée avec le SDK et les identifiants officiels.

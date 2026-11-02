# Validation locale — 2 novembre 2026

Version Windows 1.2.0, protocole réseau 3. Validation effectuée sous Windows avec Node 24.19.0 et npm 11.17.0.

| Vérification | Résultat |
| --- | --- |
| `npm test` | 21/21 tests réussis, serveur et connexions Socket.IO réels |
| `npm run check` | Types et compilation API/Web réussis |
| `npm run test:browser` | 2/2 parcours réussis sur le build de production |
| TV et mobiles dans les navigateurs | TV 1920×1080, cinq contextes mobiles distincts 390×844, association, configuration, cinq révélations, doubles clics, votes, reprise |
| Cinéma dans le navigateur | Clip MP4 réellement décodé, sous-titres timecodés, lecture/pause/retour début depuis mobile, diaporama de repli |
| Texte long TV | Réponse de 350 caractères contenue dans l'écran, vérifiée par coordonnées |
| `npm run dist:win -w @en-vrille/desktop` | EXE Windows, installateur NSIS et portable construits |
| `npm run test:launcher -w @en-vrille/desktop` avec `ENVRILLE_TEST_EXECUTABLE` | Véritable EXE final lancé, menu hors ligne, paramètres persistés, FR/EN, crédits, erreur serveur, réessai et retour |
| Archive applicative Windows | Bundle `index-VMlaMcIe.js` identique octet pour octet au build navigateur ; protocole 3 |
| `npm run steam:prepare -w @en-vrille/desktop` | Contenu et VDF de prévisualisation préparés, même archive applicative ; aucune publication ni identité Steam inventée |
| `npm audit --omit=dev` | Aucune vulnérabilité des dépendances de production signalée |
| `git diff --check` | Réussi |

## Livrables Windows

Les fichiers sont générés localement dans `apps/desktop/release/` et ignorés par Git. Le pipeline Windows les génère également comme artefacts GitHub Actions.

| Fichier | Taille | SHA-256 |
| --- | --- | --- |
| `EN-VRILLE-1.2.0-Portable-x64.exe` | 110 379 563 octets | `30cf62b80d48a5737fc3e0c8ae231236caf35e9fd9fa4689242e5446e945c040` |
| `EN-VRILLE-1.2.0-Setup-x64.exe` | 121 377 550 octets | `1005ed8181a2d04a28118839a12c2e998719e55098bcd745ccf478c19923e03b` |

Les empreintes sont également dans `SHA256SUMS.txt` et ont été recalculées et comparées après construction. Le lancement automatisé vérifié vise `release/win-unpacked/EN-VRILLE.exe` : il faut conserver son dossier complet. Le portable est autonome ; son bootstrap autoextractible n'a pas été vérifié par le même test d'attachement Electron. L'installateur est construit mais aucune installation/désinstallation n'a été exécutée sur le profil utilisateur.

Le dossier `apps/desktop/steam/output/` contient les VDF en prévisualisation et le contenu Windows final. Son manifeste indique `previewOnly=true` et `steamConfigured=false`. Les fichiers ne sont pas signés avec un certificat de distribution.

## Preuves et commandes

Les captures sont dans `test-results/` (TV, manette et cinéma) et `apps/desktop/test-results/launcher/` (menu local et erreur serveur). Les tests et leur configuration sont versionnés dans `tests/` et `playwright.config.ts`. Les rapports/captures générés restent hors Git.

Pour lancer la vérification du paquet sous PowerShell :

```powershell
$env:ENVRILLE_TEST_EXECUTABLE = (Resolve-Path apps/desktop/release/win-unpacked/EN-VRILLE.exe).Path
npm run test:launcher -w @en-vrille/desktop
```

Pour le fonctionnement, les états, le protocole, l'audit de départ et les fonctions restant à compléter, lire [IMPLEMENTATION.md](IMPLEMENTATION.md). Les procédures de construction et de déploiement sont dans le [README](../README.md).

## Ce que ces résultats ne prétendent pas valider

Les navigateurs mobiles sont simulés, pas des appareils iOS/Android physiques. Le rendu à distance et le mix audio nécessitent encore une recette de soirée sur une vraie TV. La signature Windows, les voix enregistrées finales, les intégrations Steamworks et la recette des médias avant distribution commerciale restent à traiter.

Docker n'étant pas disponible dans cet environnement, la stack PostgreSQL/API/web n'a pas été démarrée ici. Aucun push Git, téléchargement d'images GHCR, déploiement Portainer, changement DNS/TLS ou publication Steam n'a été effectué. Les versions 2 et 3 du protocole sont incompatibles : mettre à jour ensemble API, web et client Windows avant utilisation en ligne.

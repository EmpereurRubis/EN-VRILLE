# EN VRILLE — audit et suivi d'implémentation

Référence : consignes `prompt.md`, intervention du 2 novembre 2026. Le dépôt existant est conservé : React/TypeScript, Express/Socket.IO, persistance PostgreSQL/JSONB, Electron et une stack Portainer.

## Audit de départ

| Fichiers | Problème constaté | Correction |
| --- | --- | --- |
| `apps/api/src/engine.ts`, `model.ts`, `server.ts`, `packages/shared/src/index.ts` | Créer le salon créait toujours un joueur hôte, éventuellement spectateur. | Identité `DISPLAY_CLIENT` séparée de `players`, création à zéro joueur, permissions de contrôle attachées à un véritable joueur. |
| Même moteur et contrat | Le premier hôte était le créateur PC ; aucun appairage mobile sûr. | Code privé à usage unique, limitation des tentatives, transfert explicite, aucune attribution automatique au premier arrivé. |
| `engine.ts`, `rules.ts` | Collecte complète ou délai expiré déclenchaient `next()` ; `autoAdvance` activé par défaut. | Collecte fermée sans changement de scène ; chaque progression importante exige une commande avec `transitionId` courant. |
| `engine.ts`, `SceneStage.tsx` | Toutes les réponses étaient transmises puis accumulées à l'écran selon le temps. | Index serveur de révélation et de résultat ; une seule réponse par état ; auteurs masqués avant le vote. |
| `engine.ts`, `App.tsx` | Exclusion après dix secondes, jeton perdu après fermeture d'onglet, transfert implicite lors d'un départ. | Jeton durable, éligibilité conservée, suspension si maître absent, reprise ou transfert autorisé, récupération approuvée sur nouvel appareil. |
| `engine.ts`, `App.tsx`, `SceneStage.tsx` | Objets manquants remplacés secrètement ; dernier vendeur confondu avec le bilan final. | Pas de substitution ; permutation des inventions validées ; états roue, vendeur sélectionné, parole, notes locales, puis bilan final distinct. |
| `rules.ts`, textes FR/EN | Bonus de 50 à la personne désignée dans Qui parmi nous. | +100 uniquement aux votants ayant prédit une personne majoritaire, égalités incluses. |
| `SceneStage.tsx`, contrat cinéma | Activation vidéo locale au PC, projection surtout en diaporama. | Vidéo par défaut, état de lecture serveur, révision contre répétitions, télécommande mobile, sous-titres timecodés, diaporama en repli. |
| `show/audio.tsx`, styles de scène | Musique coupée en partie, colonne mascotte persistante, HUD encombrant. | Arrangements originaux par jeu, fondus et baisse de volume ; mascotte adaptée à la phase, révélations et projection occupant la scène. |
| Scripts et workflows | Aucun test de partie automatisé. | Tests Socket.IO réels et navigateurs réels, vérification de l'exécutable Windows, tests réseau intégrés avant publication GHCR. |

## Identités et confidentialité

`Session = { code, clientId, clientKind, token }`, protocole **3**. Le serveur conserve seulement le hash HMAC du jeton. Le PC n'a pas de `Player`, ne contribue pas à X/Z, n'a pas de score et ne reçoit pas les réponses privées. `HOST_CONTROLLER` est représenté par `room.hostId`, qui référence un joueur connecté ; c'est une permission, pas une identité supplémentaire.

L'URL/QR invite uniquement à rejoindre. Le code d'association est transmis exclusivement au snapshot de l'écran avant son utilisation. Le code public du salon ne permet jamais de se reconnecter en tant qu'écran ou maître. Le serveur réserve configuration, lancement, progression, pause, exclusion et transfert au maître authentifié.

Une session concurrente reprend la même identité et déconnecte l'ancien onglet. Sur nouvel appareil, `room:recovery-request {code,name}` ne renvoie aucun jeton ; seul le maître reçoit la demande. Son approbation émet `room:recovered` vers l'appareil demandeur après sauvegarde et invalide l'ancien jeton. Les demandes expirent. Une panne ne supprime pas le jeton local.

Pendant l'écriture, l'écran reçoit l'avancement, pas les créations. Pendant Mythos `reveal[n]`, il ne reçoit qu'une réponse anonyme ; pendant `results[n]`, uniquement l'auteur et les points de la réponse courante. Les scores cumulés et historiques ne révèlent pas les résultats suivants. Les votes individuels restent masqués si l'anonymat est activé. Les origines House Decoy restent cachées pendant la manche.

## Machine à états

Les noms historiques de phases sont préservés. `collectionClosed`, `revealIndex`, `resultIndex`, `pitchStage`, `podiumStep` et les révisions explicites distinguent les sous-états attendus par le prompt.

| État/sous-état | Grand écran | Téléphone et joueurs éligibles | Sortie autorisée |
| --- | --- | --- | --- |
| `lobby` | QR, code, arrivées, X/Z prêts, programme et code d'association initial | Joueurs non spectateurs : prêt ; maître : configuration/lancement | Maître, minimum et états prêts vérifiés |
| `party-intro`, `intro`, `rules` | Programme, titre, règles et Vrill | Consignes ; maître : commande contextuelle | Clic du maître ; aucun timer de révélation |
| `writing` | Question/contexte et réponses ou inventions X/Z | Participants de la manche, moins les exclusions explicites ; une soumission par joueur | X=Z ou vrai délai ferme la collecte ; clic du maître pour la suite |
| `prepare` | État collectif de préparation | Joueurs concernés : produit, rôle ou film privé et validation | Même fermeture de collecte puis clic du maître |
| Mythos `reveal[n]` | Une réponse courante anonyme en grand | Regarder la TV ; maître : réponse suivante ou ouvrir le vote | Un clic = un index ; dernière réponse conservée jusqu'au clic |
| Pitch `wheel` | Roue prête | Maître : faire tourner la roue | Sélection déjà choisie par le serveur |
| Pitch `selected` | Roue animée vers le vendeur serveur | Maître : lancer la présentation | Clic après l'animation de roue |
| `presenting` | Vendeur et produit, intervention du procès ou vidéo | Orateur parle ; maître : prochaine intervention/ouvrir les votes | Aucun chrono n'interrompt une personne |
| Cinéma `presenting` | Vidéo sans mascotte ni HUD envahissant ; sous-titres timecodés | Maître : lecture/pause/retour début/diaporama | Contrôles protégés par `playback.revision` ; fin vidéo sans transition |
| `voting` | X/Z, pas de résultats anticipés | Mythos : réponses des autres ; pitch : tous sauf vendeur ; tribunal : verdict des seuls jurés, vote bonus distinct ; cinéma : cibles permises | Collecte fermée puis révélation au clic |
| Mythos `results[n]` | Auteur, votes, points de la réponse courante | Explication du résultat courant ; maître : résultat suivant | Un clic = un résultat |
| Pitch résultats vendeur | Rideaux, trois notes, moyenne et points du vendeur | Maître : vendeur suivant ou bilan final | Le dernier vendeur suit exactement cette même étape |
| `results` final/verdict | Résultats persistants et explication des points | Maître : classement ou suite | Clic uniquement |
| `leaderboard` | Scores et rangs animés | Maître : manche ou jeu suivant | Clic uniquement |
| `transition` | Prochain jeu | Maître : présenter le jeu | Clic uniquement |
| `podium` | Places cachées puis 3e, 2e, 1er | Maître : révéler une place, puis rejouer/nouvelle soirée | `podiumStep` 0→1→2→3 ; aucun chrono |

Toutes les commandes de progression utilisent `{transitionId,skip?}`. Un ancien identifiant est rejeté même lorsque la phase conserve le même nom. Un verrou mobile évite aussi les doubles clics humains après un acquittement rapide. Les animations affichent l'état serveur et ne déclenchent aucune progression. La pause conserve une vraie absence de limite (`deadline=null`) ; une échéance expirée ne rouvre pas les soumissions.

Les identifiants éligibles viennent des participants de la manche et des règles de l'action. Une déconnexion conserve l'identité et le quorum ; « Passer ce joueur » est une intervention explicite. Le maître absent suspend la soirée, conserve les réponses et les timers, puis retrouve ses droits à la reprise. Une pause manuelle survit au redémarrage serveur. Un transfert est explicite et réservé au maître actuel.

Si un délai expire avant assez d'inventions valides, le maître peut « Rouvrir la collecte sans limite ». `room:reopen-collection {transitionId,seconds}` renouvelle le délai (0 signifie aucun), conserve les participations et ne révèle rien. Le serveur limite cette commande aux collectes fermées incomplètes et rejette les répétitions ; cela évite de bloquer la vente avec un objet manquant.

## Deux niveaux de points

`RoundResult.points` conserve le barème du mini-jeu, notamment les **+100** de la majorité. `partyPoints` représente sa contribution au classement de soirée. Les résultats affichent les deux lorsque l'équilibrage les fait différer ; l'historique conserve `gamePoints` et les points de soirée.

En mode équilibré, le moteur fixe au lancement un budget théorique de **1000 points par type de jeu**, réparti sur toutes ses manches, même si ce jeu apparaît plusieurs fois. Les plafonds par manche sont : Mythos `100×(N−1)+150`, majorité 100, vente 500 ou 600 avec invention humaine, tribunal 450, cinéma 550. Les missions compatibles ajoutent 50 au plafond. Le nombre de joueurs est figé pour ce calcul afin qu'une reconnexion ne change pas la valeur des tours passés. Les coefficients restent un choix explicite. Les arrondis par attribution peuvent donner un léger écart au budget théorique. Sans équilibrage, points du jeu et de soirée sont identiques ; en mode sans points les deux restent à zéro.

## Vérifications reproductibles

Résultats locaux du 2 novembre 2026 : **21 tests réseau réussis**, **2 parcours navigateur réussis**, types et compilation API/Web réussis. Le test navigateur comprend aussi une réponse de 350 caractères qui doit tenir dans l'écran TV. `npm audit --omit=dev` ne remonte aucune vulnérabilité des dépendances de production. Les outils de développement conservent des alertes modérées héritées ; aucune mise à jour forcée de dépendances n'a été faite pendant cette refonte.

```powershell
npm ci
npm test
npm run check
npx playwright install chromium
npm run test:browser
npm run desktop:build
npm run test:launcher -w @en-vrille/desktop
npm run pack:win -w @en-vrille/desktop
```

Les tests réseau utilisent le véritable serveur Socket.IO et des connexions distinctes, avec une base mémoire isolée et une horloge contrôlable. Ils couvrent zéro joueur PC, cinq téléphones, association, anonymat, cinq révélations et résultats, rejet des répétitions, récupération approuvée, reprise concurrente, redémarrage, absence de chrono, inventions N=3/4/5/8 dont trois humaines et deux House Decoy modifiées à cinq joueurs, roue et dernier vendeur, majorité et égalités, verdict des jurés, cinéma collaboratif complet et une soirée avec les cinq jeux jusqu'au podium. Des tests comparent également le budget soirée pour une ou plusieurs manches de majorité.

Playwright démarre une API isolée sur 3001 et le build de production sur 5173. Le parcours utilise une TV 1920×1080 et cinq contextes de navigateur mobiles indépendants de 390×844 ; il teste les vrais formulaires, l'association, la configuration, les soumissions, les doubles clics et la reprise. Un second parcours lit réellement un clip et pilote la vidéo depuis le navigateur mobile. Les captures et traces sont placées dans `test-results/`, ignoré par Git. Garder les ports libres avant ces tests.

Le test Electron ouvre une vraie fenêtre locale avec le serveur indisponible, vérifie langues, paramètres persistés, crédits, réessai et retour au menu. Il peut viser le binaire compilé avec `ENVRILLE_TEST_EXECUTABLE`. Ses captures restent dans `apps/desktop/test-results/`.

La CI exécute types, compilation, tests réseau et navigateur avant de publier les images. Le déploiement et le reverse proxy restent décrits dans le README ; les services existants restent dans l'unique `docker-compose.yml`.

## Ressources et points restant à valider

Les cinq affiches/logotypes SVG originaux, les expressions de Vrill et les bibliothèques existantes sont réutilisés. La musique et les effets ajoutés sont des compositions et synthèses locales du projet ; aucune bande-son d'un jeu tiers n'est incorporée. Les voix utilisent les ressources FR/EN présentes sur l'appareil ; il n'y a pas de voix de comédien enregistrée finale.

Les clips de *Tears of Steel* et leurs sources/crédits/licences restent documentés dans `packages/content/cinema/LICENSE.md`. La page officielle [About](https://mango.blender.org/about/) identifie CC BY 3.0 ; le [texte de licence](https://creativecommons.org/licenses/by/3.0/legalcode) autorise reproduction, adaptation et distribution sous ses conditions. La page Sharing a refusé une nouvelle consultation automatique le 2 novembre 2026 ; cette intervention n'invente pas de nouvelle validation de cette page ni de droits de portrait. Les sources de novembre 2026 déjà enregistrées sont conservées. Les acteurs gardent leurs droits personnels : ne pas présenter leurs visages comme une approbation commerciale du jeu. La distribution Steam nécessite encore une revue finale des crédits et restrictions de tous les médias importés.

La validation physique sur plusieurs téléphones iOS/Android, les mesures à distance sur une vraie télévision, la qualité du mix audio dans une soirée réelle, les performances sur les machines minimales et la signature de code Windows restent des étapes de recette commerciale. Le menu et les fonctions sont implémentés ; ces essais matériels ne sont pas remplacés par des simulations.

Le dépôt contient la préparation SteamPipe, sans identifiant Steamworks inventé. Publication GHCR/Steam, certificat de signature, DNS, HTTPS et redéploiement Portainer dépendent des comptes et de l'installation de l'éditeur ; ils ne sont pas déclenchés par ces modifications locales. Aucun déploiement public n'est présenté comme effectué. La stack a ses healthchecks, volumes persistants et routes WebSocket ; son démarrage réel sur Docker/Portainer et le test 4G derrière HTTPS restent à exécuter sur l'hôte de production.

L'ajout de tous les services réseau n'inclut pas un réplicat multi-instance ou un service vocal. Un maître définitivement privé de son téléphone et de son jeton nécessite une récupération technique explicite ; aucun joueur inconnu ne récupère silencieusement ses droits. La relance d'une animation déjà jouée, le pilotage de la vitesse vidéo et une extension du catalogue de films rétro restent des améliorations distinctes.

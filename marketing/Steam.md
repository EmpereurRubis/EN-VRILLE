# Préparation de la fiche EN VRILLE !

## Description courte

Transformez votre salon en plateau de jeu déjanté ! Cinq mini-jeux, un présentateur malicieux et les pires idées de vos amis. L’hôte lance le jeu sur PC ; de 3 à 12 participants rejoignent gratuitement avec leur navigateur et leur téléphone.

## Description longue

Bienvenue dans EN VRILLE !, l’émission dont vos amis sont les vedettes et les auteurs du chaos. Lancez la soirée sur votre PC, affichez la scène sur une télévision et partagez le code ou le QR. Chacun retrouve sa manette privée sur son téléphone, sans application à installer ni compte Steam.

Composez votre programme ou laissez le mode Surprise choisir les jeux. Vrill, votre présentateur, explique les règles, accompagne les révélations et commente les résultats. Les réponses restent anonymes jusqu’au moment de lever le voile ; les prises de parole attendent le signal de l’hôte.

- **Le Plateau des Mythos** : inventez l’explication la plus drôle et votez pour vos préférées.
- **Vends-moi cette Merde !** : défendez l’utilité de produits absurdes, ou faites vendre vos inventions par les autres.
- **Tribunal du N’importe Quoi** : accusez, plaidez et laissez le jury rendre son verdict.
- **Qui parmi nous ?** : découvrez ce que vos amis pensent vraiment de vous.
- **Sous-titres Interdits** : transformez une image en réplique inoubliable.

Les compteurs se mettent à jour avec les réponses et les votes. Les résultats, le classement et le podium racontent votre soirée. Jouez avec les points, choisissez le mode convivial ou ajoutez des missions écrites secrètes. Le Tribunal demande au moins cinq participants.

Un seul hôte utilise le jeu PC. Les participants jouent gratuitement dans un navigateur compatible, en présentiel ou à distance avec un écran spectateur. Pour discuter à distance, utilisez votre moyen de conversation habituel. Une connexion au serveur multijoueur est nécessaire pendant la partie ; le jeu n’inclut pas de conversation vocale.

## Informations à renseigner

Langue de l’interface et contenus : français. Narration optionnelle par synthèse vocale selon les voix françaises de l’appareil ; les sous-titres restent disponibles. Plateforme construite : Windows x64. Clavier et souris pour l’hôte ; écran tactile et navigateur pour les participants. Les succès, l’overlay, le contrôle de possession et l’identité Steam ne doivent pas être annoncés tant que leur intégration n’est pas validée.

Configuration indicative **provisoire**, à mesurer avant de remplir la fiche publique : Windows 11 x64, processeur double cœur, 4 Go de RAM, affichage 1280×720 et connexion Internet. Le jeu vise un affichage 1920×1080 sur télévision. La taille à réserver doit être déduite de l’installation construite, avec une marge pour les mises à jour. Ces valeurs ne constituent pas des performances minimales certifiées.

## Visuels

Les sources vectorielles et PNG sont dans `source` et `assets`. Ils utilisent le logo rouge/noir et le personnage original du jeu. Le script `node scripts/generate-store-assets.mjs` les régénère. Les capsules ne contiennent que le titre et l’illustration ; le hero de bibliothèque ne contient pas de texte.

| Fichier | Dimensions |
| --- | --- |
| `header-capsule.png` | 920 × 430 |
| `small-capsule.png` | 462 × 174 |
| `main-capsule.png` | 1232 × 706 |
| `vertical-capsule.png` | 748 × 896 |
| `library-capsule.png` | 600 × 900 |
| `library-hero.png` | 3840 × 1240 |
| `library-logo.png` | 1280 × 720, fond transparent |

Ces formats ont été vérifiés dans les références [capsules Steam](https://partner.steamgames.com/doc/store/assets/standard) et [bibliothèque Steam](https://partner.steamgames.com/doc/store/assets/libraryassets). Vérifier leurs gabarits au moment de préparer la fiche définitive.

Le dossier `screenshots` contient des captures de parties réellement exécutées en 1920×1080. Les noms de joueurs et les réponses sont des exemples de présentation. Les captures montrent le rendu du jeu ; les capsules sont des illustrations de présentation. Une bande-annonce reste à enregistrer à partir du build retenu pour publication.

Ne pas publier cette fiche automatiquement : relire les textes, les catégories de contenu, les exigences réseau et la version commerciale réellement disponible avec le compte Steamworks de l’éditeur.

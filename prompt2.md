# EN VRILLE ! — MENU DE DÉMARRAGE PC, LANCEUR STEAM ET MULTILINGUE

## 1. Objectif

Je souhaite que l'application Windows `EN-VRILLE.exe` dispose d'un véritable menu principal de jeu vidéo avant d'accéder au jeu en ligne.

Actuellement, je ne veux pas que le lancement de l'exécutable redirige immédiatement vers le site Web.

Je veux une expérience similaire à celle d'un véritable jeu PC, avec un menu d'accueil inspiré du fonctionnement des menus de jeux comme Minecraft, mais avec une identité graphique entièrement originale.

Le domaine principal du jeu est :

**https://envrille.erubis.fr**

L'exécutable doit afficher son propre menu d'accueil local, puis accéder à la plateforme EN VRILLE ! uniquement lorsque le joueur sélectionne « DÉMARRER ».

## 2. Comportement de l'exécutable

Au lancement de `EN-VRILLE.exe` :

1. Une fenêtre de jeu s'ouvre.
2. Une courte animation d'introduction affiche le logo EN VRILLE !.
3. Une ambiance musicale originale accompagne le menu.
4. Le menu principal apparaît.
5. L'utilisateur peut naviguer dans les options sans connexion préalable au serveur.
6. Le site `envrille.erubis.fr` ne doit pas être chargé comme écran principal avant que le joueur n'appuie sur « DÉMARRER ».

Le menu doit fonctionner même si le serveur multijoueur est temporairement indisponible.

Il ne doit pas nécessiter le chargement de ressources distantes pour afficher son décor, ses boutons, son logo ou sa musique.

## 3. Menu principal

Créer un véritable menu de jeu vidéo, en plein écran, adapté au format 16:9.

### Composition graphique

Au centre ou dans une composition équilibrée :
- Le logo EN VRILLE !.
- Un arrière-plan animé.
- Un décor inspiré d'un plateau de jeu télévisé humoristique.
- Des effets visuels subtils.
- Une animation d'ambiance permanente.
- Une musique originale en boucle.
- Des boutons de navigation clairement identifiables.

Le menu ne doit pas ressembler à une page d'accueil de site Web ou à un tableau de bord.

### Boutons

**DÉMARRER**

Bouton principal, le plus visible.

Lors du clic :
1. Jouer une animation de validation.
2. Déclencher une transition graphique.
3. Réduire progressivement le volume de la musique du menu.
4. Afficher éventuellement un court écran de chargement animé.
5. Charger `https://envrille.erubis.fr` directement dans la fenêtre de l'application.
6. Accéder à l'interface de création et de connexion aux parties.

L'objectif est de conserver l'expérience d'un jeu PC, sans ouvrir automatiquement un navigateur externe.

Privilégier une navigation intégrée à l'application via une WebView sécurisée ou une architecture équivalente.

**PARAMÈTRES**

Ouvre les paramètres propres au client PC.

**CRÉDITS**

Affiche les contributeurs, informations du jeu et licences des ressources utilisées.

**QUITTER**

Ferme réellement l'application Windows.

Ne pas se contenter de masquer la fenêtre ou de rediriger vers une autre page.

## 4. Direction artistique du menu

Je souhaite une ambiance très vivante, colorée et humoristique.

Références :
- Le fonctionnement du menu principal de Minecraft.
- L'ambiance audiovisuelle de Use Your Words.
- Le côté cinématographique et musical de Sub The Title.
- Les jeux télévisés déjantés.

Ces références concernent uniquement la qualité de présentation et l'ambiance. Ne pas copier leurs musiques, graphismes ou interfaces.

### Animations

Prévoir :
- Un logo animé.
- Un décor avec de légers mouvements.
- Des effets de lumière.
- Des éléments visuels qui bougent lentement.
- Une réaction au survol des boutons.
- Des effets de sélection.
- Des transitions entre les menus.
- Des animations lors du lancement du jeu.

La scène doit rester agréable à regarder même lorsque l'utilisateur ne touche à rien.

Les animations doivent être fluides, optimisées et désactivables ou réduites dans les paramètres.

## 5. Musique d'ambiance

C'est une fonctionnalité très importante.

Je souhaite que le menu possède une **véritable musique d'ambiance originale**, comme dans les jeux d'ambiance tels que Use Your Words.

L'objectif est d'installer immédiatement une atmosphère humoristique et conviviale.

### Style musical

Privilégier :
- Jazz léger.
- Swing.
- Lounge rétro.
- Musique de jeu télévisé.
- Instruments acoustiques ou sonorités vintage.
- Ambiance drôle, détendue et légèrement décalée.

La musique doit être agréable à écouter en boucle pendant plusieurs minutes.

Éviter une musique trop agressive ou répétitive.

### Fonctionnement

- Lecture en boucle.
- Transition sonore douce à l'ouverture du jeu.
- Fade-out lorsque le joueur appuie sur Démarrer.
- Réglage indépendant du volume musical.
- Possibilité de couper la musique.
- Sauvegarde des préférences.
- Reprise correcte après retour au menu.
- Effets sonores distincts lors du survol et du clic.

Utiliser uniquement une musique originale ou une musique dont la licence autorise la distribution commerciale sur Steam.

Ne jamais réutiliser directement la bande-son de Sub The Title ou d'un autre jeu.

Le menu doit fonctionner sans son si l'utilisateur le souhaite.

## 6. Menu PARAMÈTRES

Les paramètres doivent être accessibles avant le lancement du jeu en ligne.

Prévoir les catégories suivantes.

### Audio
- Volume général.
- Volume musical.
- Volume des effets sonores.
- Volume de la voix du présentateur.
- Activer ou désactiver la musique.

### Affichage
- Plein écran ou fenêtré.
- Résolution, si le framework choisi permet son contrôle.
- Limitation des animations.
- Réduction des effets visuels.
- Affichage des sous-titres.

### Langue
- Français.
- English.

### Accessibilité
- Réduction des animations.
- Ajustement du volume.
- Sous-titres du présentateur.
- Contrastes lisibles.

Les préférences doivent être conservées localement après fermeture et réouverture de l'application.

## 7. Sélection de langue en bas à droite

**Exigence visuelle précise : ajouter un sélecteur de langue dans le coin inférieur droit du menu de démarrage.**

Ce sélecteur doit rester visible sur le menu principal.

Exemple :

🌐 Français ▼

Lorsqu'on clique dessus, un petit menu apparaît avec :
- Français 🇫🇷
- English 🇬🇧

### Comportement

Le changement de langue doit être immédiat, sans redémarrage.

Exemple :

| Français | English |
|---|---|
| DÉMARRER | PLAY |
| PARAMÈTRES | SETTINGS |
| CRÉDITS | CREDITS |
| QUITTER | QUIT |
| LANGUE | LANGUAGE |

La langue doit être conservée lors des prochains lancements.

### Traduction de l'ensemble du jeu

La langue sélectionnée ne doit pas modifier uniquement le menu de démarrage.

Elle doit également être transmise à la plateforme `envrille.erubis.fr`.

Prévoir un véritable système d'internationalisation compatible avec :
- Le menu PC.
- Les menus de configuration.
- Le lobby.
- Les écrans des mini-jeux.
- Les explications des règles.
- Les instructions téléphoniques.
- Les votes.
- Les résultats.
- Les classements.
- Les interventions textuelles du présentateur.

Utiliser des fichiers de traduction structurés, par exemple `fr.json` et `en.json`.

Ne pas coder les textes directement dans chaque composant.

En cas de traduction manquante, utiliser une langue de repli définie.

Pour le multijoueur, chaque joueur doit pouvoir choisir sa langue pour son interface personnelle, indépendamment de la langue du grand écran.

La langue de l'écran principal doit être définie par l'hôte.

Les réponses humoristiques libres des joueurs ne doivent pas être traduites automatiquement.

## 8. Navigation entre menu PC et jeu en ligne

Après avoir appuyé sur DÉMARRER, le joueur entre dans la plateforme en ligne.

Le client PC doit conserver une architecture permettant de revenir au menu principal.

Prévoir :
- Navigation intégrée.
- Gestion des écrans de chargement.
- Gestion des erreurs de connexion.
- Bouton de retour au menu principal.
- Conservation des paramètres audio et linguistiques.
- Gestion de la mise en veille ou reconnexion.
- Absence de redirection incontrôlée vers un navigateur externe.

Si le serveur est indisponible, afficher une scène d'erreur intégrée :

« Impossible de rejoindre le serveur EN VRILLE ! »

Proposer :
- RÉESSAYER
- RETOUR AU MENU

Ne jamais laisser une page blanche ou une erreur brute du navigateur.

### Important pour Steam

Le client PC doit être un véritable exécutable avec ses propres ressources et son propre menu.

La partie en ligne peut être chargée depuis le serveur, mais l'application doit conserver son identité de jeu PC.

Veiller à ce que le client et le serveur utilisent des versions compatibles.

Ne pas remplacer silencieusement l'ensemble de l'application Steam par du code distant sans tenir compte des exigences de sécurité et de distribution de la plateforme.

## 9. Développement et intégration

Analyser l'architecture actuelle du dépôt EN VRILLE !.

Conserver :
- Le backend multijoueur.
- Les cinq mini-jeux.
- Le système de salons.
- Les votes.
- Le leaderboard.
- L'hébergement Docker/Portainer.
- Le domaine `envrille.erubis.fr`.

Créer ou améliorer le client Windows pour intégrer ce nouveau menu.

Si Tauri ou Electron est utilisé, placer les ressources du menu dans le package de l'application.

Ne pas charger le menu principal depuis un site distant.

Prévoir un build Windows x64 et l'intégration future à Steamworks.

## 10. Critères de réussite

Le résultat est satisfaisant si :

1. Je double-clique sur `EN-VRILLE.exe`.
2. Une introduction animée apparaît.
3. J'arrive sur un véritable menu de jeu vidéo.
4. Une musique d'ambiance originale est disponible.
5. Le menu possède les boutons DÉMARRER, PARAMÈTRES, CRÉDITS et QUITTER.
6. Je peux modifier le volume avant de lancer le jeu.
7. Le sélecteur de langue est visible en bas à droite.
8. Je peux passer instantanément de Français à English.
9. La langue choisie est conservée.
10. Le bouton DÉMARRER charge `envrille.erubis.fr` dans l'application.
11. Le site s'ouvre dans la langue choisie.
12. Je peux créer une partie et jouer normalement.
13. Je peux revenir au menu sans fermer l'application.
14. Le bouton QUITTER ferme réellement le processus.
15. Le menu fonctionne même lorsque le serveur en ligne est indisponible.
16. L'expérience est adaptée à une future commercialisation sur Steam.

## Objectif final

**Je veux que le lancement d'EN VRILLE ! donne immédiatement la sensation d'ouvrir un vrai jeu PC, avant même de commencer une partie.**

Le menu doit être vivant, musical, identifiable et agréable à utiliser.

Je veux une ambiance qui rappelle les jeux d'ambiance humoristiques, avec une identité graphique et sonore originale.

Le joueur doit pouvoir régler ses paramètres, sélectionner sa langue, puis appuyer sur DÉMARRER pour entrer dans l'univers multijoueur d'EN VRILLE !.

Ne réalise pas simplement une page HTML avec quatre boutons. Crée une véritable scène de menu de jeu vidéo, animée, sonorisée, fonctionnelle et intégrée à l'exécutable Windows.
# Bibliothèque EN VRILLE

Ce package contient les questions et produits originaux du jeu, une banque House Decoy bilingue de 150 idées et douze scènes de cinéma créditées. Le contenu fonctionne sans IA, clé ni API externe.

| Jeu | Nombre | Contenu classique disponible |
| --- | ---: | ---: |
| Le Plateau des Mythos | 120 | 100 |
| Vends-moi cette Merde ! | 100 | 100 |
| Tribunal du N’importe Quoi | 60 | 60 |
| Qui parmi nous ? | 110 | 100 |
| Sous-titres Interdits | 12 séquences de 12 images | 12 |
| House Decoy | 150 idées FR/EN | 150 |

Les vingt questions Mythos de catégorie `adulte` et les dix questions Qui parmi nous de catégorie `soirée adulte` sont marquées `adult: true`. Elles concernent les soirées et les rencontres ; elles ne contiennent pas de questions sur les traumatismes, la santé ou d’autres informations intimes. Le mode classique les exclut. L’hôte peut désactiver séparément chaque catégorie et passer une question.

## Modifier le contenu

- `src/mythos.ts` : questions, par catégorie, sous forme `[identifiant, question]`.
- `src/products.ts` : produits `[identifiant, nom, description]`.
- `src/court.ts` : accusations `[identifiant, accusation]`.
- `src/who.ts` : questions sur les joueurs `[identifiant, question]`.
- `src/index.ts` : exports et fonction de filtrage.
- `decoys/catalogue.json` : idées de produits en dix catégories, modifiables dans l’administration.
- `cinema/catalogue.json` : scènes, timecodes, positions des sous-titres et droits.
- `media/cinema/` : extraits muets et images chronologiques du cinéma collaboratif.
- `media/scene-01.svg` à `scene-20.svg` : illustrations historiques conservées pour les contenus personnalisés.

Chaque identifiant est explicite et reste stable après modification, déplacement ou suppression d’une autre entrée. Pour ajouter une question, choisir un nouvel identifiant libre du même jeu ; ne pas réutiliser un identifiant supprimé. Dès la première modification administrative, l’API sauvegarde une copie complète de la bibliothèque dans son stockage persistant. Cette copie devient la bibliothèque active et conserve les ajouts, modifications et suppressions après un redémarrage ; les nouvelles entrées d’une future version du package ne sont pas fusionnées automatiquement. `filterContent(options, bibliothèqueActive)` conserve les exclusions de catégories, d’identifiants et de contenu adulte. Une sélection vide reste vide : ne pas contourner les choix de l’hôte en choisissant dans une catégorie désactivée.

Les médias intégrés sont exposés par l’API à `/media/scene-01.svg` etc. En production leur dossier est embarqué dans l’image. Les médias ajoutés depuis l’administration doivent utiliser le volume persistant dédié de l’API.

## Illustrations et crédits

Les vingt scènes ont été dessinées en SVG spécifiquement pour EN VRILLE : conseil de pigeons, astronaute à la laverie, grenouille PDG, carotte en entretien, fantôme au supermarché, poulpe en visioconférence, dragon et facture, contrôle de vitesse d’escargot, robot et gâteau, permis de balai, raclette extraterrestre, monument félin, cactus chez le coiffeur, bonhomme de neige maître-nageur, négociation de canards, grille-pain chanteur, chevalier et meuble en kit, pingouin météo, lune chez le dentiste et baguette à l’aéroport.

![Aperçu des vingt illustrations originales](media-preview.png)

Auteur de ces vingt illustrations historiques : **Projet EN VRILLE**. Ces dessins sont faits de formes vectorielles originales. Chaque SVG contient un titre, une description accessible et ses crédits. Ils sont distincts des nouveaux médias de cinéma.

Dans toute la mesure permise par le droit applicable, le Projet EN VRILLE renonce aux droits d’auteur et droits voisins sur ses textes originaux et ses vingt illustrations historiques sous **CC0 1.0 Universal**. Cette dédicace exclut explicitement les extraits et images de cinéma et n’impose aucune licence au code du reste du projet.

Les douze séquences réelles sont adaptées de *Tears of Steel* (Blender Foundation, 2012), sous CC BY 3.0 avec attribution. Elles sont muettes, la bande-son étant sous une licence distincte. Les sources, crédits et modifications sont détaillés dans [cinema/LICENSE.md](cinema/LICENSE.md). Toute importation supplémentaire doit être accompagnée de ses propres informations de droits et d’une autorisation d’adaptation et d’utilisation commerciale pour les territoires visés.

La source vectorielle reproductible se trouve dans `scripts/create-media.mjs`. Depuis la racine :

```sh
node packages/content/scripts/create-media.mjs
```

Le script réécrit uniquement les vingt scènes intégrées. Après modification d’une scène, exécuter le script puis vérifier visuellement le fichier résultant.

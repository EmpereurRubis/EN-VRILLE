# Visuels Steam — EN VRILLE !

Les PNG de `assets/` sont les exports prêts à charger dans les emplacements correspondants de Steamworks. Les sources SVG éditables et le personnage Vrill se trouvent dans `source/`. `manifest.json` associe chaque fichier à son usage, sa taille, sa transparence et son empreinte SHA-256.

| Fichier | Dimensions | Emplacement |
| --- | --- | --- |
| `header-capsule.png` | 920 × 430 | Capsule d’en-tête de la boutique |
| `small-capsule.png` | 462 × 174 | Petite capsule de la boutique |
| `main-capsule.png` | 1232 × 706 | Capsule principale de la boutique |
| `vertical-capsule.png` | 748 × 896 | Capsule verticale de la boutique |
| `library-capsule.png` | 600 × 900 | Capsule de la bibliothèque |
| `library-hero.png` | 3840 × 1240 | Illustration panoramique de la bibliothèque, sans texte |
| `library-logo.png` | 1280 × 720 | Logo de la bibliothèque, fond transparent |

Les capsules contiennent uniquement le titre et les illustrations du jeu. Le panorama ne contient aucun mot ; le logo de bibliothèque n’inclut que le titre et son dessin. Le lettrage est intégralement vectoriel et indépendant des polices installées.

Pour régénérer tous les exports après modification des compositions dans le script :

```sh
npm ci
node scripts/generate-store-assets.mjs
```

Le rendu utilise `@resvg/resvg-js` sans accès réseau ni police système. Les PNG sont reproductibles à dépendances identiques. Ne pas modifier directement les SVG de capsules générés : ajuster les compositions dans le script ; `source/vrill.svg` est la source éditable du personnage.

Ces images sont des illustrations promotionnelles. Les captures de gameplay destinées à la fiche Steam doivent provenir du jeu exécuté et sont préparées séparément.

Les dimensions et contraintes ont été vérifiées le 1er novembre 2026 dans les documentations officielles [formats de boutique](https://partner.steamgames.com/doc/store/assets/standard), [formats de bibliothèque](https://partner.steamgames.com/doc/store/assets/libraryassets) et [règles graphiques](https://partner.steamgames.com/doc/store/assets/rules). La publication finale et la validation de la fiche restent dans Steamworks.

La licence commerciale de ces créations est précisée dans [ARTWORK-LICENSE.md](ARTWORK-LICENSE.md).

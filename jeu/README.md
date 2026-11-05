# Max et l'Œil de Jade

**Jouer : https://smob-fr.github.io/max-oeil-de-jade/** (sur téléphone : « Ajouter à l'écran d'accueil » pour le plein écran)

Jeu de plateforme pour mobile (en paysage), à mi-chemin entre l'exploration d'un *Rick Dangerous*
(munitions limitées, dynamite, momies) et les pièges farceurs d'un *Level Devil*
(le décor change sous tes pieds). L'explorateur Max fait la course contre le professeur Archibald,
un archéologue tricheur qui a piégé tout le temple pour arriver le premier à l'Œil de Jade.

Pas d'armes : on saute sur les ennemis ou on les assomme quelques secondes d'un coup de massue.
La dynamite sert à ouvrir les murs fissurés.

**100 niveaux en 10 actes**, avec une difficulté qui augmente et un niveau « Défi » tous les 3 niveaux :

| Acte | Lieu | Nouveautés |
|---|---|---|
| 1 | La jungle | sauts, pics, serpents, dynamite, ressorts, fausses dalles, flèches, rocher |
| 2 | La crypte | momies, faux murs, sols fissurés, éboulements, salle dans le noir |
| 3 | Les mines | chauves-souris, pics au plafond, planches clignotantes, deux rochers |
| 4 | Les cascades | commandes inversées, plateformes fantômes, ressort piégé |
| 5 | Le sanctuaire | tout à la fois ; au niveau 50, l'Œil de Jade… est un faux |
| 6 | Les catacombes | écraseurs, dalles à pression et grilles, plafond qui descend |
| 7 | La cité engloutie | eau qui monte, sol glissant, plateformes mobiles, monte-charges |
| 8 | Le volcan | lave qui monte, compte à rebours, forges à pilons |
| 9 | Les jardins suspendus | vent, Max-miroir, nuages fantômes, balançoires |
| 10 | La chambre du trésor | sable qui monte, tous les pièges réunis, la vraie finale (niveau 100) |

**Pour rester accrocheur** (objectif : 3 ou 4 essais par niveau, 6 ou 7 pour les plus durs) :
- un drapeau de sauvegarde au milieu des niveaux longs : après une chute, on repart de là ;
- aide automatique : tous les 3 échecs dans un niveau, les pièges ralentissent (flèches, rocher,
  eau, écraseurs) et le compte à rebours s'allonge ;
- flèches tirées en volées synchronisées jusqu'à l'acte 4 ; vitesses des rochers et des crues
  plafonnées acte par acte (voir `adoucir()` dans `outils/niveaux.py`).

**Passer un niveau** : après 5 chutes dans le même niveau (ou depuis la pause), on peut passer le niveau
en regardant une vidéo sponsorisée. Dans l'appli des stores, c'est une vraie vidéo récompensée AdMob
(plugin `@capacitor-community/admob`, identifiant à renseigner dans `PUB.adId` de `game.js`, actuellement
l'identifiant de test de Google) ; sur le web, un écran de démonstration de 5 secondes la remplace.

Chaque acte alterne Exploration, Trahison, Action et Histoire. Le temple se souvient :
certains pièges changent selon le nombre de morts dans le niveau. La progression et les records
sont gardés dans le navigateur.

## Jouer

```bash
python -m http.server 8000   # puis http://localhost:8000/
```

- Clavier : ← → courir · ↑ / Espace sauter · X massue · C dynamite · R recommencer · Échap pause
- Mobile : boutons tactiles (déplacement à gauche ; saut, tir, TNT à droite)
- Installable sur l'écran d'accueil (plein écran, paysage) grâce à `manifest.webmanifest`

## Fichiers

- `index.html` — page, accueil, carte des niveaux, pause, fin, contrôles tactiles
- `game.js` — moteur (canvas, physique, ennemis, pièges, caméra, accueil animé)
- `levels.js` — les 100 niveaux, **généré** par `outils/niveaux.py`
- `outils/niveaux.py` — recettes des niveaux + vérificateur automatique

## Modifier les niveaux

```bash
python3 outils/niveaux.py
```

Le script réécrit `levels.js` et vérifie que chaque niveau a un départ, une porte atteignable
(saut de 2 cases de haut, 4 de long, ressorts) et assez de dynamite, après déclenchement des
pièges, pour 0 à 3 morts.

Légende des cartes : `#` pierre · `B` mur fissuré · `^` pics · `v` pics au plafond · `P` départ ·
`D` porte · `J` ressort · `x` fausse dalle · `F` faux mur · `<` `>` lance-flèches · `m` momie ·
`s` serpent · `b` chauve-souris · `a` pièce d'or · `t` dynamite · `c` planche clignotante ·
`o` plateforme fantôme · `g` sol glissant · `G` grille · `_` dalle à pression.
Les plateformes mobiles, écraseurs, courants d'air et le Max-miroir sont décrits à part (`movers`,
`crushers`, `winds`, `mirror`).

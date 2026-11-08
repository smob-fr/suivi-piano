# Max et l'Œil de Jade

**Jouer : https://smob-fr.github.io/max-oeil-de-jade/** (sur téléphone : « Ajouter à l'écran d'accueil » pour le plein écran)

Jeu de plateforme pour mobile (en paysage), à mi-chemin entre l'exploration d'un *Rick Dangerous*
(munitions limitées, dynamite, momies) et les pièges farceurs d'un *Level Devil*
(le décor change sous tes pieds). L'explorateur Max fait la course contre le professeur Archibald,
un archéologue tricheur qui a piégé tout le temple pour arriver le premier à l'Œil de Jade.

Pas d'armes : on saute sur les ennemis ou on les assomme quelques secondes d'un coup de massue.
La dynamite sert à ouvrir les murs fissurés.

**5 mondes de 20 niveaux**, choisis sur une grande carte (voir `CADRAGE.md`). En touchant JOUER, on
arrive sur la carte des mondes ; chaque monde a son chemin de 20 niveaux, et on peut rejouer tout ce
qui est déjà ouvert. Chaque monde finit par un boss qu'on **assomme** (jamais tué).

| Monde | État | Contenu |
|---|---|---|
| 1. L'Empire inca | **terminé** | 19 niveaux longs (160 à 240 cases, 3 drapeaux) + le boss, le Jaguar de pierre |
| 2. Les neiges de l'Himalaya | **terminé** | 19 niveaux longs + le boss, le Yéti grognon |
| 3. Les abysses | **essai** | niveaux 1 à 3 : nage, oxygène, bulles, méduses, crabes, anguilles (toujours ouverts pour tester) ; la suite = anciens niveaux |
| 4. Le royaume des nuages | provisoire | idem |
| 5. La cité d'or | provisoire | idem |

Nouveautés du monde inca : lianes qui se balancent, singes voleurs (ils chipent 3 pièces, on les
assomme pour les récupérer), bébés jaguars qui bondissent, têtes de jaguar qui crachent du feu,
rayon du dieu Soleil (on se cache derrière les piliers), salles secrètes cachées (faux mur, mur
fissuré, corde dans le plafond, sol qui cède), ressorts fragiles, radeaux qui coulent, sabliers qui
redonnent du temps, torches à allumer dans le noir, rocher qui casse les murs fissurés, flèches
qui se plantent dans le mur et servent de marche. Nouveautés de l'Himalaya : neige profonde qui ralentit, glace vive, ponts de corde dont les planches lâchent, avalanche (boule de neige qui grossit), crevasses cachées (suivre les traces des chèvres), lac gelé qui craque si on reste immobile, geysers, jauge de froid et braseros, pente de ski, blizzard, vent qui change de sens ; loups, aigles qui piquent pendant les sauts, petits yétis lanceurs de boules de neige, chèvres sur lesquelles on rebondit, bonshommes de neige. Boss : le Yéti grognon, à attirer sous les grosses stalactites.

L'histoire est racontée **en fin de niveau**
(Archibald ne parle presque plus pendant le jeu).

**Pour rester accrocheur** (objectif : 3 ou 4 essais par niveau, 6 ou 7 pour les plus durs) :
- un ou deux drapeaux de sauvegarde dans les niveaux longs : après une chute, on repart du dernier atteint ;
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
- `mondes.js` — la carte des mondes et le chemin des niveaux de chaque monde
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
`s` serpent · `b` chauve-souris · `a` pièce d'or · `$` trésor secret · `|` corde · `(` `)` lance-flèches empoisonnées ·
`t` dynamite · `c` planche clignotante ·
`o` plateforme fantôme · `g` sol glissant · `G` grille · `_` dalle à pression.
Les plateformes mobiles, écraseurs, courants d'air et le Max-miroir sont décrits à part (`movers`,
`crushers`, `winds`, `mirror`).

# Le Temple qui Triche

Jeu de plateforme pour mobile (en paysage), à mi-chemin entre l'exploration d'un *Rick Dangerous*
(munitions limitées, dynamite, momies) et les pièges farceurs d'un *Level Devil*
(le décor change sous tes pieds). Le dieu farceur Trickster-Ka commente chacune de tes morts.

**50 niveaux en 5 actes**, avec une difficulté qui augmente :

| Acte | Lieu | Nouveautés |
|---|---|---|
| 1 | La jungle | sauts, pics, serpents, dynamite, ressorts, fausses dalles, flèches, rocher |
| 2 | La crypte | momies, faux murs, sols fissurés, éboulements |
| 3 | Les mines | chauves-souris, pics au plafond, deux rochers |
| 4 | Les cascades | commandes inversées, longs sauts |
| 5 | Le sanctuaire | tout à la fois, et la finale contre le dieu |

Chaque acte alterne Exploration, Trahison, Action et Histoire. Le temple se souvient :
certains pièges changent selon le nombre de morts dans le niveau. La progression et les records
sont gardés dans le navigateur.

## Jouer

```bash
python -m http.server 8000   # puis http://localhost:8000/jeu/
```

- Clavier : ← → courir · ↑ / Espace sauter · X tirer · C dynamite · R recommencer · Échap pause
- Mobile : boutons tactiles (déplacement à gauche ; saut, tir, TNT à droite)
- Installable sur l'écran d'accueil (plein écran, paysage) grâce à `manifest.webmanifest`

## Fichiers

- `index.html` — page, accueil, carte des niveaux, pause, fin, contrôles tactiles
- `game.js` — moteur (canvas, physique, ennemis, pièges, caméra, accueil animé)
- `levels.js` — les 50 niveaux, **généré** par `outils/niveaux.py`
- `outils/niveaux.py` — recettes des niveaux + vérificateur automatique

## Modifier les niveaux

```bash
python3 jeu/outils/niveaux.py
```

Le script réécrit `levels.js` et vérifie que chaque niveau a un départ, une porte atteignable
(saut de 2 cases de haut, 4 de long, ressorts) et assez de dynamite, après déclenchement des
pièges, pour 0 à 3 morts.

Légende des cartes : `#` pierre · `B` mur fissuré · `^` pics · `v` pics au plafond · `P` départ ·
`D` porte · `J` ressort · `x` fausse dalle · `F` faux mur · `<` `>` lance-flèches · `m` momie ·
`s` serpent · `b` chauve-souris · `a` balles · `t` dynamite.

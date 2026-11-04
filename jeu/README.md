# Le Temple qui Triche — prototype

Jeu de plateforme minimaliste, à mi-chemin entre l'exploration d'un *Rick Dangerous*
(munitions limitées, dynamite, gardiens) et les pièges farceurs d'un *Level Devil*
(le décor change sous tes pieds). Pensé pour mobile en paysage.

**Acte 1, 5 salles** : Exploration → Trahison → Exploration → Action → Histoire.
Le temple se souvient : chaque salle change certains pièges selon le nombre de morts.

## Jouer

Ouvrir `jeu/index.html` via un serveur local :

```bash
python -m http.server 8000   # puis http://localhost:8000/jeu/
```

- Clavier : ← → courir · ↑ / Espace sauter · X tirer · C dynamite · R recommencer · Échap pause
- Mobile : boutons tactiles à gauche (déplacement) et à droite (saut, tir, TNT)

## Fichiers

- `index.html` — page, écrans titre / pause / fin, contrôles tactiles
- `game.js` — moteur (canvas, physique, déclencheurs de pièges) et définition des salles

## Ajouter une salle

Dans `game.js`, tableau `ROOMS` : une grille de 30 × 17 caractères
(`#` pierre, `B` mur fissuré, `^` pics, `P` départ, `D` porte, `e` gardien,
`a` balles, `t` dynamite) et une liste de déclencheurs
(`zone` en tuiles, `min` / `max` morts, actions `say`, `hint`, `collapse`,
`spikes`, `door`, `boulder`, `fall`, `shake`).

Plus tard, le même code pourra être emballé avec Capacitor pour Android et iOS.

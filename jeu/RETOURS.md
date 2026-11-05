# Retours des testeurs — à traiter

Liste des retours reçus et ce qui a été fait.

**État : les trois retours ci-dessous sont traités** (amulettes, flèches en bois / empoisonnées, stalactites variées). Les vrais achats et les vraies vidéos ne fonctionneront que dans l'appli des stores ; sur le web, ce sont des écrans de démonstration.

## 1. « Passer un niveau » n'est ni amusant ni rentable

**Retour** : plutôt qu'un saut de niveau, donner une vie supplémentaire ou un bonus d'invincibilité
pour un ou deux obstacles. Ou un pack bonus à 0,99 €, ou une pub.

**Piste proposée** :
- **Amulette de jade** : absorbe 2 coups dans le niveau (pas les chutes dans le vide), avec une
  seconde d'invincibilité après chaque coup.
- **« Repartir d'ici ? »** juste après une mort (4 s pour accepter) : on reprend à l'endroit de la mort,
  avec une amulette active.
- Les amulettes s'obtiennent avec les **pièces d'or** (≈ 30 pièces = 1 amulette), une **vidéo
  sponsorisée** (= 1 amulette) ou un **pack à 0,99 €** (= 10 amulettes). En option : pack 2,99 €
  (40 amulettes + chapeau doré). Achats et vidéos réels uniquement dans l'appli des stores ;
  écrans de démonstration sur le web.
- « Passer le niveau » relégué en dernier recours (après une dizaine d'échecs), discret.
- Garde-fou : le jeu reste faisable sans payer (l'aide automatique reste).

À valider : prix, nombre de pièces par amulette, place de « passer le niveau ».

## 2. Pouvoir neutraliser les flèches

**Retour** : considérer les flèches comme des ennemis standard, qu'on puisse frapper ou sur lesquels
on puisse sauter.

**Piste proposée** : deux sortes de flèches bien distinctes à l'œil.
- **Flèches en bois** (pointe grise, plumes vertes) : cassées d'un coup de massue (parade), on peut
  rebondir dessus en sautant.
- **Flèches empoisonnées** (pointe rouge, traînée violette) : mortelles, incassables.
- Répartition : niveau 8 et actes 1 à 3 en bois uniquement (le niveau 14 devient plus facile) ;
  actes 4-5 mélangés ; défis et actes 6 à 10 surtout empoisonnées, avec quelques flèches en bois
  placées pour rebondir vers un passage.
- Idée en plus : flèche en bois plantée dans un mur qui sert de marche.

## 3. Les pics du plafond qui tombent sont trop prévisibles

**Retour** : le piège revient trop souvent sans variante ; on le devine avant d'y être.

**Constat** (comptage dans `levels.js`) : les stalactites qui tombent apparaissent dans **21 niveaux**,
presque toujours de la même façon (couloir bas, une stalactite toutes les 3 cases, chute 2 cases
avant le passage). Elles font partie de la rotation automatique des sections « Défi », d'où la
répétition.

**Piste proposée** :
- Les réduire à une dizaine de niveaux et les retirer de la rotation automatique des défis.
- Les cacher parmi des **stalactites de décor inoffensives** (grises) dans des salles hautes, avec
  un indice discret sur les vraies (pointe rouge, poussière qui tombe).
- Varier le comportement, une variante différente à chaque apparition :
  - **fausse alerte** : elle tremble mais ne tombe pas… c'est la suivante qui tombe ;
  - **en cascade** : elles tombent l'une après l'autre en partant de derrière Max, il faut courir ;
  - **au saut** : elle ne tombe que si Max saute dessous ;
  - **au retour** : rien à l'aller, elle tombe quand on revient sur ses pas (niveaux où la porte s'enfuit) ;
  - **utile** : une fois tombée, elle forme une marche pour atteindre une corniche ;
  - **mémoire** : après une mort, le moment de la chute change.
- Plus largement : faire la même revue pour les autres pièges répétés (pics qui sortent du sol,
  sol qui s'effondre) et donner à chaque piège plusieurs variantes, jamais deux fois la même
  d'affilée.

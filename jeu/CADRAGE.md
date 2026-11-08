# Plan de cadrage : Max et l’Œil de Jade

> Statut : **validé** le 8 novembre 2026 (312 oui, 7 non sur 319 idées). Pas encore développé.

## Décisions et ajustements issus de la validation

**Refusé**
- Le trésor secret « visible » des niveaux incas 10, 11, 14 et 19 : remplacé par des **salles secrètes** (voir plus bas).
- La grille + dalle à pression dans les niveaux incas 13, 17 et 18 : on ne garde cette combinaison que dans le niveau 9 (et le 12, ancien niveau 21).

**Ajouts et précisions**
- **Salles secrètes** : derrière un faux mur, un mur fissuré ou un passage caché, une petite salle (un mini-niveau à part entière) avec des pièces et un trésor. Le chemin pour y entrer varie d’un niveau à l’autre ; le trésor ne doit plus se voir depuis le niveau.
- **Variété** : jamais deux fois la même association de pièges (en particulier grille + dalle à pression + pics surprise).
- **Lianes qui se balancent** (monde inca) : la liane oscille de gauche à droite, Max doit s’y accrocher au bon moment et sauter de liane en liane.
- **Ressorts qui cassent** (niveau inca 5) : il doit toujours rester un chemin pour finir le niveau, même si le ressort est cassé.
- **Carte** : dans un monde, les niveaux sont des points sur un chemin. On peut revenir en arrière pour rejouer, jamais avancer au-delà du dernier niveau fini.
- **Graphisme de la carte** : plus travaillé, avec les mêmes personnages que dans le jeu (Max et Archibald reconnaissables).
- **Histoire ouverte** : l’Œil de Jade est trouvé au monde 5, mais l’histoire doit pouvoir continuer avec un 6ᵉ monde ou plus (par exemple, Archibald s’enfuit avec un morceau de la carte, ou l’Œil révèle un autre trésor).
- **Abysses** : alterner surface et plongée pour que la nage ne lasse pas. Prototyper 2 ou 3 niveaux avant de faire les 20.
- **Moins de texte pendant les niveaux** : Archibald ne parle presque plus en jouant (au plus une courte bulle de quelques mots, sans jamais gêner l'action). L'histoire est racontée **à la fin du niveau**, sur l'écran de victoire : une petite scène avec Archibald, qu'on lit tranquillement avant de passer au niveau suivant. Les niveaux d'histoire (5, 10, 15) et les boss ont une scène un peu plus longue.
- **Boss du Yéti** : la mécanique doit être comprise sans explication (indices visuels clairs).

## Ordre de développement proposé

1. **Carte des mondes et carte d’un monde** (points de niveaux), sauvegarde par monde, avec les 100 niveaux actuels rangés provisoirement.
2. **Monde inca** : les 19 niveaux choisis, rallongés, avec salles secrètes, lianes qui se balancent, singes et jaguars, rayons du soleil, têtes qui crachent ; puis le boss Jaguar de pierre.
3. **Prototype abysses** : 2 ou 3 niveaux (surface + plongée) pour valider la nage.
4. **Himalaya**, puis **Abysses**, **Nuages**, **Cité d’or**, un monde à la fois, chacun validé en jeu avant de passer au suivant.

## Les grandes règles

- **Le fil de l'histoire** : Max fait la course contre le professeur Archibald à travers 5 mondes pour retrouver l'Œil de Jade. À la fin de chaque monde, Archibald trouve une pièce de la carte du trésor… et Max la lui reprend. Le vrai Œil de Jade est au cœur du 5ᵉ monde.
- **Une grande carte des mondes** : En touchant JOUER, on arrive sur une carte illustrée : les 5 mondes reliés par un chemin. On choisit un monde, puis un niveau. On peut rejouer n'importe quel monde déjà ouvert.
- **5 mondes × 20 niveaux** : 100 niveaux en tout. Les mondes s'ouvrent l'un après l'autre ; de nouveaux mondes pourront être ajoutés plus tard sur la carte (des emplacements « bientôt » sont prévus).
- **Une identité forte par monde** : Chaque monde a ses couleurs, son décor, sa musique, ses ennemis et ses pièges propres, plus une règle de déplacement particulière (neige et glace, nage sous l'eau, sauts de nuage en nuage…).
- **Un boss à la fin de chaque monde, jamais tué** : Le niveau 20 de chaque monde est un face-à-face avec un gardien. On ne le tue jamais : on l'assomme 3 fois (avec la massue, un piège retourné contre lui, un objet du décor), il s'endort et laisse passer Max.
- **Des niveaux plus longs** : Environ deux fois plus longs qu'aujourd'hui (80 à 160 cases), découpés en 2 ou 3 parties séparées par des drapeaux. Chaque partie a son ambiance et son pic de difficulté.
- **Une vraie variété** : Chaque niveau a une mécanique vedette (jamais deux fois la même dans un monde), deux mécaniques d'appui et une surprise. Un même piège revient sous des formes différentes (variantes), jamais deux fois de suite à l'identique.
- **Le rythme d'un monde** : Niveaux 1 à 4 : on découvre les mécaniques du monde. 5, 10 et 15 : niveaux d'histoire, plus calmes. Un niveau Défi tous les 3 niveaux. 19 : la grande épreuve qui mélange tout. 20 : le boss.
- **La difficulté visée** : 3 à 4 essais en moyenne par niveau, 6 à 7 pour les Défis et les boss. L'aide automatique (pièges qui ralentissent après plusieurs chutes), les drapeaux et les amulettes restent.

## Monde 1 : L'Empire inca

*Temples dans la jungle des Andes*

- **Règle du monde** : Comme aujourd'hui : courir, sauter, assommer, faire sauter les murs fissurés, grimper aux lianes.
- **Ambiance** : Temples en pierres sculptées, lianes, statues de jaguars, torches, or des Incas.
- **Couleurs** : #2f5d3a, #6f9a4a, #c9a24a, #8a5a2b, #e9d9b0

**Ennemis**

- Serpents : Rampent au sol, se cachent dans les herbes hautes.
- Momies incas : Lentes, bras tendus ; une variante en armure d'or ne s'assomme qu'en lui sautant dessus.
- Chauves-souris : Volent en vague dans les galeries sombres.
- Singes voleurs (nouveau) : Te volent 3 pièces et s'enfuient ; assomme-les pour les récupérer.
- Jeunes jaguars (nouveau) : Bondissent de loin vers Max quand il passe devant eux.

**Pièges et mécaniques**

- Pics au sol et pics qui jaillissent : Fixes, ou qui sortent devant, loin devant ou derrière Max.
- Sol qui s'effondre et fausses dalles : Le sol cède sans prévenir, ou tremble juste avant.
- Rocher roulant : Gérard et sa famille : poursuites en descente.
- Flèches en bois et empoisonnées : En bois : on les casse ou on rebondit dessus ; empoisonnées : on les évite.
- Porte qui s'enfuit : La porte change de place quand Max approche.
- Dalles à pression et grilles : Une dalle ouvre la grille, l'autre déclenche un piège.
- Écraseurs : Blocs à pointes qui tombent en rythme.
- Sable qui monte : Fuir vers le haut avant d'être englouti.
- Lianes et ressorts : Grimper, rebondir, sauter de liane en liane.
- Rayons du dieu Soleil (nouveau) : Des miroirs envoient un rayon brûlant qui balaie la salle ; on se cache derrière les piliers.
- Têtes de jaguar qui crachent (nouveau) : Des statues soufflent des flammes par intermittence.

**Boss (niveau 20) : Le Jaguar de pierre.** Une immense statue de jaguar se réveille et charge d'un bout à l'autre de la salle. Il faut l'esquiver pour qu'il percute le mur et reste étourdi ; Max grimpe alors à une liane et lui assène un coup de massue sur la pierre de jade de son front. Trois fois, et il se rendort pour 1000 ans.

**Les 20 niveaux**

| N° | Niveau | Idée |
|---|---|---|
| 1 | Le seuil (aujourd’hui n° 1) | Apprendre les bases : pics, serpent, dynamite contre un mur fissuré. Pour le rallonger : Ajouter une 2ᵉ partie avec une liane et un premier trésor secret. |
| 2 | Le couloir honnête (aujourd’hui n° 2) | Le couloir « honnête » : le sol s'effondre, puis la porte s'enfuit derrière Max. Pour le rallonger : Allonger le couloir et faire fuir la porte deux fois, la 2ᵉ fois vers le haut. |
| 3 | La salle des gardes (aujourd’hui n° 3) | Une momie, un plafond qui tombe, et la porte enfermée sous un toit fissuré. Pour le rallonger : Ajouter une salle où il faut faire tomber le bloc pour s'en servir de marche. |
| 4 | La course (aujourd’hui n° 4) | Première poursuite du rocher Gérard sur trois étages. Pour le rallonger : Faire durer la poursuite sur 2 parties, avec un drapeau au milieu. |
| 5 | Les ressorts (aujourd’hui n° 6) | Ressorts et liane, puis un ressort qui projette dans des pics. Pour le rallonger : Ajouter des ressorts qui se cassent après un rebond. |
| 6 | Le pont (aujourd’hui n° 7) | Un pont dont certaines dalles sont fausses ; elles changent de place après une chute. Pour le rallonger : Deux ponts, le second au-dessus d'un serpent. |
| 7 | Les flèches (aujourd’hui n° 8) | Les flèches en bois : on apprend à les casser à la massue et à rebondir dessus. Pour le rallonger : Ajouter une flèche plantée dans le mur qui sert de marche. |
| 8 | Le toboggan (aujourd’hui n° 9) | Le toboggan : longue descente devant le rocher, avec des plateformes qui apparaissent. Pour le rallonger : Rocher plus gros qui casse les murs fissurés sur son passage. |
| 9 | Le faux mur (aujourd’hui n° 12) | La porte va se cacher derrière un faux mur, et une grille bloque la route. Pour le rallonger : Plusieurs faux murs dont un seul mène à la porte. |
| 10 | Le puits (aujourd’hui n° 16) | Le puits plongé dans le noir : on descend de plateforme en plateforme. Pour le rallonger : Ajouter des torches à allumer pour éclairer le chemin du retour. |
| 11 | L'éboulement (aujourd’hui n° 19) | L'éboulement : le plafond tombe en rythme, puis les stalactites en cascade. Pour le rallonger : Finir par une fuite où tout s'effondre derrière Max. |
| 12 | Le puits de mine (aujourd’hui n° 21) | Les chauves-souris dans une grande galerie, avec ressorts et murs fissurés. Pour le rallonger : Ajouter une partie sur des lianes au-dessus du vide. |
| 13 | Le plafond bas (aujourd’hui n° 27) | Le plafond bas : des pics sortent du plafond quand Max saute. Pour le rallonger : Alterner couloirs bas et salles hautes pour casser le rythme. |
| 14 | Le gué (aujourd’hui n° 31) | Le gué : vide à franchir, plateformes qui n'apparaissent qu'en plein saut. Pour le rallonger : Ajouter des plateformes qui coulent quand on reste dessus. |
| 15 | Le miroir (aujourd’hui n° 32) | Le miroir : les commandes s'inversent juste avant les pièges. Pour le rallonger : Montrer un pictogramme qui prévient de l'inversion une fois sur deux. |
| 16 | Archibald s'amuse (aujourd’hui n° 42) | Archibald s'amuse : la porte change trois fois de place. Pour le rallonger : Ajouter un niveau « labyrinthe » où l'on suit la porte. |
| 17 | Les ossements (aujourd’hui n° 51) | Dalles à pression, grilles et écraseurs : choisir la bonne dalle. Pour le rallonger : Après une chute, les dalles changent de rôle (déjà en place) ; ajouter une 3ᵉ dalle. |
| 18 | La mèche (aujourd’hui n° 74) | La mèche : compte à rebours sur un long parcours. Pour le rallonger : Ajouter des sabliers à ramasser qui donnent du temps. |
| 19 | Le sablier (aujourd’hui n° 94) | Le sablier : fuir vers le haut devant le sable qui monte. Pour le rallonger : Ajouter des lianes qui accélèrent la montée. |
| 20 | Le Jaguar de pierre | Boss : on l’assomme, on ne le tue pas. |

## Monde 2 : Les neiges de l'Himalaya

*Monastères, glaciers et sommets*

- **Règle du monde** : Neige et glace : la neige épaisse ralentit, la glace fait glisser ; rester immobile trop longtemps sur un lac gelé le fait craquer.
- **Ambiance** : Drapeaux de prière colorés, monastères suspendus, ponts de corde, aurores, chèvres des montagnes.
- **Couleurs** : #e9f1f7, #9fc4dd, #4f7ea6, #c0392b, #f2c14e

**Ennemis**

- Loups des neiges : Rapides, chassent en meute de deux ou trois.
- Aigles : Piquent sur Max depuis le ciel quand il saute.
- Petits yétis : Lancent des boules de neige en cloche.
- Chèvres des montagnes : Foncent tête baissée ; on peut rebondir sur leur dos.
- Bonhommes de neige vivants : Se reconstruisent après avoir été assommés.

**Pièges et mécaniques**

- Glace glissante : Max freine mal, jusqu'au bord des crevasses.
- Neige profonde : Ralentit la course et réduit les sauts.
- Avalanche : Une boule de neige qui grossit en roulant (remplace le rocher).
- Crevasses cachées : Une fine couche de neige cache le vide.
- Stalactites de glace : Avec leurs variantes (fausse alerte, cascade…).
- Ponts de corde qui lâchent : Les planches tombent une à une derrière Max.
- Blizzard : Vent violent et visibilité réduite.
- Lac gelé qui craque : Ne jamais rester immobile dessus.
- Sources chaudes : Des geysers propulsent Max très haut, à intervalles.
- Le froid : Une jauge de froid se vide ; il faut se réchauffer près des braseros.
- Pentes de ski : Max glisse tout seul : on ne gère que les sauts.

**Boss (niveau 20) : Le Yéti grognon.** Le gardien des sommets lance d'énormes boules de neige et fait trembler la montagne. Quand il frappe le sol, des stalactites tombent du plafond : Max doit l'attirer sous les plus grosses. Trois stalactites sur la tête, et le yéti s'endort en ronflant.

**Les 20 niveaux**

| N° | Niveau | Idée |
|---|---|---|
| 1 | Le camp de base | Découverte de la neige qui ralentit et des premières glissades. |
| 2 | La glace vive | Sol glissant jusqu'au bord des crevasses. |
| 3 | Le pont de cordes | Les planches lâchent derrière Max : on ne s'arrête pas. |
| 4 | L'avalanche | Une boule de neige qui grossit et poursuit Max. |
| 5 | Le monastère | Histoire : les moines, et des moulins à prières qui servent de plateformes tournantes. |
| 6 | Les stalactites de glace | Toutes les variantes de chute, une par partie du niveau. |
| 7 | La crevasse cachée | La neige cache le vide : suivre les traces des chèvres. |
| 8 | La meute | Loups des neiges qui chassent à plusieurs. |
| 9 | La pente de ski | Max glisse tout seul, on ne gère que les sauts. |
| 10 | Le blizzard | Vent et visibilité réduite. |
| 11 | Les sources chaudes | Geysers qui propulsent, et vapeur qui cache les pièges. |
| 12 | Le lac gelé | La glace craque si on reste immobile. |
| 13 | Les aigles | Attaques en piqué pendant les sauts. |
| 14 | Le froid mordant | Jauge de froid : de brasero en brasero. |
| 15 | La grotte de glace | Histoire : le reflet de Max dans les murs gelés. |
| 16 | Les drapeaux de prière | Grimper aux cordes dans le vent. |
| 17 | La chute de séracs | Blocs de glace qui tombent en cascade. |
| 18 | Le col du vent | Vent qui change de sens. |
| 19 | La caverne du yéti | La grande épreuve : tout le monde de la neige réuni. |
| 20 | Le Yéti grognon | Boss : on l’assomme, on ne le tue pas. |

## Monde 3 : Les abysses

*La cité engloutie sous l'océan*

- **Règle du monde** : Sous l'eau : Max nage (SAUT = une brasse), il flotte et tombe lentement ; une jauge d'oxygène se recharge dans les bulles.
- **Ambiance** : Coraux, épaves, colonnes englouties, poissons-lanternes, rayons de lumière qui percent la surface.
- **Couleurs** : #0b2a3c, #1f6f8b, #56c1c9, #f28c6b, #f2e6a0

**Ennemis**

- Méduses : Lancent des décharges électriques en rythme.
- Crabes : Carapace dure : on les assomme par-dessous ou en les retournant.
- Anguilles : Jaillissent des trous dans les rochers.
- Poissons-globes : Gonflent quand Max approche et le repoussent.
- Requin : Poursuite (remplace le rocher) ; on se cache dans les grottes.

**Pièges et mécaniques**

- Oxygène limité : Aller de bulle en bulle pour respirer.
- Courants marins : Poussent Max dans une direction.
- Coraux urticants : Les pics de ce monde.
- Mines flottantes : À éviter, ou à pousser contre un mur fissuré pour l'ouvrir.
- Colonnes de bulles : Font monter Max comme un ascenseur.
- Écluses et sas : Portes qui s'ouvrent et se ferment en rythme.
- Les abysses noirs : Il faut suivre la lumière d'un poisson-lanterne.
- Forêts d'algues : Ralentissent et cachent des ennemis.
- Tourbillons : Font tourner Max sur lui-même et brouillent les commandes.
- Torpilles d'Archibald : Son sous-marin tire depuis le fond.

**Boss (niveau 20) : La pieuvre géante.** Elle bloque l'entrée du palais avec ses huit tentacules et souffle de l'encre. Max doit faire tomber des coquillages géants (en coupant les algues qui les retiennent) sur ses tentacules quand elles frappent le sol. Trois coups, la pieuvre a le tournis et va dormir dans sa grotte.

**Les 20 niveaux**

| N° | Niveau | Idée |
|---|---|---|
| 1 | La plongée | Apprendre à nager et à respirer dans les bulles. |
| 2 | Le récif de corail | Coraux urticants et petits poissons. |
| 3 | Les courants | Se laisser porter, ou lutter contre le courant. |
| 4 | Les méduses | Passer entre les décharges en rythme. |
| 5 | L'épave | Histoire : l'épave du bateau du grand-père d'Archibald. |
| 6 | Les anguilles | Elles jaillissent des trous au passage. |
| 7 | La cité engloutie | Écluses et dalles à pression. |
| 8 | Les mines flottantes | Pousser les mines contre les murs fissurés. |
| 9 | Le requin | Poursuite : de grotte en grotte. |
| 10 | Les abysses noirs | Suivre le poisson-lanterne dans le noir. |
| 11 | Les bulles ascenseur | Colonnes de bulles qui montent. |
| 12 | Les crabes | Les retourner pour les assommer. |
| 13 | Le tourbillon | Commandes brouillées. |
| 14 | Les coffres piégés | Certains trésors mordent. |
| 15 | Le jardin d'algues | Histoire : la forêt sous-marine, calme… presque. |
| 16 | Les sas | Portes qui s'ouvrent en rythme. |
| 17 | Les torpilles d'Archibald | Son sous-marin tire depuis le fond. |
| 18 | La fosse | Grande descente avec peu d'oxygène. |
| 19 | Le palais englouti | La grande épreuve : tout l'océan réuni. |
| 20 | La pieuvre géante | Boss : on l’assomme, on ne le tue pas. |

## Monde 4 : Le royaume des nuages

*Les îles flottantes au-dessus du monde*

- **Règle du monde** : Pas de sol : on va toujours de nuage en nuage. Tomber, c'est retomber… au point de départ de la partie.
- **Ambiance** : Ciel pastel, arcs-en-ciel, palais célestes, montgolfières, moulins à vent flottants.
- **Couleurs** : #fdf6ff, #bfd7ff, #8fa8e8, #ffd36b, #f28fb8

**Ennemis**

- Oiseaux migrateurs : Traversent l'écran en volées.
- Petits éclairs vivants : Sautillent de nuage en nuage.
- Nuages souffleurs : Ont un visage et soufflent Max hors des plateformes.
- Cerfs-volants pirates : Tentent d'attraper le chapeau de Max.

**Pièges et mécaniques**

- Nuages qui fondent : Disparaissent peu après qu'on se pose dessus.
- Nuages voyageurs : Plateformes qui se déplacent.
- Orage : Des éclairs frappent en rythme, annoncés par une ombre.
- Arcs-en-ciel : Ponts qui apparaissent et disparaissent.
- Ballons et montgolfières : On s'y accroche pour monter.
- Nuages de pluie : Plaquent Max vers le bas.
- Nuages-trampolines : Rebonds de plus en plus hauts.
- Chute libre : Descente à grande vitesse entre les obstacles.
- Grêle : Des grêlons tombent par vagues.
- Moulins célestes : Pales rotatives sur lesquelles il faut sauter.

**Boss (niveau 20) : L'Oiseau-tonnerre.** Un oiseau géant fait de nuages et d'éclairs tourne autour de son nid. Max doit faire sonner les trois cloches du nid au moment où l'oiseau passe à côté : le bruit l'étourdit. Au troisième coup de cloche, il se pose et s'endort, la tête sous l'aile.

**Les 20 niveaux**

| N° | Niveau | Idée |
|---|---|---|
| 1 | Les premiers nuages | Sauter de nuage en nuage. |
| 2 | Les nuages fondants | Ne jamais rester sur place. |
| 3 | Les nuages voyageurs | Plateformes qui se déplacent. |
| 4 | L'orage | Éclairs annoncés par une ombre. |
| 5 | Le palais céleste | Histoire : les gardiens du ciel. |
| 6 | Les arcs-en-ciel | Ponts qui apparaissent et disparaissent. |
| 7 | Les ballons | S'accrocher aux ballons pour monter. |
| 8 | Les oiseaux | Volées d'oiseaux à traverser. |
| 9 | La chute libre | Descente vertigineuse entre les obstacles. |
| 10 | Le vent céleste | Rafales qui changent les sauts. |
| 11 | Les trampolines | Rebonds de plus en plus hauts. |
| 12 | La pluie | Nuages qui plaquent vers le bas. |
| 13 | Les faux nuages | Certains nuages ne portent rien. |
| 14 | Les moulins célestes | Pales rotatives. |
| 15 | L'arc-en-ciel perdu | Histoire : la porte entre le ciel et le volcan. |
| 16 | Les cerfs-volants | S'accrocher aux cerfs-volants qui bougent. |
| 17 | La grêle | Grêlons par vagues. |
| 18 | L'escalier céleste | Montée rapide sous l'orage. |
| 19 | Le nid de l'Oiseau-tonnerre | La grande épreuve : tout le ciel réuni. |
| 20 | L'Oiseau-tonnerre | Boss : on l’assomme, on ne le tue pas. |

## Monde 5 : La cité d'or

*Au cœur du volcan, la cité perdue*

- **Règle du monde** : La chaleur : la lave monte souvent, les mécanismes dorés bougent tout le temps (tapis roulants, engrenages, wagonnets).
- **Ambiance** : Rivières de lave, temples en or, machines à vapeur d'Archibald, coffres scintillants.
- **Couleurs** : #2a0f0a, #8c2a12, #e8621f, #f2c14e, #fff1c1

**Ennemis**

- Salamandres : Rapides, laissent une traînée de feu derrière elles.
- Golems de lave : Il faut les assommer deux fois.
- Gardiens d'or : Statues qui s'animent quand on leur tourne le dos.
- Robots d'Archibald : Patrouillent et sonnent l'alarme.

**Pièges et mécaniques**

- Lave qui monte : Fuir vers le haut.
- Jets de feu : Flammes qui jaillissent du sol en rythme.
- Wagonnets : Course en wagonnet : sauter au bon moment.
- Tapis roulants : Accélèrent ou freinent Max.
- Engrenages : Plateformes qui tournent sur des roues dentées.
- Pluie de magma : Des pierres en fusion tombent du plafond.
- Ponts qui fondent : Les dalles fondent sous les pieds.
- Salle des mécanismes : Combinaisons de dalles et de leviers.
- Alarmes d'Archibald : Déclenchent un compte à rebours.

**Boss (niveau 20) : Le Fouisseur d'Archibald.** Archibald pilote une énorme machine à vapeur pour s'emparer de l'Œil de Jade. On ne blesse personne : Max coince la machine en jetant de la dynamite dans ses trois cheminées, l'une après l'autre. Elle cale, Archibald en sort couvert de suie et… propose de faire équipe.

**Les 20 niveaux**

| N° | Niveau | Idée |
|---|---|---|
| 1 | Les portes d'or | Les mécanismes dorés se mettent en marche. |
| 2 | La rivière de lave | La lave qui monte. |
| 3 | Les jets de feu | Flammes qui jaillissent en rythme. |
| 4 | Le wagonnet | Course en wagonnet dans les mines d'or. |
| 5 | La salle des trésors | Histoire : Archibald trouve la dernière pièce de la carte. |
| 6 | Les tapis roulants | Accélérer, freiner, rebrousser chemin. |
| 7 | Les golems | Ennemis à assommer deux fois. |
| 8 | La pluie de magma | Pierres en fusion qui tombent. |
| 9 | La fournaise | Compte à rebours dans la chaleur. |
| 10 | Les miroirs solaires | Orienter les rayons pour ouvrir les portes. |
| 11 | Les salamandres | Rapides et brûlantes. |
| 12 | Les engrenages | Plateformes sur roues dentées. |
| 13 | Les pistons d'or | Écraseurs géants. |
| 14 | La vapeur | Geysers qui propulsent. |
| 15 | Le marché aux trésors | Histoire : Archibald propose un marché à Max. |
| 16 | Les ponts qui fondent | Les dalles fondent sous les pieds. |
| 17 | La forge d'Archibald | Ses robots et ses alarmes. |
| 18 | L'effondrement | Tout s'écroule derrière Max. |
| 19 | Le cœur du volcan | La grande épreuve : tout le jeu réuni. |
| 20 | Le Fouisseur d'Archibald | Boss : on l’assomme, on ne le tue pas. |

## Idées de mondes futurs

- **Les pyramides d'Égypte** : Tempêtes de sable, scarabées, sphinx énigmatique.
- **L'île aux pirates** : Canons, vagues, perroquets voleurs, trésor enterré.
- **La forêt hantée** : Fantômes timides, lanternes, arbres qui bougent la nuit.
- **Le train fou** : Sur les toits d'un train lancé à pleine vitesse.
- **La banquise** : Icebergs qui dérivent, ours polaires, aurores boréales.
- **Le laboratoire d'Archibald** : Gadgets, rayons, robots : le monde bonus.

## Rythme d’un monde

- 1 à 4 : découverte des mécaniques du monde.
- 5, 10, 15 : niveaux d’histoire.
- Tous les 3 niveaux : un Défi.
- 19 : la grande épreuve. 20 : le boss.

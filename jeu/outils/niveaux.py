#!/usr/bin/env python3
"""Générateur + vérificateur des 100 niveaux du Temple qui Triche.

    python3 outils/niveaux.py        # écrit jeu/levels.js et vérifie chaque niveau

Les niveaux sont décrits par des « recettes » : une suite de segments (sol plat,
fosse, ressort, mur fissuré, piège…) posés de gauche à droite. Chaque segment est
franchissable par construction ; le vérificateur rejoue ensuite un parcours
simplifié (marche, saut de 2 cases de haut et 4 de long, ressorts) sur la carte
où tous les pièges se sont déclenchés, pour 0 à 3 morts dans la salle.

Légende des cartes :
  #  pierre            B  mur fissuré (dynamite)   ^  pics au sol    v  pics au plafond
  P  départ            D  porte                     J  ressort        x  fausse dalle (s'effondre)
  F  faux mur          <  >  lance-flèches          m  momie          s  serpent
  b  chauve-souris     a  pièce d'or               t  dynamite (+1)  .  vide
"""
import json, os, sys

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(ICI, "..", "levels.js")

ACTES = [
    {"nom": "La jungle", "palette": "jungle"},
    {"nom": "La crypte", "palette": "crypte"},
    {"nom": "Les mines", "palette": "mines"},
    {"nom": "Les cascades", "palette": "cascades"},
    {"nom": "Le sanctuaire", "palette": "sanctuaire"},
    {"nom": "Les catacombes", "palette": "catacombes"},
    {"nom": "La cité engloutie", "palette": "engloutie"},
    {"nom": "Le volcan", "palette": "volcan"},
    {"nom": "Les jardins suspendus", "palette": "jardins"},
    {"nom": "La chambre du trésor", "palette": "tresor"},
]

SOLIDE = set("#BxJ<>cgG")

# Numéro du niveau en cours de construction (les actes sont construits dans l'ordre).
NUMERO = [0]
# compteurs de variantes : un même piège ne revient jamais deux fois de suite sous la même forme
VARIANTES = {"stal": 0, "pics": 0}
# Un niveau « Défi » tous les 3 niveaux ; quand ça tombe sur un niveau Histoire (15, 30, 45),
# c'est le niveau juste avant qui devient le défi.
HISTOIRE = {n for n in range(1, 101) if n % 10 in (5, 0)}
DEFIS = {(n - 1 if n in HISTOIRE else n) for n in range(3, 101, 3)}


class Niveau:
    def __init__(self, nom, type_, h=17, ammo=(6, 1), sol=None, **opts):
        NUMERO[0] += 1
        self.num = NUMERO[0]
        self.defi = self.num in DEFIS
        self._defi_fait = False
        self.nom, self.type, self.h = nom, type_, h
        self.ammo = list(ammo)
        self.cols = []
        self.y = (h - 2) if sol is None else sol  # ligne où se tient le joueur
        self.trig = []
        self.opts = opts
        self.tnt_besoin = 0
        self.movers, self.crushers, self.winds = [], [], []
        self.vines, self.flames, self.beams, self.secrets, self.liens, self.glacons = [], [], [], [], [], []
        self.monde = opts.pop("monde", None)
        self._mur()

    # ---------- colonnes ----------
    def _mur(self):
        self.cols.append(["#"] * self.h)

    def colonne(self, sol=None, plafond=0, fond="plein"):
        """Ajoute une colonne : pierre de 0..plafond, vide, sol sous la ligne `sol`.
        fond = plein | pics | vide (fosse mortelle) | plateforme (une seule épaisseur)."""
        sol = self.y if sol is None else sol
        c = ["."] * self.h
        for r in range(0, plafond + 1):
            c[r] = "#"
        if fond == "plein":
            for r in range(sol + 1, self.h):
                c[r] = "#"
        elif fond == "plateforme":
            c[sol + 1] = "#"
        elif fond == "pics":
            c[self.h - 1] = "#"
            c[self.h - 2] = "^"
            if sol + 1 < self.h - 2:
                pass
        # fond == "vide" : rien en dessous, on tombe hors de la carte
        self.cols.append(c)
        return len(self.cols) - 1

    @property
    def x(self):
        return len(self.cols)

    def put(self, x, y, ch):
        self.cols[x][y] = ch

    def Z(self, x, w=1):
        return [x, 1, w, self.h - 2]

    def t(self, act, zone=None, **kw):
        tr = {"act": act}
        if zone is not None:
            tr["zone"] = zone
        tr.update(kw)
        self.trig.append(tr)
        return tr

    # ---------- segments ----------
    def plat(self, n, plafond=0, ennemi=None, objet=None):
        x0 = self.x
        for _ in range(n):
            self.colonne(plafond=plafond)
        if ennemi:
            for i, e in enumerate(ennemi):
                ex = x0 + n // 2 + i * 2 - len(ennemi) + 1
                ex = max(x0, min(x0 + n - 1, ex))
                yy = self.y - 2 if e == "b" else self.y - 5 if e == "A" else self.y
                self.put(ex, yy, e)
        if objet:
            self.put(x0 + max(0, n // 2 - 1) if not ennemi else x0, self.y, objet)
        return x0

    def depart(self, n=4):
        # un niveau sur trois cache un trésor derrière le mur de gauche (faux mur)
        if self.num % 3 == 1 and len(self.cols) == 1 and self.y >= 4 and not self.monde:
            self.cachette()
        x0 = self.plat(n)
        self.put(x0 + 1, self.y, "P")
        return x0

    def cachette(self):
        """Petite salle secrète à gauche du départ, entièrement cachée par un faux mur."""
        for i in range(3):
            c = self.colonne()
            for r in range(1, self.y + 1):
                self.put(c, r, "F")
            self.put(c, self.y, "$" if i == 0 else "a")
        return c

    def corde(self, haut=5):
        """Corde accrochée au bord d'une corniche haute : SAUT maintenu pour grimper."""
        haut = min(haut, self.y - 3)
        if haut < 3:
            return self.plat(2)
        x0 = self.colonne()
        for r in range(self.y - haut, self.y + 1):
            self.put(x0, r, "|")
        self.y -= haut
        self.plat(3)
        self.astuce("Corde : maintiens SAUT pour grimper, ◀ ou ▶ pour sauter de côté", x0 - 2, max=0)
        return x0

    def corde_secrete(self):
        """Corde qui monte vers une plateforme cachée en hauteur, avec des pièces et un trésor."""
        if self.y < 8:
            return self.plat(3)
        x0 = self.plat(7)
        top = self.y - 5
        for r in range(top, self.y + 1):
            self.put(x0 + 1, r, "|")
        for c in range(x0 + 2, x0 + 6):
            self.put(c, top, "#")
        self.put(x0 + 3, top - 1, "a"); self.put(x0 + 4, top - 1, "a"); self.put(x0 + 5, top - 1, "$")
        return x0

    def porte(self, n=4):
        if self.defi and not self._defi_fait:
            self._defi_fait = True
            self.passage_defi()
        # un niveau sur quatre a une corde vers une plateforme secrète juste avant la porte
        if self.num % 4 == 2 and not getattr(self, "_corde_faite", False) and self.y >= 8 and not self.monde:
            self._corde_faite = True
            self.corde_secrete()
        x0 = self.plat(n)
        self.put(x0 + n - 2, self.y, "D")
        self.porte_x = x0 + n - 2
        return x0

    def monte(self, k):
        self.y -= k

    def descend(self, k):
        self.y += k

    def fosse(self, n, fond="pics"):
        x0 = self.x
        for _ in range(n):
            self.colonne(fond=fond)
        return x0

    def pics(self, n):
        x0 = self.x
        for _ in range(n):
            c = self.colonne()
            self.put(c, self.y, "^")
        return x0

    def ressort(self, monte=4):
        """Un ressort au sol puis un mur de `monte` cases (max 4)."""
        x0 = self.colonne()
        self.put(x0, self.y, "J")
        self.y -= 1  # on se tient sur le ressort
        self.y -= (monte - 1)
        return x0

    def dynamite_avant(self):
        """Pose un bâton de dynamite deux cases avant l'obstacle : jamais bloqué faute de dynamite."""
        for d in (2, 3, 1):
            c = self.x - d
            if c > 0 and self.cols[c][self.y] == "." and self.y + 1 < self.h and self.cols[c][self.y + 1] == "#":
                self.put(c, self.y, "t")
                return

    def mur_fissure(self, haut=2):
        self.dynamite_avant()
        x0 = self.colonne()
        for r in range(1, self.y + 1):
            self.put(x0, r, "#")
        for r in range(self.y - haut + 1, self.y + 1):
            self.put(x0, r, "B")
        self.tnt_besoin += 1
        return x0

    def sol_fissure(self, n=3, chute=3):
        """Sol fissuré au-dessus d'un couloir plus bas ; un mur bloque le chemin du haut."""
        self.dynamite_avant()
        x0 = self.x
        for _ in range(n):
            c = ["."] * self.h
            c[0] = "#"
            c[self.y + 1] = "B"
            for r in range(self.y + 1 + chute, self.h):
                c[r] = "#"
            self.cols.append(c)
        self.tnt_besoin += 1
        ancien = self.y
        self.y += chute
        # mur qui bloque le passage du haut
        c = ["#"] * self.h
        for r in range(ancien + 2, self.y + 1):
            c[r] = "."
        self.cols.append(c)
        return x0

    def faux_mur(self, n=2):
        x0 = self.x
        for _ in range(n):
            c = self.colonne()
            for r in range(1, self.y + 1):
                self.put(c, r, "F")
        return x0

    def pont(self, motif, fond="pics"):
        """Pont d'une épaisseur au-dessus d'une fosse ; 'x' = fausse dalle."""
        x0 = self.x
        for ch in motif:
            c = self.colonne(fond=fond)
            self.cols[c][self.y + 1] = "#" if ch == "#" else "x"
        return x0

    def plateformes(self, liste, fond="pics"):
        """liste de (écart, largeur, dy) : fosse d'`écart` cases puis plateforme décalée de dy."""
        x0 = self.x
        for ecart, larg, dy in liste:
            for _ in range(ecart):
                self.colonne(fond=fond)
            self.y += dy
            for _ in range(larg):
                self.colonne(fond="plateforme" if fond != "plein" else "plein")
                if fond == "pics":
                    self.cols[-1][self.h - 1] = "#"
                    self.cols[-1][self.h - 2] = "^" if self.y + 1 < self.h - 2 else self.cols[-1][self.h - 2]
        return x0

    def fleches(self, n=6, monte=1):
        """Course de n cases, puis marche montante avec un lance-flèches dans la contremarche."""
        x0 = self.plat(n)
        ancien = self.y
        self.y -= monte
        c = self.colonne()
        self.put(c, ancien, "<")
        return x0

    def plafond_bas(self, n, chutes=(), hauteur=4, pics_plafond=()):
        """Couloir bas ; chutes = [(décalage, délai)] blocs du plafond qui tombent."""
        x0 = self.x
        p = self.y - hauteur
        for _ in range(n):
            self.colonne(plafond=p)
        for dx, delai in chutes:
            zx = max(x0, x0 + dx - 3)
            self.t([["fall", x0 + dx, p, 1, 1, delai]], self.Z(zx))
        for dx in pics_plafond:
            self.put(x0 + dx, p + 1, "v")
        return x0

    # ---------- nouveaux pièges ----------
    def ressort_pique(self):
        """Ressort qui projette droit dans des pics au plafond : il faut filer de côté sur la corniche."""
        if self.y < 10:
            return self.sprint()
        bas = self.y
        x0 = self.ressort(3)
        for c in (x0 - 1, x0):
            self.put(c, bas - 6, "v")
            for r in range(1, bas - 6):
                self.put(c, r, "#")
        self.plat(3)
        self.astuce("Au sommet du rebond, file sur la corniche !", x0 - 2, min=1)
        return x0

    def clignote(self, n=6):
        """Plateformes qui apparaissent et disparaissent en rythme au-dessus du vide."""
        x0 = self.x
        for i in range(n):
            c = self.colonne(fond="vide")
            self.cols[c][self.y + 1] = "c"
        self.astuce("Les planches disparaissent en rythme…", x0 - 2, max=0)
        return x0

    def fantome(self, n=5):
        """Un vide trop large… dont les plateformes n'apparaissent qu'une fois qu'on a sauté."""
        x0 = self.x
        for i in range(n):
            c = self.colonne(fond="vide")
            self.cols[c][self.y + 1] = "o"
        self.t([["appear", x0, self.y + 1, n, 1], ["say", "Un saut dans le vide ? Tu me fais confiance ? Ha !"]], [x0 - 1, 1, 2, self.h - 2], air=True)
        self.astuce("Trop large ? Saute quand même…", x0 - 3, min=1)
        return x0

    def stalactites(self, n=9, pas=3, variante=None):
        """Couloir bas avec des stalactites qui tombent. Six comportements, jamais deux fois
        le même d'affilée : normal, fausse alerte, cascade, au saut, au retour, mémoire."""
        noms = ["normal", "fausse", "cascade", "saut", "retour", "memoire"]
        if variante is None:
            variante = noms[VARIANTES["stal"] % len(noms)]
            VARIANTES["stal"] += 1
        x0 = self.x
        p = self.y - 4
        for _ in range(n):
            self.colonne(plafond=p)
        cols = list(range(2, n - 1, pas))
        for dx in cols:
            self.put(x0 + dx, p + 1, "v")
        Z = lambda dx: self.Z(max(x0, x0 + dx))
        if variante == "normal":
            for dx in cols:
                self.t([["dropspike", x0 + dx, p + 1, 10]], Z(dx - 2))
        elif variante == "fausse":
            # la première tremble longtemps… et ne tombe pas ; la suivante tombe d'un coup
            self.t([["wobble", x0 + cols[0], p + 1, 70]], Z(cols[0] - 2))
            for dx in cols[1:]:
                self.t([["dropspike", x0 + dx, p + 1, 3]], Z(dx - 1))
        elif variante == "cascade":
            # en arrivant au milieu, elles tombent l'une après l'autre en partant de derrière
            for i, dx in enumerate(cols):
                self.t([["dropspike", x0 + dx, p + 1, 12 + i * 14]], Z(cols[len(cols) // 2] - 1))
            self.astuce("Elles tombent en cascade : cours !", x0, max=0)
        elif variante == "saut":
            # elles ne tombent que si Max saute en dessous
            for dx in cols:
                self.t([["dropspike", x0 + dx, p + 1, 6]], [x0 + dx - 1, 1, 3, self.h - 2], air=True)
            self.astuce("Ne saute pas sous les stalactites…", x0, max=0)
        elif variante == "retour":
            # rien à l'aller ; elles tombent si Max revient sur ses pas
            for dx in cols:
                self.t([["dropspike", x0 + dx, p + 1, 4]], Z(dx - 1), dir=-1)
        else:  # mémoire : la première fois elles tombent tôt, ensuite au dernier moment
            for dx in cols:
                self.t([["dropspike", x0 + dx, p + 1, 10]], Z(dx - 2), max=0)
                self.t([["dropspike", x0 + dx, p + 1, 2]], Z(dx), min=1)
        return x0

    def stalactite_marche(self):
        """Un bloc pend du plafond devant une corniche trop haute : en tombant, il fait une marche."""
        x0 = self.plat(3)
        b = self.colonne()
        top = self.y - 5
        for r in range(1, top + 1):
            self.put(b, r, "#")
        self.t([["fall", b, top, 1, 1, 16], ["say", "Oups, mon plafond s'effondre. Ah zut, ça t'aide."]], self.Z(x0))
        self.monte(3)
        self.plat(3)
        self.astuce("Approche-toi : le bloc va tomber et te servir de marche", x0, min=1)
        return x0

    def glissant(self, n=6):
        """Sol mouillé et glissant qui finit au bord de pics : il faut anticiper le saut."""
        x0 = self.x
        for _ in range(n):
            c = self.colonne()
            self.cols[c][self.y + 1] = "g"
        self.pics(2); self.plat(2)
        self.astuce("Sol glissant : Max freine mal !", x0, max=0)
        return x0

    def mobile(self, n=6, vitesse=1.0):
        """Fosse traversée par une plateforme qui fait l'aller-retour."""
        x0 = self.x
        for _ in range(n):
            self.colonne(fond="vide")
        self.movers.append([x0, self.y + 1, 2, n - 2, 0, vitesse])
        return x0

    def ascenseur(self, haut=4, vitesse=0.9):
        """Monte-charge qui monte et descend le long d'une paroi."""
        x0 = self.x
        for _ in range(2):
            self.colonne(fond="vide")
        self.movers.append([x0, self.y + 1, 2, 0, -haut, vitesse])
        self._lift = (x0, self.y + 1, haut)
        self.y -= haut
        return x0

    def ecraseurs(self, n=10, k=3, pas=3):
        """Couloir bas où des blocs à pointes s'abattent en rythme."""
        x0 = self.x
        p = self.y - 4
        for _ in range(n):
            self.colonne(plafond=p)
        for i in range(k):
            self.crushers.append([x0 + 2 + i * pas, p + 1, (i * 47) % 170])
        self.astuce("Passe sous les écraseurs quand ils remontent", x0, max=0)
        return x0

    def vent(self, liste=((2, 3, 0), (2, 3, 0), (2, 3, 0)), force=-0.45):
        """Plateformes au-dessus du vide, balayées par un courant d'air."""
        x0 = self.x
        self.plateformes(list(liste), fond="vide")
        self.winds.append([x0, self.x - 1, force])
        self.astuce("Attention au vent !" if force < 0 else "Le vent te pousse… trop fort ?", x0 - 1, max=0)
        return x0

    def leviers(self):
        """Deux dalles à pression devant une grille : une seule l'ouvre, l'autre est piégée.
        Après une mort, les deux dalles échangent leur rôle."""
        x0 = self.plat(2)
        a = self.colonne(); self.put(a, self.y, "_")
        self.plat(3)
        b = self.colonne(); self.put(b, self.y, "_")
        self.plat(2)
        gx = self.colonne()
        for r in range(1, self.y + 1):
            self.put(gx, r, "G" if r >= self.y - 2 else "#")
        self.plat(2)
        y = self.y
        ouvre = [["set", gx, y - 2, 1, 3, "."], ["gate"], ["say", "Clac ! La grille s'ouvre."]]
        piege = [["spikes", gx - 1, y, 1, 1], ["say", "Mauvaise dalle ! Ha ha !"]]
        self.t([["press", a, y]] + ouvre, [a, y, 1, 1], max=0)
        self.t([["press", b, y]] + piege, [b, y, 1, 1], max=0)
        self.t([["press", a, y]] + piege, [a, y, 1, 1], min=1)
        self.t([["press", b, y]] + ouvre, [b, y, 1, 1], min=1)
        self.astuce("Une seule dalle ouvre la grille…", x0, max=0)
        self.astuce("Archibald a échangé les dalles !", x0, min=1)
        return x0

    def minuterie(self, marge=2.2):
        """Compte à rebours sur tout le niveau (calculé une fois le niveau construit)."""
        self.opts["_timer"] = marge

    def crue(self, nature="eau", vitesse=0.16, texte=None):
        depart = 0 if nature == "plafond" else self.h + 4   # le plafond part du haut, l'eau de bien plus bas (temps de réaction)
        self.t([["flood", nature, vitesse, depart]] + ([["say", texte]] if texte else []))

    def sprint(self):
        x0 = self.pics(2); self.plat(1); self.fosse(3, "vide"); self.plat(1); self.pics(2); self.plat(1)
        return x0

    def passage_defi(self):
        """Section difficile ajoutée avant la porte des niveaux Défi, variée d'un défi à l'autre."""
        k = self.num // 3
        menu = [self.sprint, self.clignote, self.ressort_pique, self.fantome, self.leviers]
        self.plat(2)
        menu[k % 5]()
        if self.num > 20:
            self.plat(2)
            menu[(k + 2) % 5]()
        self.plat(2)
        self.astuce("Défi : dernier passage avant la porte !", self.x - 1, max=0)

    # ---------- monde inca : nouvelles mécaniques ----------
    def liane(self, ecart=8, longueur=5, amp=0.8, fond="vide", ph=None):
        """Liane qui se balance au-dessus du vide : on s'y accroche en sautant, SAUT pour lâcher."""
        x0 = self.x
        for _ in range(ecart):
            self.colonne(fond=fond)
        ax = x0 + ecart // 2
        self.vines.append([ax, self.y - longueur, longueur, amp] + ([ph] if ph is not None else []))
        a, b = (x0 - 1, self.y), (x0 + ecart, self.y)
        self.liens += [[a, b], [b, a]]
        return x0

    def tete_feu(self, n=7, monte=2, longueur=None):
        """Couloir qui finit sur une marche ; une tête de jaguar sculptée dans la marche crache du feu."""
        x0 = self.plat(n, plafond=self.y - 5)
        c = self.colonne(sol=self.y - monte, plafond=self.y - 5)
        self.flames.append([c, self.y, -1, longueur or n - 1, (c * 37) % 200])
        self.y -= monte
        self.plat(2, plafond=self.y - 4)
        self.astuce("Attends que la tête de jaguar ait fini de cracher", x0, max=0)
        return x0

    def tete_feu_plafond(self, n=8):
        """Deux têtes de jaguar se font face au ras du sol : il faut passer entre les deux jets."""
        x0 = self.plat(1)
        g = self.colonne(sol=self.y - 2)
        self.flames.append([g, self.y, 1, 3, 0])
        self.plat(n)
        d = self.colonne(sol=self.y - 2)
        self.flames.append([d, self.y, -1, 3, 100])
        self.plat(2)
        self.astuce("Saute par-dessus les flammes, ou passe entre deux jets", x0, max=0)
        return x0

    def soleil(self, n=20, piliers=(5, 10, 15), haut=2, periode=360):
        """Salle du dieu Soleil : un miroir au plafond balaie la salle d'un rayon brûlant ;
        on se cache dans l'ombre des piliers."""
        x0 = self.x
        for i in range(n):
            c = self.colonne()
            if i in piliers:
                for r in range(self.y - haut + 1, self.y + 1):
                    self.put(c, r, "#")
        self.beams.append([x0 + 1, 1, 0.2, 1.1, periode])
        self.astuce("Le rayon du Soleil brûle : cache-toi derrière les piliers !", x0 - 1, max=0)
        return x0

    def salle_secrete(self, genre="bloc_faux", larg=6):
        """Salle secrète cachée (pièces + trésor). Genres : bloc_faux (faux mur au dos d'un bloc),
        bloc_fissure (mur fissuré au dos d'un bloc), plafond (corde vers une salle au-dessus),
        sol (une dalle cède sur une salle en dessous, une corde pour remonter)."""
        y = self.y
        if genre.startswith("bloc"):
            self.colonne(sol=y - 1)
            cols = [self.colonne(sol=y - 3) for _ in range(larg)]
            for c in cols[1:-1]:
                for r in (y - 1, y):
                    self.put(c, r, ".")
            for r in (y - 1, y):
                self.put(cols[-1], r, "F" if genre == "bloc_faux" else "B")
            self.put(cols[1], y, "$")
            for c in cols[2:-1]:
                self.put(c, y, "a")
            if genre == "bloc_fissure":
                self.put(cols[2], y - 3, "t")
            self.secrets.append([cols[1], y - 1, larg - 2, 2])
            return cols[0]
        if genre == "plafond" and y >= 9:
            x0 = self.x
            for _ in range(7):
                self.colonne(plafond=y - 4)
            c = x0 + 3
            for xx in range(c - 2, c + 3):
                for r in range(y - 7, y - 4):
                    self.put(xx, r, ".")
            for r in range(y - 6, y + 1):
                self.put(c, r, "|")
            self.put(c - 2, y - 5, "$"); self.put(c - 1, y - 5, "a"); self.put(c + 1, y - 5, "a"); self.put(c + 2, y - 5, "a")
            self.secrets.append([c - 2, y - 7, 5, 3])
            return x0
        if genre == "sol" and y + 5 < self.h:
            x0 = self.plat(7)
            c = x0 + 2
            for xx in range(c - 1, c + 4):
                for r in (y + 2, y + 3):
                    self.put(xx, r, ".")
            self.put(c, y + 1, "x")
            for r in (y + 2, y + 3):
                self.put(c, r, "|")
            self.put(c + 3, y + 3, "$"); self.put(c + 1, y + 3, "a"); self.put(c + 2, y + 3, "a"); self.put(c - 1, y + 3, "a")
            self.t([["set", c, y + 1, 1, 1, "|"]], [c - 1, y + 2, 5, 2])
            self.secrets.append([c - 1, y + 2, 5, 2])
            return x0
        return self.salle_secrete("bloc_faux", larg)

    def ressort_fragile(self, monte=4):
        """Ressort qui casse après un rebond ; une corde à côté permet toujours de monter."""
        bas = self.y
        x0 = self.colonne()
        self.put(x0, bas, "q")
        c = self.colonne()
        for r in range(bas - monte + 1, bas + 1):
            self.put(c, r, "|")
        self.y -= monte
        return x0

    def coule(self, liste=((2, 2), (2, 2), (2, 2)), fond="vide"):
        """Radeaux de bois qui s'enfoncent quand on reste dessus."""
        x0 = self.x
        for ecart, larg in liste:
            for _ in range(ecart):
                self.colonne(fond=fond)
            for _ in range(larg):
                c = self.colonne(fond=fond)
                self.put(c, self.y + 1, "n")
        self.astuce("Les radeaux coulent : ne t'attarde pas !", x0 - 1, max=0)
        return x0

    def fleche_marche(self, monte=3, n=6):
        """Mur trop haut pour sauter. Un lance-flèches, de l'autre côté du couloir, tire dessus :
        la flèche en bois reste plantée dans la pierre et sert de marche."""
        bloc = self.colonne(sol=self.y - 2)
        self.put(bloc, self.y - 1, ">")
        x0 = self.plat(n)
        mur = self.colonne(sol=self.y - monte)
        self.opts["planter"] = True
        self.liens += [[(x0 + n - 2, self.y), (mur, self.y - monte)]]
        self.y -= monte
        self.plat(3)
        self.astuce("Trop haut ? Attends qu'une flèche se plante dans le mur…", x0 + 1, max=1)
        return x0

    def fuite_effondrement(self, n=18):
        """Le sol s'effondre derrière Max à mesure qu'il court."""
        x0 = self.plat(n)
        for i in range(0, n - 3, 3):
            self.t([["collapse", x0 + i, self.y + 1, 3, self.h - self.y - 1, 6]], self.Z(x0 + i + 4))
        self.astuce("Tout s'effondre : ne t'arrête pas !", x0, max=0)
        return x0

    # ---------- monde de l'Himalaya ----------
    def neige(self, n=6, ennemi=None, objet=None):
        """Neige profonde : Max y court moins vite et saute moins haut."""
        x0 = self.plat(n, ennemi=ennemi, objet=objet)
        for c in range(x0, x0 + n):
            self.cols[c][self.y + 1] = "z"
        return x0

    def glace_crevasse(self, n=6, trou=2):
        """Glace vive qui finit au bord d'une crevasse : on glisse, il faut sauter à temps."""
        x0 = self.x
        for _ in range(n):
            c = self.colonne()
            self.cols[c][self.y + 1] = "g"
        self.fosse(trou, "vide"); self.plat(2)
        return x0

    def pont_corde(self, n=8):
        """Pont de corde au-dessus du vide : chaque planche lâche peu après le passage de Max."""
        x0 = self.x
        for _ in range(n):
            c = self.colonne(fond="vide")
            self.cols[c][self.y + 1] = "y"
        self.astuce("Les planches lâchent derrière toi : ne t'arrête pas !", x0 - 2, max=0)
        return x0

    def lac(self, n=10):
        """Lac gelé : la glace fine craque et cède si Max reste immobile."""
        x0 = self.x
        for _ in range(n):
            c = self.colonne(fond="vide")
            self.cols[c][self.y + 1] = "i"
        self.astuce("Glace fine : ne reste jamais immobile dessus !", x0 - 2, max=0)
        return x0

    def geyser(self, monte=5):
        """Une source chaude crache de la vapeur en rythme et propulse Max sur une corniche haute."""
        x0 = self.plat(2)
        c = self.colonne()
        self.cols[c][self.y + 1] = "V"
        self.y -= monte
        self.plat(3)
        self.astuce("Attends le jet du geyser pour monter", x0, max=0)
        return x0

    def ski(self, pentes=5, longueur=5, obstacles=("pics", "trou")):
        """Pente de ski : Max glisse tout seul vers la droite, on ne gère que les sauts."""
        x0 = self.x
        for i in range(pentes):
            self.plat(longueur)
            o = obstacles[i % len(obstacles)] if obstacles else None
            if o == "pics":
                self.pics(1); self.plat(2)
            elif o == "trou":
                self.fosse(2, "vide"); self.plat(2)
            if self.y + 2 < self.h - 1:
                self.descend(1)
        self.opts.setdefault("ski", []).append([x0, self.x - 1])
        self.astuce("Pente de ski ! Tu glisses tout seul : saute au bon moment", x0 - 1, max=0)
        self.plat(6)
        return x0

    def crevasse_cachee(self, n=10, trous=(2, 3, 6, 7)):
        """La neige cache des crevasses ; les traces des chèvres montrent le bon chemin."""
        x0 = self.x
        for i in range(n):
            if i in trous:
                c = self.colonne(fond="vide")
                self.cols[c][self.y + 1] = "x"
            else:
                c = self.colonne()
                self.opts.setdefault("traces", []).append([c, self.y])
        self.astuce("Suis les traces des chèvres…", x0 - 2, max=0)
        return x0

    # ---------- pièges ----------
    def effondrement(self, n=2, avance=2, delai=0, **kw):
        """Sol plat ; en arrivant, les n cases devant s'effondrent (fosse mortelle)."""
        x0 = self.plat(avance + n + 1)
        self.t([["collapse", x0 + avance, self.y + 1, n, self.h - self.y - 1, delai]], self.Z(x0), **kw)
        return x0

    def pics_surprise(self, n=2, avance=2, variante=None, **kw):
        """Pics qui jaillissent du sol : devant (classique), loin devant, ou derrière Max une fois passé."""
        noms = ["devant", "derriere", "loin"]
        if variante is None:
            variante = noms[VARIANTES["pics"] % 3]
            VARIANTES["pics"] += 1
        if variante == "derriere":
            x0 = self.plat(n + 4)
            self.t([["spikes", x0 + 1, self.y, n, 1], ["say", "Pas de retour possible, Max !"]], self.Z(x0 + n + 2), **kw)
            return x0
        if variante == "loin":
            avance = avance + 2
        x0 = self.plat(avance + n + 1)
        self.t([["spikes", x0 + avance, self.y, n, 1]], self.Z(x0), **kw)
        return x0

    def rocher(self, x, y, sens=1, vitesse=1.4, zone=None, **kw):
        self.t([["boulder", x, y, sens, vitesse], ["shake", 6]], zone or self.Z(x + 3 * sens), **kw)

    def dit(self, texte, x=None, **kw):
        self.t([["say", texte]], None if x is None else self.Z(x), **kw)

    def astuce(self, texte, x, **kw):
        self.t([["hint", texte]], self.Z(x), **kw)

    # ---------- fin ----------
    def fini(self):
        self._mur()
        w = len(self.cols)
        rows = ["".join(self.cols[x][y] for x in range(w)) for y in range(self.h)]
        marge = self.opts.pop("_timer", None)
        if marge:
            secondes = int(w * 16 / 1.8 / 60 * marge) + 6
            self.trig.insert(0, {"act": [["timer", secondes], ["say", f"J'ai allumé une mèche, Max ! Tu as {secondes} secondes. Ha ha !"]]})
        d = {"name": self.nom, "type": self.type, "ammo": self.ammo, "map": rows, "triggers": self.trig}
        d.update(self.opts)
        if self.defi:
            d["defi"] = True
        for k in ("movers", "crushers", "winds", "vines", "flames", "beams", "secrets", "glacons"):
            if getattr(self, k):
                d[k] = getattr(self, k)
        if self.liens:
            d["_liens"] = self.liens
        if self.monde:
            d["monde"] = self.monde
        if getattr(self, "_palette", None):
            d["palette"] = self._palette
        d["_tnt"] = self.tnt_besoin
        return d


def brut(nom, type_, rows, triggers, **opts):
    NUMERO[0] += 1
    if NUMERO[0] in DEFIS:
        opts["defi"] = True
    d = {"name": nom, "type": type_, "ammo": opts.pop("ammo", [6, 1]), "map": rows, "triggers": triggers}
    d.update(opts)
    d["_tnt"] = opts.get("_tnt", 0)
    return d


# =====================================================================
#  ACTE 1 — LA JUNGLE
# =====================================================================
def acte1():
    L = []
    L.append(brut("Le seuil", "exploration", [
        "##############################",
        "#.......................#....#",
        "#.......................#....#",
        "#.......................#....#",
        "#.......................#....#",
        "#.......................#....#",
        "#.......................#....#",
        "#.......................#....#",
        "#.......................#....#",
        "#.......................#....#",
        "#.......................#....#",
        "#.......................B....#",
        "#.......................B....#",
        "#.......................B....#",
        "#.......t...............B....#",
        "#.P...####^^####...s....B..D.#",
        "##############################",
    ], [
        {"max": 0, "act": [["say", "Ha ! Max ! Tu arrives trop tard : l'Œil de Jade sera à moi !"]]},
        {"min": 1, "act": [["say", "Déjà ? On n'a même pas commencé."]]},
        {"zone": [4, 1, 1, 15], "act": [["hint", "Saute par-dessus les pics"]]},
        {"zone": [9, 1, 1, 15], "act": [["hint", "Ramasse la dynamite"]]},
        {"zone": [15, 1, 1, 15], "act": [["hint", "Saute sur le serpent, ou assomme-le avec ta massue"]]},
        {"zone": [21, 1, 1, 15], "act": [["hint", "Pose la dynamite contre le mur fissuré, puis recule"]]},
    ], _tnt=1))
    L.append(brut("Le couloir honnête", "trahison", ["##############################"] * 11 + [
        "#............................#",
        "#............................#",
        "#............................#",
        "#............................#",
        "#.P.........................D#",
        "##############################",
    ], [
        {"max": 0, "act": [["say", "Un simple couloir. Rien de suspect."]]},
        {"min": 1, "max": 2, "act": [["say", "Tu reviens ? J'ai un peu changé la déco."]]},
        {"min": 3, "act": [["say", "Indice : la porte a peur de toi."]]},
        {"max": 0, "lethal": True, "zone": [8, 11, 1, 5], "act": [["collapse", 10, 16, 4, 1, 0]]},
        {"min": 1, "zone": [10, 11, 2, 5], "act": [["collapse", 13, 16, 3, 1, 0], ["say", "Pas la même blague deux fois."]]},
        {"zone": [22, 11, 1, 5], "act": [["door", 2, 15], ["say", "Oups. La porte avait froid aux pieds."]]},
    ]))
    L.append(brut("La salle des gardes", "exploration", [
        "##############################",
        "#........##..................#",
        "#........##..................#",
        "#........##..................#",
        "#.Pa.....##..................#",
        "#######..##..................#",
        "#........##..................#",
        "#............................#",
        "#........t.....m.............#",
        "#....################........#",
        "#............................#",
        "#....................#BBBB####",
        "#....................#....####",
        "#....................#....####",
        "#....................#....####",
        "#^^^^^^^^^^^^^^^^^^^^#..D.####",
        "##############################",
    ], [
        {"max": 0, "act": [["say", "Les momies de ce temple ne dorment jamais. Enfin, presque."]]},
        {"min": 2, "act": [["say", "Le toit de la porte a l'air fragile, non ?"]]},
        {"zone": [9, 8, 1, 1], "act": [["fall", 9, 6, 2, 1, 28], ["hint", "Ça tremble au-dessus…"]]},
        {"zone": [21, 1, 7, 10], "act": [["hint", "La porte est en dessous…"]]},
    ], _tnt=1))
    L.append(brut("La course", "action", [
        "##############################",
        "#............................#",
        "#............................#",
        "#............................#",
        "#..P.......^^................#",
        "##########################...#",
        "#............................#",
        "#............................#",
        "#............................#",
        "#............................#",
        "#...##########################",
        "#............................#",
        "#............................#",
        "#............................#",
        "#............................#",
        "#..........................D.#",
        "##############################",
    ], [
        {"max": 0, "act": [["say", "Tu aimes le sport ?"]]},
        {"min": 1, "act": [["spikes", 10, 9, 2, 1]]},
        {"min": 1, "max": 2, "act": [["say", "Cette fois, je te montre les pics. Je suis bon joueur."]]},
        {"min": 3, "act": [["say", "Je ralentis le rocher. Ne le dis à personne."]]},
        {"max": 2, "zone": [6, 1, 1, 4], "act": [["boulder", 1, 2, 1, 1.5], ["shake", 6]]},
        {"min": 3, "zone": [6, 1, 1, 4], "act": [["boulder", 1, 2, 1, 1.15], ["shake", 6]]},
        {"max": 0, "zone": [13, 6, 1, 4], "act": [["spikes", 10, 9, 2, 1]]},
        {"zone": [14, 11, 1, 5], "act": [["collapse", 17, 16, 2, 1, 16]]},
    ]))
    L.append(brut("La rencontre", "histoire", ["##############################"] + ["#............................#"] * 14 + [
        "#.P........................D.#",
        "##############################",
    ], [
        {"max": 0, "act": [["say", "Tu es arrivé jusqu'ici ? Impressionnant."]]},
        {"min": 1, "act": [["say", "Bon. Celle-là, c'était un piège. Mais c'est fini, juré."]]},
        {"max": 0, "zone": [7, 1, 1, 15], "act": [["say", "Professeur Archibald, pour te servir. Le trésor, c'est pour moi. Les pièges, c'est pour toi."]]},
        {"max": 0, "zone": [14, 1, 1, 15], "act": [["say", "Cette salle n'a aucun piège. Parole d'archéologue."]]},
        {"max": 0, "lethal": True, "zone": [19, 1, 1, 15], "act": [["collapse", 21, 16, 4, 1, 0]]},
        {"min": 1, "zone": [19, 1, 1, 15], "act": [["say", "…"]]},
        {"min": 1, "zone": [24, 1, 1, 15], "act": [["say", "Tu vois ? Je tiens parole. Parfois."]]},
    ], decor="pillars"))

    # 6 — ressorts
    n = Niveau("Les ressorts", "exploration", h=22)
    n.depart(4); n.dit("Les lianes ? Non, des ressorts. On fait avec ce qu'on a.", max=0)
    n.plat(2); n.astuce("Monte sur le ressort", n.x - 2)
    n.ressort(4); n.plat(5, ennemi="s")
    n.ressort(4); n.plat(3); n.fosse(2); n.plat(4, objet="a")
    n.descend(3); n.plat(3); n.pics(2); n.plat(3)
    n.plat(2); n.corde(5); n.porte(4)
    L.append(n.fini())

    # 7 — le pont
    n = Niveau("Le pont", "trahison", sol=11)
    n.depart(4); n.dit("Un joli pont. Il a l'air solide, non ?", max=0)
    x0 = n.pont("####xx####x####")
    n.dit("J'ai déplacé les fausses dalles. Bonne chance.", min=1)
    n.t([["set", x0 + 4, n.y + 1, 2, 1, "#"], ["set", x0 + 7, n.y + 1, 2, 1, "x"]], min=1)
    n.astuce("Une dalle qui tremble va tomber : ne t'arrête pas dessus", x0 + 1, min=2)
    n.plat(3); n.porte(4)
    L.append(n.fini())

    # 8 — les flèches
    n = Niveau("Les flèches", "exploration", ammo=(6, 0), arrowRate=100)
    n.depart(3); n.plat(4, objet="t"); n.astuce("Ramasse la dynamite, tu en auras besoin", n.x - 3)
    n.plat(6, ennemi="m"); n.fleches(7, 1); n.astuce("Flèche en bois : casse-la d'un coup de massue, ou rebondis dessus !", n.x - 6)
    n.plat(3); n.mur_fissure(); n.plat(3); n.porte(4)
    n.dit("Attention, j'ai investi dans l'archerie.", max=0)
    L.append(n.fini())

    # 9 — le toboggan
    n = Niveau("Le toboggan", "action", sol=6)
    n.depart(4); n.dit("Encore un rocher. J'en ai acheté un lot.", max=0)
    n.plat(8); n.rocher(1, 3, 1, 1.4, zone=n.Z(7))
    n.descend(2); n.plat(6); n.pics(2); n.plat(5)
    n.descend(2); n.plat(4); n.fosse(1, "vide"); n.plat(6)
    n.descend(2); n.effondrement(2, 3, 14); n.plat(5); n.porte(4)
    L.append(n.fini())

    # 10 — la statue
    n = Niveau("La statue", "histoire", decor="pillars")
    n.depart(4); n.dit("Fin de l'acte 1. Je t'ai préparé une petite fête.", max=0)
    n.dit("Encore toi ! Tu es tenace, mon petit Max.", min=1)
    n.plat(6); n.t([["invert", 300], ["say", "Cadeau : je t'inverse les commandes !"]], n.Z(n.x - 2))
    n.plat(3); n.pics(1); n.plat(6)
    n.dit("La crypte t'attend. Elle sent un peu le renfermé.", n.x - 2)
    n.porte(4)
    L.append(n.fini())
    return L


# =====================================================================
#  ACTE 2 — LA CRYPTE
# =====================================================================
def acte2():
    L = []
    n = Niveau("L'antichambre", "exploration", ammo=(4, 1))
    n.depart(4); n.dit("Bienvenue dans la crypte. Essuie tes pieds.", max=0)
    n.plat(6, ennemi="m"); n.monte(2); n.plat(5, objet="t"); n.mur_fissure()
    n.plat(3); n.descend(2); n.plat(6, ennemi="m"); n.fleches(6, 1); n.plat(3); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le faux mur", "trahison")
    n.depart(4); n.dit("Une porte, là, juste devant. Facile.", max=0)
    n.plat(10); n.pics_surprise(2, 2, max=0, lethal=True)
    n.plat(3); x = n.x
    n.plat(4)
    fx = n.faux_mur(2); n.plat(2)
    n.porte(3)
    # la porte commence devant le mur puis file se cacher derrière
    n.opts["doorStart"] = [x + 2, n.y]
    n.t([["door", n.porte_x, n.y], ["say", "Elle est partie se cacher. Elle est timide."]], n.Z(x))
    n.astuce("Les murs aussi peuvent mentir…", x + 2, min=1)
    L.append(n.fini())

    n = Niveau("Les sarcophages", "exploration", ammo=(3, 2))
    n.depart(4); n.dit("Toute une famille de momies. Saute-leur dessus, si tu l'oses.", max=0)
    n.plat(8, ennemi="mm"); n.monte(1); n.plat(6, ennemi="ms"); n.fosse(2)
    n.plat(6, ennemi="m", objet="a"); n.plat(3); n.descend(1); n.plat(3); n.mur_fissure(); n.plat(3); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le couloir des flèches", "action", arrowRate=125)
    n.depart(3); n.dit("Cours. Vraiment. Cours.", max=0)
    n.fleches(5, 1); n.plat(2)
    n.t([["collapse", 1, 16, 4, 1, 70], ["say", "Derrière toi, le sol s'en va."]], n.Z(n.x - 1))
    n.fleches(5, 1); n.pics(1); n.fleches(5, 1); n.plat(2); n.fleches(4, 1)
    n.plat(4); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le scribe", "histoire", decor="glyphs")
    n.depart(4); n.dit("Un scribe a gravé ici le chemin du trésor. Je l'ai un peu raturé.", max=0)
    n.plat(6); n.dit("Il a aussi gravé : « Archibald est un tricheur ». Calomnie !", n.x - 2)
    n.plat(8); n.dit("J'étais professeur, avant. Renvoyé pour « tricherie ». Pff.", n.x - 3)
    n.plat(4); x = n.x; n.porte(5)
    n.t([["door", n.porte_x + 1, n.y], ["say", "Pardon, réflexe."]], n.Z(x), max=0)
    L.append(n.fini())

    n = Niveau("Le puits", "exploration", h=22, sol=5, ammo=(6, 1), dark=True)
    n.depart(4); n.dit("Il faut descendre. Tout en bas. Comme ton moral.", max=0)
    n.plateformes([(2, 3, 2), (2, 3, 2), (1, 3, 2), (2, 4, 2)])
    n.plat(2); n.sol_fissure(3, 3); n.plat(5, ennemi="s"); n.porte(4)
    n.astuce("Le sol est fissuré : dynamite !", n.x - 12)
    L.append(n.fini())

    n = Niveau("Les dalles", "trahison", sol=11)
    n.depart(4); n.dit("Le sol de cette salle est… original.", max=0)
    a = n.pont("##x###xx###x##")
    n.t([["set", a + 2, n.y + 1, 1, 1, "#"], ["set", a + 4, n.y + 1, 1, 1, "x"]], min=1)
    n.dit("J'ai remélangé les dalles. Je m'ennuyais.", min=1)
    n.plat(2); n.pics_surprise(1, 2); n.plat(2)
    b = n.pont("###xx###")
    n.plat(2); n.porte(4)
    L.append(n.fini())

    n = Niveau("La chambre du serpent", "exploration", h=22, ammo=(8, 0))
    n.depart(3); n.dit("Ce sont des serpents. Pourquoi faut-il toujours des serpents ?", max=0)
    n.plat(6, ennemi="s"); n.ressort(4); n.plat(5, ennemi="s"); n.fosse(2)
    n.plat(6, ennemi="ss"); n.descend(4); n.plat(6, ennemi="s", objet="a"); n.pics(2); n.plat(3); n.porte(4)
    L.append(n.fini())

    n = Niveau("L'éboulement", "action")
    n.depart(3); n.dit("Le plafond est un peu fatigué aujourd'hui.", max=0)
    n.plafond_bas(26, chutes=[(4, 22), (8, 18), (12, 16), (15, 14), (19, 12), (22, 10)])
    n.plat(2); n.stalactites(10, 3)
    n.plat(3); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le pharaon déguisé", "histoire", decor="glyphs")
    n.depart(4); n.dit("Fin de l'acte 2. Le pharaon voulait te dire au revoir.", max=0)
    n.plat(6); n.dit("En fait, le pharaon, c'est moi avec un faux nez.", n.x - 2)
    n.plat(5); x = n.x; n.plat(6)
    n.t([["invert", 240], ["say", "Allez, une dernière pour la route."]], n.Z(x))
    n.pics(1); n.plat(4); n.porte(4)
    L.append(n.fini())
    return L


# =====================================================================
#  ACTE 3 — LES MINES
# =====================================================================
def acte3():
    L = []
    n = Niveau("Le puits de mine", "exploration", ammo=(5, 0))
    n.depart(4); n.dit("Les mines. Attention aux chauves-souris, elles mordent.", max=0)
    n.plat(8, ennemi="b"); n.monte(2); n.plat(6, ennemi="b"); n.fosse(2, "vide")
    n.plat(5, objet="t"); n.mur_fissure(); n.plat(6, ennemi="m"); n.plat(3, ennemi="b"); n.stalactite_marche(); n.plat(2); n.porte(4)
    L.append(n.fini())

    n = Niveau("Les étais", "trahison")
    n.depart(3); n.dit("Les étais sont neufs. Je les ai achetés d'occasion.", max=0)
    n.plafond_bas(10, chutes=[(6, 8)])
    n.t([["dark", 1], ["say", "Oups. J'ai soufflé les torches. Quelle maladresse !"]], n.Z(n.x - 2))
    n.effondrement(2, 2, 0, max=0, lethal=True)
    n.dit("La même ? Non, pas la même.", min=1)
    n.effondrement(2, 3, 10, min=1)
    n.plafond_bas(8, chutes=[(3, 12), (6, 6)])
    n.pics_surprise(2, 3); n.plat(3); n.stalactites(9, 3); n.plat(2); n.porte(4)
    L.append(n.fini())

    n = Niveau("Les chauves-souris", "exploration", ammo=(8, 1))
    n.depart(4); n.dit("Elles adorent les chapeaux. Surtout avec une tête dedans.", max=0)
    n.plateformes([(2, 4, 0), (2, 4, -1), (2, 3, 0), (3, 4, 1)], fond="vide")
    n.plat(6, ennemi="b"); n.plateformes([(2, 3, -1), (2, 3, 0), (2, 4, 1)], fond="vide")
    n.plat(3, ennemi="b"); n.plat(2); n.corde(5); n.porte(4)
    for x in range(len(n.cols)):
        pass
    L.append(n.fini())

    n = Niveau("La poursuite", "action", sol=5, h=20)
    n.depart(4); n.dit("Mon rocher a un nom : Gérard. Dis bonjour à Gérard.", max=0)
    n.plat(6); n.rocher(1, 2, 1, 1.5, zone=n.Z(6))
    n.descend(2); n.plat(5); n.fosse(1, "vide"); n.plat(4); n.pics(1); n.plat(4)
    n.descend(2); n.plat(5); n.fosse(1, "vide"); n.plat(5)
    n.descend(3); n.plat(4); n.pics(2); n.plat(4); n.descend(2)
    n.effondrement(2, 3, 12); n.plat(3); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le contremaître", "histoire", decor="beams")
    n.depart(4); n.dit("Il n'y a jamais eu de mineurs ici.", max=0)
    n.plat(7); n.dit("Juste moi, une pioche, et beaucoup trop de temps libre.", n.x - 3)
    n.plat(6); x = n.x; n.plat(4)
    n.t([["spikes", x + 2, n.y, 1, 1], ["say", "Oups, mon coude a glissé."]], n.Z(x))
    n.plat(4); n.porte(4)
    L.append(n.fini())

    n = Niveau("La dynamite", "exploration", ammo=(2, 3), sol=10)
    n.depart(4); n.dit("Trois bâtons de dynamite. Ne fais pas de bêtise. Fais-en plein.", max=0)
    n.plat(4, ennemi="m"); n.mur_fissure(); n.plat(4); n.sol_fissure(3, 3); n.plat(5, ennemi="s")
    n.mur_fissure(); n.plat(4); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le plafond bas", "trahison")
    n.depart(3); n.dit("Ne saute pas trop haut. Ou alors si. Je ne sais plus.", max=0)
    x = n.plafond_bas(6, hauteur=4); n.pics(1)
    n.t([["spikes", x + 7, n.y - 3, 4, 1, "v"]], [x + 4, 1, 3, n.h - 2], air=True)
    n.plafond_bas(6, hauteur=4); n.pics(2)
    n.plafond_bas(8, hauteur=4, pics_plafond=(2, 3, 6)); n.pics_surprise(1, 2)
    n.plat(2); n.stalactites(10, 3); n.plat(2); n.porte(4)
    L.append(n.fini())

    n = Niveau("Les ressorts fous", "exploration", h=24, ammo=(6, 1))
    n.depart(3); n.dit("Ressorts, chauves-souris, vide. Mon trio préféré.", max=0)
    n.plat(2); n.ressort(4); n.plat(3); n.ressort_pique(); n.fosse(2, "vide"); n.plat(2)
    n.ressort(4); n.plat(4, ennemi="b"); n.fosse(2, "vide"); n.plat(3, objet="a")
    n.ressort(4); n.plat(5, ennemi="m"); n.descend(6); n.plat(3); n.plat(2); n.corde(5); n.porte(4)
    L.append(n.fini())

    n = Niveau("Deux rochers", "action", sol=6)
    n.depart(4); n.dit("Gérard a un frère. Il s'appelle aussi Gérard.", max=0)
    n.plat(6); n.rocher(1, 3, 1, 1.4, zone=n.Z(6))
    n.descend(2); n.plat(8)
    x = n.x; n.fosse(2, "vide"); n.monte(1); n.plat(10)
    n.rocher(x + 9, n.y - 1, -1, 1.2, zone=n.Z(x - 3))
    n.dit("Il arrive par devant ! Ne bouge pas, il va tomber.", x - 3, max=1)
    n.descend(3); n.plat(5); n.fosse(1, "vide"); n.plat(4); n.porte(4)
    L.append(n.fini())

    n = Niveau("La galerie", "histoire", decor="beams")
    n.depart(4); n.dit("Fin de l'acte 3. Tu sens l'eau ? Ce sont les cascades.", max=0)
    n.plat(8); n.dit("Là-bas, j'ai inversé le sens de l'eau. Et parfois le tien.", n.x - 3)
    n.plat(6); x = n.x; n.plat(5)
    n.t([["door", 3, n.y], ["say", "La porte a eu peur du noir."]], n.Z(x), max=0)
    n.porte(4)
    L.append(n.fini())
    return L


# =====================================================================
#  ACTE 4 — LES CASCADES
# =====================================================================
def acte4():
    L = []
    n = Niveau("Le gué", "exploration", ammo=(6, 0))
    n.depart(4); n.dit("Ne tombe pas à l'eau. Il n'y a pas d'eau, mais ne tombe pas.", max=0)
    n.plateformes([(2, 3, 0), (3, 3, 0), (2, 2, -1), (3, 4, 1)], fond="vide")
    n.plat(6, ennemi="s", objet="a"); n.fantome(5); n.plat(3)
    n.plateformes([(3, 3, 0), (2, 3, -1), (3, 4, 0)], fond="vide")
    n.plat(4, ennemi="s"); n.plat(2); n.corde(5); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le miroir", "trahison")
    n.depart(4); n.dit("Ici, gauche et droite se disputent souvent.", max=0)
    n.plat(4); x = n.x; n.plat(3); n.pics(2)
    n.t([["invert", 200]], n.Z(x), max=0)
    n.t([["invert", 200], ["say", "Je préviens, cette fois : ça s'inverse."]], n.Z(x - 2), min=1)
    n.plat(5); x = n.x; n.plat(2); n.pics(2); n.plat(3)
    n.t([["invert", 150]], n.Z(x))
    n.plat(4); x = n.x; n.plat(3); n.fosse(2, "vide"); n.plat(3)
    n.t([["invert", 180]], n.Z(x))
    n.porte(4)
    L.append(n.fini())

    n = Niveau("Les marches", "exploration", arrowRate=90, ammo=(5, 1))
    n.depart(3); n.dit("Un escalier avec des flèches. L'architecte était un artiste.", max=0)
    n.fleches(5, 2); n.plat(4, ennemi="m"); n.fleches(4, 2); n.plat(5, objet="t")
    n.fleches(4, 2); n.plat(4, ennemi="s"); n.clignote(5); n.plat(2); n.mur_fissure(); n.plat(3); n.porte(4)
    L.append(n.fini())

    n = Niveau("La chute", "action", sol=4, h=22)
    n.depart(4); n.dit("Gérard est de retour. Il a fait du sport.", max=0)
    n.plat(6); n.rocher(1, 1, 1, 1.6, zone=n.Z(6))
    n.descend(2); n.effondrement(2, 3, 10); n.descend(2); n.plat(5); n.pics(2); n.plat(3)
    n.descend(3); n.plat(4); n.fosse(1, "vide"); n.plat(3); n.descend(2); n.pics_surprise(2, 3)
    n.plat(3); n.descend(2); n.plat(4); n.porte(4)
    L.append(n.fini())

    n = Niveau("L'écho", "histoire", decor="water")
    n.depart(4); n.dit("Écho… écho… écho…", max=0)
    n.plat(6); n.dit("Tu croyais que c'était l'écho ? C'était moi.", n.x - 3)
    n.plat(6); n.dit("Je fais aussi les bruits de pas derrière toi.", n.x - 3)
    n.plat(4); n.porte(4)
    L.append(n.fini())

    n = Niveau("Les piliers", "exploration", h=22, ammo=(6, 2), dark=True)
    n.depart(3); n.dit("Des piliers, du vide, et quelques chauves-souris pour l'ambiance.", max=0)
    n.plateformes([(2, 2, 0), (3, 2, 0), (2, 2, -1)], fond="vide")
    n.plat(2); n.ressort(4); n.plat(4, ennemi="b"); n.mur_fissure(); n.plat(3)
    n.plateformes([(3, 2, 0), (2, 2, 1), (3, 3, 0)], fond="vide")
    n.plat(4, ennemi="m"); n.mur_fissure(); n.plat(3); n.plat(2); n.corde(5); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le doute", "trahison", sol=11)
    n.depart(4); n.dit("Cette salle est parfaitement normale. Je te le jure sur ma tête.", max=0)
    n.pont("###x###")
    n.plat(3); n.effondrement(2, 2, 0, max=0, lethal=True); n.effondrement(2, 3, 12, min=1)
    n.plat(2); x = n.x; n.plat(6)
    fx = n.faux_mur(1); n.plat(2); n.porte(3)
    n.opts["doorStart"] = [x + 4, n.y]
    n.t([["door", n.porte_x, n.y], ["invert", 120], ["say", "Où est la porte ? Où est la droite ?"]], n.Z(x))
    L.append(n.fini())

    n = Niveau("La cascade", "action", sol=5, h=20, arrowRate=80)
    n.depart(4); n.dit("Gérard a appris à nager. Enfin, à rouler mouillé.", max=0)
    n.plat(6); n.rocher(1, 2, 1, 1.5, zone=n.Z(6))
    n.descend(2); n.plat(6, ennemi="b"); n.fosse(1, "vide"); n.plat(4)
    n.descend(2); n.plat(5); n.pics(2); n.plat(4, ennemi="b"); n.descend(3)
    n.effondrement(2, 3, 10); n.plat(4); n.porte(4)
    L.append(n.fini())

    n = Niveau("Les gardiens", "exploration", ammo=(6, 2))
    n.depart(4); n.dit("J'ai réveillé les gardiens du temple. Ils sont nuls, mais nombreux.", max=0)
    n.plat(8, ennemi="mm"); n.fosse(2); n.plat(6, ennemi="ss", objet="a"); n.monte(2)
    n.plat(6, ennemi="mb"); n.mur_fissure(); n.plat(5, ennemi="ms"); n.descend(2); n.plat(6, ennemi="mm", objet="t")
    n.mur_fissure(); n.plat(3); n.stalactites(9, 3); n.plat(2); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le seuil du trésor", "histoire", decor="water")
    n.depart(4); n.dit("Fin de l'acte 4. Derrière cette porte, le sanctuaire de l'Œil de Jade.", max=0)
    n.plat(8); n.dit("Personne n'est jamais allé aussi loin. À part moi. Et Gérard.", n.x - 3)
    n.plat(5); x = n.x; n.plat(4)
    n.t([["spikes", x + 2, n.y, 2, 1], ["say", "Ah non, pas ça ! Bon, saute."]], n.Z(x))
    n.plat(4); n.porte(4)
    L.append(n.fini())
    return L


# =====================================================================
#  ACTE 5 — LE SANCTUAIRE
# =====================================================================
def acte5():
    L = []
    n = Niveau("L'entrée sacrée", "exploration", ammo=(6, 2), arrowRate=90)
    n.depart(4); n.dit("Le sanctuaire ! Enlève ton chapeau. Non, garde-le, il est ridicule.", max=0)
    n.plat(6, ennemi="m"); n.fleches(5, 1); n.fosse(2); n.plat(4, ennemi="b")
    n.ressort(4); n.plat(5, objet="t"); n.mur_fissure(); n.descend(3); n.plat(5, ennemi="ms")
    n.pics(2); n.plat(3); n.porte(4)
    L.append(n.fini())

    n = Niveau("Archibald s'amuse", "trahison")
    n.depart(4); n.dit("Je vais déplacer la porte. Plusieurs fois. Parce que je peux.", max=0)
    n.plat(6); x1 = n.x; n.plat(4); n.pics(2); n.plat(6); x2 = n.x; n.plat(5); n.fosse(2, "vide"); n.plat(4); x3 = n.x
    n.porte(4)
    n.t([["door", 3, n.y], ["say", "Hop ! Derrière toi."]], n.Z(x3 - 2))
    n.t([["door", x2 + 1, n.y], ["say", "Non, en fait, là."]], n.Z(5))
    n.t([["door", n.porte_x, n.y], ["say", "Bon, d'accord, tout au bout."]], n.Z(x2 - 1))
    n.t([["spikes", x1 + 1, n.y, 1, 1]], n.Z(x1 - 1), max=0)
    L.append(n.fini())

    n = Niveau("Les épreuves", "exploration", h=22, sol=12, ammo=(6, 2), arrowRate=85)
    n.depart(3); n.dit("Trois épreuves : sauter, assommer, exploser. Comme un mardi.", max=0)
    n.plateformes([(2, 3, 0), (3, 3, -1), (2, 3, 0)])
    n.plat(5, ennemi="m"); n.fleches(5, 2); n.plat(4, ennemi="b"); n.ressort(4); n.plat(5, objet="t")
    n.t([["dark", 1], ["say", "Et si on éteignait la lumière ? Ha ha !"]], n.Z(n.x - 2))
    n.mur_fissure(); n.plat(3); n.sol_fissure(3, 3); n.plat(5, ennemi="ss"); n.plat(2); n.corde(5); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le grand rocher", "action", sol=4, h=22)
    n.depart(4); n.dit("Je te présente la maman de Gérard.", max=0)
    n.plat(6); n.rocher(1, 1, 1, 1.65, zone=n.Z(6))
    n.descend(2); n.plat(5); n.fosse(1, "vide"); n.plat(4); n.pics(2); n.plat(3)
    n.descend(2); n.effondrement(2, 2, 8); n.plat(3); n.descend(3); n.plat(4, ennemi="b"); n.fosse(1, "vide")
    n.plat(4); n.descend(2); n.pics_surprise(2, 3); n.plat(3); n.descend(2); n.plat(4); n.porte(4)
    L.append(n.fini())

    n = Niveau("La confidence", "histoire", decor="pillars")
    n.depart(4); n.dit("Je peux te dire un secret ?", max=0)
    n.plat(6); n.dit("Je n'ai jamais rien trouvé tout seul. Toujours en suivant quelqu'un.", n.x - 3)
    n.plat(6); n.dit("Alors cette fois, je voulais être le premier. Quitte à tricher un peu.", n.x - 3)
    n.plat(5); n.dit("Beaucoup.", n.x - 2)
    n.plat(4); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le labyrinthe", "exploration", h=22, sol=6, ammo=(4, 3), dark=True)
    n.depart(4); n.dit("Un labyrinthe. Si tu te perds, c'est normal. C'est fait pour.", max=0)
    n.plat(4, ennemi="m"); n.sol_fissure(3, 4); n.plat(5, ennemi="s"); n.faux_mur(1); n.plat(4, objet="t")
    n.sol_fissure(3, 4); n.plat(4, ennemi="b"); n.mur_fissure(); n.plat(4); n.porte(4)
    n.astuce("Certains murs ne sont que des illusions", 12, min=2)
    L.append(n.fini())

    n = Niveau("Tout est faux", "trahison", sol=11)
    n.depart(4); n.dit("Dans cette salle, tout est faux. Même cette phrase.", max=0)
    n.pont("##x##x#")
    n.effondrement(2, 2, 0, max=0, lethal=True); n.effondrement(2, 3, 10, min=1)
    n.plat(2); x = n.x; n.plat(4); n.t([["invert", 150]], n.Z(x))
    n.pics(2); n.plat(3); n.pont("#xx##"); n.plat(2); x = n.x; n.plat(5)
    n.faux_mur(1); n.plat(2); n.stalactites(9, 3); n.plat(2); n.porte(3)
    n.opts["doorStart"] = [x + 3, n.y]
    n.t([["door", n.porte_x, n.y], ["say", "La porte aussi était fausse. Enfin, ailleurs."]], n.Z(x))
    L.append(n.fini())

    n = Niveau("L'armée", "exploration", ammo=(8, 2), arrowRate=80)
    n.depart(4); n.dit("Tous les gardiens du temple sont là. Ils ont mis leurs plus beaux bandages.", max=0)
    n.plat(8, ennemi="mms"); n.fleches(5, 1); n.plat(6, ennemi="bm", objet="a"); n.fosse(2)
    n.plat(7, ennemi="smm"); n.mur_fissure(); n.plat(6, ennemi="bs", objet="a"); n.fleches(5, 1)
    n.plat(5, ennemi="mm"); n.porte(4)
    L.append(n.fini())

    n = Niveau("La fuite", "action", sol=3, h=24, arrowRate=90)
    n.depart(4); n.dit("Toute la famille Gérard est venue te dire au revoir.", max=0)
    n.plat(6); n.rocher(1, 1, 1, 1.6, zone=n.Z(6))
    n.descend(2); n.plat(5, ennemi="b"); n.fosse(1, "vide"); n.plat(4); n.pics(2); n.plat(3)
    n.descend(3); n.effondrement(2, 2, 8); n.plat(3); n.descend(2); n.plafond_bas(8, chutes=[(4, 6)])
    n.descend(2); n.plat(4); n.fosse(1, "vide"); n.plat(4); n.pics_surprise(2, 3)
    n.descend(3); n.plat(5); n.porte(4)
    L.append(n.fini())

    # 50 — finale : détruire les trois idoles pour faire apparaître la porte
    n = Niveau("Le faux Œil", "histoire", ammo=(6, 3), decor="eye", doorHidden=True)
    n.depart(4); n.dit("Le coffre de l'Œil de Jade est fermé par trois sceaux de pierre.", max=0)
    n.dit("J'ai oublié ma dynamite. Toi, non ? Zut, zut et zut.", 6)
    n.plat(6); i1 = n.mur_fissure(1); n.plat(3, objet="t"); n.fosse(2)
    n.plat(5, ennemi="m"); i2 = n.mur_fissure(1); n.plat(4); n.pics(1); n.plat(3, objet="t")
    n.plat(4, ennemi="b"); i3 = n.mur_fissure(1); n.plat(4); n.porte(4)
    n.t([["showdoor"], ["say", "L'Œil de Jade… en plâtre ?! C'est un FAUX ! Le vrai est plus bas. Rendez-vous en bas, Max !"], ["shake", 10]], allB=True)
    L.append(n.fini())
    return L


# =====================================================================
#  Outils pour les actes 6 à 10
# =====================================================================
def grimpe(n, marches=6, ressorts=(), ennemis=()):
    """Montée en escalier vers la droite (pour fuir l'eau, le sable ou la lave)."""
    for i in range(marches):
        if i in ressorts:
            n.ressort(4); n.plat(3)
        else:
            n.monte(2); n.plat(3, ennemi=("b" if i in ennemis else None))


def miroir(nom, type_, pics_reflet, pics_max=(), largeur=40, dits=()):
    """Max en haut ; sous la surface de l'eau, son reflet à l'envers.
    Quand Max saute, le reflet plonge vers les pics du bas : il faut sauter par-dessus
    ses propres pics sans planter son reflet dans les siens (les petits sauts passent)."""
    NUMERO[0] += 1
    h = 12
    rows = [["#"] * largeur for _ in range(h)]
    for y in list(range(1, 6)) + list(range(7, 10)):
        for x in range(1, largeur - 1):
            rows[y][x] = "."
    rows[5][2] = "P"; rows[5][largeur - 3] = "D"
    for x in pics_reflet:
        rows[9][x] = "^"
    for x in pics_max:
        rows[5][x] = "^"
    trig = [{"act": [["say", t]]} if i == 0 else {"zone": [z, 1, 1, h - 2], "act": [["say", t]]} for i, (z, t) in enumerate(dits)]
    trig.append({"zone": [4, 1, 1, h - 2], "max": 0, "act": [["hint", "Si tu sautes trop haut, ton reflet plonge dans ses pics !"]]})
    d = {"name": nom, "type": type_, "ammo": [6, 0], "map": ["".join(r) for r in rows], "triggers": trig, "mirror": 6.5, "decor": "water", "_tnt": 0}
    if NUMERO[0] in DEFIS:
        d["defi"] = True
    return d


# =====================================================================
#  ACTE 6 — LES CATACOMBES
# =====================================================================
def acte6():
    L = []
    n = Niveau("Les ossements", "exploration", ammo=(6, 1))
    n.depart(4); n.dit("Bienvenue dans les catacombes, Max. Les anciens locataires sont restés.", max=0)
    n.plat(6, ennemi="m"); n.leviers(); n.plat(3); n.ecraseurs(10, 2); n.plat(5, ennemi="m"); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le plafond qui descend", "trahison")
    n.depart(4); n.crue("plafond", 0.12, "J'ai trouvé un levier « plafond ». Je l'ai tiré. Pour voir.")
    n.plat(6); n.pics(2); n.plat(5); n.fosse(2, "vide"); n.plat(4); n.effondrement(2, 2, 10)
    n.plat(4); n.pics(1); n.plat(4); n.porte(4)
    L.append(n.fini())

    n = Niveau("La crypte aux leviers", "exploration", ammo=(6, 2), sol=10)
    n.depart(4); n.dit("Des dalles, des grilles. Choisis bien. Ou pas, ça m'amuse aussi.", max=0)
    n.leviers(); n.plat(4, ennemi="s"); n.sol_fissure(3, 3); n.plat(3, objet="t"); n.leviers(); n.plat(3); n.porte(4)
    L.append(n.fini())

    n = Niveau("Les pilons", "action", sol=6)
    n.depart(4); n.dit("Gérard est revenu. Et il a des amis qui tapent fort.", max=0)
    n.plat(6); n.rocher(1, 3, 1, 1.4, zone=n.Z(6))
    n.descend(2); n.plat(3); n.ecraseurs(10, 3); n.descend(2); n.plat(4); n.fosse(1, "vide"); n.plat(3)
    n.ecraseurs(9, 3); n.plat(3); n.porte(4)
    L.append(n.fini())

    n = Niveau("L'ossuaire", "histoire", dark=True, decor="glyphs")
    n.depart(4); n.dit("Max, je vais te dire un secret : le faux Œil, c'est moi qui l'avais acheté au marché.", max=0)
    n.plat(8); n.dit("Je voulais te faire croire que j'avais gagné. Raté.", n.x - 3)
    n.plat(8); n.dit("Le vrai est au fond du temple. Et j'y serai avant toi !", n.x - 3)
    n.plat(4); n.porte(4)
    L.append(n.fini())

    n = Niveau("Les gardiens de pierre", "exploration", h=22, ammo=(6, 1))
    n.depart(3); n.dit("Des momies, des pilons, des ressorts. Une journée normale.", max=0)
    n.plat(5, ennemi="m"); n.ecraseurs(9, 2); n.ressort(4); n.plat(5, ennemi="mm"); n.ecraseurs(10, 3)
    n.descend(4); n.plat(5, ennemi="s", objet="a"); n.plat(2); n.corde(5); n.porte(4)
    L.append(n.fini())

    n = Niveau("La dalle de trop", "trahison", sol=11)
    n.depart(4); n.dit("Ici, chaque dalle a une personnalité. Certaines sont méchantes.", max=0)
    n.leviers(); n.pont("##x##x###"); n.plat(2); n.pics_surprise(2, 2); n.leviers(); n.plat(2); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le couloir sombre", "exploration", dark=True, ammo=(6, 1))
    n.depart(4); n.dit("Il fait noir. Tu entends ce battement d'ailes ? Moi non plus.", max=0)
    n.plat(8, ennemi="b"); n.ecraseurs(10, 3); n.plat(6, ennemi="mb"); n.fosse(2, "vide"); n.plat(5, ennemi="b"); n.stalactites(10, 3); n.plat(2); n.porte(4)
    L.append(n.fini())

    n = Niveau("La fuite des catacombes", "action")
    n.depart(3); n.crue("plafond", 0.18, "Le plafond tombe ! Cours, Max, cours !")
    n.plat(4); n.sprint(); n.plat(3); n.pics(2); n.plat(3); n.fosse(3, "vide"); n.plat(3); n.ecraseurs(9, 2); n.plat(2); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le passage secret", "histoire")
    n.depart(4); n.dit("Fin des catacombes. Il y a un passage secret par ici… je ne te dirai pas où.", max=0)
    n.plat(8); x = n.x; n.plat(4); n.faux_mur(2); n.plat(3); n.porte(3)
    n.dit("Tu l'as trouvé ? Bon. La cité engloutie t'attend. Prends un maillot.", x)
    L.append(n.fini())
    return L


# =====================================================================
#  ACTE 7 — LA CITÉ ENGLOUTIE
# =====================================================================
def acte7():
    L = []
    n = Niveau("Les quais", "exploration", ammo=(6, 0))
    n.depart(4); n.dit("La cité engloutie ! Attention, ça glisse. Moi, j'ai des semelles spéciales.", max=0)
    n.plat(3); n.glissant(6); n.plat(4, ennemi="s"); n.mobile(6, 1.0); n.plat(4, objet="a"); n.glissant(5); n.porte(4)
    L.append(n.fini())

    n = Niveau("La marée", "trahison", h=26, sol=24)
    n.depart(4); n.crue("eau", 0.15, "Oups, j'ai ouvert les vannes. L'eau monte, Max !")
    grimpe(n, 7, ressorts=(3,)); n.plat(2); n.porte(4)
    L.append(n.fini())

    n = Niveau("Les canaux", "exploration", h=22, ammo=(6, 1))
    n.depart(4); n.dit("Des canaux, des barques… enfin, des planches. Ça flotte, je crois.", max=0)
    n.mobile(6, 0.9); n.plat(4, ennemi="s"); n.ascenseur(4); n.plat(4); n.glissant(5); n.plat(3, ennemi="m"); n.stalactite_marche(); n.plat(2); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le grand déluge", "action", h=26, sol=24)
    n.depart(4); n.crue("eau", 0.22, "Tout le lac arrive ! Nage, Max ! Enfin, grimpe !")
    grimpe(n, 8, ressorts=(2, 5), ennemis=(4,)); n.plat(2); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le palais noyé", "histoire", decor="water")
    n.depart(4); n.dit("Ce palais était magnifique, avant que je casse la digue.", max=0)
    n.plat(8); n.dit("Bon, d'accord, la digue était déjà fissurée. J'ai juste soufflé dessus.", n.x - 3)
    n.plat(6); n.glissant(4); n.porte(4)
    L.append(n.fini())

    n = Niveau("Les écluses", "exploration", h=22, ammo=(6, 1))
    n.depart(4); n.dit("Une écluse, ça s'ouvre avec la bonne dalle. La bonne… ou l'autre.", max=0)
    n.leviers(); n.mobile(7, 1.1); n.plat(3, ennemi="s"); n.ascenseur(4, 1.0); n.plat(4, ennemi="b"); n.stalactites(9, 3); n.plat(2); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le pont flottant", "trahison")
    n.depart(4); n.dit("Un pont flottant. Il flotte. Parfois.", max=0)
    n.mobile(7, 1.2); n.plat(3); n.fantome(5); n.plat(3); n.clignote(5); n.plat(3); n.porte(4)
    L.append(n.fini())

    n = Niveau("Les monte-charges", "exploration", h=26, sol=24, ammo=(6, 0))
    n.depart(4); n.dit("Trois monte-charges. Un seul a été entretenu. Je ne sais plus lequel.", max=0)
    n.ascenseur(5); n.plat(4, ennemi="b"); n.ascenseur(5, 1.1); n.plat(4, ennemi="s"); n.ascenseur(5, 1.2); n.plat(4); n.plat(2); n.corde(5); n.porte(4)
    L.append(n.fini())

    n = Niveau("La vague", "action", h=26, sol=24)
    n.depart(4); n.crue("eau", 0.28, "La vague ! LA VAGUE ! Ha ha ha !")
    grimpe(n, 7, ressorts=(1, 4)); n.plat(2); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le temple immergé", "histoire", decor="water")
    n.depart(4); n.dit("Fin de la cité engloutie. Tu es trempé, Max. Moi, je suis sec. Le secret ? Je triche.", max=0)
    n.plat(8); n.dit("Prochaine étape : le volcan. Tu vas sécher très vite.", n.x - 3)
    n.plat(5); n.porte(4)
    L.append(n.fini())
    return L


# =====================================================================
#  ACTE 8 — LE VOLCAN
# =====================================================================
def acte8():
    L = []
    n = Niveau("Les cendres", "exploration", ammo=(6, 1))
    n.depart(4); n.dit("Le volcan ! Il fait un peu chaud. Enlève ta veste. Non, garde-la.", max=0)
    n.plat(4); n.mobile(6, 1.0); n.plat(4, ennemi="s"); n.ecraseurs(9, 2); n.plat(2); n.stalactites(9, 3); n.plat(2); n.porte(4)
    L.append(n.fini())

    n = Niveau("La coulée", "trahison", h=26, sol=24)
    n.depart(4); n.crue("lave", 0.17, "Ce n'est pas de l'eau, cette fois. C'est de la lave. Bonne chance !")
    grimpe(n, 7, ressorts=(3,), ennemis=(5,)); n.plat(2); n.porte(4)
    L.append(n.fini())

    n = Niveau("La forge", "exploration", arrowRate=80, ammo=(6, 1))
    n.depart(4); n.dit("La forge des anciens. Les marteaux marchent encore. Très bien, même.", max=0)
    n.ecraseurs(10, 3); n.fleches(5, 1); n.plat(3, ennemi="m"); n.ecraseurs(12, 4); n.plat(3); n.porte(4)
    L.append(n.fini())

    n = Niveau("La mèche", "action")
    n.depart(3); n.minuterie(1.7)
    n.plat(3); n.sprint(); n.plat(3); n.pics(2); n.plat(3); n.fosse(3, "vide"); n.plat(3); n.pics(1); n.plat(4); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le cœur du volcan", "histoire", decor="eye")
    n.depart(4); n.dit("Le cœur du volcan. On l'entend battre. Ou c'est le tien ?", max=0)
    n.plat(8); n.dit("Tu sais, Max, tu me rappelles moi, jeune. En moins tricheur.", n.x - 3)
    n.plat(5); n.porte(4)
    L.append(n.fini())

    n = Niveau("Les cheminées", "exploration", h=26, sol=24, ammo=(6, 0))
    n.depart(4); n.crue("lave", 0.10, "La lave monte doucement. Prends ton temps. Enfin, pas trop.")
    n.ascenseur(5); n.plat(3, ennemi="b"); n.ressort(4); n.plat(3); n.ascenseur(5, 1.1); n.plat(3); n.ressort(4); n.plat(3); n.plat(2); n.corde(5); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le sol brûlant", "trahison", sol=11)
    n.depart(4); n.dit("Le sol est brûlant. Les dalles sont fausses. Le reste est vrai. Peut-être.", max=0)
    n.pont("###xx##x###"); n.plat(2); n.stalactites(9, 3); n.pics_surprise(2, 2); n.plat(3); n.porte(4)
    L.append(n.fini())

    n = Niveau("Les pistons", "exploration", ammo=(6, 1))
    n.depart(4); n.dit("Pistons, grilles, dalles. Le volcan est très bien équipé.", max=0)
    n.ecraseurs(10, 3); n.leviers(); n.ecraseurs(12, 4, 3); n.plat(3, ennemi="m"); n.stalactites(9, 3); n.plat(2); n.porte(4)
    L.append(n.fini())

    n = Niveau("L'éruption", "action", h=26, sol=24)
    n.depart(4); n.crue("lave", 0.26, "ÉRUPTION ! Ce n'est pas moi, cette fois. Promis. Enfin, un peu.")
    grimpe(n, 8, ressorts=(2, 6), ennemis=(4,)); n.plat(2); n.porte(4)
    L.append(n.fini())

    n = Niveau("La sortie de lave", "histoire")
    n.depart(4); n.dit("Fin du volcan. Tu as survécu ? Mince.", max=0)
    n.plat(8); n.dit("Les jardins suspendus sont juste au-dessus. Il y a du vent. Beaucoup.", n.x - 3)
    n.plat(5); n.porte(4)
    L.append(n.fini())
    return L


# =====================================================================
#  ACTE 9 — LES JARDINS SUSPENDUS
# =====================================================================
def acte9():
    L = []
    n = Niveau("Les terrasses", "exploration", ammo=(6, 0))
    n.depart(4); n.dit("Les jardins suspendus ! Ne regarde pas en bas. Moi, je regarde, c'est drôle.", max=0)
    n.vent(((2, 3, 0), (2, 3, 0), (2, 4, 0)), 0.35); n.plat(3, ennemi="s"); n.mobile(6, 1.0); n.plat(4, objet="a"); n.plat(2); n.corde(5); n.porte(4)
    L.append(n.fini())

    L.append(miroir("Le miroir d'eau", "trahison", pics_reflet=(8, 9, 16, 24, 25, 31), pics_max=(12, 20, 28), dits=((0, "Voici ton reflet, Max. S'il se pique, tu perds. C'est la règle. Ma règle."),)))

    n = Niveau("Les ponts de lianes", "exploration", ammo=(6, 0))
    n.depart(4); n.dit("Des ponts de lianes. Enfin, ce qu'il en reste.", max=0)
    n.vent(((2, 3, 0), (2, 3, -1), (2, 3, 1)), -0.4); n.plat(3, ennemi="b"); n.clignote(5); n.plat(3); n.fantome(5); n.plat(3); n.porte(4)
    L.append(n.fini())

    n = Niveau("La tempête", "action", sol=6)
    n.depart(4); n.dit("La tempête ET Gérard. Quelle belle journée !", max=0)
    n.plat(6); n.rocher(1, 3, 1, 1.5, zone=n.Z(6))
    x = n.x; n.descend(2); n.plat(6); n.pics(2); n.plat(5); n.descend(2); n.plat(4); n.fosse(1, "vide"); n.plat(5)
    n.winds.append([x, n.x - 1, 0.35])
    n.descend(2); n.effondrement(2, 3, 10); n.plat(4); n.porte(4)
    L.append(n.fini())

    n = Niveau("La fontaine", "histoire", decor="water")
    n.depart(4); n.dit("Une fontaine magique. On dit qu'elle exauce les vœux.", max=0)
    n.plat(8); n.dit("J'ai souhaité que tu tombes. Ça marche souvent.", n.x - 3)
    n.plat(5); n.porte(4)
    L.append(n.fini())

    L.append(miroir("Le double", "exploration", pics_reflet=(6, 7, 13, 14, 15, 22, 27, 28, 35), pics_max=(10, 18, 24, 31, 32), largeur=42, dits=((0, "Ton reflet est revenu. Et toi aussi tu as des pics, maintenant."),)))

    n = Niveau("Les nuages", "trahison")
    n.depart(4); n.dit("On marche sur les nuages ici. Enfin, sur ce qu'on croit être des nuages.", max=0)
    n.fantome(5); n.plat(3); n.clignote(6); n.plat(3); n.vent(((2, 3, 0), (3, 3, 0)), -0.4); n.plat(3); n.porte(4)
    L.append(n.fini())

    n = Niveau("Les balançoires", "exploration", ammo=(6, 0))
    n.depart(4); n.dit("Des planches qui se balancent. Comme ma morale.", max=0)
    n.mobile(6, 1.0); n.plat(3, ennemi="b"); n.mobile(7, 1.2); n.plat(3, ennemi="s"); n.mobile(7, 1.4); n.plat(3); n.porte(4)
    L.append(n.fini())

    n = Niveau("La grande bourrasque", "action")
    n.depart(3); n.minuterie(1.9)
    n.vent(((2, 3, 0), (2, 3, 0), (2, 3, 0), (2, 4, 0)), -0.45); n.plat(3); n.pics(2); n.plat(3)
    n.vent(((2, 3, 0), (2, 3, 0)), 0.5); n.plat(3); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le belvédère", "histoire", decor="pillars")
    n.depart(4); n.dit("Fin des jardins. D'ici, on voit la chambre du trésor.", max=0)
    n.plat(8); n.dit("Dernière ligne droite, Max. Que le meilleur tricheur gagne !", n.x - 3)
    n.plat(5); n.porte(4)
    L.append(n.fini())
    return L


# =====================================================================
#  ACTE 10 — LA CHAMBRE DU TRÉSOR
# =====================================================================
def acte10():
    L = []
    n = Niveau("Les gardiens d'or", "exploration", ammo=(6, 2))
    n.depart(4); n.dit("Les derniers gardiens. Ils sont en or. Enfin, plaqués or.", max=0)
    n.plat(6, ennemi="mm"); n.leviers(); n.ecraseurs(10, 3); n.plat(5, ennemi="ms"); n.mur_fissure(); n.plat(3); n.stalactite_marche(); n.plat(2); n.porte(4)
    L.append(n.fini())

    L.append(miroir("Le miroir d'or", "trahison", pics_reflet=(5, 6, 11, 12, 16, 22, 23, 29, 34, 35), pics_max=(8, 14, 19, 26, 31, 37), largeur=42, dits=((0, "Le miroir d'or. Ton reflet est plus beau que toi. Et plus prudent, j'espère."),)))

    n = Niveau("L'escalier sans fin", "exploration", h=28, sol=26, ammo=(6, 0))
    n.depart(4); n.crue("sable", 0.14, "Du sable ! Le sablier géant s'est renversé. Grimpe !")
    n.ascenseur(5); n.plat(3, ennemi="b"); n.ressort(4); n.plat(3); n.ascenseur(5, 1.1); n.plat(3); grimpe(n, 3); n.plat(2); n.plat(2); n.corde(5); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le sablier", "action", h=26, sol=24)
    n.depart(4); n.crue("sable", 0.22, "Le sablier est retourné. Il te reste… pas beaucoup de sable.")
    n.minuterie(3.2)
    grimpe(n, 8, ressorts=(3, 6), ennemis=(1, 5)); n.plat(2); n.porte(4)
    L.append(n.fini())

    n = Niveau("Les aveux", "histoire", decor="eye")
    n.depart(4); n.dit("Max… je vais t'avouer quelque chose.", max=0)
    n.plat(6); n.dit("Je n'ai jamais voulu l'Œil pour l'argent. Je voulais qu'on parle de moi dans les livres.", n.x - 3)
    n.plat(6); n.dit("Mais bon, je vais quand même essayer de te battre. Par principe.", n.x - 3)
    n.plat(4); n.porte(4)
    L.append(n.fini())

    n = Niveau("Tous les pièges", "exploration", h=22, ammo=(6, 2), arrowRate=80)
    n.depart(4); n.dit("J'ai rassemblé tous mes pièges préférés. C'est mon album souvenir.", max=0)
    n.glissant(5); n.mobile(6, 1.2); n.plat(3); n.ecraseurs(9, 2); n.leviers(); n.fleches(5, 1); n.clignote(5); n.plat(3)
    n.ressort_pique(); n.plat(3, ennemi="m"); n.plat(2); n.corde(5); n.porte(4)
    L.append(n.fini())

    n = Niveau("La dernière trahison", "trahison")
    n.depart(4); n.dit("Pour la dernière trahison, j'ai mis le paquet.", max=0)
    n.leviers(); x = n.x; n.plat(4); n.t([["invert", 220], ["say", "Gauche, droite… tout se mélange !"]], n.Z(x))
    n.pics(2); n.plat(4); x2 = n.x; n.plat(6); n.fosse(2, "vide"); n.plat(4)
    n.porte(4)
    n.t([["door", 3, n.y], ["say", "La porte retourne au début. Je plaisante. Ou pas."]], n.Z(x2))
    n.t([["door", n.porte_x, n.y], ["say", "Bon, d'accord, elle est revenue."]], n.Z(4))
    L.append(n.fini())

    n = Niveau("Le labyrinthe d'or", "exploration", h=22, sol=6, ammo=(4, 3), dark=True)
    n.depart(4); n.dit("Un labyrinthe dans le noir. Je t'ai laissé une lampe. Elle est éteinte.", max=0)
    n.plat(4, ennemi="m"); n.sol_fissure(3, 4); n.plat(4, ennemi="b"); n.faux_mur(1); n.plat(4, objet="t"); n.ecraseurs(9, 2)
    n.sol_fissure(3, 4); n.plat(4, ennemi="s"); n.stalactites(9, 3); n.plat(2); n.porte(4)
    L.append(n.fini())

    n = Niveau("La course finale", "action", sol=5, h=24)
    n.depart(4); n.dit("La course finale ! Gérard, le plafond et moi, on est tous là.", max=0)
    n.plat(6); n.rocher(1, 2, 1, 1.6, zone=n.Z(6)); n.crue("plafond", 0.06)
    n.descend(2); n.plat(5); n.fosse(1, "vide"); n.plat(4); n.pics(2); n.plat(3); n.descend(3); n.ecraseurs(9, 2)
    n.descend(2); n.effondrement(2, 2, 8); n.plat(3); n.descend(2); n.plat(4); n.porte(4)
    L.append(n.fini())

    # 100 — finale : briser les quatre sceaux du coffre de l'Œil de Jade
    n = Niveau("L'Œil de Jade", "histoire", ammo=(6, 2), decor="eye", doorHidden=True)
    n.depart(4); n.dit("Le vrai coffre de l'Œil de Jade ! Quatre sceaux. Et cette fois, j'ai ma dynamite !", max=0)
    n.dit("… Elle est mouillée. Depuis la cité engloutie. Zut.", 6)
    n.plat(6); n.mur_fissure(1); n.plat(3, objet="t"); n.ecraseurs(8, 2); n.mur_fissure(1); n.plat(3, ennemi="m")
    n.leviers(); n.mur_fissure(1); n.plat(3, objet="t"); n.fosse(2); n.plat(4, ennemi="b"); n.mur_fissure(1); n.plat(4); n.porte(4)
    n.t([["showdoor"], ["say", "Tu as gagné, Max. L'Œil de Jade est à toi. … On fait équipe pour le prochain trésor ?"], ["shake", 10]], allB=True)
    L.append(n.fini())
    return L



# =====================================================================
#  MONDE 1 — L'EMPIRE INCA (20 niveaux, validés dans l'Atlas)
# =====================================================================
DEFIS_MONDE = {3, 6, 9, 12, 18}
FIN_INCA = {
    1: "Archibald, essoufflé : « Pas mal, pour un débutant. Mais l'Œil de Jade m'attend au bout de ce temple ! »",
    2: "Archibald referme une porte derrière lui. « Une porte qui fuit, c'est pratique. Je l'ai dressée moi-même. »",
    3: "Archibald compte ses momies : « Une, deux… Hé ! Qui a assommé Ramsès ? »",
    4: "Archibald caresse son rocher : « Gérard, tu as été parfait. Max a juste été… plus rapide. »",
    5: "Histoire. Archibald déplie une vieille carte : « L'Œil de Jade est caché tout au fond du temple, derrière le Jaguar de pierre. Il ne se réveille que pour les intrus. Donc pour toi. »",
    6: "Archibald, vexé : « Mes fausses dalles étaient parfaites ! Tu as dû tricher. »",
    7: "Archibald retire une flèche de son chapeau. « Mes archers sont un peu maladroits, aujourd'hui. »",
    8: "Archibald, de loin : « Gérard a cassé un mur ? Il faudra que je le dédommage. »",
    9: "Archibald soupire : « Trois murs, un seul faux. Tu as choisi le bon. Évidemment. »",
    10: "Histoire. Au fond du puits, une fresque montre un jaguar géant qui garde une pierre verte. Archibald l'a déjà photographiée. « Le Jaguar de pierre ne dort que d'un œil, Max. Et cet œil, c'est le mien. »",
    11: "Archibald époussette sa veste. « Ce temple tombe en ruine. Ce n'est pas moi, je le jure. Enfin, pas tout. »",
    12: "Archibald, suspendu à une liane : « Toi aussi, tu aimes te balancer ? On a au moins ça en commun. »",
    13: "Archibald se cogne au plafond. « Aïe. Bon, d'accord, ce piège-là était bête. »",
    14: "Archibald essore son pantalon. « Mes radeaux coulent. J'aurais dû lire la notice. »",
    15: "Histoire. Archibald regarde son reflet : « Tu sais, Max, avant, on était collègues. Puis j'ai eu une idée géniale : tricher. » Il repart en courant.",
    16: "Archibald tient la porte à bout de bras. « Bon. Elle reste là. Promis. Peut-être. »",
    17: "Archibald s'éloigne en sifflotant. « Les momies te passent le bonjour. Les écraseurs aussi. »",
    18: "Archibald regarde sa montre. « Encore à l'heure ? Tu commences à m'agacer. »",
    19: "Archibald, couvert de sable : « La salle du Jaguar est juste derrière. S'il te plaît, ne le réveille pas trop fort. »",
    20: "Le Jaguar de pierre ronfle comme un volcan. Archibald, caché derrière un pilier, applaudit à moitié. « Bravo… Mais l'Œil n'est pas ici ! Le Jaguar gardait seulement un morceau de carte. Rendez-vous dans les neiges de l'Himalaya ! »",
}


def I(nom, type_, **kw):
    n = Niveau(nom, type_, monde=1, **kw)
    n.defi = n.num in DEFIS_MONDE
    return n


def trois_murs(n):
    """Fin de niveau : trois couloirs superposés finissent sur un mur ; un seul est faux et mène à la porte."""
    y = n.y
    x0 = n.x
    for i in range(8):
        c = n.colonne()
        for r in range(1, n.h):
            n.put(c, r, "#")
        for base in (y, y - 4, y - 8):
            for r in (base - 2, base - 1, base):
                n.put(c, r, ".")
    for r in range(y - 9, y + 1):
        n.put(x0 + 1, r, "|")
    mur = n.colonne()
    for r in range(1, y + 1):
        n.put(mur, r, "#")
    for r in (y - 10, y - 9, y - 8):
        n.put(mur, r, "F")
    for _ in range(5):
        n.colonne()
    n.put(n.x - 2, y, "D")
    n.porte_x = n.x - 2
    n.astuce("Un seul de ces murs est faux…", x0 + 2, min=1)
    n.astuce("Grimpe à la corde pour essayer les autres étages", x0 + 2, max=0)


def monde_inca():
    NUMERO[0] = 0
    L = []

    # 1 — Le seuil : les bases, puis les lianes et une première salle secrète
    n = I("Le seuil", "exploration", ammo=(6, 0))
    n.depart(4); n.plat(4); n.astuce("Saute par-dessus les pics", n.x - 3)
    n.pics(2); n.plat(5, objet="t"); n.astuce("Ramasse la dynamite", n.x - 4)
    n.plat(7, ennemi="s"); n.astuce("Saute sur le serpent, ou assomme-le avec ta massue", n.x - 8)
    n.plat(2); n.mur_fissure(3); n.astuce("Pose la dynamite contre le mur fissuré, puis recule", n.x - 4)
    n.plat(5); n.liane(7, 5); n.astuce("Saute sur la liane, puis appuie sur SAUT pour lâcher", n.x - 9)
    n.plat(5); n.salle_secrete("plafond"); n.astuce("Une corde monte dans le plafond…", n.x - 6, max=0)
    n.plat(4, ennemi="s"); n.pics(1); n.plat(4)
    n.liane(9, 5); n.plat(3); n.pics(2); n.plat(4); n.porte(4)
    L.append(n.fini())

    # 2 — Le couloir honnête : le sol cède, la porte s'enfuit deux fois (la seconde vers le haut)
    n = I("Le couloir honnête", "trahison")
    n.depart(4); n.plat(6); e1 = n.x; n.plat(8)
    n.t([["collapse", e1 + 2, n.y + 1, 3, n.h - n.y - 1, 0]], n.Z(e1), max=0, lethal=True)
    n.t([["collapse", e1 + 5, n.y + 1, 2, n.h - n.y - 1, 0]], n.Z(e1 + 3), min=1)
    y0 = n.y; n.plat(4); d1 = n.x - 2; n.plat(3)
    n.plat(4); n.pics_surprise(2, 2); n.plat(5); n.pics(2); n.plat(4)
    n.effondrement(2, 3, 10); n.plat(4); d2 = n.x + 1; n.plat(6)
    n.salle_secrete("bloc_faux")
    n.plat(3); n.corde(6); n.plat(5, ennemi="s"); n.porte(4)
    fx, fy = n.porte_x, n.y
    n.put(fx, fy, "."); n.put(d1, y0, "D")
    n.t([["door", d2, y0], ["hint", "La porte s'enfuit !"]], n.Z(d1 - 5))
    n.t([["door", fx, fy], ["hint", "Elle grimpe, maintenant ?!"]], n.Z(d2 - 5))
    L.append(n.fini())

    # 3 — La salle des gardes (Défi) : momies, singe voleur, bloc qui fait une marche, porte sous un sol fissuré
    n = I("La salle des gardes", "exploration", sol=11, ammo=(6, 1))
    n.depart(3); n.plat(6, ennemi="m"); n.astuce("Les momies : saute-leur dessus ou assomme-les", n.x - 7)
    n.stalactite_marche(); n.plat(6, ennemi="k")
    n.plat(3); n.fosse(2); n.plat(5, ennemi="m")
    n.salle_secrete("bloc_fissure")
    n.plat(4); n.pics(2); n.plat(5, ennemi="m"); n.plat(3, objet="t")
    n.sol_fissure(3, 3); n.plat(5, ennemi="s"); n.porte(4)
    L.append(n.fini())

    # 4 — La course : deux poursuites du rocher, séparées par un drapeau
    n = I("La course", "action", h=22, sol=5)
    n.depart(4); n.plat(6); n.rocher(1, n.y - 3, 1, 1.4, zone=n.Z(6))
    n.descend(2); n.plat(6); n.pics(2); n.plat(4)
    n.descend(2); n.plat(5); n.pics_surprise(2, 2, variante="devant"); n.plat(3)
    n.descend(2); n.effondrement(2, 3, 14); n.plat(5)
    n.fosse(2, "vide"); n.astuce("Le rocher tombe dans le trou : ouf !", n.x - 6, max=0)
    x = n.x; n.plat(14)
    n.rocher(x + 1, n.y - 3, 1, 1.5, zone=n.Z(x + 9))
    n.descend(2); n.plat(5); n.fosse(1, "vide"); n.plat(5, ennemi="s")
    n.descend(2); n.pics(1); n.plat(6); n.descend(2); n.plat(4); n.pics(2); n.plat(5)
    n.fosse(2, "vide"); n.plat(4); n.porte(4)
    L.append(n.fini())

    # 5 — Les ressorts (Histoire) : ressorts, ressort piège, ressort fragile, liane, salle sous le sol
    n = I("Les ressorts", "histoire", h=22)
    n.depart(4); n.plat(3); n.astuce("Monte sur le ressort", n.x - 2)
    n.ressort(4); n.plat(5, ennemi="s")
    n.ressort_pique(); n.plat(3); n.fosse(2); n.plat(4)
    n.ressort_fragile(4); n.astuce("Si le ressort casse, prends la corde", n.x - 3, min=1)
    n.plat(4); n.descend(4); n.plat(3); n.liane(8, 5); n.plat(4)
    n.salle_secrete("sol"); n.plat(3); n.pics(2); n.plat(3); n.corde(5); n.plat(2); n.porte(4)
    L.append(n.fini())

    # 6 — Le pont (Défi) : fausses dalles qui changent de place, second pont au-dessus d'un serpent
    n = I("Le pont", "trahison", sol=11)
    n.depart(4)
    x0 = n.pont("####xx####x####")
    n.t([["set", x0 + 4, n.y + 1, 2, 1, "#"], ["set", x0 + 7, n.y + 1, 2, 1, "x"]], min=1)
    n.astuce("Une dalle qui tremble va tomber : ne t'arrête pas dessus", x0 + 1, min=2)
    n.plat(5, ennemi="j"); n.astuce("Un bébé jaguar ! Il bondit quand tu passes devant lui", n.x - 8, max=0)
    y = n.y
    for i, ch in enumerate("##x###xx##x##"):
        c = n.colonne(sol=y + 3)
        n.put(c, y + 1, "#" if ch == "#" else "x")
        if i == 6:
            n.put(c, y + 3, "s")
    c = n.colonne(sol=y + 3); n.put(c, y + 3, "J")
    n.astuce("Tombé en dessous ? Le ressort te remonte", c - 4, min=1)
    n.plat(4); n.salle_secrete("bloc_faux"); n.plat(3); n.porte(4)
    L.append(n.fini())

    # 7 — Les flèches : casser, rebondir, et se servir d'une flèche plantée comme marche
    n = I("Les flèches", "exploration", ammo=(6, 0), arrowRate=100)
    n.depart(3); n.plat(4, objet="t"); n.plat(6, ennemi="m")
    n.fleches(7, 1); n.astuce("Flèche en bois : casse-la d'un coup de massue, ou rebondis dessus !", n.x - 6)
    n.plat(3); n.mur_fissure(); n.plat(4)
    n.fleche_marche(3); n.plat(3); n.tete_feu(7)
    n.plat(4, ennemi="k"); n.fleches(5, 1); n.plat(3); n.salle_secrete("bloc_fissure"); n.plat(4); n.porte(4)
    L.append(n.fini())

    # 8 — Le toboggan : longue descente, le rocher casse un mur fissuré, plateformes qui apparaissent
    n = I("Le toboggan", "action", h=22, sol=4)
    n.depart(4); n.plat(8)
    n.t([["boulder", 1, n.y - 3, 1, 1.35, 1], ["shake", 6]], n.Z(7))
    n.descend(2); n.plat(6); n.pics(2); n.plat(5)
    abri = n.colonne(sol=n.y + 1)
    n.astuce("Un mur ! Cache-toi dans le trou et laisse passer le rocher…", abri - 2)
    n.plat(4)
    m = n.colonne()
    for r in range(1, n.y + 1):
        n.put(m, r, "#")
    for r in (n.y - 1, n.y):
        n.put(m, r, "B")
    n.plat(4); n.fosse(2, "vide"); n.plat(4)
    n.fantome(5); n.plat(5, ennemi="k")
    n.descend(2); n.plat(4); n.pics(2); n.plat(3); n.salle_secrete("sol")
    n.descend(2); n.effondrement(2, 3, 14); n.plat(4); n.porte(4)
    L.append(n.fini())

    # 9 — Le faux mur (Défi) : dalles et grille, salle du Soleil, trois murs dont un seul est faux
    n = I("Le faux mur", "trahison")
    n.depart(4); n.plat(4); n.leviers(); n.plat(3)
    n.soleil(20, piliers=(5, 11, 16)); n.plat(3, ennemi="s"); n.salle_secrete("bloc_faux"); n.plat(3)
    n.passage_defi(); n._defi_fait = True
    trois_murs(n)
    L.append(n.fini())

    # 10 — Le puits (Histoire) : dans le noir, on allume les torches en descendant
    n = I("Le puits", "histoire", h=30, sol=5, ammo=(6, 1), dark=True)
    n.depart(3); n.plat(2, objet="T"); n.astuce("Touche les torches pour les allumer", 3)
    n.plateformes([(2, 3, 2), (2, 3, 2), (1, 3, 2), (2, 4, 2)])
    n.plat(3, objet="T"); n.plateformes([(2, 3, 2), (2, 3, 2)])
    n.plat(4, ennemi="s"); n.plat(2, objet="T"); n.sol_fissure(3, 3); n.plat(3, objet="T")
    n.salle_secrete("sol"); n.plateformes([(2, 3, 2), (2, 3, 1)])
    n.plat(5, ennemi="s"); n.plat(2, objet="T"); n.porte(4)
    L.append(n.fini())

    # 11 — L'éboulement : plafond qui tombe en rythme, jaguar, stalactites, puis tout s'effondre
    n = I("L'éboulement", "action")
    n.depart(3); n.plafond_bas(26, chutes=[(4, 22), (8, 18), (12, 16), (15, 14), (19, 12), (22, 10)])
    n.plat(3); n.plat(5, ennemi="j"); n.stalactites(10, 3); n.plat(4)
    n.salle_secrete("plafond"); n.plat(3)
    x = n.fuite_effondrement(21)
    for tr in n.trig:
        if tr.get("zone") and tr["act"][0][0] == "collapse" and tr["act"][0][1] >= x:
            tr["lethal"] = True
    n.plat(3); n.porte(4)
    L.append(n.fini())

    # 12 — Le puits de mine (Défi) : chauves-souris, murs fissurés, lianes au-dessus du vide
    n = I("Le puits de mine", "exploration", ammo=(5, 0))
    n.depart(4); n.plat(8, ennemi="b"); n.monte(2); n.plat(6, ennemi="b"); n.fosse(2, "vide")
    n.plat(5, objet="t"); n.mur_fissure(); n.plat(6, ennemi="m")
    n.plat(2); n.liane(8, 5); n.plat(2); n.liane(8, 5, ph=1.6); n.plat(4, ennemi="b")
    n.ressort(4); n.plat(4); n.salle_secrete("bloc_faux"); n.plat(3, ennemi="b")
    n.stalactite_marche(); n.plat(2); n.porte(4)
    L.append(n.fini())

    # 13 — Le plafond bas : couloirs bas et salles hautes, pics du plafond au saut, tête de jaguar
    n = I("Le plafond bas", "trahison")
    n.depart(3); x = n.plafond_bas(6, hauteur=4); n.pics(1)
    n.t([["spikes", x + 7, n.y - 3, 4, 1, "v"]], [x + 4, 1, 3, n.h - 2], air=True)
    n.plat(6); n.plafond_bas(6, hauteur=4); n.pics(2)
    n.tete_feu(7); n.plat(6, ennemi="k")
    n.plafond_bas(8, hauteur=4, pics_plafond=(2, 3, 6)); n.pics_surprise(1, 2)
    n.plat(5); n.stalactites(10, 3); n.plat(3); n.salle_secrete("plafond"); n.plat(3); n.porte(4)
    L.append(n.fini())

    # 14 — Le gué : plateformes fantômes, radeaux qui coulent, singe, liane
    n = I("Le gué", "exploration", ammo=(6, 0))
    n.depart(4); n.plateformes([(2, 3, 0), (3, 3, 0), (2, 2, -1), (3, 4, 1)], fond="vide")
    n.plat(6, ennemi="s"); n.fantome(5); n.plat(3)
    n.coule(((2, 2), (2, 2), (3, 2), (2, 2))); n.plat(5, ennemi="k"); n.liane(8, 5); n.plat(3)
    n.coule(((2, 1), (2, 1), (2, 1), (2, 2))); n.plat(3); n.salle_secrete("bloc_faux")
    n.plat(4, ennemi="s"); n.plat(2); n.corde(5); n.porte(4)
    L.append(n.fini())

    # 15 — Le miroir (Histoire) : les commandes s'inversent ; une fois sur deux, un pictogramme prévient
    n = I("Le miroir", "histoire", decor="pillars")
    n.depart(4); n.plat(4); x = n.x; n.plat(3); n.pics(2)
    n.t([["invert", 200], ["hint", "⇄ Commandes inversées !"]], n.Z(x))
    n.plat(5); x = n.x; n.plat(2); n.pics(2); n.plat(3)
    n.t([["invert", 150]], n.Z(x), max=0)
    n.t([["invert", 150], ["hint", "⇄ Encore inversé !"]], n.Z(x), min=1)
    n.plat(4, ennemi="j"); x = n.x; n.plat(3); n.fosse(2, "vide"); n.plat(3)
    n.t([["invert", 180], ["hint", "⇄ Inversé !"]], n.Z(x))
    n.plat(4); x = n.x; n.plat(2); n.liane(7, 5); n.plat(3)
    n.t([["invert", 220]], n.Z(x), max=0)
    n.t([["invert", 220], ["hint", "⇄ Inversé, même sur la liane !"]], n.Z(x), min=1)
    n.plat(3); n.salle_secrete("bloc_fissure"); n.plat(4); n.porte(4)
    L.append(n.fini())

    # 16 — Archibald s'amuse : la porte change quatre fois de place, il faut la suivre
    n = I("Archibald s'amuse", "trahison")
    n.depart(4); n.plat(6); x1 = n.x; n.plat(4); n.pics(2); n.plat(6, ennemi="j"); x2 = n.x
    n.plat(5); n.fosse(2, "vide"); n.plat(4); x3 = n.x; n.plat(5)
    y0 = n.y
    n.plat(3); n.ressort(4); n.plat(6); x4 = n.x; y4 = n.y; n.plat(4); n.pics_surprise(2, 2); n.plat(4)
    n.descend(4); n.plat(5, ennemi="s"); n.salle_secrete("bloc_faux"); n.plat(3); n.porte(4)
    fx, fy = n.porte_x, n.y
    n.put(fx, fy, "."); n.put(x3 + 2, y0, "D")
    t1 = len(n.trig); n.t([["door", 3, y0], ["hint", "La porte est retournée au départ !"]], n.Z(x3 - 2))
    t2 = len(n.trig); n.t([["door", x2 + 1, y0]], n.Z(5), after=t1)
    t3 = len(n.trig); n.t([["door", x4 + 2, y4]], n.Z(x2 - 1), after=t2)
    n.t([["door", fx, fy], ["hint", "Elle file tout au bout…"]], n.Z(x4 - 1), after=t3)
    n.t([["spikes", x1 + 1, y0, 1, 1]], n.Z(x1 - 1), max=0)
    L.append(n.fini())

    # 17 — Les ossements : écraseurs, momies, têtes de jaguar face à face
    n = I("Les ossements", "action", ammo=(6, 1))
    n.depart(4); n.plat(6, ennemi="m"); n.pics_surprise(2, 2); n.plat(3); n.ecraseurs(10, 2); n.plat(5, ennemi="m")
    n.tete_feu_plafond(8); n.plat(3); n.ressort(4); n.plat(4, ennemi="m")
    n.ecraseurs(12, 3); n.plat(3); n.salle_secrete("bloc_fissure"); n.plat(4); n.porte(4)
    L.append(n.fini())

    # 18 — La mèche (Défi) : compte à rebours, sabliers qui redonnent du temps, salle du Soleil
    n = I("La mèche", "action")
    n.depart(3); n.minuterie(1.6)
    n.plat(3); n.sprint(); n.plat(3, objet="w"); n.astuce("Sablier : +10 secondes !", n.x - 4, max=0)
    n.clignote(6); n.plat(3); n.pics(2); n.plat(3, objet="w")
    n.soleil(16, piliers=(4, 9, 13)); n.plat(3); n.fosse(3, "vide"); n.plat(3, objet="w")
    n.corde(5); n.plat(3); n.pics(1); n.plat(4); n.porte(4)
    L.append(n.fini())

    # 19 — Le sablier (grande épreuve) : le sable monte, on grimpe par ressorts, cordes et liane
    n = I("Le sablier", "action", h=34, sol=32)
    n.depart(4); n.crue("sable", 0.2)
    grimpe(n, 3, ressorts=(1,), ennemis=(0,)); n.plat(2, ennemi="j"); n.corde(5); n.plat(3, ennemi="b")
    n.liane(7, 4); n.plat(3); grimpe(n, 2, ressorts=(0,)); n.salle_secrete("bloc_faux")
    n.plat(2); n.ressort_fragile(4); n.plat(3, ennemi="b"); n.corde(5); n.plat(3); n.porte(4)
    L.append(n.fini())

    # 20 — Le Jaguar de pierre : le boss (on l'assomme, on ne le tue pas)
    L.append(boss_jaguar())

    for i, lv in enumerate(L):
        lv["fin"] = FIN_INCA[i + 1]
    return L


def boss_jaguar():
    NUMERO[0] += 1
    W, h, y = 44, 17, 15
    rows = [["#"] * W for _ in range(h)]
    for r in range(1, y + 1):
        for x in range(1, W - 1):
            rows[r][x] = "."
    rows[y][3] = "P"
    rows[y][W - 4] = "D"
    lv = {"name": "Le Jaguar de pierre", "type": "histoire", "ammo": [6, 0], "map": ["".join(r) for r in rows],
          "triggers": [{"zone": [6, 1, 1, h - 2], "max": 0, "act": [["hint", "Accroche-toi à une liane quand il charge. Sonné contre le mur, saute-lui sur la tête !"]]}],
          "vines": [[4, 8, 5, 0.45, 0], [22, 8, 5, 0.45, 2.1], [39, 8, 5, 0.45, 4.2]],
          "boss": "jaguar", "doorHidden": True, "decor": "pillars", "monde": 1, "_tnt": 0}
    return lv




# =====================================================================
#  MONDE 3 — LES ABYSSES : 3 niveaux d'essai (nage, oxygène, bulles)
# =====================================================================
class Mer:
    """Niveau dessiné sur une grille : on pose le sol, des rochers, des grottes, puis les objets.
    Tout ce qui est sous la ligne `eau` est sous l'eau."""
    def __init__(self, nom, type_, largeur, h=22, eau=8):
        self.nom, self.type, self.W, self.h, self.eau = nom, type_, largeur, h, eau
        self.g = [["." for _ in range(largeur)] for _ in range(h)]
        for x in range(largeur):
            self.g[0][x] = "#"; self.g[h - 1][x] = "#"
        for y in range(h):
            self.g[y][0] = "#"; self.g[y][largeur - 1] = "#"
        self.trig, self.secrets, self.winds = [], [], []
        self.tnt = 0

    def sol(self, x0, x1, haut, ch="#"):
        """Sol plein de la colonne x0 à x1 (exclu), à partir de la ligne `haut`."""
        for x in range(x0, x1):
            for y in range(haut, self.h):
                self.g[y][x] = ch

    def bloc(self, x0, y0, w, h, ch="#"):
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                self.g[y][x] = ch

    def vide(self, x0, y0, w, h):
        self.bloc(x0, y0, w, h, ".")

    def put(self, x, y, ch):
        self.g[y][x] = ch

    def astuce(self, texte, x, **kw):
        self.trig.append(dict({"zone": [x, 1, 1, self.h - 2], "act": [["hint", texte]]}, **kw))

    def fini(self, **opts):
        d = {"name": self.nom, "type": self.type, "ammo": opts.pop("ammo", [6, 0]), "map": ["".join(r) for r in self.g],
             "triggers": self.trig, "eau": self.eau, "palette": "abysses", "monde": 3, "essai": True, "_tnt": self.tnt}
        if self.secrets:
            d["secrets"] = self.secrets
        if self.winds:
            d["winds"] = self.winds
        d.update(opts)
        return d


FIN_ABYSSES = {
    1: "Archibald, en maillot rayé : « L'eau est bonne, hein ? J'ai oublié de te dire qu'il faut respirer. »",
    2: "Archibald essore sa moustache : « Les anguilles, ce n'est pas moi. Les courants non plus. Enfin, presque. »",
    3: "Histoire. Dans la cabine du capitaine, Max trouve le journal de bord : « Le grand-père d'Archibald cherchait déjà l'Œil de Jade. Il a coulé avec. » Archibald, tout bas : « …Ne le dis à personne. »",
}


def abysses_essai():
    L = []
    # 1 — La plongée : apprendre à nager, respirer, sortir de l'eau ; grotte avec une poche d'air
    m = Mer("La plongée", "exploration", 96)
    m.sol(1, 11, 7); m.put(3, 6, "P")
    m.astuce("Saute dans l'eau ! SAUT = une brasse. Surveille ta réserve d'AIR", 8, max=0)
    m.sol(11, 31, 18); m.put(16, 17, "^"); m.put(17, 17, "^"); m.put(22, 17, "r")
    m.sol(24, 27, 15); m.put(25, 14, "a"); m.put(13, 14, "a"); m.put(20, 12, "a")
    m.sol(31, 38, 7); m.astuce("Près de la surface, SAUT te fait sortir de l'eau", 30, max=0)
    m.sol(38, 59, 18); m.bloc(40, 1, 19, 10)          # toit de la grotte, sous l'eau
    m.vide(47, 5, 4, 6)                                  # poche d'air dans le plafond
    m.put(48, 6, "a"); m.put(49, 6, "a")
    m.astuce("Une grotte ! Remonte respirer dans la poche d'air au plafond", 39, max=0)
    m.put(44, 17, "^"); m.put(52, 17, "^"); m.put(53, 17, "^")
    m.put(56, 17, "u"); m.astuce("Les colonnes de bulles redonnent de l'air et font monter", 54, max=0)
    m.sol(59, 73, 18); m.put(63, 12, "e"); m.put(68, 10, "e"); m.put(70, 17, "u")
    m.astuce("Méduse : passe quand elle n'est pas chargée (ou assomme-la)", 58, max=0)
    m.put(61, 17, "^"); m.put(65, 17, "r")
    m.sol(73, 79, 13); m.sol(79, 95, 7); m.put(92, 6, "D")
    L.append(m.fini())

    # 2 — Le récif : îles et plongées en alternance, anguilles, courant, mur fissuré, grotte secrète
    m = Mer("Le récif", "exploration", 112)
    m.sol(1, 9, 7); m.put(3, 6, "P")
    m.sol(9, 25, 16); m.sol(14, 17, 11); m.put(14, 10, "^"); m.put(15, 10, "^"); m.put(13, 13, "l")
    m.put(20, 15, "r"); m.put(11, 15, "a"); m.put(22, 12, "a")
    m.astuce("Attention aux trous dans le rocher : il y a des anguilles", 10, max=0)
    m.sol(25, 31, 7); m.put(28, 6, "t"); m.put(27, 6, "a")
    m.sol(31, 51, 19); m.winds.append([31, 50, -0.35]); m.put(40, 18, "u"); m.put(36, 13, "e"); m.put(45, 11, "e")
    m.put(34, 18, "^"); m.put(46, 18, "^"); m.put(47, 18, "^")
    m.astuce("Un courant te pousse en arrière : nage fort !", 30, max=0)
    m.sol(51, 57, 7); m.put(54, 6, "r")
    m.sol(57, 85, 18); m.bloc(60, 8, 2, 7); m.put(62, 12, "l"); m.bloc(68, 12, 3, 6); m.put(67, 15, "l")
    m.put(64, 17, "^"); m.put(65, 17, "^"); m.put(74, 17, "r"); m.put(72, 10, "e"); m.put(80, 17, "u")
    m.bloc(78, 8, 1, 10, "B"); m.tnt += 1
    m.astuce("Un mur fissuré sous l'eau : pose la dynamite et recule !", 74, max=0)
    m.sol(85, 91, 20); m.put(87, 19, "u")
    m.sol(91, 111, 7); m.put(106, 6, "D")
    # grotte secrète sous la plage, derrière un faux mur
    m.bloc(91, 11, 4, 2, "F"); m.vide(95, 10, 5, 4)
    m.put(95, 13, "$"); m.put(96, 13, "a"); m.put(97, 13, "a"); m.put(98, 13, "a")
    m.secrets.append([95, 10, 5, 4])
    L.append(m.fini(ammo=[6, 1]))

    # 3 — L'épave : le bateau englouti, la cabine pleine d'air, la cale, le trésor du capitaine
    m = Mer("L'épave", "histoire", 100, h=24, eau=6)
    m.sol(1, 9, 5); m.put(3, 4, "P")
    m.sol(9, 100, 22)
    # coque : fond, murs, pont avec écoutilles
    m.bloc(20, 18, 61, 4); m.bloc(20, 9, 1, 10); m.bloc(80, 9, 1, 10)
    m.bloc(20, 9, 61, 1)
    for hx in (30, 31, 52, 53, 70, 71):
        m.put(hx, 9, ".")
    # cloisons de la cale
    m.bloc(40, 10, 1, 5); m.bloc(60, 10, 1, 8, "B"); m.tnt += 1; m.put(56, 17, "t")
    # cabine sur le pont (une poche d'air)
    m.bloc(44, 2, 13, 1); m.bloc(44, 2, 1, 5); m.bloc(56, 2, 1, 7)
    m.put(50, 4, "a"); m.put(52, 4, "a")
    # cabine du capitaine (secrète) derrière un faux mur
    m.bloc(75, 10, 1, 3, "F"); m.vide(76, 10, 4, 3); m.put(78, 12, "$"); m.put(77, 12, "a"); m.put(76, 12, "a")
    m.secrets.append([76, 10, 4, 3])
    # habitants
    m.put(26, 17, "r"); m.put(48, 17, "r"); m.put(41, 12, "l")
    m.put(14, 12, "e"); m.put(86, 12, "e"); m.put(65, 13, "e")
    m.put(35, 17, "u"); m.put(66, 17, "u"); m.put(12, 21, "u")
    m.put(24, 17, "^"); m.put(46, 17, "^"); m.put(73, 17, "^")
    m.put(33, 15, "a"); m.put(63, 11, "a"); m.put(68, 16, "a")
    m.astuce("Entre dans l'épave par l'écoutille du pont", 12, max=0)
    m.astuce("La cabine sur le pont est pleine d'air !", 42, max=0)
    # sortie
    m.sol(88, 99, 5); m.put(96, 4, "D")
    L.append(m.fini(ammo=[6, 1], decor="abysses"))

    for i, lv in enumerate(L):
        lv["fin"] = FIN_ABYSSES[i + 1]
    return L




# =====================================================================
#  MONDE 2 — LES NEIGES DE L'HIMALAYA (20 niveaux)
# =====================================================================
FIN_HIMALAYA = {
    1: "Archibald, emmitouflé jusqu'au nez : « Il fait moins quarante, Max. Ma moustache a gelé. Rentre chez toi ! »",
    2: "Archibald glisse sur les fesses : « Cette glace est très bien. Je l'ai cirée moi-même. »",
    3: "Archibald, de l'autre côté du gouffre : « Le pont ? Il tenait très bien. Pour une personne. »",
    4: "Archibald, tout blanc : « J'ai juste éternué. Je ne savais pas qu'une montagne était aussi susceptible. »",
    5: "Histoire. Les moines du monastère ont vu passer Archibald : il cherche le deuxième morceau de la carte, caché au sommet, dans la caverne du Yéti. « Ne réveillez pas le Yéti », disent-ils. Archibald n'écoute jamais les moines.",
    6: "Archibald se gratte la tête : « Une stalactite m'est tombée dessus. Je l'ai prise pour un compliment. »",
    7: "Archibald, coincé dans une crevasse : « Ne me regarde pas. Je cherchais… un caillou. »",
    8: "Archibald court plus vite que d'habitude : « Les loups sont de mon côté ! Enfin, je crois. »",
    9: "Archibald, les skis à l'envers : « Je descends toujours comme ça. C'est une technique. »",
    10: "Histoire. Dans la tempête, Max entend une voix : c'est Archibald, perdu. Il crie : « Max ! Par où est le sommet ? » Max lui montre le chemin. Archibald file sans dire merci.",
    11: "Archibald sort d'un bain chaud : « Ne juge pas. Même les tricheurs ont besoin de vacances. »",
    12: "Archibald pêche dans un trou de la glace : « Silence, ça mord ! … Ah non, c'est un phoque. »",
    13: "Archibald se protège la tête : « Ces aigles en veulent à mon chapeau. Ils ont bon goût. »",
    14: "Archibald claque des dents : « J'ai brûlé ma carte pour me réchauffer. C'était une copie. Presque sûr. »",
    15: "Histoire. Dans la grotte, les murs de glace reflètent Max… et derrière, Archibald enfant, avec son grand-père, devant une carte. Max comprend que l'Œil est une histoire de famille.",
    16: "Archibald, accroché à un drapeau : « Ces drapeaux portent bonheur. Pas à moi, visiblement. »",
    17: "Archibald, sous un bloc de glace : « Je vais très bien. Je me rafraîchis. »",
    18: "Archibald, retourné comme un parapluie : « Le vent change tout le temps ! C'est de la triche ! »",
    19: "Archibald, à l'entrée de la caverne : « Le Yéti dort. Vas-y en premier, toi. Moi, je… surveille. »",
    20: "Le Yéti ronfle, une bosse sur la tête. Archibald, qui s'était caché, attrape le deuxième morceau de carte… Max le lui reprend. « La carte mène sous la mer ! » souffle Archibald. Rendez-vous dans les abysses !",
}


def H_(nom, type_, palette="himalaya", **kw):
    n = Niveau(nom, type_, monde=2, **kw)
    n.defi = n.num in DEFIS_MONDE
    n._palette = palette
    return n


def boss_yeti():
    NUMERO[0] += 1
    W, h, y = 40, 17, 15
    rows = [["#"] * W for _ in range(h)]
    for r in range(1, y + 1):
        for x in range(1, W - 1):
            rows[r][x] = "."
    rows[y][3] = "P"; rows[y][W - 4] = "D"
    return {"name": "Le Yéti grognon", "type": "histoire", "ammo": [6, 0], "map": ["".join(r) for r in rows],
            "triggers": [{"zone": [6, 1, 1, h - 2], "max": 0, "act": [["hint", "Attire le yéti sous une grosse stalactite : quand il frappe le sol, elle lui tombe dessus ! Saute quand il retombe."]]}],
            "glacons": [[9, 1], [19, 1], [29, 1]], "boss": "yeti", "doorHidden": True, "monde": 2, "palette": "glace", "decor": "glace", "_tnt": 0}


def monde_himalaya():
    NUMERO[0] = 0
    L = []

    # 1 — Le camp de base : la neige profonde ralentit, premières glissades
    n = H_("Le camp de base", "exploration")
    n.depart(4); n.plat(2, objet="f"); n.neige(6); n.astuce("Neige profonde : Max avance moins vite et saute moins haut", 6)
    n.plat(3); n.glissant(5); n.plat(4, ennemi="S"); n.astuce("Un bonhomme de neige ! Saute-lui dessus", n.x - 6, max=0)
    n.neige(8); n.salle_secrete("bloc_faux"); n.plat(4)
    n.plat(5, ennemi="C"); n.astuce("Les chèvres foncent ! Rebondis sur leur dos", n.x - 7, max=0)
    n.plat(3); n.fosse(2); n.plat(3, objet="f"); n.neige(6); n.monte(1); n.plat(4); n.porte(4)
    L.append(n.fini())

    # 2 — La glace vive : on glisse jusqu'au bord des crevasses
    n = H_("La glace vive", "trahison")
    n.depart(4); n.glace_crevasse(6); n.plat(3); n.glace_crevasse(8, 3)
    n.plat(4, ennemi="C"); n.salle_secrete("plafond"); n.plat(3)
    n.glace_crevasse(10, 2); n.pics_surprise(1, 2); n.plat(3); n.glissant(6); n.plat(3)
    n.neige(5); n.glace_crevasse(7, 3); n.plat(3); n.porte(4)
    L.append(n.fini())

    # 3 — Le pont de cordes (Défi) : les planches lâchent derrière Max
    n = H_("Le pont de cordes", "action")
    n.depart(4); n.plat(3); n.pont_corde(8); n.plat(4)
    n.pont_corde(11); n.plat(5, ennemi="L"); n.astuce("Un loup ! Il fonce sur toi dès qu'il te voit", n.x - 7, max=0)
    n.salle_secrete("bloc_fissure"); n.plat(3); n.pont_corde(14); n.plat(3); n.porte(4)
    L.append(n.fini())

    # 4 — L'avalanche : une boule de neige qui grossit en roulant
    n = H_("L'avalanche", "action", h=22, sol=5)
    n.depart(4); n.plat(6)
    n.t([["boulder", 1, n.y - 2, 1, 1.4, 0, 1], ["shake", 8]], n.Z(6))
    n.descend(2); n.plat(6); n.pics(1); n.plat(5); n.descend(2); n.neige(4); n.plat(4)
    n.descend(2); n.plat(6); n.fosse(3, "vide"); n.astuce("La boule est trop grosse : elle tombe dans le trou !", n.x - 6, max=0)
    x = n.x; n.plat(12); n.salle_secrete("bloc_faux"); n.plat(3)
    n.t([["boulder", x + 1, n.y - 2, 1, 1.5, 0, 1], ["shake", 8]], n.Z(x + 10))
    n.descend(2); n.plat(5); n.pics(2); n.plat(5); n.descend(2); n.plat(6); n.fosse(3, "vide"); n.plat(4); n.porte(4)
    L.append(n.fini())

    # 5 — Le monastère (Histoire) : moulins à prières qui servent de plateformes
    n = H_("Le monastère", "histoire", h=20)
    n.depart(4); n.plat(3, objet="f"); n.mobile(7, 0.9); n.plat(4); n.ascenseur(4); n.plat(4, objet="f")
    n.mobile(8, 1.0); n.plat(3); n.salle_secrete("bloc_fissure"); n.plat(3)
    n.ressort(4); n.plat(4); n.mobile(7, 1.2); n.plat(4); n.porte(4)
    L.append(n.fini())

    # 6 — Les stalactites de glace (Défi) : toutes les façons de tomber
    n = H_("Les stalactites de glace", "trahison", palette="glace")
    n.depart(3); n.stalactites(9, 3); n.plat(3); n.stalactites(10, 3); n.plat(4, ennemi="Y")
    n.astuce("Petit yéti : il lance des boules de neige", n.x - 6, max=0)
    n.stalactites(9, 3); n.plat(3); n.salle_secrete("plafond"); n.stalactites(10, 3); n.plat(3)
    n.stalactites(9, 3); n.plat(3); n.porte(4)
    L.append(n.fini())

    # 7 — La crevasse cachée : suivre les traces des chèvres
    n = H_("La crevasse cachée", "trahison")
    n.depart(4); n.plat(3); n.crevasse_cachee(10, (2, 3, 6, 7)); n.plat(5, ennemi="C")
    n.neige(6); n.crevasse_cachee(12, (1, 4, 5, 8, 9)); n.plat(3); n.salle_secrete("bloc_faux"); n.plat(3, ennemi="S")
    n.crevasse_cachee(10, (3, 4, 7)); n.plat(4); n.porte(4)
    L.append(n.fini())

    # 8 — La meute : des loups qui chassent à plusieurs
    n = H_("La meute", "action", ammo=(6, 1))
    n.depart(4); n.plat(6); n.ressort(3); n.plat(3); n.descend(3); n.plat(10, ennemi="L"); n.ressort(4); n.plat(5); n.descend(4)
    n.plat(12, ennemi="LL"); n.astuce("Saute-leur dessus, ou monte hors de leur portée", n.x - 14, max=0)
    n.plat(3, objet="t"); n.mur_fissure(); n.plat(4); n.salle_secrete("bloc_fissure")
    n.plat(10, ennemi="LL"); n.fosse(2); n.plat(4); n.porte(4)
    L.append(n.fini())

    # 9 — La pente de ski (Défi) : Max glisse tout seul
    n = H_("La pente de ski", "action", h=22, sol=4)
    n.depart(4); n.plat(4); n.ski(6, 5, ("pics", "trou", None)); n.salle_secrete("bloc_faux")
    n.plat(3, ennemi="S"); n.ski(5, 4, ("trou", "pics")); n.plat(4); n.porte(4)
    L.append(n.fini())

    # 10 — Le blizzard (Histoire) : vent et visibilité réduite
    n = H_("Le blizzard", "histoire", blizzard=True)
    n.depart(4); n.plat(3, objet="f")
    n.vent(((2, 3, 0), (2, 3, 0), (2, 4, -1)), -0.35); n.plat(5, ennemi="S"); n.plat(3, objet="f")
    n.vent(((2, 3, 0), (3, 3, 1), (2, 3, 0)), -0.4); n.plat(4); n.salle_secrete("bloc_faux")
    n.plat(3, objet="f"); n.vent(((2, 4, 0), (2, 3, 0)), -0.3); n.plat(4); n.porte(4)
    L.append(n.fini())

    # 11 — Les sources chaudes : geysers qui propulsent, vapeur
    n = H_("Les sources chaudes", "exploration", h=24)
    n.depart(4); n.plat(3); n.geyser(5); n.plat(4, ennemi="Y"); n.fosse(2); n.plat(3)
    n.geyser(5); n.plat(5, ennemi="S"); n.salle_secrete("bloc_fissure"); n.plat(3); n.descend(6); n.plat(4)
    n.geyser(6); n.plat(4, ennemi="Y"); n.porte(4)
    L.append(n.fini())

    # 12 — Le lac gelé (Défi) : la glace craque si on reste immobile
    n = H_("Le lac gelé", "trahison")
    n.depart(4); n.plat(3); n.lac(10); n.plat(4, ennemi="L"); n.lac(14); n.plat(3)
    n.salle_secrete("plafond"); n.lac(12); n.plat(4); n.porte(4)
    L.append(n.fini())

    # 13 — Les aigles : ils piquent pendant les sauts
    n = H_("Les aigles", "action")
    n.depart(4); n.plat(4, ennemi="A"); n.astuce("Les aigles piquent quand tu sautes : saute quand ils sont loin", 4, max=0)
    n.plateformes([(2, 3, 0), (3, 3, -1), (2, 3, 0)], fond="vide"); n.plat(4, ennemi="A")
    n.plateformes([(3, 3, 1), (2, 2, 0), (3, 3, -1)], fond="vide"); n.plat(4, ennemi="C")
    n.salle_secrete("bloc_faux"); n.plat(3, ennemi="A"); n.plateformes([(2, 3, 0), (3, 4, 0)], fond="vide"); n.plat(3); n.porte(4)
    L.append(n.fini())

    # 14 — Le froid mordant : de brasero en brasero
    n = H_("Le froid mordant", "exploration", froid=True)
    n.depart(4); n.plat(2, objet="f"); n.astuce("Le froid te gagne : réchauffe-toi aux braseros", 3)
    n.neige(10); n.plat(3, ennemi="C"); n.plat(3, objet="f"); n.neige(8, ennemi="S"); n.fosse(2); n.neige(8)
    n.plat(2, objet="f"); n.salle_secrete("bloc_fissure"); n.neige(10); n.glissant(5); n.plat(2, objet="f")
    n.neige(8, ennemi="C"); n.plat(4); n.porte(4)
    L.append(n.fini())

    # 15 — La grotte de glace (Histoire) : le reflet de Max dans le sol gelé
    lv = miroir("La grotte de glace", "histoire", pics_reflet=(9, 10, 18, 27, 28, 37, 46, 47), pics_max=(13, 23, 32, 41, 51), largeur=60)
    lv["monde"] = 2; lv["palette"] = "glace"; lv["decor"] = "glace"
    lv["triggers"].append({"zone": [4, 1, 1, 10], "max": 0, "act": [["hint", "La glace reflète Max… et son reflet a ses propres pics !"]]})
    L.append(lv)

    # 16 — Les drapeaux de prière : grimper aux cordes dans le vent
    n = H_("Les drapeaux de prière", "exploration", h=22)
    n.depart(4); n.plat(3); n.corde(5); n.plat(3, ennemi="A"); n.vent(((2, 3, 0), (2, 3, 0)), 0.35)
    n.plat(3); n.corde(5); n.plat(4, ennemi="C"); n.salle_secrete("bloc_faux"); n.plat(3)
    n.descend(6); n.plat(3); n.corde(6); n.plat(3, ennemi="A"); n.vent(((2, 3, 0), (3, 3, 0)), -0.35); n.plat(3); n.porte(4)
    L.append(n.fini())

    # 17 — La chute de séracs : des blocs de glace tombent en cascade
    n = H_("La chute de séracs", "action", palette="glace")
    n.depart(3); n.plafond_bas(24, chutes=[(4, 20), (8, 16), (12, 14), (16, 12), (20, 10)])
    n.plat(3, ennemi="Y"); n.stalactites(10, 3, "cascade"); n.plat(3); n.salle_secrete("plafond"); n.plat(2)
    x = n.fuite_effondrement(18)
    for tr in n.trig:
        if tr.get("zone") and tr["act"][0][0] == "collapse" and tr["act"][0][1] >= x:
            tr["lethal"] = True
    n.plat(3); n.porte(4)
    L.append(n.fini())

    # 18 — Le col du vent (Défi) : le vent change de sens
    n = H_("Le col du vent", "action")
    n.depart(4); n.plat(3)
    x = n.vent(((2, 3, 0), (2, 3, 0), (2, 3, -1)), 0.4); n.winds[-1].append(150)
    n.plat(5, ennemi="L"); n.salle_secrete("bloc_faux"); n.plat(3)
    x = n.vent(((2, 3, 0), (3, 3, 1), (2, 3, 0), (2, 3, 0)), -0.45); n.winds[-1].append(120)
    n.plat(4); n.porte(4)
    L.append(n.fini())

    # 19 — La caverne du yéti (grande épreuve) : tout le monde de la neige réuni
    n = H_("La caverne du yéti", "action", palette="glace", h=22)
    n.depart(4); n.neige(6); n.glace_crevasse(6); n.plat(3, ennemi="L"); n.pont_corde(9); n.plat(3, ennemi="Y")
    n.geyser(5); n.plat(3); n.lac(8); n.plat(3, ennemi="C"); n.stalactites(9, 3); n.salle_secrete("bloc_fissure")
    n.plat(3, ennemi="A"); n.crevasse_cachee(8, (2, 5)); n.plat(4, ennemi="L"); n.porte(4)
    L.append(n.fini())

    L.append(boss_yeti())
    for i, lv in enumerate(L):
        lv["fin"] = FIN_HIMALAYA[i + 1]
        lv.setdefault("monde", 2)
    return L


# =====================================================================
#  Vérification
# =====================================================================
def appliquer(lv, morts):
    g = [list(r) for r in lv["map"]]
    H, W = len(g), len(g[0])
    porte = None
    for y in range(H):
        for x in range(W):
            if g[y][x] == "D":
                porte = (x, y)
    # plateformes mobiles : un trajet horizontal sert de pont ; un monte-charge relie le bas et le haut
    liens = []
    for (mx, my, mw, dx, dy, _v) in lv.get("movers", []):
        if dy == 0:
            for xx in range(mx, mx + mw + dx):
                if g[my][xx] == ".":
                    g[my][xx] = "="
        else:
            for yy in (my, my + dy):
                for xx in range(mx, mx + mw):
                    if g[yy][xx] == ".":
                        g[yy][xx] = "="
            for xx in range(mx, mx + mw):
                liens.append(((xx, my - 1), (xx, my + dy - 1)))
                liens.append(((xx, my + dy - 1), (xx, my - 1)))
    # lianes qui se balancent, flèches plantées… : passages décrits par le générateur
    for a_, b_ in lv.get("_liens", []):
        liens.append((tuple(a_), tuple(b_)))
    for tr in lv["triggers"]:
        if tr.get("lethal"):
            continue
        if tr.get("min") is not None and morts < tr["min"]:
            continue
        if tr.get("max") is not None and morts > tr["max"]:
            continue
        for a in tr["act"]:
            k = a[0]
            if k == "appear":
                x0, y0, w, h = a[1:5]
                for yy in range(y0, y0 + h):
                    for xx in range(x0, x0 + w):
                        g[yy][xx] = "#"
                continue
            if k == "dropspike":
                x0, y0 = a[1], a[2]
                g[y0][x0] = "."
                yy = y0
                while yy + 1 < H and g[yy + 1][x0] not in "#BJ<>c":
                    yy += 1
                if yy + 1 < H:
                    g[yy][x0] = "^"
                continue
            if k == "fall":
                x0, y0, w, h = a[1:5]
                for xx in range(x0, x0 + w):
                    g[y0][xx] = "."
                    yy = y0
                    while yy + 1 < H and g[yy + 1][xx] not in "#BJ<>cgG":
                        yy += 1
                    if yy + 1 < H:
                        g[yy][xx] = "#"
                continue
            if k == "wobble":
                continue
            if k in ("collapse", "set", "spikes", "fall"):
                x0, y0, w, h = a[1:5]
                ch = {"collapse": ".", "fall": ".", "spikes": a[5] if len(a) > 5 else "^", "set": a[5] if len(a) > 5 else "."}[k]
                for yy in range(y0, y0 + h):
                    for xx in range(x0, x0 + w):
                        if 0 <= yy < H and 0 <= xx < W:
                            g[yy][xx] = ch
            elif k == "door":
                porte = (a[1], a[2])
    return g, porte, liens


O2_CASES = 40   # cases qu'on peut nager sans respirer (le jeu en permet ~70 : bonne marge)


FROID_CASES = 70   # cases parcourues loin d'un brasero (le jeu en permet bien plus)


def accessible(g, porte, liens=(), depart=None, eau=None, bulles=(), chaud=None):
    H, W = len(g), len(g[0])
    air_bulles = set(bulles)

    def mouille(x, y):
        return eau is not None and y >= eau and 0 <= x < W and 0 <= y < H and libre(x, y)

    def libre(x, y):
        if x < 0 or x >= W or y < 0:
            return False
        if y >= H:
            return True
        return g[y][x] not in "#J<>()^vcgG=qnziyV"  # B, x, F, o, _ sont traversables (dynamite / chute / illusion / fantôme / dalle)

    def mortel(x, y):
        return 0 <= y < H and 0 <= x < W and g[y][x] in "^v"

    def porteur(x, y):
        return 0 <= y < H and 0 <= x < W and g[y][x] in "#BJ<>()cgG=qnziyV"   # q (ressort fragile) compte comme un simple sol

    def debout(x, y):
        if 0 <= y < H and 0 <= x < W and g[y][x] == "|":
            return True
        if mouille(x, y) and not mortel(x, y):
            return True   # sous l'eau, on peut se tenir n'importe où
        return y < H - 0 and libre(x, y) and y + 1 < H and porteur(x, y + 1) and not mortel(x, y)

    def chute(x, y):
        while y < H:
            if mortel(x, y) or not libre(x, y):
                return None
            if debout(x, y):
                return (x, y)
            y += 1
        return None

    start = depart
    for y in range(H):
        for x in range(W):
            if g[y][x] == "P" and start is None:
                start = (x, y)
    if not start:
        return False, "pas de départ", set()
    vus = {start: FROID_CASES if chaud is not None else O2_CASES}
    pile = [start]
    while pile:
        x, y = pile.pop()
        o2 = vus[(x, y)]
        if (x, y) == porte:
            return True, "", set(vus)
        cibles = []
        dans_eau = mouille(x, y)
        if dans_eau:
            for ddx in (-1, 0, 1):
                for ddy in (-1, 0, 1):
                    if (ddx or ddy) and mouille(x + ddx, y + ddy) and not mortel(x + ddx, y + ddy):
                        if ddx and ddy and not (libre(x + ddx, y) and libre(x, y + ddy)):
                            continue
                        cibles.append((x + ddx, y + ddy))
            if y != eau:   # sous la surface : pas de saut, on nage
                cibles_sauts = False
            else:
                cibles_sauts = True
        else:
            cibles_sauts = True
        for dx in (-1, 1):
            if libre(x + dx, y) and not mortel(x + dx, y):
                c = chute(x + dx, y)
                if c:
                    cibles.append(c)
        ressort = y + 1 < H and g[y + 1][x] in "JV"
        haut = (6 if ressort else 2) if cibles_sauts else 0
        for apex in range(haut, 0, -1):
            if all(libre(x, y - r) for r in range(1, apex + 1)):
                break
        else:
            apex = 0
        if apex:
            for dx in range(-4, 5):
                for dy in range(-apex, 8):
                    if dx == 0 and dy == 0:
                        continue
                    lim = 4 if dy >= -1 else (2 if dy >= -2 else 3)
                    if ressort:
                        lim = 3
                    if abs(dx) > lim:
                        continue
                    tx, ty = x + dx, y + dy
                    if not debout(tx, ty):
                        continue
                    a = y - apex
                    pas = 1 if dx > 0 else -1
                    ok = True
                    for c in range(x + pas, tx + pas, pas) if dx else []:
                        bas = ty if c == tx else y - 1
                        for r in range(a, bas + 1):
                            if not libre(c, r) or mortel(c, r):
                                ok = False
                                break
                        if not ok:
                            break
                    if ok and dx == 0:
                        ok = all(libre(x, r) for r in range(a, ty + 1)) if ty < y else ok
                    if ok:
                        cibles.append((tx, ty))
        if g[y][x] == "|":
            for dy in (-1, 1):
                if 0 <= y + dy < H and (g[y + dy][x] == "|" or debout(x, y + dy)):
                    cibles.append((x, y + dy))
        for a_, b_ in liens:
            if a_ == (x, y):
                cibles.append(b_)
        for c in cibles:
            if chaud is not None:
                no = FROID_CASES if c in chaud else o2 - max(1, abs(c[0] - x))
                if no < 0:
                    continue
            elif mouille(*c) and c not in air_bulles and c[1] > eau:
                no = (o2 if dans_eau and (x, y) not in air_bulles and y > eau else O2_CASES) - 1
                if no < 0:
                    continue
            else:
                no = O2_CASES
            if vus.get(c, -1) < no:
                vus[c] = no
                pile.append(c)
    return False, "porte inaccessible", set(vus)


def acces(lv, g, porte, liens, depart=None):
    bulles = []
    for y, row in enumerate(lv["map"]):
        for x, c in enumerate(row):
            if c == "u":
                yy = y
                while yy >= 0 and g[yy][x] not in "#B":
                    bulles.append((x, yy))
                    yy -= 1
    chaud = None
    if lv.get("froid"):
        chaud = set()
        for y, row in enumerate(lv["map"]):
            for x, c in enumerate(row):
                if c == "f":
                    chaud.update((x + dx, y + dy) for dx in range(-2, 3) for dy in range(-2, 3))
        for y, row in enumerate(lv["map"]):
            for x, c in enumerate(row):
                if c == "P":
                    chaud.add((x, y))
    return accessible(g, porte, liens, depart, lv.get("eau"), bulles, chaud)


def verifier(niveaux):
    erreurs = 0
    for i, lv in enumerate(niveaux):
        rows = lv["map"]
        if len(set(len(r) for r in rows)) != 1:
            print(f"✗ {i+1:2d} {lv['name']}: lignes de longueurs différentes"); erreurs += 1; continue
        txt = "".join(rows)
        if txt.count("P") != 1 or txt.count("D") != 1:
            print(f"✗ {i+1:2d} {lv['name']}: P={txt.count('P')} D={txt.count('D')}"); erreurs += 1; continue
        tnt_dispo = lv["ammo"][1] + txt.count("t")
        if lv.get("_tnt", 0) > tnt_dispo:
            print(f"✗ {i+1:2d} {lv['name']}: dynamite {tnt_dispo} < {lv['_tnt']} nécessaires"); erreurs += 1
        for morts in range(4):
            g, porte, liens = appliquer(lv, morts)
            ok, pourquoi, _ = acces(lv, g, porte, liens)
            if not ok:
                print(f"✗ {i+1:2d} {lv['name']} (morts={morts}): {pourquoi}")
                erreurs += 1
                break
    return erreurs


VITESSE_ROCHER = [1.3, 1.35, 1.45, 1.5, 1.55, 1.55, 1.6, 1.6, 1.65, 1.65]


def adoucir(lv):
    """Courbe de difficulté : flèches synchronisées et espacées au début, rochers et crues plafonnés."""
    a = lv["act"]
    lv["arrowRate"] = max(lv.get("arrowRate", 110), 105 if a < 4 else 90)
    if a < 4:
        lv["arrowSync"] = True
    for tr in lv["triggers"]:
        for act in tr["act"]:
            if act[0] == "boulder":
                act[4] = min(act[4], VITESSE_ROCHER[a])
            elif act[0] == "flood":
                act[2] = round(act[2] * 0.85, 3)


def fleches_poison(lv, deja):
    """Lanceurs ( et ) = flèches empoisonnées. Actes 1-3 : bois uniquement ; actes 4-5 : un sur deux ;
    actes 6-10 : surtout empoisonnées (tout empoisonné dans les Défis)."""
    a = lv["act"]
    rows = [list(r) for r in lv["map"]]
    n_poison = 0
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c not in "<>":
                continue
            if a < 3:
                poison = False
            elif a < 5:
                poison = (x + y) % 2 == 0 or lv.get("defi")
            else:
                poison = lv.get("defi") or x % 3 != 0
            if poison:
                r[x] = "(" if c == "<" else ")"
                n_poison += 1
    lv["map"] = ["".join(r) for r in rows]
    if n_poison and not deja[0]:
        deja[0] = True
        lv["triggers"].insert(0, {"zone": [3, 1, 1, len(rows) - 2], "act": [["hint", "Pointe rouge = flèche empoisonnée : impossible à casser, évite-la !"]]})


def pieces(lv):
    """Sème des pièces d'or sur des cases sûres et accessibles (elles servent à gagner des amulettes)."""
    W = len(lv["map"][0])
    g, porte, liens = appliquer(lv, 0)
    ok, _, vus = acces(lv, g, porte, liens)
    if not ok:
        return
    rows = lv["map"]
    interdit = set()
    for tr in lv["triggers"]:
        if "zone" in tr:
            zx, _, zw, _ = tr["zone"]
            interdit.update(range(zx - 1, zx + zw + 1))
    def sur(x, y):
        return x not in interdit and rows[y][x] == "." and rows[y + 1][x] in "#" and rows[y - 1][x] == "." \
            and all(rows[y][x + d] not in "^vx" for d in (-1, 1))
    cands = sorted(c for c in vus if sur(*c) and 3 < c[0] < W - 4)
    voulu = max(3, min(7, W // 12))
    if not cands:
        return
    pas = max(1, len(cands) // voulu)
    lv["coins"] = [list(c) for c in cands[pas // 2::pas][:voulu]]


def point_de_sauvegarde(lv, plage=(0.35, 0.7), deja=()):
    """Place un drapeau au milieu des niveaux longs, sur une case sûre, accessible,
    d'où la porte reste atteignable, loin des pièges et des zones de déclenchement."""
    W = len(lv["map"][0])
    if W < 40 or lv.get("mirror") or lv.get("boss"):
        return
    g, porte, liens = appliquer(lv, 0)
    ok, _, vus = acces(lv, g, porte, liens)
    if not ok:
        return
    interdit = set()
    for tr in lv["triggers"]:
        if "zone" in tr:
            zx, _, zw, _ = tr["zone"]
            interdit.update(range(zx - 1, zx + zw + 1))
    for c in lv.get("crushers", []):
        interdit.update(range(c[0] - 2, c[0] + 3))
    for m in lv.get("movers", []):
        interdit.update(range(m[0] - 1, m[0] + m[2] + m[3] + 1))
    for w in lv.get("winds", []):
        interdit.update(range(w[0] - 1, w[1] + 2))
    rows = lv["map"]
    def sur(x, y):
        if x in interdit or not (0 < y < len(rows) - 1):
            return False
        for dx in (-1, 0, 1):
            if rows[y][x + dx] in "^vxcoJ<>" or rows[y + 1][x + dx] not in "#":
                return False
        return rows[y - 1][x] == "." and rows[y][x] == "."
    cands = sorted((c for c in vus if sur(*c)), key=lambda c: abs(c[0] - W * (plage[0] + plage[1]) / 2))
    for c in cands:
        if not (plage[0] * W <= c[0] <= plage[1] * W):
            continue
        if any(abs(c[0] - d[0]) < 10 for d in deja):
            continue
        if acces(lv, g, porte, liens, depart=c)[0]:
            lv["checkpoint"] = list(c)
            return


def drapeaux(lv):
    """Niveaux des mondes : un drapeau au milieu, deux dans les niveaux longs (vers 1/3 et 2/3)."""
    W = len(lv["map"][0])
    lv.pop("checkpoint", None)
    if W < 40:
        return
    zones = [(0.25, 0.42), (0.58, 0.76)] if W >= 95 else [(0.38, 0.66)]
    pris = []
    for a, b in zones:
        lv["checkpoint"] = None
        point_de_sauvegarde(lv, (a, b), pris)
        c = lv.pop("checkpoint", None)
        if c:
            pris.append(c)
    if pris:
        lv["checkpoints"] = pris


INCA_ORIG = [1, 2, 3, 4, 6, 7, 8, 9, 12, 16, 19, 21, 27, 31, 32, 42, 51, 74, 94, None]


def main():
    anciens = []
    for a, fn in enumerate([acte1, acte2, acte3, acte4, acte5, acte6, acte7, acte8, acte9, acte10]):
        for lv in fn():
            lv["act"] = a
            anciens.append(lv)
    assert len(anciens) == 100, len(anciens)
    deja = [False]
    for i, lv in enumerate(anciens):
        lv["orig"] = i + 1
        adoucir(lv)
        fleches_poison(lv, deja)
        point_de_sauvegarde(lv)
        pieces(lv)
    # Monde 1 : les 20 niveaux incas. Mondes 2 à 5 (provisoires) : les 80 autres anciens niveaux.
    retires = set(x for x in INCA_ORIG if x) | {10}
    autres = [lv for lv in anciens if lv["orig"] not in retires]
    inca = monde_inca()
    PALETTE_INCA = ["jungle", "jungle", "crypte", "jungle", "jungle", "jungle", "crypte", "jungle", "sanctuaire", "crypte",
                    "mines", "mines", "mines", "cascades", "sanctuaire", "jungle", "crypte", "jungle", "jungle", "sanctuaire"]
    for i, lv in enumerate(inca):
        lv["act"] = min(4, i // 4)
        lv["palette"] = PALETTE_INCA[i]
        if INCA_ORIG[i]:
            lv["orig"] = INCA_ORIG[i]
        # moins de bulles d'Archibald pendant le jeu : l'histoire est racontée en fin de niveau
        for tr in lv["triggers"]:
            tr["act"] = [a for a in tr["act"] if a[0] != "say"]
        lv["triggers"] = [tr for tr in lv["triggers"] if tr["act"]]
        adoucir(lv)
        drapeaux(lv)
        pieces(lv)
    # Monde 3 : les 3 premiers niveaux sont les essais des abysses (ils remplacent 3 anciens niveaux)
    mer = abysses_essai()
    for lv in mer:
        lv["act"] = 3
        adoucir(lv)
        drapeaux(lv)
        pieces(lv)
    him = monde_himalaya()
    for lv in him:
        lv["act"] = 2
        lv.setdefault("palette", "himalaya")
        for tr in lv["triggers"]:
            tr["act"] = [a for a in tr["act"] if a[0] != "say"]
        lv["triggers"] = [tr for tr in lv["triggers"] if tr["act"]]
        if lv["palette"] == "himalaya":
            # dehors : pas de plafond, on voit le ciel
            rows = [list(r) for r in lv["map"]]
            for x in range(1, len(rows[0]) - 1):
                if rows[1][x] == ".":
                    rows[0][x] = "."
            lv["map"] = ["".join(r) for r in rows]
            lv.setdefault("decor", "himalaya")
        adoucir(lv)
        drapeaux(lv)
        pieces(lv)
    # Mondes 3 à 5 : les essais des abysses, puis les anciens niveaux restants (les plus difficiles)
    # identifiants stables : la sauvegarde suit chaque niveau même s'il change de place
    for i, lv in enumerate(inca): lv["id"] = f"inca-{i+1}"
    for i, lv in enumerate(him): lv["id"] = f"him-{i+1}"
    for i, lv in enumerate(mer): lv["id"] = f"mer-{i+1}"
    for lv in autres: lv["id"] = f"old-{lv['orig']}"
    ordre_v2 = [lv["id"] for lv in inca] + [lv["id"] for lv in autres]
    ordre_v3 = [lv["id"] for lv in inca] + [lv["id"] for lv in autres[:20]] + [lv["id"] for lv in mer] + [lv["id"] for lv in autres[23:]]
    niveaux = inca + him + mer + autres[-57:]
    assert len(niveaux) == 100, len(niveaux)
    err = verifier(niveaux)
    for lv in niveaux:
        lv.pop("_tnt", None)
        lv.pop("_liens", None)
    with open(SORTIE, "w", encoding="utf-8") as f:
        f.write("/* Généré par outils/niveaux.py — ne pas modifier à la main. */\n")
        f.write("window.TEMPLE_ACTS = " + json.dumps(ACTES, ensure_ascii=False) + ";\n")
        f.write("window.TEMPLE_ORDRE_V2 = " + json.dumps(ordre_v2) + ";\n")
        f.write("window.TEMPLE_ORDRE_V3 = " + json.dumps(ordre_v3) + ";\n")
        f.write("window.TEMPLE_LEVELS = [\n")
        for lv in niveaux:
            f.write("  " + json.dumps(lv, ensure_ascii=False) + ",\n")
        f.write("];\n")
    tailles = [len(lv["map"][0]) for lv in niveaux]
    print(f"{len(niveaux)} niveaux écrits, largeur {min(tailles)}–{max(tailles)} cases, {err} erreur(s)")
    print("Himalaya :", ", ".join(f"{i+1} {lv['name']} ({len(lv['map'][0])}×{len(lv['map'])})" for i, lv in enumerate(him)))
    print("Abysses :", ", ".join(f"{lv['name']} ({len(lv['map'][0])}×{len(lv['map'])})" for lv in mer))
    print("Monde inca :", ", ".join(f"{i+1} {lv['name']} ({len(lv['map'][0])}×{len(lv['map'])}, {len(lv.get('checkpoints', []))} drapeau(x))" for i, lv in enumerate(inca)))
    sys.exit(1 if err else 0)


if __name__ == "__main__":
    main()

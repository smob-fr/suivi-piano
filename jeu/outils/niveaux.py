#!/usr/bin/env python3
"""Générateur + vérificateur des 50 niveaux du Temple qui Triche.

    python3 jeu/outils/niveaux.py        # écrit jeu/levels.js et vérifie chaque niveau

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
]

SOLIDE = set("#BxJ<>c")

# Numéro du niveau en cours de construction (les actes sont construits dans l'ordre).
NUMERO = [0]
# Un niveau « Défi » tous les 3 niveaux ; quand ça tombe sur un niveau Histoire (15, 30, 45),
# c'est le niveau juste avant qui devient le défi.
DEFIS = {n for n in range(3, 51, 3) if n not in (15, 30, 45)} | {14, 29, 44}


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
                yy = self.y - 2 if e == "b" else self.y
                self.put(ex, yy, e)
        if objet:
            self.put(x0 + max(0, n // 2 - 1) if not ennemi else x0, self.y, objet)
        return x0

    def depart(self, n=4):
        x0 = self.plat(n)
        self.put(x0 + 1, self.y, "P")
        return x0

    def porte(self, n=4):
        if self.defi and not self._defi_fait:
            self._defi_fait = True
            self.passage_defi()
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

    def mur_fissure(self, haut=2):
        x0 = self.colonne()
        for r in range(1, self.y + 1):
            self.put(x0, r, "#")
        for r in range(self.y - haut + 1, self.y + 1):
            self.put(x0, r, "B")
        self.tnt_besoin += 1
        return x0

    def sol_fissure(self, n=3, chute=3):
        """Sol fissuré au-dessus d'un couloir plus bas ; un mur bloque le chemin du haut."""
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

    def stalactites(self, n=9, pas=3):
        """Couloir bas dont les stalactites tombent quand on passe dessous et restent plantées au sol."""
        x0 = self.x
        p = self.y - 4
        for _ in range(n):
            self.colonne(plafond=p)
        for dx in range(2, n - 1, pas):
            self.put(x0 + dx, p + 1, "v")
            self.t([["dropspike", x0 + dx, p + 1, 10]], self.Z(max(x0, x0 + dx - 2)))
        return x0

    def sprint(self):
        x0 = self.pics(2); self.plat(1); self.fosse(3, "vide"); self.plat(1); self.pics(2); self.plat(1)
        return x0

    def passage_defi(self):
        """Section difficile ajoutée avant la porte des niveaux Défi, variée d'un défi à l'autre."""
        k = self.num // 3
        menu = [self.sprint, self.clignote, self.ressort_pique, self.fantome, self.stalactites]
        self.plat(2)
        menu[k % 5]()
        if self.num > 20:
            self.plat(2)
            menu[(k + 2) % 5]()
        self.plat(2)
        self.astuce("Défi : dernier passage avant la porte !", self.x - 1, max=0)

    # ---------- pièges ----------
    def effondrement(self, n=2, avance=2, delai=0, **kw):
        """Sol plat ; en arrivant, les n cases devant s'effondrent (fosse mortelle)."""
        x0 = self.plat(avance + n + 1)
        self.t([["collapse", x0 + avance, self.y + 1, n, self.h - self.y - 1, delai]], self.Z(x0), **kw)
        return x0

    def pics_surprise(self, n=2, avance=2, **kw):
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
        d = {"name": self.nom, "type": self.type, "ammo": self.ammo, "map": rows, "triggers": self.trig}
        d.update(self.opts)
        if self.defi:
            d["defi"] = True
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
        {"max": 0, "zone": [7, 1, 1, 15], "act": [["say", "Professeur Lecoquin, pour te servir. Le trésor, c'est pour moi. Les pièges, c'est pour toi."]]},
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
    n.porte(4)
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
    n.plat(6, ennemi="m"); n.fleches(7, 1); n.astuce("Saute par-dessus les flèches", n.x - 6)
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

    n = Niveau("Le couloir des flèches", "action", arrowRate=70)
    n.depart(3); n.dit("Cours. Vraiment. Cours.", max=0)
    n.fleches(5, 1); n.plat(2)
    n.t([["collapse", 1, 16, 4, 1, 30], ["say", "Derrière toi, le sol s'en va."]], n.Z(n.x - 1))
    n.fleches(5, 1); n.pics(1); n.fleches(5, 1); n.plat(2); n.fleches(4, 1)
    n.plat(4); n.porte(4)
    L.append(n.fini())

    n = Niveau("Le scribe", "histoire", decor="glyphs")
    n.depart(4); n.dit("Un scribe a gravé ici le chemin du trésor. Je l'ai un peu raturé.", max=0)
    n.plat(6); n.dit("Il a aussi gravé : « Lecoquin est un tricheur ». Calomnie !", n.x - 2)
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
    n.plat(5, objet="t"); n.mur_fissure(); n.plat(6, ennemi="m"); n.plat(3, ennemi="b"); n.porte(4)
    L.append(n.fini())

    n = Niveau("Les étais", "trahison")
    n.depart(3); n.dit("Les étais sont neufs. Je les ai achetés d'occasion.", max=0)
    n.plafond_bas(10, chutes=[(6, 8)])
    n.t([["dark", 1], ["say", "Oups. J'ai soufflé les torches. Quelle maladresse !"]], n.Z(n.x - 2))
    n.effondrement(2, 2, 0, max=0, lethal=True)
    n.dit("La même ? Non, pas la même.", min=1)
    n.effondrement(2, 3, 10, min=1)
    n.plafond_bas(8, chutes=[(3, 12), (6, 6)])
    n.pics_surprise(2, 3); n.plat(3); n.porte(4)
    L.append(n.fini())

    n = Niveau("Les chauves-souris", "exploration", ammo=(8, 1))
    n.depart(4); n.dit("Elles adorent les chapeaux. Surtout avec une tête dedans.", max=0)
    n.plateformes([(2, 4, 0), (2, 4, -1), (2, 3, 0), (3, 4, 1)], fond="vide")
    n.plat(6, ennemi="b"); n.plateformes([(2, 3, -1), (2, 3, 0), (2, 4, 1)], fond="vide")
    n.plat(3, ennemi="b"); n.porte(4)
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
    n.plat(2); n.porte(4)
    L.append(n.fini())

    n = Niveau("Les ressorts fous", "exploration", h=24, ammo=(6, 1))
    n.depart(3); n.dit("Ressorts, chauves-souris, vide. Mon trio préféré.", max=0)
    n.plat(2); n.ressort(4); n.plat(3); n.ressort_pique(); n.fosse(2, "vide"); n.plat(2)
    n.ressort(4); n.plat(4, ennemi="b"); n.fosse(2, "vide"); n.plat(3, objet="a")
    n.ressort(4); n.plat(5, ennemi="m"); n.descend(6); n.plat(3); n.porte(4)
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
    n.plat(4, ennemi="s"); n.porte(4)
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
    n.plat(4, ennemi="m"); n.mur_fissure(); n.plat(3); n.porte(4)
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
    n.mur_fissure(); n.plat(3); n.porte(4)
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

    n = Niveau("Lecoquin s'amuse", "trahison")
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
    n.mur_fissure(); n.plat(3); n.sol_fissure(3, 3); n.plat(5, ennemi="ss"); n.porte(4)
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
    n.faux_mur(1); n.plat(2); n.porte(3)
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
    n = Niveau("L'Œil de Jade", "histoire", ammo=(6, 3), decor="eye", doorHidden=True)
    n.depart(4); n.dit("Le coffre de l'Œil de Jade est fermé par trois sceaux de pierre.", max=0)
    n.dit("J'ai oublié ma dynamite. Toi, non ? Zut, zut et zut.", 6)
    n.plat(6); i1 = n.mur_fissure(1); n.plat(3, objet="t"); n.fosse(2)
    n.plat(5, ennemi="m"); i2 = n.mur_fissure(1); n.plat(4); n.pics(1); n.plat(3, objet="t")
    n.plat(4, ennemi="b"); i3 = n.mur_fissure(1); n.plat(4); n.porte(4)
    n.t([["showdoor"], ["say", "Non ! Mon trésor ! Bon… on partage ? Non ? Bien joué, Max."], ["shake", 10]], allB=True)
    L.append(n.fini())
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
    if lv.get("doorStart"):
        porte_init = tuple(lv["doorStart"])
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
            if k in ("collapse", "set", "spikes", "fall"):
                x0, y0, w, h = a[1:5]
                ch = {"collapse": ".", "fall": ".", "spikes": a[5] if len(a) > 5 else "^", "set": a[5] if len(a) > 5 else "."}[k]
                for yy in range(y0, y0 + h):
                    for xx in range(x0, x0 + w):
                        if 0 <= yy < H and 0 <= xx < W:
                            g[yy][xx] = ch
            elif k == "door":
                porte = (a[1], a[2])
    return g, porte


def accessible(g, porte):
    H, W = len(g), len(g[0])

    def libre(x, y):
        if x < 0 or x >= W or y < 0:
            return False
        if y >= H:
            return True
        return g[y][x] not in "#J<>^vc"  # B, x, F, o sont traversables (dynamite / chute / illusion / fantôme)

    def mortel(x, y):
        return 0 <= y < H and 0 <= x < W and g[y][x] in "^v"

    def porteur(x, y):
        return 0 <= y < H and 0 <= x < W and g[y][x] in "#BJ<>c"

    def debout(x, y):
        return y < H - 0 and libre(x, y) and y + 1 < H and porteur(x, y + 1) and not mortel(x, y)

    def chute(x, y):
        while y < H:
            if mortel(x, y) or not libre(x, y):
                return None
            if debout(x, y):
                return (x, y)
            y += 1
        return None

    start = None
    for y in range(H):
        for x in range(W):
            if g[y][x] == "P":
                start = (x, y)
    if not start:
        return False, "pas de départ"
    vus, pile = {start}, [start]
    while pile:
        x, y = pile.pop()
        if (x, y) == porte:
            return True, ""
        cibles = []
        for dx in (-1, 1):
            if libre(x + dx, y) and not mortel(x + dx, y):
                c = chute(x + dx, y)
                if c:
                    cibles.append(c)
        ressort = y + 1 < H and g[y + 1][x] == "J"
        haut = 6 if ressort else 2
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
        for c in cibles:
            if c not in vus:
                vus.add(c)
                pile.append(c)
    return False, "porte inaccessible"


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
            g, porte = appliquer(lv, morts)
            ok, pourquoi = accessible(g, porte)
            if not ok:
                print(f"✗ {i+1:2d} {lv['name']} (morts={morts}): {pourquoi}")
                erreurs += 1
                break
    return erreurs


def main():
    niveaux = []
    for a, fn in enumerate([acte1, acte2, acte3, acte4, acte5]):
        for lv in fn():
            lv["act"] = a
            niveaux.append(lv)
    assert len(niveaux) == 50, len(niveaux)
    err = verifier(niveaux)
    for lv in niveaux:
        lv.pop("_tnt", None)
    with open(SORTIE, "w", encoding="utf-8") as f:
        f.write("/* Généré par outils/niveaux.py — ne pas modifier à la main. */\n")
        f.write("window.TEMPLE_ACTS = " + json.dumps(ACTES, ensure_ascii=False) + ";\n")
        f.write("window.TEMPLE_LEVELS = [\n")
        for lv in niveaux:
            f.write("  " + json.dumps(lv, ensure_ascii=False) + ",\n")
        f.write("];\n")
    tailles = [len(lv["map"][0]) for lv in niveaux]
    print(f"{len(niveaux)} niveaux écrits, largeur {min(tailles)}–{max(tailles)} cases, {err} erreur(s)")
    sys.exit(1 if err else 0)


if __name__ == "__main__":
    main()

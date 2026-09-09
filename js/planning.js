// Suivi Piano — dates, jours fériés, périodes sans cours, génération des séances

import { uid, nowISO } from "./util.js";
import { JOURS } from "./util.js";
import { getAll, put, remove, bulkPut } from "./db.js";

// Les créneaux récurrents sont générés jusqu'à la fin de l'année scolaire
// (les créneaux sont valables de septembre à juillet).
export function finAnneeScolaire(refYmd) {
  const d = parseYmd(refYmd || today());
  const mois = d.getMonth() + 1; // 1–12
  const annee = mois >= 8 ? d.getFullYear() + 1 : d.getFullYear();
  return `${annee}-07-31`;
}

/* ---------- Dates (locales, format "YYYY-MM-DD") ---------- */

export function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseYmd(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function today() {
  return ymd(new Date());
}

export function addDays(s, n) {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

/** Index du jour, 0 = lundi … 6 = dimanche. */
export function jourIndex(s) {
  return (parseYmd(s).getDay() + 6) % 7;
}

export function jourNom(s) {
  return JOURS[jourIndex(s)];
}

/** Lundi de la semaine contenant `s`. */
export function lundiDeLaSemaine(s) {
  return addDays(s, -jourIndex(s));
}

export function memesSemaine(a, b) {
  return lundiDeLaSemaine(a) === lundiDeLaSemaine(b);
}

const FMT_JOUR = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const FMT_JOUR_COURT = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });

export function libelleJour(s, court = false) {
  return (court ? FMT_JOUR_COURT : FMT_JOUR).format(parseYmd(s));
}

export function finHeure(heure, dureeMin) {
  const [h, m] = heure.split(":").map(Number);
  const t = h * 60 + m + dureeMin;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/* ---------- Jours fériés (France métropolitaine) ---------- */

function paques(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, mois - 1, jour);
}

const feriesCache = new Map();

export function joursFeries(year) {
  if (feriesCache.has(year)) return feriesCache.get(year);
  const p = paques(year);
  const plus = (n) => {
    const d = new Date(p);
    d.setDate(d.getDate() + n);
    return ymd(d);
  };
  const map = new Map([
    [`${year}-01-01`, "Jour de l'an"],
    [`${year}-05-01`, "Fête du Travail"],
    [`${year}-05-08`, "Victoire 1945"],
    [`${year}-07-14`, "Fête nationale"],
    [`${year}-08-15`, "Assomption"],
    [`${year}-11-01`, "Toussaint"],
    [`${year}-11-11`, "Armistice"],
    [`${year}-12-25`, "Noël"],
    [plus(1), "Lundi de Pâques"],
    [plus(39), "Ascension"],
    [plus(50), "Lundi de Pentecôte"],
  ]);
  feriesCache.set(year, map);
  return map;
}

export function ferieNom(s) {
  return joursFeries(Number(s.slice(0, 4))).get(s) || null;
}

/* ---------- Périodes sans cours ---------- */

export function enPeriode(s, periodes) {
  return periodes.find((p) => s >= p.debut && s <= p.fin) || null;
}

export const periodes = {
  all: () => getAll("periodes"),
  save: (p) => put("periodes", p),
  remove: (id) => remove("periodes", id),
};

/* ---------- Conflits de créneaux ---------- */

function heureEnMinutes(h) {
  const [hh, mm] = String(h || "0:0").split(":").map(Number);
  return (hh || 0) * 60 + (mm || 0);
}

/** Deux créneaux se chevauchent-ils (même jour, plages horaires qui se recouvrent) ? */
export function creneauxSeChevauchent(a, b) {
  if (!a || !b || a.jour !== b.jour) return false;
  const aDeb = heureEnMinutes(a.heure);
  const aFin = aDeb + (a.dureeMin || 0);
  const bDeb = heureEnMinutes(b.heure);
  const bFin = bDeb + (b.dureeMin || 0);
  return aDeb < bFin && bDeb < aFin;
}

/** Chevauchement entre deux créneaux d'un même élève. */
export function conflitInterne(creneaux) {
  for (let i = 0; i < creneaux.length; i += 1) {
    for (let j = i + 1; j < creneaux.length; j += 1) {
      if (creneauxSeChevauchent(creneaux[i], creneaux[j])) return [creneaux[i], creneaux[j]];
    }
  }
  return null;
}

/**
 * Cherche un chevauchement entre les créneaux fournis et ceux des autres élèves actifs.
 * @returns {{ creneau, eleve, autreCreneau } | null}
 */
export async function chercherConflitCreneaux(creneaux, selfId) {
  const elevesAll = await getAll("eleves");
  for (const autre of elevesAll) {
    if (autre.id === selfId || autre.statut !== "actif" || !Array.isArray(autre.creneaux)) continue;
    for (const c of creneaux) {
      for (const ac of autre.creneaux) {
        if (creneauxSeChevauchent(c, ac)) return { creneau: c, eleve: autre, autreCreneau: ac };
      }
    }
  }
  return null;
}

/* ---------- Génération des séances prévues ---------- */

function seanceAuto(eleve, creneau, date, key) {
  const now = nowISO();
  return {
    id: uid(),
    date,
    heure: creneau.heure,
    dureeMin: creneau.dureeMin,
    eleveId: eleve.id,
    eleveIds: [eleve.id],
    payeurType: eleve.payeurId ? "payeur" : "eleve",
    payeurId: eleve.payeurId || eleve.id,
    lieu: eleve.lieu,
    statut: "prevue",
    montant: null,
    modePaiement: eleve.modePaiementHabituel,
    facturee: false,
    commentaire: "",
    rattrapageDe: null,
    source: "auto",
    creneauKey: key,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Crée / met à jour / nettoie les séances `prevue` automatiques sur les 2 semaines
 * à venir, à partir des créneaux récurrents des élèves actifs.
 * Ne touche jamais aux séances `effectuee` / `annulee` ni aux séances manuelles.
 */
export async function genererHorizon() {
  const debut = today();
  const fin = finAnneeScolaire(debut);
  const [elevesAll, seancesAll, listePeriodes] = await Promise.all([
    getAll("eleves"),
    getAll("seances"),
    getAll("periodes"),
  ]);

  const actifs = elevesAll.filter(
    (e) => e.statut === "actif" && e.creneauRecurrent && Array.isArray(e.creneaux) && e.creneaux.length
  );

  const autoIndex = new Map();
  const autoPrevuesFutures = [];
  for (const s of seancesAll) {
    if (s.source !== "auto") continue;
    autoIndex.set(`${s.creneauKey}|${s.date}`, s);
    if (s.statut === "prevue" && s.date >= debut) autoPrevuesFutures.push(s);
  }

  const voulus = new Set();
  const aCreer = [];
  const aMettreAJour = [];

  for (const eleve of actifs) {
    for (const c of eleve.creneaux) {
      const idx = JOURS.indexOf(c.jour);
      if (idx < 0 || !/^\d{2}:\d{2}$/.test(c.heure || "")) continue;
      const key = `${eleve.id}#${c.jour}#${c.heure}`;
      for (let d = debut; d <= fin; d = addDays(d, 1)) {
        if (jourIndex(d) !== idx) continue;
        if (enPeriode(d, listePeriodes)) continue;
        const kd = `${key}|${d}`;
        voulus.add(kd);
        const ex = autoIndex.get(kd);
        if (!ex) {
          aCreer.push(seanceAuto(eleve, c, d, key));
        } else if (ex.statut === "prevue") {
          const pType = eleve.payeurId ? "payeur" : "eleve";
          const pId = eleve.payeurId || eleve.id;
          let modifie = false;
          if (ex.dureeMin !== c.dureeMin) { ex.dureeMin = c.dureeMin; modifie = true; }
          if (ex.lieu !== eleve.lieu) { ex.lieu = eleve.lieu; modifie = true; }
          if (ex.payeurType !== pType || ex.payeurId !== pId) {
            ex.payeurType = pType;
            ex.payeurId = pId;
            modifie = true;
          }
          if (modifie) aMettreAJour.push(ex);
        }
      }
    }
  }

  const aSupprimer = autoPrevuesFutures.filter((s) => !voulus.has(`${s.creneauKey}|${s.date}`));

  if (aCreer.length) await bulkPut("seances", aCreer);
  for (const s of aMettreAJour) await put("seances", s);
  for (const s of aSupprimer) await remove("seances", s.id);

  return { crees: aCreer.length, majs: aMettreAJour.length, supprimes: aSupprimer.length };
}

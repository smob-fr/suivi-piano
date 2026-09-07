// Suivi Piano — import CSV des eleves

import { uid } from "./util.js";
import { nouvelEleve, nouveauPayeur } from "./model.js";
import { JOURS, DUREES, LIEUX, MODES_PAIEMENT } from "./util.js";

export const CSV_COLUMNS = [
  "prenom",
  "nom",
  "mineur",
  "rep_prenom",
  "rep_nom",
  "rep_telephone",
  "rep_email",
  "telephone",
  "email",
  "adr_numero",
  "adr_rue",
  "adr_complement",
  "adr_cp",
  "adr_ville",
  "lieu",
  "jour",
  "heure",
  "duree_min",
  "creneau_recurrent",
  "tarif_habituel",
  "mode_paiement",
  "eligible_credit_impot",
  "date_debut",
  "foyer",
  "notes",
];

export function templateCSV() {
  const rows = [
    CSV_COLUMNS,
    ["Lea", "Martin", "oui", "Sophie", "Martin", "0611223344", "sophie.martin@example.com",
      "", "", "12", "rue des Lilas", "", "69100", "Villeurbanne",
      "domicile", "mardi", "17:00", "45", "oui", "25", "cheque", "oui", "2024-09-10", "", "Debutante"],
    ["Paul", "Durand", "non", "", "", "", "",
      "0678901234", "paul.durand@example.com", "3", "avenue Jean Jaures", "Bat. B", "69003", "Lyon",
      "chez_prof", "mercredi", "18:30", "60", "oui", "30", "virement", "non", "", "", ""],
    ["Claire", "Petit", "non", "", "", "", "",
      "0700000000", "", "5", "chemin du Piano", "", "69005", "Lyon",
      "domicile", "samedi", "10:00", "60", "oui", "", "cheque", "oui", "", "Famille Petit", ""],
    ["Tom", "Petit", "oui", "Claire", "Petit", "0700000000", "",
      "", "", "5", "chemin du Piano", "", "69005", "Lyon",
      "domicile", "samedi", "10:45", "30", "oui", "", "cheque", "oui", "", "Famille Petit", ""],
  ];
  const body = rows.map((r) => r.map(csvCell).join(";")).join("\r\n");
  return "﻿" + body + "\r\n";
}

function csvCell(v) {
  const s = String(v ?? "");
  return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/* ---------- Analyse ---------- */

function deaccent(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function detectDelimiter(firstLine) {
  const counts = { ";": 0, ",": 0, "\t": 0 };
  let inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch] += 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] || ";";
}

/** Parse un texte CSV en tableau de lignes (tableaux de chaines). */
export function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM
  const nl = text.search(/\r?\n/);
  const firstLine = nl === -1 ? text : text.slice(0, nl);
  const delim = detectDelimiter(firstLine);

  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; }
        else inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === delim) { row.push(field); field = ""; continue; }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((c) => c !== "")) rows.push(row);
  }
  return rows;
}

const TRUTHY = new Set(["oui", "o", "yes", "y", "true", "vrai", "1", "x"]);
const FALSY = new Set(["", "non", "n", "no", "false", "faux", "0"]);

function toBool(v, fallback = false) {
  const s = String(v || "").trim().toLowerCase();
  if (TRUTHY.has(s)) return true;
  if (FALSY.has(s)) return false;
  return fallback;
}

function toNumber(v) {
  const s = String(v || "").trim().replace(",", ".").replace(/[^\d.]/g, "");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normKey(h) {
  return deaccent(h).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

const HEADER_ALIASES = {
  prenom: "prenom", firstname: "prenom",
  nom: "nom", lastname: "nom", name: "nom",
  telephone: "telephone", tel: "telephone", portable: "telephone", mobile: "telephone",
  email: "email", mail: "email", courriel: "email",
  adresse: "adr_rue", rue: "adr_rue",
  numero: "adr_numero", no: "adr_numero", n: "adr_numero",
  complement: "adr_complement",
  cp: "adr_cp", code_postal: "adr_cp", codepostal: "adr_cp",
  ville: "adr_ville", commune: "adr_ville",
  lieu: "lieu", jour: "jour", heure: "heure",
  duree: "duree_min", duree_min: "duree_min", duree_minutes: "duree_min",
  tarif: "tarif_habituel", tarif_habituel: "tarif_habituel", prix: "tarif_habituel",
  mode_paiement: "mode_paiement", paiement: "mode_paiement", reglement: "mode_paiement",
  foyer: "foyer", famille: "foyer",
  notes: "notes", note: "notes", commentaire: "notes",
  mineur: "mineur",
  eligible_credit_impot: "eligible_credit_impot", credit_impot: "eligible_credit_impot",
  date_debut: "date_debut", debut: "date_debut",
  creneau_recurrent: "creneau_recurrent", recurrent: "creneau_recurrent",
  rep_prenom: "rep_prenom", rep_nom: "rep_nom",
  rep_telephone: "rep_telephone", rep_tel: "rep_telephone", rep_email: "rep_email",
};

export function mapHeaders(headerRow) {
  return headerRow.map((h) => {
    const k = normKey(h);
    return HEADER_ALIASES[k] || (CSV_COLUMNS.includes(k) ? k : null);
  });
}

const JOUR_SET = new Set(JOURS);
const LIEU_SET = new Set(Object.keys(LIEUX));
const MODE_SET = new Set(Object.keys(MODES_PAIEMENT));

function normJour(v) {
  const s = deaccent(v).trim().toLowerCase();
  return JOUR_SET.has(s) ? s : "";
}

function normLieu(v) {
  const s = deaccent(v).trim().toLowerCase().replace(/[^a-z]/g, "_");
  if (LIEU_SET.has(s)) return s;
  if (s.includes("visio") || s.includes("distance") || s.includes("ligne")) return "visio";
  if (s.includes("prof") || s.includes("studio") || s.includes("cabinet")) return "chez_prof";
  if (s.includes("domicile") || s.includes("eleve") || s.includes("maison")) return "domicile";
  return "";
}

function normMode(v) {
  const s = deaccent(v).trim().toLowerCase().replace(/[^a-z]/g, "");
  if (MODE_SET.has(s)) return s;
  if (s.includes("cr") && s.includes("cesu")) return "crcesu";
  if (s.includes("cesu")) return "cesu";
  if (s.includes("cheque") || s === "chq") return "cheque";
  if (s.includes("virement") || s === "vir") return "virement";
  if (s.includes("espece") || s.includes("liquide") || s.includes("cash")) return "liquide";
  return "";
}

function normHeure(v) {
  const s = String(v || "").trim().toLowerCase().replace("h", ":").replace(/[.\s]/g, "");
  const m = s.match(/^(\d{1,2}):?(\d{2})?$/);
  if (!m) return "";
  const hh = String(Math.min(23, parseInt(m[1], 10))).padStart(2, "0");
  const mm = String(m[2] ? Math.min(59, parseInt(m[2], 10)) : 0).padStart(2, "0");
  return `${hh}:${mm}`;
}

function normDate(v) {
  const s = String(v || "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

/**
 * Transforme les lignes CSV en eleves + payeurs prets a enregistrer.
 * @returns {{ eleves:Array, payeurs:Array, lignes:Array }}
 */
export function csvToEleves(rows) {
  if (!rows.length) return { eleves: [], payeurs: [], lignes: [] };
  const headerCols = mapHeaders(rows[0]);
  const dataRows = rows.slice(1);

  const foyerToPayeur = new Map();
  const payeurs = [];
  const lignes = [];
  const eleves = [];

  dataRows.forEach((cells, i) => {
    const rec = {};
    headerCols.forEach((col, idx) => {
      if (col) rec[col] = (cells[idx] ?? "").trim();
    });

    const erreurs = [];
    const avertissements = [];
    const e = nouvelEleve();
    e.id = uid();
    e.prenom = rec.prenom || "";
    e.nom = rec.nom || "";
    if (!e.prenom && !e.nom) erreurs.push("Prenom et nom manquants");

    e.mineur = toBool(rec.mineur);
    e.telephone = rec.telephone || "";
    e.email = rec.email || "";
    e.adresse = {
      numero: rec.adr_numero || "",
      rue: rec.adr_rue || "",
      complement: rec.adr_complement || "",
      cp: rec.adr_cp || "",
      ville: rec.adr_ville || "",
    };

    if (e.mineur || rec.rep_prenom || rec.rep_nom || rec.rep_telephone || rec.rep_email) {
      e.representantLegal = {
        prenom: rec.rep_prenom || "",
        nom: rec.rep_nom || "",
        telephone: rec.rep_telephone || "",
        email: rec.rep_email || "",
      };
    }

    if (rec.lieu) {
      const l = normLieu(rec.lieu);
      if (l) e.lieu = l;
      else avertissements.push(`Lieu « ${rec.lieu} » non reconnu, laisse sur Domicile`);
    }

    e.creneauRecurrent = rec.creneau_recurrent != null && rec.creneau_recurrent !== ""
      ? toBool(rec.creneau_recurrent, true)
      : true;

    const jour = normJour(rec.jour);
    const heure = normHeure(rec.heure);
    let duree = toNumber(rec.duree_min);
    if (rec.jour && !jour) avertissements.push(`Jour « ${rec.jour} » non reconnu, creneau ignore`);
    if (rec.heure && !heure) avertissements.push(`Heure « ${rec.heure} » non reconnue, creneau ignore`);
    if (duree != null && !DUREES.includes(duree)) {
      const near = DUREES.reduce((a, b) => (Math.abs(b - duree) < Math.abs(a - duree) ? b : a));
      avertissements.push(`Duree ${duree} min ajustee a ${near} min`);
      duree = near;
    }
    if (jour && heure) {
      e.creneaux = [{ jour, heure, dureeMin: duree || 60 }];
    }

    e.tarifHabituel = toNumber(rec.tarif_habituel);
    if (rec.mode_paiement) {
      const m = normMode(rec.mode_paiement);
      if (m) e.modePaiementHabituel = m;
      else avertissements.push(`Mode de paiement « ${rec.mode_paiement} » non reconnu`);
    }
    e.eligibleCreditImpot = toBool(rec.eligible_credit_impot);
    e.dateDebut = normDate(rec.date_debut);
    if (rec.date_debut && !e.dateDebut) avertissements.push(`Date de debut « ${rec.date_debut} » ignoree`);
    e.notes = rec.notes || "";

    const foyer = (rec.foyer || "").trim();
    if (foyer) {
      let p = foyerToPayeur.get(foyer.toLowerCase());
      if (!p) {
        p = nouveauPayeur();
        p.id = uid();
        const label = foyer.replace(/^famille\s+/i, "").trim();
        const parts = label.split(/\s+/);
        p.prenom = parts.length > 1 ? parts[0] : "";
        p.nom = parts.length > 1 ? parts.slice(1).join(" ") : parts[0] || foyer;
        if (e.representantLegal && (e.representantLegal.prenom || e.representantLegal.nom)) {
          p.prenom = e.representantLegal.prenom || p.prenom;
          p.nom = e.representantLegal.nom || p.nom;
          p.telephone = e.representantLegal.telephone || "";
          p.email = e.representantLegal.email || "";
        }
        p.adresse = { ...e.adresse };
        p.modePaiementHabituel = e.modePaiementHabituel;
        p.eligibleCreditImpot = e.eligibleCreditImpot;
        p._foyerLabel = foyer;
        foyerToPayeur.set(foyer.toLowerCase(), p);
        payeurs.push(p);
      }
      e.payeurId = p.id;
    }

    eleves.push(e);
    lignes.push({ ligne: i + 2, eleve: e, foyer, erreurs, avertissements });
  });

  return { eleves, payeurs, lignes };
}

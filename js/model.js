// Suivi Piano — fabriques et règles métier (indépendantes de l'UI et du stockage)

import { personneNom, fmtDuree, el } from "./util.js";

/** Petit badge de statut de séance (élément DOM). */
export function badgeStatut(statut) {
  const map = {
    prevue: ["Prévu", "prevue"],
    effectuee: ["Effectué", "effectuee"],
    annulee: ["Annulé", "annulee"],
  };
  const [txt, kind] = map[statut] || [statut, ""];
  return el("span.badge-statut", { class: `badge-statut--${kind}` }, txt);
}

export function adresseVide() {
  return { numero: "", rue: "", complement: "", cp: "", ville: "" };
}

export function nouvelEleve() {
  return {
    id: "",
    prenom: "",
    nom: "",
    mineur: false,
    representantLegal: null, // { prenom, nom, telephone, email }
    telephone: "",
    email: "",
    adresse: adresseVide(),
    lieu: "domicile",
    creneauRecurrent: true,
    creneaux: [], // [{ jour: "lundi", heure: "17:00", dureeMin: 60 }]
    payeurId: null, // id d'un payeur externe (ex. grand-parent non élève)
    payeurEleveId: null, // id d'un autre élève qui paie (ex. le parent, lui aussi élève)
    // aucun des deux => l'élève est son propre payeur
    tarifHabituel: null, // € pour une séance de cet élève seul
    modePaiementHabituel: "cheque",
    eligibleCreditImpot: false,
    dateDebut: null, // "YYYY-MM-DD"
    statut: "actif", // "actif" | "archive"
    notes: "",
  };
}

export function nouveauPayeur() {
  return {
    id: "",
    prenom: "",
    nom: "",
    adresse: adresseVide(),
    telephone: "",
    email: "",
    modePaiementHabituel: "cheque",
    forfait: null, // { montant: number, dureeMin: number } — cas foyer / famille
    eligibleCreditImpot: false,
  };
}

export function representantVide() {
  return { prenom: "", nom: "", telephone: "", email: "" };
}

/**
 * Qui paie pour cet élève ? Renvoie une référence stable pour le regroupement « foyer ».
 * - payeur externe  -> { type: "payeur", id }
 * - autre élève      -> { type: "eleve", id }  (le parent qui est aussi élève)
 * - lui-même         -> { type: "eleve", id: <son propre id> }
 */
export function payeurRef(eleve) {
  if (eleve?.payeurEleveId && eleve.payeurEleveId !== eleve.id) {
    return { type: "eleve", id: eleve.payeurEleveId };
  }
  if (eleve?.payeurId) return { type: "payeur", id: eleve.payeurId };
  return { type: "eleve", id: eleve?.id };
}

/** Libellé d'affichage d'un élève (Prénom Nom). */
export function libelleEleve(e) {
  const n = personneNom(e);
  return n || "(élève sans nom)";
}

/** Libellé « Nom Prénom » (listes et sélecteurs d'élèves). */
export function nomPrenom(e) {
  const s = [e?.nom, e?.prenom].filter(Boolean).join(" ").trim();
  return s || "(élève sans nom)";
}

/** Libellé d'affichage d'un payeur. */
export function libellePayeur(p) {
  const n = personneNom(p);
  return n || "(payeur sans nom)";
}

/** Libellé auto d'une séance pour la synthèse mensuelle. */
export function libelleSeance(eleve, dureeMin) {
  return `Cours de piano — ${personneNom(eleve)} (${fmtDuree(dureeMin)})`;
}

/** Une adresse est-elle renseignée ? */
export function adresseRenseignee(a) {
  if (!a) return false;
  return Boolean(a.rue || a.ville || a.cp);
}

export function adresseTexte(a) {
  if (!a) return "";
  const l1 = [a.numero, a.rue].filter(Boolean).join(" ");
  const l2 = [a.cp, a.ville].filter(Boolean).join(" ");
  return [l1, a.complement, l2].filter(Boolean).join(", ");
}

/**
 * Montant pré-rempli pour une séance.
 * - séance individuelle : tarif habituel de l'élève
 * - séance de foyer (payeur avec forfait) : montant du forfait
 */
export function montantParDefaut({ eleve, payeur, groupe }) {
  if (groupe && payeur?.forfait?.montant != null) return Number(payeur.forfait.montant);
  if (eleve?.tarifHabituel != null) return Number(eleve.tarifHabituel);
  return 0;
}

export const CRITERES_CREDIT_IMPOT =
  "Cours retenu si : statut Effectuée, lieu « Domicile de l'élève », mode de paiement ≠ Liquide, foyer éligible.";

/**
 * Séances qui composent la même « visite » : même foyer (payeur), même date.
 * Renvoie [seance] si la séance est individuelle ou seule ce jour-là.
 * Triées par heure ; la première est la « porteuse » du montant.
 */
export function membresVisite(seance, toutes) {
  if (!seance) return [];
  // Séance individuelle si le payeur est l'élève lui-même.
  if (seance.payeurType === "eleve" && seance.payeurId === seance.eleveId) return [seance];
  const groupe = toutes.filter(
    (s) => s.payeurType === seance.payeurType && s.payeurId === seance.payeurId && s.date === seance.date
  );
  if (groupe.length <= 1) return [seance];
  return groupe.slice().sort((a, b) => String(a.heure).localeCompare(String(b.heure)));
}

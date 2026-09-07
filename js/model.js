// Suivi Piano — fabriques et règles métier (indépendantes de l'UI et du stockage)

import { personneNom, fmtDuree } from "./util.js";

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
    payeurId: null, // null => l'élève est son propre payeur
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

/** Libellé d'affichage d'un élève. */
export function libelleEleve(e) {
  const n = personneNom(e);
  return n || "(élève sans nom)";
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

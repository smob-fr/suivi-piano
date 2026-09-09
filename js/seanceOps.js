// Suivi Piano — opérations de validation d'une séance (partagées écran / popin)

import { seances as seancesDB } from "./db.js";
import { nowISO, uid } from "./util.js";
import { addDays } from "./planning.js";

/** Valide (ou annule) une séance individuelle. */
export async function validerSolo(seance, { effectuee, montant, dureeMin }) {
  seance.statut = effectuee ? "effectuee" : "annulee";
  seance.montant = effectuee ? (Number(montant) || 0) : 0;
  if (dureeMin) seance.dureeMin = Number(dureeMin);
  if (effectuee) seance.rattrapageIgnore = false;
  seance.rattacheeA = null;
  seance.updatedAt = nowISO();
  await seancesDB.save(seance);
}

/** Marque une séance annulée comme « ne pas reprogrammer » (sort de la liste à faire). */
export async function annulerDefinitivement(seance) {
  seance.statut = "annulee";
  seance.montant = 0;
  seance.rattrapageIgnore = true;
  seance.updatedAt = nowISO();
  await seancesDB.save(seance);
}

/**
 * Crée une séance de rattrapage liée à `origine` (déjà annulée).
 * @returns la séance créée
 */
export async function reprogrammer(origine, { date, heure } = {}) {
  const now = nowISO();
  const rattrapage = {
    id: uid(),
    date: date || addDays(origine.date, 7),
    heure: heure || origine.heure,
    dureeMin: origine.dureeMin,
    eleveId: origine.eleveId,
    eleveIds: [origine.eleveId],
    payeurType: origine.payeurType,
    payeurId: origine.payeurId,
    lieu: origine.lieu,
    statut: "prevue",
    montant: null,
    modePaiement: origine.modePaiement,
    facturee: false,
    commentaire: "",
    rattrapageDe: origine.id,
    rattacheeA: null,
    source: "manuelle",
    creneauKey: null,
    createdAt: now,
    updatedAt: now,
  };
  await seancesDB.save(rattrapage);
  return rattrapage;
}

/**
 * Valide (ou annule) une visite de foyer : plusieurs séances, un seul montant.
 * @param membres séances triées par heure
 * @param presenceById Map<id, boolean>
 */
export async function validerVisite(membres, { effectuee, montant, presenceById }) {
  const now = nowISO();
  const porteuse = effectuee
    ? membres.find((m) => presenceById.get(m.id)) || membres[0]
    : membres[0];
  for (const m of membres) {
    const present = presenceById.get(m.id);
    m.rattacheeA = m.id === porteuse.id ? null : porteuse.id;
    if (!effectuee) {
      m.statut = "annulee";
      m.montant = 0;
    } else {
      m.statut = present ? "effectuee" : "annulee";
      m.montant = m.id === porteuse.id ? (Number(montant) || 0) : 0;
    }
    m.updatedAt = now;
    await seancesDB.save(m);
  }
}

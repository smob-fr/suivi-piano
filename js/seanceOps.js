// Suivi Piano — opérations de validation d'une séance (partagées écran / popin)

import { seances as seancesDB } from "./db.js";
import { nowISO } from "./util.js";

/** Valide (ou annule) une séance individuelle. */
export async function validerSolo(seance, { effectuee, montant, dureeMin }) {
  seance.statut = effectuee ? "effectuee" : "annulee";
  seance.montant = effectuee ? (Number(montant) || 0) : 0;
  if (dureeMin) seance.dureeMin = Number(dureeMin);
  seance.rattacheeA = null;
  seance.updatedAt = nowISO();
  await seancesDB.save(seance);
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

// Suivi Piano — regroupement des élèves d'un même foyer en UN élève principal
//
// Règles de sécurité (l'appli est utilisée en production) :
//  - AUCUNE séance existante n'est modifiée, déplacée ni supprimée par la fusion :
//    l'historique (effectuées, annulées, facturées) reste tel quel.
//  - Les anciens élèves ne sont jamais supprimés : ils sont ARCHIVÉS et rattachés
//    à l'élève principal (`fusionneDans`). Leurs séances passées restent donc valides
//    et continuent de se regrouper par payeur dans la synthèse / le crédit d'impôt.
//  - Seules les séances « prévues » FUTURES générées automatiquement sont régénérées
//    (par genererHorizon) à partir du nouveau créneau de l'élève principal.
//  - Chaque fusion est réversible (`annulerFusion`).

import { getAll, put } from "./db.js";
import { payeurRef } from "./model.js";
import { JOURS } from "./util.js";
import { nowISO } from "./util.js";

const cle = (ref) => `${ref.type}:${ref.id}`;

/**
 * Détecte les foyers à regrouper : élèves actifs partageant le même payeur.
 * @returns {{ key, ref, membres, principalImpose }[]}
 */
export function detecterGroupes(eleves) {
  const actifs = eleves.filter((e) => e.statut === "actif");
  const map = new Map();
  for (const e of actifs) {
    const ref = payeurRef(e);
    const k = cle(ref);
    if (!map.has(k)) map.set(k, { key: k, ref, membres: [] });
    map.get(k).membres.push(e);
  }
  return [...map.values()]
    .filter((g) => g.membres.length >= 2)
    .map((g) => {
      g.membres.sort((a, b) => (a.nom || "").localeCompare(b.nom || "", "fr") || (a.prenom || "").localeCompare(b.prenom || "", "fr"));
      // Si le payeur est lui-même un élève du groupe (ex. la maman), il reste l'élève principal.
      const imposed = g.ref.type === "eleve" ? g.membres.find((m) => m.id === g.ref.id) : null;
      g.principalImpose = imposed ? imposed.id : null;
      return g;
    })
    .sort((a, b) => (a.membres[0].nom || "").localeCompare(b.membres[0].nom || "", "fr"));
}

/** Créneaux fusionnés : par jour, début le plus tôt, durées additionnées. */
export function creneauxCombines(membres) {
  const parJour = new Map();
  for (const m of membres) {
    for (const c of m.creneaux || []) {
      if (!parJour.has(c.jour)) parJour.set(c.jour, []);
      parJour.get(c.jour).push(c);
    }
  }
  return [...parJour]
    .map(([jour, cs]) => ({
      jour,
      heure: cs.map((c) => c.heure).sort()[0],
      dureeMin: cs.reduce((n, c) => n + (Number(c.dureeMin) || 0), 0),
    }))
    .sort((a, b) => JOURS.indexOf(a.jour) - JOURS.indexOf(b.jour));
}

/** Tarif proposé : forfait du payeur externe s'il existe, sinon somme des tarifs des membres. */
export function tarifCombine(membres, payeur) {
  if (payeur?.forfait?.montant != null) return Number(payeur.forfait.montant);
  const t = membres.filter((m) => m.tarifHabituel != null);
  return t.length ? t.reduce((n, m) => n + Number(m.tarifHabituel), 0) : null;
}

/** Proposition complète pour un groupe et un élève principal donnés. */
export function proposer(groupe, principalId, payeur) {
  const principal = groupe.membres.find((m) => m.id === principalId);
  const autres = groupe.membres.filter((m) => m.id !== principalId);
  return {
    principalId,
    secondairesIds: autres.map((m) => m.id),
    creneaux: creneauxCombines(groupe.membres),
    tarif: tarifCombine(groupe.membres, payeur),
    participants: autres.map((m) => (m.nom && m.nom !== principal.nom ? `${m.prenom} ${m.nom}` : m.prenom)).filter(Boolean),
  };
}

/** Applique une fusion. Ne touche à aucune séance. */
export async function appliquerFusion({ principalId, secondairesIds, creneaux, tarif, participants }) {
  const tous = await getAll("eleves");
  const principal = tous.find((e) => e.id === principalId);
  if (!principal) throw new Error("Élève principal introuvable.");
  const now = nowISO();

  principal.fusionAvant = {
    date: now,
    creneaux: principal.creneaux || [],
    creneauRecurrent: principal.creneauRecurrent,
    tarifHabituel: principal.tarifHabituel,
    participants: principal.participants || [],
  };
  principal.fusionDe = secondairesIds;
  principal.creneaux = creneaux;
  principal.creneauRecurrent = creneaux.length ? true : principal.creneauRecurrent;
  principal.tarifHabituel = tarif;
  principal.participants = participants;
  await put("eleves", principal);

  for (const id of secondairesIds) {
    const e = tous.find((x) => x.id === id);
    if (!e) continue;
    e.statutAvantFusion = e.statut;
    e.statut = "archive";
    e.fusionneDans = principalId;
    await put("eleves", e);
  }
}

/** Fusions actuellement en place : [{ principal, secondaires }]. */
export function fusionsEnPlace(eleves) {
  return eleves
    .filter((e) => Array.isArray(e.fusionDe) && e.fusionDe.length && e.fusionAvant)
    .map((p) => ({ principal: p, secondaires: eleves.filter((e) => e.fusionneDans === p.id) }));
}

/** Annule une fusion : restaure l'élève principal et réactive les anciens élèves. */
export async function annulerFusion(principalId) {
  const tous = await getAll("eleves");
  const principal = tous.find((e) => e.id === principalId);
  if (!principal?.fusionAvant) throw new Error("Aucune fusion à annuler.");
  const av = principal.fusionAvant;
  principal.creneaux = av.creneaux;
  principal.creneauRecurrent = av.creneauRecurrent;
  principal.tarifHabituel = av.tarifHabituel;
  principal.participants = av.participants;
  const ids = principal.fusionDe || [];
  delete principal.fusionAvant;
  delete principal.fusionDe;
  await put("eleves", principal);
  for (const id of ids) {
    const e = tous.find((x) => x.id === id);
    if (!e) continue;
    e.statut = e.statutAvantFusion || "actif";
    delete e.fusionneDans;
    delete e.statutAvantFusion;
    await put("eleves", e);
  }
}

// Suivi Piano — popin « nouvelle séance ponctuelle »
// Champs : élève, date, heure, lieu. Le reste (durée, montant, mode) vient de l'élève.

import { el, toast, personneNom, LIEUX, uid, nowISO } from "./util.js";
import { seances as seancesDB, eleves as elevesDB } from "./db.js";
import { nomPrenom, montantParDefaut, payeurRef } from "./model.js";
import { today } from "./planning.js";

export async function ouvrirNouvelleSeance(onDone) {
  const elevesAll = await elevesDB.all();
  const actifs = elevesAll
    .filter((e) => e.statut === "actif")
    .sort((a, b) => (a.nom || "").localeCompare(b.nom || "", "fr") || (a.prenom || "").localeCompare(b.prenom || "", "fr"));
  if (!actifs.length) return toast("Ajoute d'abord un élève.", "warn");

  const draft = {
    eleveId: actifs[0].id,
    date: today(),
    heure: "17:00",
    lieu: actifs[0].lieu || "domicile",
  };

  const overlay = el("div.modal-overlay");
  const fermer = () => overlay.remove();
  overlay.addEventListener("click", (e) => { if (e.target === overlay) fermer(); });

  const selEleve = el("select.field__input", {
    onchange: (e) => {
      draft.eleveId = e.target.value;
      const el2 = actifs.find((x) => x.id === draft.eleveId);
      if (el2) { draft.lieu = el2.lieu; selLieu.value = el2.lieu; }
    },
  }, actifs.map((e) => el("option", { value: e.id, selected: e.id === draft.eleveId }, nomPrenom(e))));

  const selLieu = el("select.field__input", { onchange: (e) => (draft.lieu = e.target.value) },
    Object.entries(LIEUX).map(([v, t]) => el("option", { value: v, selected: v === draft.lieu }, t)));

  const box = el("div.modal.qv", [
    el("button.modal-close", { type: "button", "aria-label": "Fermer", onclick: fermer }, "✕"),
    el("div.qv__head", [el("strong.qv__titre", "Nouvelle séance ponctuelle")]),
    el("label.field", [el("span.field__label", "Élève"), selEleve]),
    el("div.qv__edit", [
      el("label.field", [el("span.field__label", "Date"),
        el("input.field__input", { type: "date", value: draft.date, oninput: (e) => (draft.date = e.target.value) })]),
      el("label.field", [el("span.field__label", "Heure"),
        el("input.field__input", { type: "time", value: draft.heure, oninput: (e) => (draft.heure = e.target.value) })]),
    ]),
    el("label.field", [el("span.field__label", "Lieu"), selLieu]),
    el("p.field__hint", "Durée, tarif et mode de paiement sont repris de la fiche de l'élève."),
    el("button.btn.btn--primary.qv__oui", { onclick: creer }, "Créer la séance"),
    el("button.link", { type: "button", onclick: fermer }, "Annuler"),
  ]);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  async function creer() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) return toast("Choisis une date.", "warn");
    if (!/^\d{2}:\d{2}$/.test(draft.heure)) return toast("Choisis une heure.", "warn");
    const e = actifs.find((x) => x.id === draft.eleveId);
    const passe = draft.date < today();
    const now = nowISO();
    const s = {
      id: uid(),
      date: draft.date,
      heure: draft.heure,
      dureeMin: e.creneaux?.[0]?.dureeMin || 60,
      eleveId: e.id,
      eleveIds: [e.id],
      payeurType: payeurRef(e).type,
      payeurId: payeurRef(e).id,
      lieu: draft.lieu,
      statut: passe ? "effectuee" : "prevue",
      montant: passe ? montantParDefaut({ eleve: e, payeur: null, groupe: false }) : null,
      modePaiement: e.modePaiementHabituel,
      facturee: false,
      commentaire: "",
      rattrapageDe: null,
      rattacheeA: null,
      source: "manuelle",
      creneauKey: null,
      createdAt: now,
      updatedAt: now,
    };
    await seancesDB.save(s);
    fermer();
    toast(passe ? "Séance créée et validée." : "Séance créée.", "ok");
    onDone && onDone();
  }
}

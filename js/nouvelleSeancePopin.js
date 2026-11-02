// Suivi Piano — popin « nouvelle séance ponctuelle »
// Champs : élève, date, heure, lieu, mode de paiement, durée, montant — pré-remplis depuis la fiche élève.
// opts : { eleveIds (restreint la liste), date, effectuee (crée directement un cours effectué), titre }

import { el, toast, LIEUX, MODES_PAIEMENT, DUREES, uid, nowISO } from "./util.js";
import { seances as seancesDB, eleves as elevesDB } from "./db.js";
import { nomPrenom, montantParDefaut, payeurRef } from "./model.js";
import { today } from "./planning.js";

export async function ouvrirNouvelleSeance(onDone, opts = {}) {
  const elevesAll = await elevesDB.all();
  const actifs = elevesAll
    .filter((e) => e.statut === "actif" && (!opts.eleveIds || opts.eleveIds.includes(e.id)))
    .sort((a, b) => (a.nom || "").localeCompare(b.nom || "", "fr") || (a.prenom || "").localeCompare(b.prenom || "", "fr"));
  if (!actifs.length) return toast("Ajoute d'abord un élève.", "warn");

  const dureeDe = (e) => e?.creneaux?.[0]?.dureeMin || 60;
  const heureDe = (e) => e?.creneaux?.[0]?.heure || "17:00";
  const montantDe = (e) => montantParDefaut({ eleve: e, payeur: null, groupe: false });

  const draft = {
    eleveId: actifs[0].id,
    date: opts.date || today(),
    heure: heureDe(actifs[0]),
    lieu: actifs[0].lieu || "domicile",
    modePaiement: actifs[0].modePaiementHabituel || "cheque",
    dureeMin: dureeDe(actifs[0]),
    montant: montantDe(actifs[0]),
  };
  let montantModifie = false;

  const overlay = el("div.modal-overlay");
  const fermer = () => overlay.remove();
  overlay.addEventListener("click", (e) => { if (e.target === overlay) fermer(); });

  const selEleve = el("select.field__input", {
    onchange: (e) => {
      draft.eleveId = e.target.value;
      const el2 = actifs.find((x) => x.id === draft.eleveId);
      if (el2) {
        draft.lieu = el2.lieu; selLieu.value = el2.lieu;
        draft.modePaiement = el2.modePaiementHabituel || "cheque"; selMode.value = draft.modePaiement;
        draft.heure = heureDe(el2); inputHeure.value = draft.heure;
        draft.dureeMin = dureeDe(el2); selDuree.value = String(draft.dureeMin);
        draft.montant = montantDe(el2); inputMontant.value = draft.montant; montantModifie = false;
      }
    },
  }, actifs.map((e) => el("option", { value: e.id, selected: e.id === draft.eleveId }, nomPrenom(e))));

  const selLieu = el("select.field__input", { onchange: (e) => (draft.lieu = e.target.value) },
    Object.entries(LIEUX).map(([v, t]) => el("option", { value: v, selected: v === draft.lieu }, t)));

  const selMode = el("select.field__input", { onchange: (e) => (draft.modePaiement = e.target.value) },
    Object.entries(MODES_PAIEMENT).map(([v, t]) => el("option", { value: v, selected: v === draft.modePaiement }, t)));
  const inputHeure = el("input.field__input", { type: "time", value: draft.heure, oninput: (e) => (draft.heure = e.target.value) });

  const dureesPossibles = DUREES.includes(draft.dureeMin) ? DUREES : [...DUREES, draft.dureeMin].sort((a, b) => a - b);
  const selDuree = el("select.field__input", { onchange: (e) => (draft.dureeMin = Number(e.target.value)) },
    dureesPossibles.map((d) => el("option", { value: d, selected: d === draft.dureeMin }, `${d} min`)));
  const inputMontant = el("input.field__input", {
    type: "number", inputmode: "decimal", value: draft.montant,
    oninput: (e) => { draft.montant = e.target.value === "" ? 0 : Number(e.target.value); montantModifie = true; },
  });

  const box = el("div.modal.qv", [
    el("button.modal-close", { type: "button", "aria-label": "Fermer", onclick: fermer }, "✕"),
    el("div.qv__head", [el("strong.qv__titre", opts.titre || "Nouvelle séance ponctuelle")]),
    el("label.field", [el("span.field__label", "Élève"), selEleve]),
    el("div.qv__edit", [
      el("label.field", [el("span.field__label", "Date"),
        el("input.field__input", { type: "date", value: draft.date, oninput: (e) => (draft.date = e.target.value) })]),
      el("label.field", [el("span.field__label", "Heure"), inputHeure]),
    ]),
    el("div.qv__edit", [
      el("label.field", [el("span.field__label", "Lieu"), selLieu]),
      el("label.field", [el("span.field__label", "Paiement"), selMode]),
    ]),
    el("div.qv__edit", [
      el("label.field", [el("span.field__label", "Durée"), selDuree]),
      el("label.field", [el("span.field__label", "Montant (€)"), inputMontant]),
    ]),
    el("button.btn.btn--primary.qv__oui", { onclick: creer }, "Créer la séance"),
    el("button.link", { type: "button", onclick: fermer }, "Annuler"),
  ]);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  async function creer() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) return toast("Choisis une date.", "warn");
    if (!/^\d{2}:\d{2}$/.test(draft.heure)) return toast("Choisis une heure.", "warn");
    const e = actifs.find((x) => x.id === draft.eleveId);
    const passe = opts.effectuee || draft.date < today();
    const now = nowISO();
    const s = {
      id: uid(),
      date: draft.date,
      heure: draft.heure,
      dureeMin: draft.dureeMin,
      eleveId: e.id,
      eleveIds: [e.id],
      payeurType: payeurRef(e).type,
      payeurId: payeurRef(e).id,
      lieu: draft.lieu,
      statut: passe ? "effectuee" : "prevue",
      // séance à venir : montant stocké seulement s'il a été changé à la main (sinon calculé à la validation)
      montant: passe || montantModifie ? draft.montant : null,
      modePaiement: draft.modePaiement,
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

// Suivi Piano — popin de modification d'un cours (depuis la Synthèse mensuelle)
// Modifie le montant, la durée, la date, le lieu et le mode de paiement d'un cours, ou le supprime.
// Pour une ancienne « visite » (séances groupées), la durée est la durée totale :
// l'écart est reporté sur la séance porteuse, la date est appliquée à tout le groupe.

import { el, toast, confirmDialog, fmtDateFR, DUREES, LIEUX, MODES_PAIEMENT, nowISO } from "./util.js";
import { seances as seancesDB } from "./db.js";

/**
 * @param {{ porteuse:object, rattachees:object[], titre:string }} ev
 * @param {() => void} onDone
 */
export function ouvrirModifierSeance({ porteuse, rattachees = [], titre }, onDone) {
  const dureeRatt = rattachees.reduce((n, r) => n + (r.dureeMin || 0), 0);
  const draft = {
    date: porteuse.date,
    dureeMin: (porteuse.dureeMin || 0) + dureeRatt,
    montant: Number(porteuse.montant) || 0,
    lieu: porteuse.lieu,
    modePaiement: porteuse.modePaiement,
  };

  const overlay = el("div.modal-overlay");
  const fermer = () => overlay.remove();
  overlay.addEventListener("click", (e) => { if (e.target === overlay) fermer(); });

  const options = DUREES.includes(draft.dureeMin) ? DUREES : [...DUREES, draft.dureeMin].sort((a, b) => a - b);
  const selDuree = el("select.field__input", { onchange: (e) => (draft.dureeMin = Number(e.target.value)) },
    options.map((d) => el("option", { value: d, selected: d === draft.dureeMin }, `${d} min`)));

  const box = el("div.modal.qv", [
    el("button.modal-close", { type: "button", "aria-label": "Fermer", onclick: fermer }, "✕"),
    el("div.qv__head", [
      el("strong.qv__titre", "Modifier ce cours"),
      el("span.qv__sous", `${titre} · ${fmtDateFR(porteuse.date)}`),
      porteuse.facturee ? el("span.qv__sous", "⚠ Ce cours est déjà marqué « facturé ».") : null,
    ].filter(Boolean)),
    el("label.field", [el("span.field__label", "Date"),
      el("input.field__input", { type: "date", value: draft.date, oninput: (e) => (draft.date = e.target.value) })]),
    el("div.qv__edit", [
      el("label.field", [el("span.field__label", "Durée"), selDuree]),
      el("label.field", [el("span.field__label", "Montant (€)"),
        el("input.field__input", {
          type: "number", inputmode: "decimal", value: draft.montant,
          oninput: (e) => (draft.montant = e.target.value === "" ? 0 : Number(e.target.value)),
        })]),
    ]),
    el("div.qv__edit", [
      el("label.field", [el("span.field__label", "Lieu"),
        el("select.field__input", { onchange: (e) => (draft.lieu = e.target.value) },
          Object.entries(LIEUX).map(([v, t]) => el("option", { value: v, selected: v === draft.lieu }, t)))]),
      el("label.field", [el("span.field__label", "Paiement"),
        el("select.field__input", { onchange: (e) => (draft.modePaiement = e.target.value) },
          Object.entries(MODES_PAIEMENT).map(([v, t]) => el("option", { value: v, selected: v === draft.modePaiement }, t)))]),
    ]),
    el("button.btn.btn--primary.qv__oui", { onclick: enregistrer }, "Enregistrer"),
    el("button.link", { type: "button", onclick: fermer }, "Annuler"),
    el("button.btn.btn--danger.btn--sm", { type: "button", onclick: supprimer }, "Supprimer ce cours"),
  ]);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  async function supprimer() {
    const ok = await confirmDialog(
      `Supprimer définitivement ce cours du ${fmtDateFR(porteuse.date)} (${titre}) ?` +
      (rattachees.length ? ` Les ${rattachees.length} séance(s) rattachée(s) seront supprimées aussi.` : "") +
      " Il n'apparaîtra plus dans les synthèses ni les factures.",
      { danger: true, okLabel: "Supprimer" }
    );
    if (!ok) return;
    for (const s of [porteuse, ...rattachees]) await seancesDB.remove(s.id);
    fermer();
    onDone && onDone();
  }

  async function enregistrer() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) return toast("Choisis une date.", "warn");
    const now = nowISO();
    const maj = [{
      ...porteuse,
      date: draft.date,
      dureeMin: Math.max(15, draft.dureeMin - dureeRatt),
      montant: draft.montant,
      lieu: draft.lieu,
      modePaiement: draft.modePaiement,
      updatedAt: now,
    }];
    for (const r of rattachees) maj.push({ ...r, date: draft.date, lieu: draft.lieu, modePaiement: draft.modePaiement, updatedAt: now });
    for (const s of maj) await seancesDB.save(s);
    fermer();
    onDone && onDone();
  }
}

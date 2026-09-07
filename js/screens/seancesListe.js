// Suivi Piano — onglet Séances (historique + filtres)

import { el, personneNom, fmtEUR, LIEUX, STATUT_SEANCE, sortBy, debounce } from "../util.js";
import { screen, btn, emptyState } from "../ui.js";
import { seances as seancesDB, eleves as elevesDB } from "../db.js";
import { libelleEleve } from "../model.js";
import { finHeure, libelleJour } from "../planning.js";
import { navigate } from "../router.js";

const state = { statut: "tous", facturee: "tous", eleveId: "", mois: "" };

export async function seancesListeScreen() {
  const [seances, elevesAll] = await Promise.all([seancesDB.all(), elevesDB.all()]);
  const eleveById = new Map(elevesAll.map((e) => [e.id, e]));
  const elevesTries = sortBy(elevesAll, (e) => personneNom(e));

  const listBox = el("div.list");

  const filtres = el("div.filtres", [
    selectFiltre("Statut", state.statut, [
      ["tous", "Tous les statuts"], ["prevue", "Prévue"], ["effectuee", "Effectuée"], ["annulee", "Annulée"],
    ], (v) => { state.statut = v; paint(); }),
    selectFiltre("Facturée", state.facturee, [
      ["tous", "Facturée : tous"], ["non", "Non facturée"], ["oui", "Facturée"],
    ], (v) => { state.facturee = v; paint(); }),
    selectFiltre("Élève", state.eleveId, [
      ["", "Tous les élèves"], ...elevesTries.map((e) => [e.id, personneNom(e)]),
    ], (v) => { state.eleveId = v; paint(); }),
    el("label.field", [
      el("span.field__label", "Mois"),
      el("input.field__input", {
        type: "month",
        value: state.mois,
        oninput: debounce((e) => { state.mois = e.target.value; paint(); }, 150),
      }),
    ]),
  ]);

  function selectFiltre(label, value, options, onChange) {
    const sel = el("select.field__input", { onchange: (e) => onChange(e.target.value) });
    for (const [v, t] of options) sel.appendChild(el("option", { value: v, selected: String(v) === String(value) }, t));
    return el("label.field", [el("span.field__label", label), sel]);
  }

  function paint() {
    let rows = seances.slice();
    if (state.statut !== "tous") rows = rows.filter((s) => s.statut === state.statut);
    if (state.facturee !== "tous") rows = rows.filter((s) => !!s.facturee === (state.facturee === "oui"));
    if (state.eleveId) rows = rows.filter((s) => s.eleveId === state.eleveId);
    if (state.mois) rows = rows.filter((s) => s.date.slice(0, 7) === state.mois);
    rows = sortBy(rows, (s) => s.date + s.heure).reverse();

    const total = rows.reduce((n, s) => n + (Number(s.montant) || 0), 0);
    resume.textContent = `${rows.length} séance(s) — ${fmtEUR(total)}`;

    if (!rows.length) {
      listBox.replaceChildren(emptyState("Aucune séance ne correspond à ces filtres."));
      return;
    }
    listBox.replaceChildren(
      ...rows.slice(0, 300).map((s) => {
        const e = eleveById.get(s.eleveId);
        const sub = [
          libelleJour(s.date, true),
          `${s.heure}–${finHeure(s.heure, s.dureeMin)}`,
          LIEUX[s.lieu],
          s.montant != null ? fmtEUR(s.montant) : null,
        ].filter(Boolean).join(" · ");
        return el("button.list-item", { class: `seance--${s.statut}`, onclick: () => navigate(`/seances/${s.id}`) }, [
          el("div.list-item__main", [
            el("div.list-item__title", [
              libelleEleve(e || {}),
              el("span.chip", STATUT_SEANCE[s.statut]),
              s.facturee ? el("span.chip.chip--ok", "facturée") : null,
              s.rattacheeA ? el("span.chip", "visite") : null,
            ]),
            el("div.list-item__sub", sub),
          ]),
        ]);
      })
    );
  }

  const resume = el("p.preview-summary");
  paint();

  return screen("Séances", {
    actions: [btn("+ Séance", { onClick: () => navigate("/seances/nouveau"), small: true })],
    children: [filtres, resume, listBox],
  });
}

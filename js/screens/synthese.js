// Suivi Piano — Synthèse mensuelle (facturation) + liste crédit d'impôt

import { el, fmtEUR, fmtDuree, fmtDateFR, personneNom, sortBy, toast } from "../util.js";
import { screen, btn, emptyState } from "../ui.js";
import { seances as seancesDB, eleves as elevesDB, payeurs as payeursDB, bulkPut } from "../db.js";
import { libelleEleve, libellePayeur } from "../model.js";
import { render } from "../router.js";

const state = { vue: "mensuelle", mois: prevMonth(), annee: new Date().getFullYear(), nonFacturees: true };

function prevMonth() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function syntheseScreen() {
  const [seances, elevesAll, payeursAll] = await Promise.all([seancesDB.all(), elevesDB.all(), payeursDB.all()]);
  const eleveById = new Map(elevesAll.map((e) => [e.id, e]));
  const payeurById = new Map(payeursAll.map((p) => [p.id, p]));

  function foyerDe(s) {
    if (s.payeurType === "payeur") {
      const p = payeurById.get(s.payeurId);
      return { id: "p:" + s.payeurId, nom: p ? libellePayeur(p) : "(payeur supprimé)", eligible: !!p?.eligibleCreditImpot };
    }
    const e = eleveById.get(s.eleveId);
    return { id: "e:" + s.eleveId, nom: e ? libelleEleve(e) : "(élève supprimé)", eligible: !!e?.eligibleCreditImpot };
  }
  const rattacheesDe = new Map(); // porteuseId -> [séances rattachées]
  for (const s of seances) {
    if (s.rattacheeA) {
      if (!rattacheesDe.has(s.rattacheeA)) rattacheesDe.set(s.rattacheeA, []);
      rattacheesDe.get(s.rattacheeA).push(s);
    }
  }

  /** Évènements facturables : séances effectuées non rattachées, enrichies. */
  function evenements(filtre) {
    const out = [];
    for (const s of seances) {
      if (s.statut !== "effectuee" || s.rattacheeA) continue;
      if (!filtre(s)) continue;
      const rat = (rattacheesDe.get(s.id) || []).filter((r) => r.statut === "effectuee");
      const membres = [s, ...rat];
      const dureeTotale = membres.reduce((n, m) => n + (m.dureeMin || 0), 0);
      const noms = membres.map((m) => personneNom(eleveById.get(m.eleveId)) || "?").join(", ");
      out.push({
        porteuse: s,
        foyer: foyerDe(s),
        date: s.date,
        libelle: `Cours de piano — ${noms} (${fmtDuree(dureeTotale)})`,
        dureeTotale,
        montant: Number(s.montant) || 0,
        idsAmarquer: [s.id, ...(rattacheesDe.get(s.id) || []).map((r) => r.id)],
      });
    }
    return sortBy(out, (e) => e.date + e.porteuse.heure);
  }

  function groupeParFoyer(evs) {
    const map = new Map();
    for (const ev of evs) {
      if (!map.has(ev.foyer.id)) map.set(ev.foyer.id, { foyer: ev.foyer, lignes: [], total: 0, heures: 0 });
      const g = map.get(ev.foyer.id);
      g.lignes.push(ev);
      g.total += ev.montant;
      g.heures += ev.dureeTotale;
    }
    return [...map.values()].sort((a, b) => a.foyer.nom.localeCompare(b.foyer.nom, "fr"));
  }

  /* ---------- Barre de bascule ---------- */
  const barre = el("div.seg", [
    seg("Synthèse mensuelle", "mensuelle"),
    seg("Crédit d'impôt", "credit"),
  ]);
  function seg(label, val) {
    return el("button.seg__btn", { class: state.vue === val ? "seg__btn--on" : "", onclick: () => { state.vue = val; render(); } }, label);
  }

  const body = state.vue === "mensuelle" ? vueMensuelle() : vueCredit();

  /* ---------- Vue mensuelle ---------- */
  function vueMensuelle() {
    const evs = evenements((s) => s.date.slice(0, 7) === state.mois && (!state.nonFacturees || !s.facturee));
    const groupes = groupeParFoyer(evs);
    const totalGeneral = groupes.reduce((n, g) => n + g.total, 0);

    const controles = el("div.filtres", [
      el("label.field", [
        el("span.field__label", "Mois"),
        el("input.field__input", { type: "month", value: state.mois, oninput: (e) => { state.mois = e.target.value; render(); } }),
      ]),
      el("label.field.field--check", [
        el("input", { type: "checkbox", checked: state.nonFacturees, onchange: (e) => { state.nonFacturees = e.target.checked; render(); } }),
        el("span.field__label", "Seulement non facturées"),
      ]),
    ]);

    if (!groupes.length) {
      return el("div", [controles, emptyState("Aucune séance à facturer pour ce mois.")]);
    }

    return el("div", [
      controles,
      el("p.preview-summary", `${evs.length} séance(s) · ${groupes.length} foyer(s) · total ${fmtEUR(totalGeneral)}`),
      ...groupes.map((g) =>
        el("section.foyer-bloc", [
          el("div.foyer-bloc__head", [
            el("strong", g.foyer.nom),
            el("span.foyer-bloc__total", fmtEUR(g.total)),
          ]),
          el("table.recap", [
            el("tbody", g.lignes.map((ev) =>
              el("tr", [
                el("td.recap__date", fmtDateFR(ev.date)),
                el("td", ev.libelle),
                el("td.recap__montant", fmtEUR(ev.montant)),
              ])
            )),
          ]),
          btn("Marquer ce foyer facturé", {
            onClick: () => marquerFacture(g.lignes.flatMap((ev) => ev.idsAmarquer)),
            variant: "ghost",
            small: true,
          }),
        ])
      ),
    ]);
  }

  async function marquerFacture(ids) {
    const set = new Set(ids);
    const maj = seances.filter((s) => set.has(s.id)).map((s) => ({ ...s, facturee: true, updatedAt: new Date().toISOString() }));
    await bulkPut("seances", maj);
    toast(`${maj.length} séance(s) marquée(s) facturée(s).`, "ok");
    render();
  }

  /* ---------- Vue crédit d'impôt ---------- */
  function vueCredit() {
    const an = String(state.annee);
    const evs = evenements((s) =>
      s.date.slice(0, 4) === an &&
      s.lieu === "domicile" &&
      s.modePaiement !== "liquide" &&
      foyerDe(s).eligible
    );
    const groupes = groupeParFoyer(evs);
    const totalEuros = groupes.reduce((n, g) => n + g.total, 0);
    const totalHeures = groupes.reduce((n, g) => n + g.heures, 0);

    const controles = el("div.filtres", [
      el("label.field", [
        el("span.field__label", "Année civile"),
        el("input.field__input", { type: "number", value: state.annee, min: 2020, max: 2100, oninput: (e) => { state.annee = Number(e.target.value); render(); } }),
      ]),
    ]);

    return el("div", [
      controles,
      el("p.field__hint",
        "Cours retenus : effectués, au domicile de l'élève, réglés autrement qu'en liquide, " +
        "pour un foyer marqué « éligible crédit d'impôt ». L'attestation elle-même se fait ailleurs."
      ),
      groupes.length
        ? el("div", [
            el("p.preview-summary", `${evs.length} cours · ${fmtEUR(totalEuros)} · ${fmtDuree(totalHeures)}`),
            ...groupes.map((g) =>
              el("section.foyer-bloc", [
                el("div.foyer-bloc__head", [
                  el("strong", g.foyer.nom),
                  el("span.foyer-bloc__total", `${fmtEUR(g.total)} · ${fmtDuree(g.heures)}`),
                ]),
                el("table.recap", [
                  el("tbody", g.lignes.map((ev) =>
                    el("tr", [
                      el("td.recap__date", fmtDateFR(ev.date)),
                      el("td", ev.libelle),
                      el("td.recap__montant", fmtEUR(ev.montant)),
                    ])
                  )),
                ]),
              ])
            ),
          ])
        : emptyState("Aucun cours éligible pour cette année."),
    ]);
  }

  return screen("Synthèse", { children: [barre, body] });
}

// Suivi Piano — écran Agenda (Semaine / Jour / Liste)

import { el, personneNom, LIEUX, STATUT_SEANCE, fmtEUR, sortBy } from "../util.js";
import { screen, btn, emptyState } from "../ui.js";
import { seances as seancesDB, eleves as elevesDB, payeurs as payeursDB } from "../db.js";
import { libelleEleve, libellePayeur } from "../model.js";
import {
  today, addDays, lundiDeLaSemaine, libelleJour,
  finHeure, ferieNom, enPeriode, periodes as periodesDB,
} from "../planning.js";
import { navigate } from "../router.js";

const state = { ancre: today(), vue: "semaine" };

const LIEU_ICON = { domicile: "🏠", visio: "💻", chez_prof: "🎹" };

export async function agendaScreen() {
  const [seances, elevesAll, payeursAll, listePeriodes] = await Promise.all([
    seancesDB.all(), elevesDB.all(), payeursDB.all(), periodesDB.all(),
  ]);
  const eleveById = new Map(elevesAll.map((e) => [e.id, e]));
  const payeurById = new Map(payeursAll.map((p) => [p.id, p]));

  const body = el("div.agenda");

  const barre = el("div.agenda__bar", [
    el("div.seg", [
      segBtn("Semaine", "semaine"),
      segBtn("Jour", "jour"),
      segBtn("Liste", "liste"),
    ]),
    el("div.agenda__nav", [
      btn("‹", { onClick: () => shift(-1), variant: "ghost", small: true }),
      btn("Aujourd'hui", { onClick: () => { state.ancre = today(); paint(); }, variant: "ghost", small: true }),
      btn("›", { onClick: () => shift(1), variant: "ghost", small: true }),
    ]),
  ]);

  function segBtn(label, val) {
    return el("button.seg__btn", {
      class: state.vue === val ? "seg__btn--on" : "",
      onclick: () => { state.vue = val; paint(); },
    }, label);
  }

  function shift(dir) {
    const step = state.vue === "jour" ? 1 : 7;
    state.ancre = addDays(state.ancre, dir * step);
    paint();
  }

  function seancesDuJour(d) {
    return sortBy(seances.filter((s) => s.date === d), (s) => s.heure);
  }

  function carteSeance(s) {
    const e = eleveById.get(s.eleveId);
    const p = s.payeurType === "payeur" ? payeurById.get(s.payeurId) : null;
    const sub = [
      LIEUX[s.lieu],
      s.statut !== "prevue" ? STATUT_SEANCE[s.statut] : null,
      s.montant != null ? fmtEUR(s.montant) : null,
      s.facturee ? "facturée" : null,
    ].filter(Boolean).join(" · ");
    return el("button.seance", { class: `seance--${s.statut}`, onclick: () => navigate(`/seances/${s.id}`) }, [
      el("span.seance__time", `${s.heure}–${finHeure(s.heure, s.dureeMin)}`),
      el("span.seance__body", [
        el("span.seance__title", [
          LIEU_ICON[s.lieu] ? el("span.seance__ic", LIEU_ICON[s.lieu]) : null,
          libelleEleve(e || {}),
        ]),
        el("span.seance__sub", sub),
        p ? el("span.seance__foyer", `foyer ${libellePayeur(p)}`) : null,
      ]),
    ]);
  }

  function sectionJour(d, { grosTitre = false } = {}) {
    const items = seancesDuJour(d);
    const ferie = ferieNom(d);
    const periode = enPeriode(d, listePeriodes);
    const head = el("div.jour__head", { class: d === today() ? "jour__head--today" : "" }, [
      el("span.jour__label", libelleJour(d, !grosTitre)),
      ferie ? el("span.chip.chip--warn", `férié — ${ferie}`) : null,
      periode ? el("span.chip", periode.libelle || "sans cours") : null,
    ]);
    return el("div.jour", [
      head,
      items.length
        ? el("div.jour__list", items.map(carteSeance))
        : el("p.jour__vide", periode ? "—" : "aucune séance"),
    ]);
  }

  function paint() {
    [...barre.querySelectorAll(".seg__btn")].forEach((b, i) => {
      b.classList.toggle("seg__btn--on", ["semaine", "jour", "liste"][i] === state.vue);
    });

    if (state.vue === "jour") {
      titre.textContent = cap(libelleJour(state.ancre));
      body.replaceChildren(sectionJour(state.ancre, { grosTitre: true }));
      return;
    }

    if (state.vue === "liste") {
      const from = today();
      const prochains = sortBy(
        seances.filter((s) => s.date >= from),
        (s) => s.date + s.heure
      ).slice(0, 60);
      titre.textContent = "À venir";
      if (!prochains.length) {
        body.replaceChildren(emptyState("Aucune séance à venir. Ajoute des créneaux aux élèves ou une séance ponctuelle."));
        return;
      }
      let jourCourant = null;
      const frag = [];
      for (const s of prochains) {
        if (s.date !== jourCourant) {
          jourCourant = s.date;
          frag.push(el("div.jour__head", el("span.jour__label", libelleJour(s.date, true))));
        }
        frag.push(carteSeance(s));
      }
      body.replaceChildren(el("div.liste", frag));
      return;
    }

    // semaine
    const lundi = lundiDeLaSemaine(state.ancre);
    const dim = addDays(lundi, 6);
    titre.textContent = `${libelleJour(lundi, true)} – ${libelleJour(dim, true)}`;
    body.replaceChildren(
      el("div.semaine", Array.from({ length: 7 }, (_, i) => sectionJour(addDays(lundi, i))))
    );
  }

  const titre = el("span.agenda__titre");
  paint();

  return screen("Agenda", {
    actions: [
      btn("Vacances", { onClick: () => navigate("/periodes"), variant: "ghost", small: true }),
      btn("+ Séance", { onClick: () => navigate("/seances/nouveau"), small: true }),
    ],
    children: [barre, el("div.agenda__titre-wrap", titre), body],
  });
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

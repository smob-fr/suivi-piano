// Suivi Piano — écran Accueil (version step 3 : à faire + aujourd'hui + demain)

import { el, personneNom, fmtEUR, LIEUX, sortBy } from "../util.js";
import { screen, btn, emptyState } from "../ui.js";
import { seances as seancesDB, eleves as elevesDB } from "../db.js";
import { libelleEleve } from "../model.js";
import { today, addDays, libelleJour, finHeure } from "../planning.js";
import { navigate, render } from "../router.js";
import { ouvrirQuickValider } from "../quickValider.js";

export async function accueilScreen() {
  const [seances, elevesAll] = await Promise.all([seancesDB.all(), elevesDB.all()]);
  const eleveById = new Map(elevesAll.map((e) => [e.id, e]));
  const j = today();

  const aSaisir = sortBy(
    seances.filter((s) => s.statut === "prevue" && s.date < j),
    (s) => s.date + s.heure
  );
  const rattrapages = seances.filter((s) => s.statut === "annulee" && !seances.some((x) => x.rattrapageDe === s.id));

  const ouvrir = (s) =>
    s.statut === "prevue"
      ? ouvrirQuickValider(s.id, () => render())
      : navigate(`/seances/${s.id}`);

  const ligneSeance = (s) =>
    el("button.seance", { class: `seance--${s.statut}`, onclick: () => ouvrir(s) }, [
      el("span.seance__time", `${s.heure}–${finHeure(s.heure, s.dureeMin)}`),
      el("span.seance__body", [
        el("span.seance__title", libelleEleve(eleveById.get(s.eleveId) || {})),
        el("span.seance__sub", [LIEUX[s.lieu], s.montant != null ? fmtEUR(s.montant) : null].filter(Boolean).join(" · ")),
      ]),
    ]);

  const carteAFaire = el("button.todo-card", { onclick: () => toggleDetail() }, [
    el("span.todo-card__n", String(aSaisir.length + rattrapages.length)),
    el("span.todo-card__txt",
      aSaisir.length + rattrapages.length === 0
        ? "Rien à faire"
        : `à faire — ${aSaisir.length} séance(s) à saisir${rattrapages.length ? `, ${rattrapages.length} rattrapage(s)` : ""}`
    ),
  ]);

  const detail = el("div.todo-detail", { hidden: true });
  let ouvert = false;
  function toggleDetail() {
    ouvert = !ouvert;
    detail.hidden = !ouvert;
    if (ouvert && !detail.childElementCount) {
      const parts = [];
      if (aSaisir.length) parts.push(el("h3.bloc-titre", "Séances à saisir"));
      for (const s of aSaisir) {
        parts.push(el("div.j-line", [el("span.j-mini", libelleJour(s.date, true)), ligneSeance(s)]));
      }
      if (rattrapages.length) parts.push(el("h3.bloc-titre", "Cours annulés à reprogrammer"));
      for (const s of rattrapages) {
        parts.push(el("div.j-line", [el("span.j-mini", libelleJour(s.date, true)), ligneSeance(s)]));
      }
      if (!parts.length) parts.push(el("p.jour__vide", "Rien à faire."));
      detail.replaceChildren(...parts);
    }
  }

  const jourSeances = (d) => sortBy(seances.filter((s) => s.date === d), (s) => s.heure);
  const bloc = (label, d) => {
    const list = jourSeances(d);
    return el("section.bloc", [
      el("h3.bloc-titre", `${label} — ${libelleJour(d, true)}`),
      list.length ? el("div.jour__list", list.map(ligneSeance)) : el("p.jour__vide", "aucune séance"),
    ]);
  };

  return screen(cap(libelleJour(j)), {
    children: [
      carteAFaire,
      detail,
      bloc("Aujourd'hui", j),
      bloc("Demain", addDays(j, 1)),
      el("div.form-actions", [btn("+ Séance ponctuelle", { onClick: () => navigate("/seances/nouveau"), variant: "ghost" })]),
    ],
  });
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

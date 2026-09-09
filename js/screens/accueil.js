// Suivi Piano — écran Accueil : à faire · 3 jours · chiffres du mois

import { el, personneNom, fmtEUR, LIEUX, sortBy } from "../util.js";
import { screen } from "../ui.js";
import { seances as seancesDB, eleves as elevesDB } from "../db.js";
import { libelleEleve, badgeStatut } from "../model.js";
import { today, addDays, libelleJour, finHeure } from "../planning.js";
import { navigate, render } from "../router.js";
import { ouvrirQuickValider } from "../quickValider.js";
import { ouvrirNouvelleSeance } from "../nouvelleSeancePopin.js";

export async function accueilScreen() {
  const [seances, elevesAll] = await Promise.all([seancesDB.all(), elevesDB.all()]);
  const eleveById = new Map(elevesAll.map((e) => [e.id, e]));
  const j = today();
  const moisCourant = j.slice(0, 7);
  const debutDeMois = Number(j.slice(8, 10)) <= 7;

  const aSaisir = sortBy(seances.filter((s) => s.statut === "prevue" && s.date < j), (s) => s.date + s.heure);
  const aReprogrammer = seances.filter(
    (s) => s.statut === "annulee" && !s.rattrapageIgnore && !seances.some((x) => x.rattrapageDe === s.id)
  );
  const nbActions = aSaisir.length + aReprogrammer.length + (debutDeMois ? 1 : 0);

  const rafraichir = () => render();
  const ligneSeance = (s) =>
    el("button.seance", { class: `seance--${s.statut}`, onclick: () => ouvrirQuickValider(s.id, rafraichir) }, [
      el("span.seance__time", `${s.heure}–${finHeure(s.heure, s.dureeMin)}`),
      el("span.seance__body", [
        el("span.seance__title", [libelleEleve(eleveById.get(s.eleveId) || {}), badgeStatut(s.statut)]),
        el("span.seance__sub", [LIEUX[s.lieu], s.montant != null && s.montant !== 0 ? fmtEUR(s.montant) : null].filter(Boolean).join(" · ")),
      ]),
    ]);

  /* ---------- Zone 1 : À faire ---------- */
  const detail = el("div.todo-detail", { hidden: true });
  let ouvert = false;
  const carteAFaire = el("button.todo-card", { onclick: () => toggleDetail() }, [
    el("span.todo-card__n", String(nbActions)),
    el("span.todo-card__txt", nbActions === 0 ? "Rien à faire" : [
      aSaisir.length ? `${aSaisir.length} à saisir` : null,
      aReprogrammer.length ? `${aReprogrammer.length} à reprogrammer` : null,
      debutDeMois ? "synthèse du mois" : null,
    ].filter(Boolean).join(" · ")),
    el("span.todo-card__chev", nbActions ? "▾" : ""),
  ]);
  const zoneTodo = el("section.zone.zone--todo", { class: nbActions ? "" : "zone--todo-vide" }, [carteAFaire, detail]);
  function toggleDetail() {
    ouvert = !ouvert;
    detail.hidden = !ouvert;
    carteAFaire.querySelector(".todo-card__chev").textContent = nbActions ? (ouvert ? "▴" : "▾") : "";
    if (ouvert && !detail.childElementCount) {
      const parts = [];
      if (aSaisir.length) parts.push(el("h4.bloc-titre", "Séances à saisir"));
      for (const s of aSaisir) parts.push(el("div.j-line", [el("span.j-mini", libelleJour(s.date, true)), ligneSeance(s)]));
      if (aReprogrammer.length) parts.push(el("h4.bloc-titre", "Cours annulés à reprogrammer"));
      for (const s of aReprogrammer) parts.push(el("div.j-line", [el("span.j-mini", libelleJour(s.date, true)), ligneSeance(s)]));
      if (debutDeMois) {
        parts.push(el("h4.bloc-titre", "Facturation"));
        parts.push(el("button.list-item", { onclick: () => navigate("/synthese") }, [
          el("div.list-item__main", [el("div.list-item__title", "Faire la synthèse du mois dernier")]),
        ]));
      }
      if (!parts.length) parts.push(el("p.jour__vide", "Rien à faire."));
      detail.replaceChildren(...parts);
    }
  }

  /* ---------- Zone 2 : Agenda 3 jours ---------- */
  const jourSeances = (d) => sortBy(seances.filter((s) => s.date === d), (s) => s.heure);
  const blocJour = (label, d) => {
    const list = jourSeances(d);
    return el("section.jour-bloc", { class: d === j ? "jour-bloc--today" : "" }, [
      el("h4.jour-bloc__titre", [el("span", label), el("span.jour-bloc__date", libelleJour(d, true))]),
      list.length ? el("div.jour__list", list.map(ligneSeance)) : el("p.jour__vide", "aucune séance"),
    ]);
  };
  const agenda = el("section.zone.zone--agenda", [
    blocJour("Aujourd'hui", j),
    blocJour("Demain", addDays(j, 1)),
    blocJour("Après-demain", addDays(j, 2)),
  ]);

  /* ---------- Zone 3 : Chiffres du mois ---------- */
  const effMois = seances.filter((s) => s.statut === "effectuee" && s.date.slice(0, 7) === moisCourant);
  const montantMois = effMois.reduce((n, s) => n + (Number(s.montant) || 0), 0);
  const resteAFacturer = effMois.filter((s) => !s.facturee).reduce((n, s) => n + (Number(s.montant) || 0), 0);
  const chiffres = el("section.zone.zone--stats", [
    el("h4.zone__titre", "Ce mois-ci"),
    el("div.chiffres", [
      stat(`${effMois.length}`, "cours"),
      stat(fmtEUR(montantMois), "encaissable"),
      stat(fmtEUR(resteAFacturer), "à facturer"),
    ]),
  ]);

  const fab = el("button.fab", { title: "Nouvelle séance ponctuelle", onclick: () => ouvrirNouvelleSeance(rafraichir) }, "+");

  return screen(cap(libelleJour(j)), { children: [zoneTodo, agenda, chiffres, fab] });
}

function stat(valeur, label) {
  return el("div.stat", [el("div.stat__val", valeur), el("div.stat__lbl", label)]);
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

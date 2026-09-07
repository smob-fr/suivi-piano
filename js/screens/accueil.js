// Suivi Piano — écran Accueil (à faire · aujourd'hui · demain · chiffres du mois)

import { el, personneNom, fmtEUR, LIEUX, sortBy } from "../util.js";
import { screen, btn } from "../ui.js";
import { seances as seancesDB, eleves as elevesDB } from "../db.js";
import { libelleEleve } from "../model.js";
import { today, addDays, libelleJour, finHeure } from "../planning.js";
import { navigate, render } from "../router.js";
import { ouvrirQuickValider } from "../quickValider.js";

export async function accueilScreen() {
  const [seances, elevesAll] = await Promise.all([seancesDB.all(), elevesDB.all()]);
  const eleveById = new Map(elevesAll.map((e) => [e.id, e]));
  const j = today();
  const moisCourant = j.slice(0, 7);
  const jourDuMois = Number(j.slice(8, 10));

  const aSaisir = sortBy(seances.filter((s) => s.statut === "prevue" && s.date < j), (s) => s.date + s.heure);
  const rattrapages = seances.filter((s) => s.statut === "annulee" && !seances.some((x) => x.rattrapageDe === s.id));
  const debutDeMois = jourDuMois <= 7;

  const nbActions = aSaisir.length + rattrapages.length + (debutDeMois ? 1 : 0);

  const ouvrir = (s) =>
    s.statut === "prevue" ? ouvrirQuickValider(s.id, () => render()) : navigate(`/seances/${s.id}`);

  const ligneSeance = (s) =>
    el("button.seance", { class: `seance--${s.statut}`, onclick: () => ouvrir(s) }, [
      el("span.seance__time", `${s.heure}–${finHeure(s.heure, s.dureeMin)}`),
      el("span.seance__body", [
        el("span.seance__title", libelleEleve(eleveById.get(s.eleveId) || {})),
        el("span.seance__sub", [LIEUX[s.lieu], s.montant != null ? fmtEUR(s.montant) : null].filter(Boolean).join(" · ")),
      ]),
    ]);

  const carteAFaire = el("button.todo-card", { onclick: () => toggleDetail() }, [
    el("span.todo-card__n", String(nbActions)),
    el("span.todo-card__txt",
      nbActions === 0
        ? "Rien à faire"
        : [
            aSaisir.length ? `${aSaisir.length} séance(s) à saisir` : null,
            rattrapages.length ? `${rattrapages.length} rattrapage(s)` : null,
            debutDeMois ? "synthèse du mois dernier" : null,
          ].filter(Boolean).join(" · ")
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
      for (const s of aSaisir) parts.push(el("div.j-line", [el("span.j-mini", libelleJour(s.date, true)), ligneSeance(s)]));
      if (rattrapages.length) parts.push(el("h3.bloc-titre", "Cours annulés à reprogrammer"));
      for (const s of rattrapages) parts.push(el("div.j-line", [el("span.j-mini", libelleJour(s.date, true)), ligneSeance(s)]));
      if (debutDeMois) {
        parts.push(el("h3.bloc-titre", "Facturation"));
        parts.push(el("button.list-item", { onclick: () => navigate("/synthese") }, [
          el("div.list-item__main", [el("div.list-item__title", "Faire la synthèse du mois dernier")]),
        ]));
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

  /* ---- Chiffres du mois ---- */
  const effMois = seances.filter((s) => s.statut === "effectuee" && s.date.slice(0, 7) === moisCourant);
  const montantMois = effMois.reduce((n, s) => n + (Number(s.montant) || 0), 0);
  const resteAFacturer = effMois.filter((s) => !s.facturee).reduce((n, s) => n + (Number(s.montant) || 0), 0);
  const chiffres = el("section.chiffres", [
    stat(`${effMois.length}`, "cours ce mois"),
    stat(fmtEUR(montantMois), "montant du mois"),
    stat(fmtEUR(resteAFacturer), "reste à facturer"),
  ]);

  const fab = el("button.fab", { title: "Nouvelle séance ponctuelle", onclick: () => navigate("/seances/nouveau") }, "+");

  return screen(cap(libelleJour(j)), {
    children: [carteAFaire, detail, bloc("Aujourd'hui", j), bloc("Demain", addDays(j, 1)), chiffres, fab],
  });
}

function stat(valeur, label) {
  return el("div.stat", [el("div.stat__val", valeur), el("div.stat__lbl", label)]);
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

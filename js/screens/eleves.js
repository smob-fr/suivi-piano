// Suivi Piano — écran Élèves (liste)

import { el, debounce, personneNom, JOURS, fmtEUR } from "../util.js";
import { screen, btn, emptyState, listItem } from "../ui.js";
import { eleves as elevesDB, payeurs as payeursDB } from "../db.js";
import { nomPrenom, libellePayeur } from "../model.js";
import { navigate } from "../router.js";

const state = { q: "", statut: "actif" };

export async function elevesListScreen() {
  const [all, payeurs] = await Promise.all([elevesDB.all(), payeursDB.all()]);
  const payeurById = new Map(payeurs.map((p) => [p.id, p]));

  const wrap = el("div");
  const listBox = el("div.list");

  const search = el("input.search", {
    type: "search",
    placeholder: "Rechercher un élève…",
    value: state.q,
    oninput: debounce((ev) => { state.q = ev.target.value; paint(); }, 200),
  });

  const tabs = el("div.tabs", [
    tab("Actifs", "actif"),
    tab("Archivés", "archive"),
    tab("Tous", "tous"),
  ]);

  function tab(label, val) {
    return el("button.tab", {
      class: state.statut === val ? "tab--on" : "",
      onclick: () => { state.statut = val; paint(); repaintTabs(); },
    }, label);
  }
  function repaintTabs() {
    [...tabs.children].forEach((c, i) => {
      const val = ["actif", "archive", "tous"][i];
      c.classList.toggle("tab--on", state.statut === val);
    });
  }

  function paint() {
    const q = state.q.trim().toLowerCase();
    let rows = all;
    if (state.statut !== "tous") rows = rows.filter((e) => e.statut === state.statut);
    if (q) {
      rows = rows.filter((e) =>
        personneNom(e).toLowerCase().includes(q) ||
        (e.notes || "").toLowerCase().includes(q) ||
        (e.adresse?.ville || "").toLowerCase().includes(q)
      );
    }
    rows = rows.sort((a, b) =>
      (a.nom || "").localeCompare(b.nom || "", "fr") ||
      (a.prenom || "").localeCompare(b.prenom || "", "fr")
    );

    if (!rows.length) {
      listBox.replaceChildren(
        emptyState(
          all.length ? "Aucun élève ne correspond." : "Aucun élève pour l'instant.",
          all.length ? null : btn("Importer un CSV", { onClick: () => navigate("/parametres"), small: true })
        )
      );
      return;
    }

    listBox.replaceChildren(
      ...rows.map((e) => {
        const cr = e.creneaux?.[0];
        const sub = [
          cr ? `${cap(cr.jour)} ${cr.heure}` : "pas de créneau",
          e.payeurId ? `payé par ${libellePayeur(payeurById.get(e.payeurId) || {})}` : null,
          e.tarifHabituel != null ? fmtEUR(e.tarifHabituel) : null,
        ].filter(Boolean).join(" · ");
        return listItem({
          title: nomPrenom(e),
          subtitle: sub,
          onClick: () => navigate(`/eleves/${e.id}`),
          badges: [
            e.statut === "archive" ? el("span.chip", "archivé") : null,
            e.mineur ? el("span.chip.chip--info", "mineur") : null,
          ].filter(Boolean),
        });
      })
    );
  }

  paint();

  wrap.append(
    el("div.toolbar", [search, tabs]),
    listBox
  );

  return screen("Élèves", {
    actions: [
      btn("Payeurs", { onClick: () => navigate("/payeurs"), variant: "ghost", small: true }),
      btn("+ Élève", { onClick: () => navigate("/eleves/nouveau"), small: true }),
    ],
    children: [wrap],
  });
}

function cap(s) {
  return String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
}

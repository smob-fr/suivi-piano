// Suivi Piano — popin universelle de gestion rapide d'une séance
// Fonctionne quel que soit le statut (Prévu / Effectué / Annulé). Aucune redirection
// vers la fiche élève : tout se règle ici.

import { el, fmtEUR, fmtDuree, DUREES, LIEUX, toast, personneNom } from "./util.js";
import { seances as seancesDB, eleves as elevesDB, payeurs as payeursDB } from "./db.js";
import { libelleEleve, libellePayeur, montantParDefaut, membresVisite } from "./model.js";
import { libelleJour, today, addDays } from "./planning.js";
import { validerSolo, validerVisite, annulerDefinitivement, reprogrammer } from "./seanceOps.js";

export async function ouvrirQuickValider(seanceId, onDone) {
  const [seance, elevesAll, payeursAll, seancesAll] = await Promise.all([
    seancesDB.get(seanceId), elevesDB.all(), payeursDB.all(), seancesDB.all(),
  ]);
  if (!seance) return;
  const eleveById = new Map(elevesAll.map((e) => [e.id, e]));
  const payeurById = new Map(payeursAll.map((p) => [p.id, p]));

  const membres = membresVisite(seance, seancesAll);
  const estVisite = membres.length > 1;
  const eleve = eleveById.get(seance.eleveId);
  const payeur = seance.payeurType === "payeur" ? payeurById.get(seance.payeurId) : null;
  const aRattrapage = seancesAll.some((x) => x.rattrapageDe === seance.id);

  const tarifRef = montantParDefaut({ eleve, payeur, groupe: estVisite });
  let montant = seance.montant != null && seance.montant !== 0 ? seance.montant : tarifRef;
  let dureeMin = seance.dureeMin;
  const presence = new Map(membres.map((m) => [m.id, m.statut !== "annulee"]));

  const overlay = el("div.modal-overlay");
  const fermer = () => overlay.remove();
  overlay.addEventListener("click", (e) => { if (e.target === overlay) fermer(); });
  const content = el("div.qv__content");
  const box = el("div.modal.qv", [
    el("button.modal-close", { type: "button", "aria-label": "Fermer", onclick: fermer }, "✕"),
    content,
  ]);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const termine = (msg) => {
    fermer();
    if (msg) toast(msg, "ok");
    onDone && onDone();
  };

  /* ---------- En-tête (toujours affiché) ---------- */
  function entete() {
    return el("div.qv__head", [
      el("strong.qv__titre", estVisite ? `Visite — ${libellePayeur(payeur || {})}` : libelleEleve(eleve || {})),
      el("span.qv__sous", `${libelleJour(seance.date)} · ${seance.heure}`),
      el("span.qv__meta", [
        `${fmtDuree(dureeMin)}`,
        ` · ${fmtEUR(montant)}`,
        estVisite ? ` · ${membres.length} élèves` : "",
        ` · ${LIEUX[seance.lieu] || ""}`,
      ].join("")),
    ]);
  }

  /* ---------- Édition durée / montant ---------- */
  function zoneEdition() {
    const kids = [];
    if (!estVisite) {
      const sel = el("select.field__input", { onchange: (e) => { dureeMin = Number(e.target.value); rendre(); } },
        DUREES.map((d) => el("option", { value: d, selected: d === dureeMin }, `${d} min`)));
      kids.push(el("label.field", [el("span.field__label", "Durée"), sel]));
    }
    kids.push(el("label.field", [
      el("span.field__label", "Montant (€)"),
      el("input.field__input", {
        type: "number", inputmode: "decimal", value: montant ?? "",
        oninput: (e) => { montant = e.target.value === "" ? 0 : Number(e.target.value); },
      }),
    ]));
    return el("div.qv__edit", kids);
  }

  /* ---------- Présents (visite) ---------- */
  function zonePresents() {
    if (!estVisite) return null;
    return el("div.qv__presents", membres.map((m) => {
      const e = eleveById.get(m.eleveId);
      const c = el("button.qv__chip", {
        type: "button", class: presence.get(m.id) ? "qv__chip--on" : "",
        onclick: () => { presence.set(m.id, !presence.get(m.id)); c.classList.toggle("qv__chip--on", presence.get(m.id)); },
      }, `${m.heure} ${personneNom(e) || "?"}`);
      return c;
    }));
  }

  /* ---------- Actions selon le statut ---------- */
  let mode = "principal"; // principal | edition | annuler

  async function valider() {
    if (estVisite) {
      if (!membres.some((m) => presence.get(m.id))) return toast("Coche au moins un élève présent.", "warn");
      await validerVisite(membres, { effectuee: true, montant, presenceById: presence });
    } else {
      await validerSolo(seance, { effectuee: true, montant, dureeMin });
    }
    termine("Cours validé.");
  }

  async function passerAnnule() {
    if (estVisite) await validerVisite(membres, { effectuee: false, montant: 0, presenceById: presence });
    else await validerSolo(seance, { effectuee: false });
    seance.statut = "annulee";
    mode = "annuler";
    rendre();
  }

  function rendre() {
    const kids = [entete(), zonePresents()];

    if (mode === "edition") {
      kids.push(zoneEdition());
      kids.push(el("button.btn.btn--primary.qv__oui", { onclick: valider }, "Enregistrer"));
      kids.push(el("button.link", { type: "button", onclick: () => { mode = "principal"; rendre(); } }, "← retour"));
      content.replaceChildren(...kids.filter(Boolean));
      return;
    }

    if (mode === "annuler" || seance.statut === "annulee") {
      // Vue « cours annulé » : reprogrammer / annuler définitivement / il a eu lieu
      if (aRattrapage) {
        kids.push(el("p.qv__resume", "Cours annulé — rattrapage déjà programmé."));
      } else if (seance.rattrapageIgnore) {
        kids.push(el("p.qv__resume", "Cours annulé définitivement."));
      } else {
        kids.push(el("p.qv__resume", "Cours annulé. À reprogrammer ?"));
      }

      if (!aRattrapage) {
        let dateR = addDays(seance.date, 7);
        let heureR = seance.heure;
        const dateInput = el("input.field__input", { type: "date", value: dateR, oninput: (e) => (dateR = e.target.value) });
        const heureInput = el("input.field__input", { type: "time", value: heureR, oninput: (e) => (heureR = e.target.value) });
        kids.push(el("div.qv__edit", [
          el("label.field", [el("span.field__label", "Nouvelle date"), dateInput]),
          el("label.field", [el("span.field__label", "Heure"), heureInput]),
        ]));
        kids.push(el("button.btn.btn--primary.qv__oui", {
          onclick: async () => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateR)) return toast("Choisis une date.", "warn");
            await reprogrammer(seance, { date: dateR, heure: heureR });
            termine("Rattrapage programmé.");
          },
        }, "Reprogrammer ce cours"));
        kids.push(el("div.qv__row", [
          el("button.btn.btn--ghost", {
            onclick: async () => { await annulerDefinitivement(seance); termine("Cours annulé définitivement."); },
          }, "Annuler définitivement"),
          el("button.btn.btn--ghost", { onclick: valider }, "Le cours a eu lieu"),
        ]));
      } else {
        kids.push(el("button.btn.btn--ghost.qv__oui", { onclick: valider }, "Le cours a finalement eu lieu"));
      }
      content.replaceChildren(...kids.filter(Boolean));
      return;
    }

    // Statut prévu ou effectué
    if (seance.statut === "effectuee") {
      kids.push(el("p.qv__resume", `✓ Cours validé (${fmtDuree(dureeMin)} — ${fmtEUR(montant)})`));
    } else {
      kids.push(el("p.qv__resume", estVisite
        ? `Valider la visite (${fmtEUR(montant)} · ${membres.length} élèves)`
        : `Valider ce cours (${fmtDuree(dureeMin)} — ${fmtEUR(montant)})`));
    }
    kids.push(el("button.btn.btn--primary.qv__oui", { onclick: valider },
      seance.statut === "effectuee" ? "Confirmer" : "OUI, valider"));
    kids.push(el("div.qv__row", [
      el("button.btn.btn--ghost", { onclick: () => { mode = "edition"; rendre(); } }, "Modifier"),
      el("button.btn.btn--ghost", { onclick: passerAnnule }, "Absent / annulé"),
    ]));
    content.replaceChildren(...kids.filter(Boolean));
  }

  rendre();
}

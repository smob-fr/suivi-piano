// Suivi Piano — popin de validation rapide d'une séance

import { el, fmtEUR, fmtDuree, DUREES, toast, personneNom } from "./util.js";
import { seances as seancesDB, eleves as elevesDB, payeurs as payeursDB } from "./db.js";
import { libelleEleve, libellePayeur, montantParDefaut, membresVisite } from "./model.js";
import { libelleJour } from "./planning.js";
import { validerSolo, validerVisite } from "./seanceOps.js";
import { navigate } from "./router.js";

/**
 * Ouvre la popin de validation rapide.
 * @param {string} seanceId
 * @param {() => void} onDone  rappelé après validation / annulation
 */
export async function ouvrirQuickValider(seanceId, onDone) {
  const [seance, elevesAll, payeursAll, seancesAll] = await Promise.all([
    seancesDB.get(seanceId), elevesDB.all(), payeursDB.all(), seancesDB.all(),
  ]);
  if (!seance) return;
  const eleveById = new Map(elevesAll.map((e) => [e.id, e]));
  const payeurById = new Map(payeursAll.map((p) => [p.id, p]));

  const membres = membresVisite(seance, seancesAll);
  const estVisite = membres.length > 1;
  const payeur = seance.payeurType === "payeur" ? payeurById.get(seance.payeurId) : null;

  let montant = montantParDefaut({
    eleve: eleveById.get(seance.eleveId),
    payeur,
    groupe: estVisite,
  });
  let dureeMin = seance.dureeMin;
  const presence = new Map(membres.map((m) => [m.id, true]));

  const overlay = el("div.modal-overlay");
  const fermer = () => overlay.remove();
  overlay.addEventListener("click", (e) => { if (e.target === overlay) fermer(); });

  const titre = estVisite
    ? `Visite — ${libellePayeur(payeur || {})}`
    : libelleEleve(eleveById.get(seance.eleveId) || {});
  const sousTitre = `${libelleJour(seance.date)} · ${seance.heure}`;

  /* ----- Zone "Modifier" (repliée par défaut) ----- */
  const editZone = el("div.qv__edit", { hidden: true });
  const rerenderEdit = () => {
    const kids = [];
    if (!estVisite) {
      kids.push(
        champ("Durée", el("select.field__input", {
          onchange: (e) => { dureeMin = Number(e.target.value); rerenderResume(); },
        }, DUREES.map((d) => el("option", { value: d, selected: d === dureeMin }, `${d} min`))))
      );
    }
    kids.push(
      champ("Montant (€)", el("input.field__input", {
        type: "number", inputmode: "decimal", value: montant ?? "",
        oninput: (e) => { montant = e.target.value === "" ? 0 : Number(e.target.value); rerenderResume(); },
      }))
    );
    editZone.replaceChildren(...kids);
  };
  rerenderEdit();

  /* ----- Présents (visite) ----- */
  const presentsZone = estVisite
    ? el("div.qv__presents", membres.map((m) => {
        const e = eleveById.get(m.eleveId);
        const chip = el("button.qv__chip.qv__chip--on", {
          type: "button",
          onclick: () => {
            const on = !presence.get(m.id);
            presence.set(m.id, on);
            chip.classList.toggle("qv__chip--on", on);
          },
        }, `${m.heure} ${personneNom(e) || "?"}`);
        return chip;
      }))
    : null;

  /* ----- Résumé ----- */
  const resume = el("p.qv__resume");
  const rerenderResume = () => {
    resume.textContent = estVisite
      ? `Valider la visite (${fmtEUR(montant)} · ${membres.length} élèves)`
      : `Valider ce cours (${fmtDuree(dureeMin)} — ${fmtEUR(montant)})`;
  };
  rerenderResume();

  async function faire(effectuee) {
    try {
      if (estVisite) {
        await validerVisite(membres, { effectuee, montant, presenceById: presence });
      } else {
        await validerSolo(seance, { effectuee, montant, dureeMin });
      }
      fermer();
      toast(effectuee ? "Cours validé." : "Cours annulé.", "ok");
      onDone && onDone();
    } catch (e) {
      console.error(e);
      toast("Échec de l'enregistrement.", "warn");
    }
  }

  const box = el("div.modal.qv", [
    el("div.qv__head", [
      el("strong.qv__titre", titre),
      el("span.qv__sous", sousTitre),
    ]),
    presentsZone,
    resume,
    el("button.btn.btn--primary.qv__oui", { onclick: () => faire(true) }, "OUI, valider"),
    el("div.qv__row", [
      el("button.btn.btn--ghost", {
        onclick: () => {
          editZone.hidden = !editZone.hidden;
        },
      }, "Modifier"),
      el("button.btn.btn--ghost", { onclick: () => faire(false) }, "Absent / annulé"),
    ]),
    editZone,
    el("button.link.qv__fiche", {
      type: "button",
      onclick: () => { fermer(); navigate(`/seances/${seance.id}`); },
    }, "Ouvrir la fiche complète"),
  ]);

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function champ(label, input) {
    return el("label.field", [el("span.field__label", label), input]);
  }
}

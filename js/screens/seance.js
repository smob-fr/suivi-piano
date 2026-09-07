// Suivi Piano — écran Séance (version step 3 : statut, montant, commentaire, suppression)

import {
  el, toast, confirmDialog, personneNom, fmtEUR, fmtDuree,
  LIEUX, MODES_PAIEMENT, DUREES, STATUT_SEANCE,
} from "../util.js";
import { screen, btn, fieldText, fieldNumber, fieldSelect, fieldTextarea, formSection, emptyState } from "../ui.js";
import { seances, eleves as elevesDB, payeurs as payeursDB } from "../db.js";
import { libelleEleve, libellePayeur, montantParDefaut } from "../model.js";
import { finHeure, libelleJour, today } from "../planning.js";
import { navigate } from "../router.js";

export async function seanceScreen({ id }) {
  const isNew = id === "nouveau";
  const [elevesAll, payeursAll] = await Promise.all([elevesDB.all(), payeursDB.all()]);
  const actifs = elevesAll.filter((e) => e.statut === "actif").sort((a, b) => personneNom(a).localeCompare(personneNom(b), "fr"));

  let s;
  if (isNew) {
    const params = new URLSearchParams(location.hash.split("?")[1] || "");
    const e0 = actifs[0];
    s = {
      date: params.get("date") || today(),
      heure: params.get("heure") || "17:00",
      dureeMin: 60,
      eleveId: e0?.id || "",
      eleveIds: e0 ? [e0.id] : [],
      payeurType: e0?.payeurId ? "payeur" : "eleve",
      payeurId: e0?.payeurId || e0?.id || "",
      lieu: e0?.lieu || "domicile",
      statut: "effectuee",
      montant: null,
      modePaiement: e0?.modePaiementHabituel || "cheque",
      facturee: false,
      commentaire: "",
      rattrapageDe: null,
      source: "manuelle",
      creneauKey: null,
    };
  } else {
    s = await seances.get(id);
    if (!s) return screen("Séance introuvable", { children: [emptyState("Cette séance n'existe plus.")] });
  }

  const eleveCourant = () => elevesAll.find((e) => e.id === s.eleveId) || null;
  const payeurCourant = () => (s.payeurType === "payeur" ? payeursAll.find((p) => p.id === s.payeurId) : null);

  const set = (k, v) => { s[k] = v; };

  function appliquerEleve(e) {
    s.eleveId = e.id;
    s.eleveIds = [e.id];
    s.payeurType = e.payeurId ? "payeur" : "eleve";
    s.payeurId = e.payeurId || e.id;
    s.lieu = e.lieu;
    s.modePaiement = e.modePaiementHabituel;
  }

  function prefillMontant() {
    if (s.montant == null && s.statut === "effectuee") {
      s.montant = montantParDefaut({ eleve: eleveCourant(), payeur: payeurCourant(), groupe: false });
    }
  }

  const montantField = el("div");
  const renderMontant = () => {
    montantField.replaceChildren(
      s.statut === "effectuee"
        ? fieldNumber("Montant (€)", s.montant, (v) => set("montant", v))
        : el("p.field__hint", "Montant non facturé (séance non effectuée).")
    );
  };
  renderMontant();

  const titre = isNew
    ? "Nouvelle séance ponctuelle"
    : `Séance — ${libelleEleve(eleveCourant() || {})}`;

  const form = el("form.form", { onsubmit: (e) => e.preventDefault() }, [
    formSection("Séance", [
      isNew
        ? fieldSelect("Élève", s.eleveId, actifs.map((e) => [e.id, libelleEleve(e)]), (v) => {
            const e = actifs.find((x) => x.id === v);
            if (e) { appliquerEleve(e); rerenderInfos(); }
          })
        : infoLigne("Élève", el("button.link", { type: "button", onclick: () => navigate(`/eleves/${s.eleveId}`) }, libelleEleve(eleveCourant() || {}))),
      fieldText("Date", s.date, (v) => { set("date", v); }, { type: "date" }),
      fieldText("Heure", s.heure, (v) => set("heure", v), { type: "time" }),
      fieldSelect("Durée", s.dureeMin, DUREES.map((d) => [d, `${d} min`]), (v) => set("dureeMin", Number(v))),
      fieldSelect("Lieu", s.lieu, Object.entries(LIEUX), (v) => set("lieu", v)),
    ]),
    formSection("Suivi", [
      fieldSelect("Statut", s.statut, Object.entries(STATUT_SEANCE), (v) => {
        set("statut", v);
        prefillMontant();
        renderMontant();
      }),
      montantField,
      fieldSelect("Mode de paiement", s.modePaiement, Object.entries(MODES_PAIEMENT), (v) => set("modePaiement", v)),
      fieldTextarea("Commentaire (travail fait / à faire)", s.commentaire, (v) => set("commentaire", v), { rows: 3 }),
    ]),
    infosBox(),
    el("div.form-actions", [
      btn("Enregistrer", { onClick: save, variant: "primary" }),
      btn("Annuler", { onClick: () => history.back(), variant: "ghost" }),
      !isNew ? btn("Supprimer", { onClick: del, variant: "danger" }) : null,
    ]),
  ]);

  function infosBox() {
    const box = el("div.form-section.form-section--inset");
    rerenderInfos._box = box;
    rerenderInfos();
    return box;
  }
  function rerenderInfos() {
    const box = rerenderInfos._box;
    if (!box) return;
    const p = payeurCourant();
    box.replaceChildren(
      el("div.form-section__title", "Récapitulatif"),
      infoLigne("Fin prévue", finHeure(s.heure || "00:00", s.dureeMin || 0)),
      infoLigne("Payeur", s.payeurType === "payeur" && p ? libellePayeur(p) : "l'élève lui-même"),
      infoLigne("Jour", s.date ? libelleJour(s.date) : "—"),
    );
  }

  async function save() {
    if (!s.eleveId) return toast("Choisis un élève.", "warn");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date)) return toast("Date invalide.", "warn");
    if (!/^\d{2}:\d{2}$/.test(s.heure)) return toast("Heure invalide.", "warn");
    if (s.statut !== "effectuee") s.montant = s.statut === "annulee" ? 0 : null;
    await seances.save(s);
    toast("Séance enregistrée.", "ok");
    navigate("/agenda");
  }

  async function del() {
    if (!(await confirmDialog("Supprimer cette séance ?", { danger: true, okLabel: "Supprimer" }))) return;
    await seances.remove(id);
    toast("Séance supprimée.");
    navigate("/agenda");
  }

  return screen(titre, { children: [form] });
}

function infoLigne(label, valeur) {
  return el("div.info-row", [el("span.info-row__label", label), el("span.info-row__val", valeur)]);
}

// Suivi Piano — écran Séance (étape 4 : visite de foyer, rattrapage)

import {
  el, toast, confirmDialog, personneNom, fmtEUR, fmtDuree,
  LIEUX, MODES_PAIEMENT, DUREES, STATUT_SEANCE, uid, nowISO,
} from "../util.js";
import { screen, btn, fieldText, fieldNumber, fieldSelect, fieldTextarea, fieldCheckbox, formSection, emptyState } from "../ui.js";
import { seances as seancesDB, eleves as elevesDB, payeurs as payeursDB } from "../db.js";
import { libelleEleve, libellePayeur, montantParDefaut, membresVisite } from "../model.js";
import { finHeure, libelleJour, today, addDays } from "../planning.js";
import { navigate, currentQuery } from "../router.js";

export async function seanceScreen({ id }) {
  const isNew = id === "nouveau";
  const [seancesAll, elevesAll, payeursAll] = await Promise.all([seancesDB.all(), elevesDB.all(), payeursDB.all()]);
  const actifs = elevesAll.filter((e) => e.statut === "actif").sort((a, b) => personneNom(a).localeCompare(personneNom(b), "fr"));
  const eleveById = new Map(elevesAll.map((e) => [e.id, e]));
  const payeurById = new Map(payeursAll.map((p) => [p.id, p]));

  let s;
  if (isNew) {
    const qs = currentQuery();
    const e0 = actifs[0];
    s = baseSeance(e0);
    s.date = qs.get("date") || today();
    s.heure = qs.get("heure") || "17:00";
    if (qs.get("rattrapageDe")) {
      s.rattrapageDe = qs.get("rattrapageDe");
      const orig = seancesAll.find((x) => x.id === s.rattrapageDe);
      if (orig) {
        const e = eleveById.get(orig.eleveId);
        if (e) appliquerEleve(s, e);
        s.dureeMin = orig.dureeMin;
        s.date = addDays(orig.date, 7);
        s.heure = orig.heure;
        s.statut = "prevue";
      }
    }
  } else {
    s = await seancesDB.get(id);
    if (!s) return screen("Séance introuvable", { children: [emptyState("Cette séance n'existe plus.")] });
  }

  // Visite de foyer : autres séances du même foyer le même jour
  const membres = isNew ? [s] : membresVisite(s, seancesAll);
  const estVisite = membres.length > 1;
  const porteuse = membres[0];
  // présence : coché si la séance du membre n'est pas annulée
  const presence = new Map(membres.map((m) => [m.id, m.statut !== "annulee"]));
  // statut de la visite : effectuee si au moins un membre effectué, annulee si tous annulés, sinon prevue
  let statutVisite = estVisite
    ? membres.some((m) => m.statut === "effectuee") ? "effectuee"
      : membres.every((m) => m.statut === "annulee") ? "annulee" : "prevue"
    : s.statut;
  let montantVisite = estVisite ? (porteuse.montant ?? null) : s.montant;

  const eleveCourant = () => eleveById.get(s.eleveId) || null;
  const payeurCourant = () => (s.payeurType === "payeur" ? payeurById.get(s.payeurId) : null);
  const set = (k, v) => { s[k] = v; };

  function prefillMontant() {
    const st = estVisite ? statutVisite : s.statut;
    if (st === "effectuee" && (estVisite ? montantVisite : s.montant) == null) {
      const v = montantParDefaut({ eleve: eleveCourant(), payeur: payeurCourant(), groupe: estVisite });
      if (estVisite) montantVisite = v; else s.montant = v;
    }
  }

  /* ----- Bloc montant (réactif au statut) ----- */
  const montantBox = el("div");
  const renderMontant = () => {
    const st = estVisite ? statutVisite : s.statut;
    montantBox.replaceChildren(
      st === "effectuee"
        ? fieldNumber(estVisite ? "Montant de la visite (€)" : "Montant (€)", estVisite ? montantVisite : s.montant, (v) => {
            if (estVisite) montantVisite = v; else s.montant = v;
          })
        : el("p.field__hint", "Montant non facturé (séance non effectuée).")
    );
  };
  renderMontant();

  /* ----- Bloc visite ----- */
  const visiteBox = el("div");
  if (estVisite) {
    visiteBox.append(
      formSection("Visite du foyer " + libellePayeur(payeurCourant() || {}), [
        el("p.field__hint", "Un seul montant pour toute la visite. Décoche les élèves absents."),
        ...membres.map((m) => {
          const e = eleveById.get(m.eleveId);
          return fieldCheckbox(
            `${m.heure} — ${libelleEleve(e || {})} (${fmtDuree(m.dureeMin)})`,
            presence.get(m.id),
            (v) => presence.set(m.id, v)
          );
        }),
      ], { inset: true })
    );
  }

  /* ----- Rattrapage ----- */
  const rattrapageBox = el("div");
  if (!isNew) {
    const rattr = seancesAll.find((x) => x.rattrapageDe === s.id);
    const orig = s.rattrapageDe ? seancesAll.find((x) => x.id === s.rattrapageDe) : null;
    const kids = [];
    if (orig) kids.push(el("p.field__hint", `Rattrapage du cours du ${libelleJour(orig.date)}.`));
    if (rattr) kids.push(el("p.field__hint", `Rattrapage programmé le ${libelleJour(rattr.date)} — `,
      el("button.link", { type: "button", onclick: () => navigate(`/seances/${rattr.id}`) }, "voir")));
    if (s.statut === "annulee" && !rattr) {
      kids.push(btn("Programmer un rattrapage", { onClick: programmerRattrapage, variant: "ghost" }));
    }
    if (kids.length) rattrapageBox.append(formSection("Rattrapage", kids, { inset: true }));
  }

  const titre = isNew
    ? (s.rattrapageDe ? "Rattrapage" : "Nouvelle séance ponctuelle")
    : estVisite ? `Visite — ${libellePayeur(payeurCourant() || {})}` : `Séance — ${libelleEleve(eleveCourant() || {})}`;

  const form = el("form.form", { onsubmit: (e) => e.preventDefault() }, [
    formSection("Séance", [
      isNew
        ? fieldSelect("Élève", s.eleveId, actifs.map((e) => [e.id, libelleEleve(e)]), (v) => {
            const e = actifs.find((x) => x.id === v);
            if (e) appliquerEleve(s, e);
          })
        : infoLigne("Élève", el("button.link", { type: "button", onclick: () => navigate(`/eleves/${s.eleveId}`) }, libelleEleve(eleveCourant() || {}))),
      fieldText("Date", s.date, (v) => set("date", v), { type: "date" }),
      !estVisite ? fieldText("Heure", s.heure, (v) => set("heure", v), { type: "time" }) : null,
      !estVisite ? fieldSelect("Durée", s.dureeMin, DUREES.map((d) => [d, `${d} min`]), (v) => set("dureeMin", Number(v))) : null,
      fieldSelect("Lieu", s.lieu, Object.entries(LIEUX), (v) => set("lieu", v)),
    ]),
    visiteBox,
    formSection("Suivi", [
      fieldSelect("Statut", estVisite ? statutVisite : s.statut, Object.entries(STATUT_SEANCE), (v) => {
        if (estVisite) statutVisite = v; else set("statut", v);
        prefillMontant();
        renderMontant();
      }),
      montantBox,
      fieldSelect("Mode de paiement", s.modePaiement, Object.entries(MODES_PAIEMENT), (v) => set("modePaiement", v)),
      fieldTextarea("Commentaire (travail fait / à faire)", s.commentaire, (v) => set("commentaire", v), { rows: 3 }),
    ]),
    rattrapageBox,
    el("div.form-section.form-section--inset", [
      el("div.form-section__title", "Récapitulatif"),
      infoLigne("Fin prévue", finHeure(s.heure || "00:00", s.dureeMin || 0)),
      infoLigne("Payeur", s.payeurType === "payeur" ? libellePayeur(payeurCourant() || {}) : "l'élève lui-même"),
      infoLigne("Jour", s.date ? libelleJour(s.date) : "—"),
    ]),
    el("div.form-actions", [
      btn("Enregistrer", { onClick: save, variant: "primary" }),
      btn("Annuler", { onClick: () => history.back(), variant: "ghost" }),
      !isNew ? btn(estVisite ? "Supprimer la visite" : "Supprimer", { onClick: del, variant: "danger" }) : null,
    ]),
  ]);

  async function programmerRattrapage() {
    navigate(`/seances/nouveau?rattrapageDe=${s.id}`);
  }

  async function save() {
    if (!s.eleveId) return toast("Choisis un élève.", "warn");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date)) return toast("Date invalide.", "warn");
    if (!/^\d{2}:\d{2}$/.test(s.heure)) return toast("Heure invalide.", "warn");

    if (estVisite) {
      const st = statutVisite;
      const now = nowISO();
      if (st === "effectuee" && !membres.some((m) => presence.get(m.id))) {
        return toast("Aucun élève présent : passe la visite en « Annulée » ou coche au moins un élève.", "warn");
      }
      // La séance qui porte le montant est le premier membre présent (pour l'attestation).
      const port = st === "effectuee" ? membres.find((m) => presence.get(m.id)) : membres[0];
      for (const m of membres) {
        const present = presence.get(m.id);
        m.date = s.date;
        m.lieu = s.lieu;
        m.modePaiement = s.modePaiement;
        m.rattacheeA = m.id === port.id ? null : port.id;
        if (st === "prevue") { m.statut = "prevue"; m.montant = null; }
        else if (st === "annulee") { m.statut = "annulee"; m.montant = 0; }
        else {
          m.statut = present ? "effectuee" : "annulee";
          m.montant = m.id === port.id ? (montantVisite ?? 0) : 0;
        }
        m.updatedAt = now;
      }
      // commentaire : uniquement sur la séance ouverte
      const ouverte = membres.find((m) => m.id === s.id);
      if (ouverte) ouverte.commentaire = s.commentaire;
      for (const m of membres) await seancesDB.save(m);
      toast("Visite enregistrée.", "ok");
    } else {
      if (s.statut === "effectuee") { /* montant conservé */ }
      else s.montant = s.statut === "annulee" ? 0 : null;
      s.rattacheeA = null;
      await seancesDB.save(s);
      toast("Séance enregistrée.", "ok");
    }
    navigate("/agenda");
  }

  async function del() {
    const msg = estVisite ? "Supprimer toutes les séances de cette visite ?" : "Supprimer cette séance ?";
    if (!(await confirmDialog(msg, { danger: true, okLabel: "Supprimer" }))) return;
    if (estVisite) {
      for (const m of membres) await seancesDB.remove(m.id);
    } else {
      await seancesDB.remove(id);
    }
    toast("Supprimé.");
    navigate("/agenda");
  }

  return screen(titre, { children: [form], back: true });

  function appliquerEleve(target, e) {
    target.eleveId = e.id;
    target.eleveIds = [e.id];
    target.payeurType = e.payeurId ? "payeur" : "eleve";
    target.payeurId = e.payeurId || e.id;
    target.lieu = e.lieu;
    target.modePaiement = e.modePaiementHabituel;
  }
}

function baseSeance(e0) {
  return {
    date: today(),
    heure: "17:00",
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
    rattacheeA: null,
    source: "manuelle",
    creneauKey: null,
  };
}

function infoLigne(label, valeur) {
  return el("div.info-row", [el("span.info-row__label", label), el("span.info-row__val", valeur)]);
}

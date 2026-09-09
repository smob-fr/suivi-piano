// Suivi Piano — fiche élève (création / édition)

import {
  el, toast, confirmDialog, personneNom,
  LIEUX, MODES_PAIEMENT, JOURS, DUREES,
} from "../util.js";
import {
  screen, btn, fieldText, fieldNumber, fieldSelect, fieldCheckbox, fieldTextarea,
  formSection, sectionPliable, emptyState,
} from "../ui.js";
import { eleves as elevesDB, payeurs as payeursDB } from "../db.js";
import { nouvelEleve, representantVide, libelleEleve, libellePayeur } from "../model.js";
import { genererHorizon, conflitInterne, chercherConflitCreneaux } from "../planning.js";
import { navigate } from "../router.js";

export async function eleveFormScreen({ id }) {
  const isNew = id === "nouveau";
  const e = isNew ? nouvelEleve() : await elevesDB.get(id);
  if (!e) return screen("Élève introuvable", { children: [emptyState("Cette fiche n'existe plus.")] });

  const [listePayeurs, tousEleves] = await Promise.all([payeursDB.all(), elevesDB.all()]);
  const autresEleves = tousEleves
    .filter((x) => x.id !== e.id && x.statut === "actif")
    .sort((a, b) => (a.nom || "").localeCompare(b.nom || "", "fr"));

  const set = (k, v) => { e[k] = v; };
  const setAdr = (k, v) => { e.adresse[k] = v; };

  /* ----- Représentant légal (affiché si mineur) ----- */
  const repBox = el("div");
  const renderRep = () => {
    if (e.mineur && !e.representantLegal) e.representantLegal = representantVide();
    repBox.replaceChildren();
    if (e.mineur) {
      repBox.appendChild(
        formSection("Représentant légal", [
          fieldText("Prénom", e.representantLegal.prenom, (v) => (e.representantLegal.prenom = v)),
          fieldText("Nom", e.representantLegal.nom, (v) => (e.representantLegal.nom = v)),
          fieldText("Téléphone", e.representantLegal.telephone, (v) => (e.representantLegal.telephone = v), { type: "tel" }),
          fieldText("Email", e.representantLegal.email, (v) => (e.representantLegal.email = v), { type: "email" }),
        ], { inset: true })
      );
    }
  };
  renderRep();

  /* ----- Créneaux ----- */
  const creneauxBox = el("div.creneaux");
  const renderCreneaux = () => {
    const parts = e.creneaux.map((c, idx) =>
      el("div.creneau-row", [
        fieldSelect("Jour", c.jour, JOURS.map((j) => [j, cap(j)]), (v) => (c.jour = v)),
        fieldText("Heure", c.heure, (v) => (c.heure = v), { type: "time" }),
        fieldSelect("Durée", c.dureeMin, DUREES.map((d) => [d, `${d} min`]), (v) => (c.dureeMin = Number(v))),
        btn("✕", { onClick: () => { e.creneaux.splice(idx, 1); renderCreneaux(); }, variant: "ghost", small: true }),
      ])
    );
    if (!e.creneaux.length) parts.push(el("p.field__hint", "Aucun créneau."));
    if (e.creneaux.length < 2) {
      parts.push(
        btn("+ Ajouter un créneau", {
          onClick: () => { e.creneaux.push({ jour: "lundi", heure: "17:00", dureeMin: 60 }); renderCreneaux(); },
          variant: "ghost",
          small: true,
        })
      );
    }
    creneauxBox.replaceChildren(...parts);
  };
  renderCreneaux();

  /* ----- Payeur -----
     Valeurs : "self" | "e:<id élève parent>" | "p:<id payeur externe>" */
  const payeurOpts = [
    ["self", "L'élève lui-même"],
    ...autresEleves.map((x) => ["e:" + x.id, `${personneNom(x)} (élève)`]),
    ...listePayeurs.map((p) => ["p:" + p.id, `${libellePayeur(p)} (payeur externe)`]),
  ];
  const payeurValeur = () => (e.payeurEleveId ? "e:" + e.payeurEleveId : e.payeurId ? "p:" + e.payeurId : "self");
  const payeurHint = el("p.field__hint");
  const renderPayeurHint = () => {
    payeurHint.replaceChildren();
    if (e.payeurId) {
      payeurHint.append(
        "Coordonnées du payeur externe (pour l'attestation) : ",
        el("button.link", { type: "button", onclick: () => navigate(`/payeurs/${e.payeurId}`) }, "modifier ce payeur"),
        "."
      );
    } else if (e.payeurEleveId) {
      payeurHint.append("Les cours de cet élève seront regroupés avec ceux du payeur sur une seule facture.");
    } else {
      payeurHint.append(
        "Choisis un autre élève (un parent lui aussi élève) ou, pour un tiers non élève, ",
        el("button.link", { type: "button", onclick: () => navigate("/payeurs/nouveau") }, "crée un payeur externe"),
        "."
      );
    }
  };
  renderPayeurHint();
  const payeurMode = el("div", [
    fieldSelect("Payeur", payeurValeur(), payeurOpts, (v) => {
      if (v === "self") { e.payeurId = null; e.payeurEleveId = null; }
      else if (v.startsWith("e:")) { e.payeurEleveId = v.slice(2); e.payeurId = null; }
      else if (v.startsWith("p:")) { e.payeurId = v.slice(2); e.payeurEleveId = null; }
      renderPayeurHint();
    }),
    payeurHint,
  ]);

  const form = el("form.form", { onsubmit: (ev) => ev.preventDefault() }, [
    sectionPliable("Identité", [
      fieldText("Prénom *", e.prenom, (v) => set("prenom", v)),
      fieldText("Nom", e.nom, (v) => set("nom", v)),
      fieldText("Téléphone", e.telephone, (v) => set("telephone", v), { type: "tel" }),
      fieldText("Email", e.email, (v) => set("email", v), { type: "email" }),
      fieldCheckbox("Élève mineur", e.mineur, (v) => { set("mineur", v); renderRep(); }),
    ], { ouvert: false }),
    repBox,
    sectionPliable("Créneau & lieu", [
      fieldSelect("Lieu", e.lieu, Object.entries(LIEUX), (v) => set("lieu", v)),
      fieldCheckbox("Créneau récurrent chaque semaine", e.creneauRecurrent, (v) => set("creneauRecurrent", v)),
      el("div.field", { style: "grid-column:1/-1" }, [
        el("span.field__label", "Horaires"),
        creneauxBox,
      ]),
    ], { ouvert: false }),
    sectionPliable("Adresse", [
      fieldText("N°", e.adresse.numero, (v) => setAdr("numero", v)),
      fieldText("Rue", e.adresse.rue, (v) => setAdr("rue", v)),
      fieldText("Complément", e.adresse.complement, (v) => setAdr("complement", v)),
      fieldText("Code postal", e.adresse.cp, (v) => setAdr("cp", v)),
      fieldText("Ville", e.adresse.ville, (v) => setAdr("ville", v)),
    ], { ouvert: false }),
    sectionPliable("Facturation", [
      payeurMode,
      fieldNumber("Tarif habituel (€ / séance)", e.tarifHabituel, (v) => set("tarifHabituel", v)),
      fieldSelect("Mode de paiement habituel", e.modePaiementHabituel, Object.entries(MODES_PAIEMENT), (v) => set("modePaiementHabituel", v)),
      fieldCheckbox("Éligible crédit d'impôt", e.eligibleCreditImpot, (v) => set("eligibleCreditImpot", v)),
    ], { ouvert: false }),
    sectionPliable("Divers", [
      fieldText("Date de début des cours", e.dateDebut || "", (v) => set("dateDebut", v || null), { type: "date" }),
      fieldSelect("Statut", e.statut, [["actif", "Actif"], ["archive", "Archivé"]], (v) => set("statut", v)),
      fieldTextarea("Notes (niveau, morceaux, remarques…)", e.notes, (v) => set("notes", v), { rows: 4 }),
    ], { ouvert: false }),
    el("div.form-actions", [
      btn("Enregistrer", { onClick: save, variant: "primary" }),
      btn("Annuler", { onClick: () => navigate("/eleves"), variant: "ghost" }),
      !isNew
        ? btn(e.statut === "archive" ? "Réactiver" : "Archiver", {
            onClick: toggleArchive,
            variant: "ghost",
          })
        : null,
      !isNew ? btn("Supprimer définitivement", { onClick: del, variant: "danger" }) : null,
    ]),
  ]);

  async function save() {
    if (!e.prenom.trim()) return toast("Le prénom est obligatoire.", "warn");
    for (const c of e.creneaux) {
      if (!/^\d{2}:\d{2}$/.test(c.heure)) return toast("Heure de créneau invalide (format HH:MM).", "warn");
    }
    if (e.statut === "actif" && e.creneaux.length) {
      const interne = conflitInterne(e.creneaux);
      if (interne) return toast("Les deux créneaux de cet élève se chevauchent.", "warn");
      const conflit = await chercherConflitCreneaux(e.creneaux, e.id);
      if (conflit) {
        const c = conflit.creneau;
        return toast(
          `Créneau ${cap(c.jour)} ${c.heure} déjà occupé par ${personneNom(conflit.eleve)} ` +
          `(${conflit.autreCreneau.heure}, ${conflit.autreCreneau.dureeMin} min).`,
          "warn"
        );
      }
    }
    if (e.mineur && e.representantLegal && !personneNom(e.representantLegal)) {
      e.representantLegal = null;
    }
    await elevesDB.save(e);
    await regenererSilencieux();
    toast("Fiche enregistrée.", "ok");
    navigate("/eleves");
  }

  async function toggleArchive() {
    e.statut = e.statut === "archive" ? "actif" : "archive";
    await elevesDB.save(e);
    await regenererSilencieux();
    toast(e.statut === "archive" ? "Élève archivé." : "Élève réactivé.");
    navigate("/eleves");
  }

  async function regenererSilencieux() {
    try { await genererHorizon(); } catch (err) { console.error("génération séances", err); }
  }

  async function del() {
    const ok = await confirmDialog(
      `Supprimer définitivement la fiche de ${libelleEleve(e)} ? Cette action est irréversible.`,
      { danger: true, okLabel: "Supprimer" }
    );
    if (!ok) return;
    await elevesDB.remove(id);
    toast("Fiche supprimée.");
    navigate("/eleves");
  }

  return screen(isNew ? "Nouvel élève" : libelleEleve(e), { children: [form], back: true });
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

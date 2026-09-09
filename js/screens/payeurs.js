// Suivi Piano — écran Payeurs (foyers)

import { el, toast, confirmDialog, personneNom, MODES_PAIEMENT, fmtEUR, fmtDuree } from "../util.js";
import {
  screen, btn, fieldText, fieldNumber, fieldSelect, fieldCheckbox,
  formSection, emptyState, listItem,
} from "../ui.js";
import { payeurs as payeursDB, elevesDuPayeur } from "../db.js";
import { nouveauPayeur, adresseTexte, libellePayeur } from "../model.js";
import { navigate } from "../router.js";

export async function payeursListScreen() {
  const list = await payeursDB.all();
  const eleves = await Promise.all(list.map((p) => elevesDuPayeur(p.id)));

  const items = list.length
    ? list
        .sort((a, b) => personneNom(a).localeCompare(personneNom(b)))
        .map((p, i) =>
          listItem({
            title: libellePayeur(p),
            subtitle: adresseTexte(p.adresse) || "Adresse non renseignée",
            meta: `${eleves[i].length} élève${eleves[i].length > 1 ? "s" : ""}`,
            onClick: () => navigate(`/payeurs/${p.id}`),
            badges: [
              p.forfait?.montant != null
                ? el("span.chip.chip--info", `forfait ${fmtEUR(p.forfait.montant)}`)
                : null,
              p.eligibleCreditImpot ? el("span.chip.chip--ok", "crédit d'impôt") : null,
            ].filter(Boolean),
          })
        )
    : [emptyState("Aucun payeur distinct. Un payeur regroupe les élèves d'une même famille.")];

  return screen("Payeurs / foyers", {
    back: true,
    actions: [btn("+ Payeur", { onClick: () => navigate("/payeurs/nouveau"), small: true })],
    children: [el("div.list", items)],
  });
}

export async function payeurFormScreen({ id }) {
  const isNew = id === "nouveau";
  const p = isNew ? nouveauPayeur() : await payeursDB.get(id);
  if (!p) return screen("Payeur introuvable", { children: [emptyState("Ce payeur n'existe plus.")] });

  const rattaches = isNew ? [] : await elevesDuPayeur(id);
  const set = (k, v) => { p[k] = v; };
  const setAdr = (k, v) => { p.adresse[k] = v; };
  const setForfait = (k, v) => {
    p.forfait = p.forfait || { montant: null, dureeMin: 120 };
    p.forfait[k] = v;
  };

  const forfaitBox = el("div");
  const renderForfait = () => {
    forfaitBox.replaceChildren(
      p.forfait
        ? formSection("Forfait foyer", [
            fieldNumber("Montant (€)", p.forfait.montant, (v) => setForfait("montant", v)),
            fieldNumber("Durée totale (min)", p.forfait.dureeMin, (v) => setForfait("dureeMin", v)),
            el("p.field__hint", "Utilisé quand une séance regroupe plusieurs membres du foyer (ex. « Famille Untel : 60 € / 2 h »)."),
          ], { inset: true })
        : el("p.field__hint", "Pas de forfait : chaque élève garde son tarif habituel.")
    );
  };
  renderForfait();

  const form = el("form.form", { onsubmit: (e) => e.preventDefault() }, [
    formSection("Identité du payeur", [
      fieldText("Prénom", p.prenom, (v) => set("prenom", v)),
      fieldText("Nom", p.nom, (v) => set("nom", v)),
      fieldText("Téléphone", p.telephone, (v) => set("telephone", v), { type: "tel" }),
      fieldText("Email", p.email, (v) => set("email", v), { type: "email" }),
    ]),
    formSection("Adresse", [
      fieldText("N°", p.adresse.numero, (v) => setAdr("numero", v)),
      fieldText("Rue", p.adresse.rue, (v) => setAdr("rue", v)),
      fieldText("Complément", p.adresse.complement, (v) => setAdr("complement", v)),
      fieldText("Code postal", p.adresse.cp, (v) => setAdr("cp", v)),
      fieldText("Ville", p.adresse.ville, (v) => setAdr("ville", v)),
    ]),
    formSection("Facturation", [
      fieldSelect("Mode de paiement habituel", p.modePaiementHabituel, Object.entries(MODES_PAIEMENT), (v) => set("modePaiementHabituel", v)),
      fieldCheckbox("Éligible crédit d'impôt", p.eligibleCreditImpot, (v) => set("eligibleCreditImpot", v)),
      fieldCheckbox("Forfait foyer (montant global)", !!p.forfait, (v) => {
        p.forfait = v ? { montant: null, dureeMin: 120 } : null;
        renderForfait();
      }),
    ]),
    forfaitBox,
    rattaches.length
      ? formSection("Élèves rattachés", [
          el("ul.plain-list", rattaches.map((e) =>
            el("li", [el("button.link", { type: "button", onclick: () => navigate(`/eleves/${e.id}`) }, personneNom(e))])
          )),
        ])
      : null,
    el("div.form-actions", [
      btn("Enregistrer", { onClick: save, variant: "primary" }),
      btn("Annuler", { onClick: () => history.back(), variant: "ghost" }),
      !isNew && !rattaches.length
        ? btn("Supprimer", { onClick: del, variant: "danger" })
        : null,
    ]),
  ]);

  async function save() {
    if (!p.prenom && !p.nom) return toast("Indique au moins un nom.", "warn");
    if (p.forfait && p.forfait.montant == null) return toast("Renseigne le montant du forfait ou décoche-le.", "warn");
    await payeursDB.save(p);
    toast("Payeur enregistré.", "ok");
    navigate("/payeurs");
  }

  async function del() {
    if (!(await confirmDialog("Supprimer ce payeur ?", { danger: true, okLabel: "Supprimer" }))) return;
    await payeursDB.remove(id);
    toast("Payeur supprimé.");
    navigate("/payeurs");
  }

  return screen(isNew ? "Nouveau payeur" : libellePayeur(p), { children: [form], back: true });
}

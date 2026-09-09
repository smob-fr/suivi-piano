// Suivi Piano — écran Périodes sans cours (vacances, absences)

import { el, toast, confirmDialog, uid, fmtDateFR, sortBy } from "../util.js";
import { screen, btn, fieldText, formSection, emptyState, listItem } from "../ui.js";
import { periodes as periodesDB } from "../planning.js";
import { genererHorizon } from "../planning.js";
import { render } from "../router.js";

export async function periodesScreen() {
  const list = sortBy(await periodesDB.all(), (p) => p.debut).reverse();

  const draft = { libelle: "", debut: "", fin: "" };

  const form = el("form.form", { onsubmit: (e) => e.preventDefault() }, [
    formSection("Nouvelle période sans cours", [
      fieldText("Libellé (ex. Vacances de la Toussaint)", draft.libelle, (v) => (draft.libelle = v)),
      fieldText("Du", draft.debut, (v) => (draft.debut = v), { type: "date" }),
      fieldText("Au", draft.fin, (v) => (draft.fin = v), { type: "date" }),
      el("p.field__hint", "Aucune séance prévue ne sera générée sur cette plage. Les séances déjà effectuées ou annulées ne sont pas touchées."),
    ]),
    el("div.form-actions", [btn("Ajouter", { onClick: ajouter, variant: "primary" })]),
  ]);

  const items = list.length
    ? list.map((p) =>
        listItem({
          title: p.libelle || "Sans cours",
          subtitle: `${fmtDateFR(p.debut)} → ${fmtDateFR(p.fin)}`,
          meta: btn("Supprimer", { onClick: (ev) => { ev.stopPropagation(); supprimer(p); }, variant: "ghost", small: true }),
          onClick: () => {},
        })
      )
    : [emptyState("Aucune période enregistrée.")];

  async function ajouter() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.debut) || !/^\d{4}-\d{2}-\d{2}$/.test(draft.fin)) {
      return toast("Renseigne les deux dates.", "warn");
    }
    if (draft.fin < draft.debut) return toast("La date de fin précède la date de début.", "warn");
    await periodesDB.save({ id: uid(), libelle: draft.libelle.trim(), debut: draft.debut, fin: draft.fin });
    const res = await genererHorizon();
    toast(`Période ajoutée${res.supprimes ? ` — ${res.supprimes} séance(s) prévue(s) retirée(s)` : ""}.`, "ok");
    render();
  }

  async function supprimer(p) {
    if (!(await confirmDialog(`Supprimer « ${p.libelle || "sans cours"} » ?`, { danger: true, okLabel: "Supprimer" }))) return;
    await periodesDB.remove(p.id);
    await genererHorizon();
    toast("Période supprimée.");
    render();
  }

  return screen("Périodes sans cours", { children: [form, el("div.list", items)], back: true });
}

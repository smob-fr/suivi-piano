// Suivi Piano — écran « Regrouper les foyers »
// Remplace les élèves d'un même foyer par UN élève principal (+ participants).
// L'historique des séances n'est jamais modifié (voir fusion.js).

import { el, toast, confirmDialog, fmtDuree, fmtEUR, cap } from "../util.js";
import { screen, btn, emptyState, fieldNumber, fieldText } from "../ui.js";
import { eleves as elevesDB, payeurs as payeursDB, seances as seancesDB } from "../db.js";
import { libelleEleve, libellePayeur } from "../model.js";
import { genererHorizon } from "../planning.js";
import { exporterSauvegarde } from "../backup.js";
import { detecterGroupes, proposer, appliquerFusion, fusionsEnPlace, annulerFusion } from "../fusion.js";
import { render, navigate } from "../router.js";

export async function fusionFoyersScreen() {
  const [elevesAll, payeursAll, seancesAll] = await Promise.all([elevesDB.all(), payeursDB.all(), seancesDB.all()]);
  const payeurById = new Map(payeursAll.map((p) => [p.id, p]));
  const groupes = detecterGroupes(elevesAll);

  const nbSeances = (eleveId) => {
    const s = seancesAll.filter((x) => x.eleveId === eleveId);
    return {
      effectuees: s.filter((x) => x.statut === "effectuee").length,
      autres: s.filter((x) => x.statut !== "effectuee" && x.date < new Date().toISOString().slice(0, 10)).length,
    };
  };

  // État de chaque groupe (choix en cours)
  const etats = groupes.map((g) => {
    const principalId = g.principalImpose || g.membres[0].id;
    const payeur = g.ref.type === "payeur" ? payeurById.get(g.ref.id) : null;
    return { g, payeur, coche: true, ...proposer(g, principalId, payeur) };
  });

  const zoneGroupes = el("div.fusion-groupes");

  function nomFoyer(g, payeur) {
    return g.ref.type === "payeur" ? libellePayeur(payeur || {}) : libelleEleve(g.membres.find((m) => m.id === g.ref.id) || g.membres[0]);
  }

  function carte(st) {
    const { g, payeur } = st;
    const principal = g.membres.find((m) => m.id === st.principalId);
    return el("section.foyer-bloc", [
      el("div.foyer-bloc__head", [
        el("strong", `Foyer ${nomFoyer(g, payeur)}`),
        el("label.field.field--check", [
          el("input", { type: "checkbox", checked: st.coche, onchange: (e) => { st.coche = e.target.checked; majBouton(); } }),
          el("span.field__label", "Regrouper"),
        ]),
      ]),
      el("p.field__hint", g.principalImpose
        ? "Le payeur est lui-même élève : il devient l'élève principal."
        : "Choisis l'élève principal (celui qui restera dans la liste des élèves) :"),
      el("div.fusion-membres", g.membres.map((m) => {
        const n = nbSeances(m.id);
        const cr = (m.creneaux || []).map((c) => `${cap(c.jour)} ${c.heure} · ${fmtDuree(c.dureeMin)}`).join(", ") || "pas de créneau";
        return el("label.fusion-membre", [
          el("input", {
            type: "radio", name: `princ-${g.key}`, checked: m.id === st.principalId, disabled: !!g.principalImpose,
            onchange: () => { Object.assign(st, proposer(g, m.id, payeur)); rafraichir(); },
          }),
          el("span", [
            el("strong", libelleEleve(m)),
            el("span.field__hint", ` — ${cr} · ${m.tarifHabituel != null ? fmtEUR(m.tarifHabituel) : "pas de tarif"} · ${n.effectuees} cours effectué(s) conservé(s)`),
          ]),
        ]);
      })),
      el("div.fusion-resultat", [
        el("p.field__label", `Résultat : ${libelleEleve(principal)}`),
        el("p.field__hint", st.creneaux.length
          ? st.creneaux.map((c) => `${cap(c.jour)} ${c.heure} · ${fmtDuree(c.dureeMin)}`).join(" / ")
          : "Aucun créneau (à renseigner dans la fiche)."),
        fieldNumber("Tarif du cours (€) — toutes personnes comprises", st.tarif, (v) => { st.tarif = v; }),
        fieldText("Participants (prénoms, séparés par une virgule)", st.participants.join(", "),
          (v) => { st.participants = v.split(",").map((x) => x.trim()).filter(Boolean); }),
      ]),
    ]);
  }

  function rafraichir() { zoneGroupes.replaceChildren(...etats.map(carte)); majBouton(); }

  const boutonFusion = btn("", { onClick: lancer });
  function majBouton() {
    const n = etats.filter((s) => s.coche).length;
    boutonFusion.textContent = `Regrouper ${n} foyer${n > 1 ? "s" : ""}`;
    boutonFusion.disabled = n === 0;
  }

  async function lancer() {
    const choisis = etats.filter((s) => s.coche);
    if (!choisis.length) return;
    const ok = await confirmDialog(
      `Regrouper ${choisis.length} foyer(s) ? Une sauvegarde complète va d'abord être téléchargée. ` +
      "L'historique des cours (effectués, annulés, facturés) n'est pas modifié ; seules les séances futures sont recalculées. " +
      "Tu pourras annuler chaque regroupement.",
      { okLabel: "Regrouper" }
    );
    if (!ok) return;
    try {
      await exporterSauvegarde(); // filet de sécurité avant toute modification
    } catch (e) {
      console.error(e);
      toast("Sauvegarde impossible : regroupement annulé.", "warn");
      return;
    }
    for (const st of choisis) {
      await appliquerFusion({
        principalId: st.principalId, secondairesIds: st.secondairesIds,
        creneaux: st.creneaux, tarif: st.tarif, participants: st.participants,
      });
    }
    try { await genererHorizon(); } catch (e) { console.error(e); }
    toast(`${choisis.length} foyer(s) regroupé(s).`, "ok");
    render();
  }

  /* ---------- Fusions déjà faites (annulables) ---------- */
  const faites = fusionsEnPlace(elevesAll);
  const blocFaites = faites.length
    ? el("section.form-section", [
        el("div.form-section__title", "Regroupements effectués"),
        ...faites.map(({ principal, secondaires }) =>
          el("div.fusion-fait", [
            el("span", `${libelleEleve(principal)} (avec ${secondaires.map(libelleEleve).join(", ") || "—"})`),
            btn("Annuler", {
              variant: "ghost", small: true,
              onClick: async () => {
                if (!(await confirmDialog("Annuler ce regroupement ? Les anciens élèves redeviennent actifs avec leurs créneaux d'origine.", { okLabel: "Annuler le regroupement" }))) return;
                await annulerFusion(principal.id);
                try { await genererHorizon(); } catch (e) { console.error(e); }
                render();
              },
            }),
          ])
        ),
      ])
    : null;

  rafraichir();

  const corps = [
    el("p.field__hint",
      "Un foyer = un payeur = un élève principal. Les autres personnes qui suivent le même cours deviennent de simples « participants » : " +
      "un seul créneau, une seule durée, un seul tarif."),
    groupes.length
      ? el("div", [zoneGroupes, el("div.form-actions", [boutonFusion])])
      : emptyState("Aucun foyer à regrouper : chaque payeur n'a qu'un seul élève actif."),
    blocFaites,
  ];
  return screen("Regrouper les foyers", { children: corps.filter(Boolean), back: true });
}

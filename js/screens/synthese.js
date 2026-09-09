// Suivi Piano — Synthèse mensuelle (facturation) + liste crédit d'impôt

import { el, fmtEUR, fmtDuree, dureeCourt, fmtDateFR, personneNom, sortBy, toast } from "../util.js";
import { screen, btn, emptyState } from "../ui.js";
import { seances as seancesDB, eleves as elevesDB, payeurs as payeursDB, bulkPut, getParam } from "../db.js";
import { libelleEleve, libellePayeur, payeurRef, adresseLignes } from "../model.js";
import { downloadFile } from "../backup.js";
import { genererFacturePdf, construireFactureFile } from "../facturePdf.js";
import { today } from "../planning.js";
import { render } from "../router.js";

const MOIS_FR = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
function moisLisible(ym) {
  const [y, m] = ym.split("-").map(Number);
  return MOIS_FR.format(new Date(y, m - 1, 1));
}
function csvCell(v) {
  const s = String(v ?? "");
  return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function toCSV(entetes, lignes) {
  const corps = [entetes, ...lignes].map((r) => r.map(csvCell).join(";")).join("\r\n");
  return "﻿" + corps + "\r\n";
}

const state = { vue: "mensuelle", mois: prevMonth(), annee: new Date().getFullYear(), nonFacturees: false };

function prevMonth() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function syntheseScreen() {
  const [seances, elevesAll, payeursAll, emetteur] = await Promise.all([
    seancesDB.all(), elevesDB.all(), payeursDB.all(),
    getParam("emetteur", { nom: "", adresse: "", siren: "", mention: "TVA non applicable, article 293 B du CGI." }),
  ]);
  const eleveById = new Map(elevesAll.map((e) => [e.id, e]));
  const payeurById = new Map(payeursAll.map((p) => [p.id, p]));

  // Le foyer = le payeur ACTUEL configuré sur la fiche de l'élève (un payeur = une
  // facture = un ou plusieurs élèves). On ne se fie pas au payeur figé sur la séance,
  // qui peut dater d'avant le rattachement.
  function foyerDe(s) {
    const e = eleveById.get(s.eleveId);
    const ref = e ? payeurRef(e) : { type: s.payeurType, id: s.payeurId };
    if (ref.type === "payeur") {
      const p = payeurById.get(ref.id);
      return {
        id: "p:" + ref.id,
        nom: p ? libellePayeur(p) : "(payeur supprimé)",
        adresse: adresseLignes(p?.adresse),
        eligible: !!p?.eligibleCreditImpot,
      };
    }
    const foyerEleve = eleveById.get(ref.id);
    return {
      id: "e:" + ref.id,
      nom: foyerEleve ? libelleEleve(foyerEleve) : "(élève supprimé)",
      adresse: adresseLignes(foyerEleve?.adresse),
      eligible: !!foyerEleve?.eligibleCreditImpot,
    };
  }
  const rattacheesDe = new Map(); // porteuseId -> [séances rattachées]
  for (const s of seances) {
    if (s.rattacheeA) {
      if (!rattacheesDe.has(s.rattacheeA)) rattacheesDe.set(s.rattacheeA, []);
      rattacheesDe.get(s.rattacheeA).push(s);
    }
  }

  /** Évènements facturables : séances effectuées non rattachées, enrichies. */
  function evenements(filtre) {
    const out = [];
    for (const s of seances) {
      if (s.statut !== "effectuee" || s.rattacheeA) continue;
      if (!filtre(s)) continue;
      const rat = (rattacheesDe.get(s.id) || []).filter((r) => r.statut === "effectuee");
      const membres = [s, ...rat];
      const dureeTotale = membres.reduce((n, m) => n + (m.dureeMin || 0), 0);
      const noms = membres.map((m) => personneNom(eleveById.get(m.eleveId)) || "?").join(", ");
      const prenoms = membres.map((m) => eleveById.get(m.eleveId)?.prenom || "?").join(", ");
      const dateFR = fmtDateFR(s.date);
      out.push({
        porteuse: s,
        foyer: foyerDe(s),
        date: s.date,
        libelle: `Cours de piano — ${noms} (${fmtDuree(dureeTotale)})`,
        libelleFacture: membres.length > 1
          ? `Cours de piano du ${dateFR} — ${prenoms} (${dureeCourt(dureeTotale)})`
          : `Cours de piano du ${dateFR} (${dureeCourt(dureeTotale)})`,
        dureeTotale,
        montant: Number(s.montant) || 0,
        facturee: !!s.facturee,
        idsAmarquer: [s.id, ...(rattacheesDe.get(s.id) || []).map((r) => r.id)],
      });
    }
    return sortBy(out, (e) => e.date + e.porteuse.heure);
  }

  function groupeParFoyer(evs) {
    const map = new Map();
    for (const ev of evs) {
      if (!map.has(ev.foyer.id)) map.set(ev.foyer.id, { foyer: ev.foyer, lignes: [], total: 0, heures: 0 });
      const g = map.get(ev.foyer.id);
      g.lignes.push(ev);
      g.total += ev.montant;
      g.heures += ev.dureeTotale;
    }
    return [...map.values()].sort((a, b) => a.foyer.nom.localeCompare(b.foyer.nom, "fr"));
  }

  /* ---------- Barre de bascule ---------- */
  const barre = el("div.seg", [
    seg("Synthèse mensuelle", "mensuelle"),
    seg("Crédit d'impôt", "credit"),
  ]);
  function seg(label, val) {
    return el("button.seg__btn", { class: state.vue === val ? "seg__btn--on" : "", onclick: () => { state.vue = val; render(); } }, label);
  }

  const body = state.vue === "mensuelle" ? vueMensuelle() : vueCredit();

  /* ---------- Vue mensuelle ---------- */
  function vueMensuelle() {
    const evs = evenements((s) => s.date.slice(0, 7) === state.mois && (!state.nonFacturees || !s.facturee));
    const groupes = groupeParFoyer(evs);
    const totalGeneral = groupes.reduce((n, g) => n + g.total, 0);

    const controles = el("div.filtres", [
      el("label.field", [
        el("span.field__label", "Mois"),
        el("input.field__input", { type: "month", value: state.mois, oninput: (e) => { state.mois = e.target.value; render(); } }),
      ]),
      el("label.field.field--check", [
        el("input", { type: "checkbox", checked: state.nonFacturees, onchange: (e) => { state.nonFacturees = e.target.checked; render(); } }),
        el("span.field__label", "Seulement non facturées"),
      ]),
    ]);

    if (!groupes.length) {
      return el("div", [controles, emptyState("Aucune séance à facturer pour ce mois.")]);
    }

    return el("div", [
      el("h1.print-only", `Synthèse — ${moisLisible(state.mois)}`),
      controles,
      el("div.export-bar.no-print", [
        btn("Export CSV", { onClick: exportMensuelCSV, variant: "ghost", small: true }),
        btn("Imprimer / PDF", { onClick: () => imprimer(`Synthèse ${moisLisible(state.mois)}`), variant: "ghost", small: true }),
        btn(`Factures PDF (${groupes.length})`, { onClick: () => genererToutesFactures(groupes), variant: "ghost", small: true }),
        btn("Envoyer les factures par mail", { onClick: () => envoyerFacturesMail(groupes), small: true }),
      ]),
      el("p.preview-summary", `${evs.length} séance(s) · ${groupes.length} foyer(s) · total ${fmtEUR(totalGeneral)}`),
      ...groupes.map((g, gi) => {
        const toutFacture = g.lignes.every((ev) => ev.facturee);
        return el("section.foyer-bloc", { class: toutFacture ? "foyer-bloc--facture" : "" }, [
          el("div.foyer-bloc__head", [
            el("strong", [g.foyer.nom, toutFacture ? el("span.chip.chip--ok", "facturé") : null]),
            el("span.foyer-bloc__total", fmtEUR(g.total)),
          ]),
          el("table.recap", [
            el("tbody", g.lignes.map((ev) =>
              el("tr", { class: ev.facturee ? "recap__row--facture" : "" }, [
                el("td.recap__date", fmtDateFR(ev.date)),
                el("td", [ev.libelle, ev.facturee ? el("span.chip.chip--ok", "facturé") : null]),
                el("td.recap__montant", fmtEUR(ev.montant)),
              ])
            )),
          ]),
          el("div.btn-row.no-print", [
            btn("Facture PDF", { onClick: () => genererFacture(g, gi), variant: "ghost", small: true }),
            btn(toutFacture ? "Annuler « facturé »" : "Marquer ce foyer facturé", {
              onClick: () => marquerFacture(g.lignes.flatMap((ev) => ev.idsAmarquer), !toutFacture),
              variant: toutFacture ? "ghost" : "primary",
              small: true,
            }),
          ]),
        ]);
      }),
    ]);
  }

  /* ---------- Factures PDF ---------- */
  function emetteurLignes() {
    const l = [];
    if (emetteur.nom) l.push(emetteur.nom);
    else l.push("[Renseigne l'émetteur dans Paramètres]");
    for (const a of String(emetteur.adresse || "").split("\n")) if (a.trim()) l.push(a.trim());
    if (emetteur.siren) l.push(`SIREN : ${emetteur.siren}`);
    return l;
  }

  function payloadFacture(g, index) {
    const [y, m] = state.mois.split("-");
    return {
      num: `${y}${m}-${String(index + 1).padStart(2, "0")}`,
      dateEmission: fmtDateFR(today()),
      titre: `Cours de piano — ${moisLisible(state.mois)}`,
      emetteur: emetteurLignes(),
      clientNom: (g.foyer.nom || "").toUpperCase(),
      clientAdresse: g.foyer.adresse || [],
      items: g.lignes.map((ev) => ({
        designation: ev.libelleFacture,
        quantite: "1",
        prixUnitaire: euro(ev.montant),
        montant: euro(ev.montant),
      })),
      total: euro(g.total),
      mentions: [emetteur.mention].filter(Boolean),
      filename: `Facture - ${(g.foyer.nom || "client").replace(/[\\/:*?"<>|]/g, "")} - ${moisLisible(state.mois)}.pdf`,
    };
  }

  async function genererFacture(g, index = 0) {
    try {
      await genererFacturePdf(payloadFacture(g, index));
    } catch (e) {
      console.error(e);
      toast("Génération PDF impossible.", "warn");
    }
  }

  async function genererToutesFactures(groupes) {
    for (let i = 0; i < groupes.length; i += 1) {
      await genererFacture(groupes[i], i);
      await new Promise((r) => setTimeout(r, 450));
    }
    toast(`${groupes.length} facture(s) générée(s).`, "ok");
  }

  async function envoyerFacturesMail(groupes) {
    if (!groupes.length) return;
    toast("Préparation des factures…", "info");
    let files;
    try {
      files = await Promise.all(groupes.map((g, i) => construireFactureFile(payloadFacture(g, i))));
    } catch (e) {
      console.error(e);
      return toast("Génération des PDF impossible.", "warn");
    }
    const dest = String((await getParam("emailFactures", "")) || "").trim();
    const sujet = `Factures cours de piano — ${moisLisible(state.mois)}`;
    const corps =
      `Bonjour,\n\nCi-joint les factures de cours de piano de ${moisLisible(state.mois)} ` +
      `(${groupes.length} facture·s).\n\nCordialement`;

    if (navigator.canShare && navigator.canShare({ files })) {
      try {
        await navigator.share({ files, title: sujet, text: corps + (dest ? `\n\nÀ envoyer à : ${dest}` : "") });
        return;
      } catch (e) {
        if (e?.name === "AbortError") return;
        console.error(e);
      }
    }
    // Repli : on télécharge les PDF et on ouvre un brouillon de mail (sans pièces jointes).
    for (const f of files) {
      downloadFile(f.name, f, "application/pdf");
      await new Promise((r) => setTimeout(r, 300));
    }
    const url = `mailto:${encodeURIComponent(dest)}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
    window.location.href = url;
    toast("PDF téléchargés — joins-les au mail qui vient de s'ouvrir.", "ok");
  }

  async function marquerFacture(ids, valeur = true) {
    const set = new Set(ids);
    const maj = seances
      .filter((s) => set.has(s.id))
      .map((s) => ({ ...s, facturee: valeur, updatedAt: new Date().toISOString() }));
    await bulkPut("seances", maj);
    toast(valeur ? `Foyer marqué facturé (${maj.length} séance·s).` : "Marquage « facturé » retiré.", "ok");
    render();
  }

  /* ---------- Vue crédit d'impôt ---------- */
  function vueCredit() {
    const an = String(state.annee);
    const evs = evenements((s) =>
      s.date.slice(0, 4) === an &&
      s.lieu === "domicile" &&
      s.modePaiement !== "liquide" &&
      foyerDe(s).eligible
    );
    const groupes = groupeParFoyer(evs);
    const totalEuros = groupes.reduce((n, g) => n + g.total, 0);
    const totalHeures = groupes.reduce((n, g) => n + g.heures, 0);

    const controles = el("div.filtres", [
      el("label.field", [
        el("span.field__label", "Année civile"),
        el("input.field__input", { type: "number", value: state.annee, min: 2020, max: 2100, oninput: (e) => { state.annee = Number(e.target.value); render(); } }),
      ]),
    ]);

    return el("div", [
      el("h1.print-only", `Crédit d'impôt — année ${an}`),
      controles,
      el("p.field__hint",
        "Cours retenus : effectués, au domicile de l'élève, réglés autrement qu'en liquide, " +
        "pour un foyer marqué « éligible crédit d'impôt ». L'attestation elle-même se fait ailleurs."
      ),
      groupes.length
        ? el("div", [
            barreExport(() => exportCreditCSV(evs), `Credit impot ${an}`),
            el("p.preview-summary", `${evs.length} cours · ${fmtEUR(totalEuros)} · ${fmtDuree(totalHeures)}`),
            ...groupes.map((g) =>
              el("section.foyer-bloc", [
                el("div.foyer-bloc__head", [
                  el("strong", g.foyer.nom),
                  el("span.foyer-bloc__total", `${fmtEUR(g.total)} · ${fmtDuree(g.heures)}`),
                ]),
                el("table.recap", [
                  el("tbody", g.lignes.map((ev) =>
                    el("tr", [
                      el("td.recap__date", fmtDateFR(ev.date)),
                      el("td", ev.libelle),
                      el("td.recap__montant", fmtEUR(ev.montant)),
                    ])
                  )),
                ]),
              ])
            ),
          ])
        : emptyState("Aucun cours éligible pour cette année."),
    ]);
  }

  /* ---------- Exports ---------- */
  function barreExport(onCsv, titreImpression) {
    return el("div.export-bar.no-print", [
      btn("Export CSV", { onClick: onCsv, variant: "ghost", small: true }),
      btn("Imprimer / PDF", { onClick: () => imprimer(titreImpression), variant: "ghost", small: true }),
    ]);
  }

  function imprimer(titre) {
    const prec = document.title;
    document.title = `Suivi Piano — ${titre}`;
    window.print();
    setTimeout(() => { document.title = prec; }, 500);
  }

  function exportMensuelCSV() {
    const evs = evenements((s) => s.date.slice(0, 7) === state.mois);
    const groupes = groupeParFoyer(evs);
    const lignes = [];
    for (const g of groupes) {
      for (const ev of g.lignes) {
        lignes.push([g.foyer.nom, ev.date, ev.libelle, euro(ev.montant), ev.facturee ? "oui" : "non"]);
      }
    }
    downloadFile(`synthese-${state.mois}.csv`,
      toCSV(["foyer", "date", "libelle", "montant", "facturee"], lignes), "text/csv;charset=utf-8");
    toast(`${lignes.length} ligne(s) exportée(s).`, "ok");
  }

  function exportCreditCSV(evs) {
    const groupes = groupeParFoyer(evs);
    const lignes = [];
    for (const g of groupes) {
      for (const ev of g.lignes) {
        lignes.push([g.foyer.nom, ev.date, ev.libelle, ev.dureeTotale, euro(ev.montant)]);
      }
      lignes.push([g.foyer.nom, "", "TOTAL FOYER", g.heures, euro(g.total)]);
    }
    downloadFile(`credit-impot-${state.annee}.csv`,
      toCSV(["foyer", "date", "libelle", "duree_min", "montant"], lignes), "text/csv;charset=utf-8");
    toast(`${lignes.length} ligne(s) exportée(s).`, "ok");
  }

  return screen("Synthèse", { children: [barre, body] });
}

/** Montant format CSV FR : "45,00" sans symbole. */
function euro(n) {
  return (Number(n) || 0).toFixed(2).replace(".", ",");
}

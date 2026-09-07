// Suivi Piano — écran Paramètres (sauvegarde, import CSV, réglages)

import { el, toast, confirmDialog, fmtDateFR, personneNom } from "../util.js";
import { screen, btn, formSection, fieldText } from "../ui.js";
import { getParam, setParam, STORES, clearStore } from "../db.js";
import {
  exporterSauvegarde, importerSauvegarde, pickFile, readFileText,
  downloadFile, joursDepuisSauvegarde, enregistrerImportCsv,
} from "../backup.js";
import { templateCSV, parseCSV, csvToEleves } from "../csv.js";
import { libellePayeur } from "../model.js";
import { render, navigate } from "../router.js";

export async function parametresScreen() {
  const jours = await joursDepuisSauvegarde();
  const lastBackup = await getParam("derniereSauvegarde", null);
  const heureRappel = await getParam("heureRappel", "19:00");

  const importResultBox = el("div");

  const body = [
    /* ---- Sauvegarde complète ---- */
    formSection("Sauvegarde complète (JSON)", [
      el("p.field__hint",
        lastBackup
          ? `Dernière sauvegarde : ${fmtDateFR(lastBackup.slice(0, 10))} (il y a ${jours === Infinity ? "—" : jours + " j"}).`
          : "Aucune sauvegarde effectuée. Pense à en faire régulièrement : les données ne vivent que sur cet appareil."
      ),
      el("div.btn-row", [
        btn("Exporter la sauvegarde", { onClick: doExport }),
        btn("Restaurer depuis un fichier", { onClick: doImport, variant: "ghost" }),
      ]),
    ]),

    /* ---- Import CSV des élèves ---- */
    formSection("Import CSV des élèves", [
      el("p.field__hint",
        "Charge tous tes élèves d'un coup. Télécharge le modèle, remplis-le, puis importe-le. " +
        "La colonne « foyer » regroupe les élèves d'une même famille sous un payeur commun."
      ),
      el("div.btn-row", [
        btn("Télécharger le modèle CSV", { onClick: dlTemplate, variant: "ghost" }),
        btn("Choisir un fichier CSV…", { onClick: choisirCsv }),
      ]),
      importResultBox,
    ]),

    /* ---- Rappel quotidien ---- */
    formSection("Rappel quotidien", [
      fieldText("Heure du rappel", heureRappel, async (v) => {
        await setParam("heureRappel", v || "19:00");
        toast("Heure enregistrée.", "ok");
      }, { type: "time" }),
      el("p.field__hint", "Le bouton « créer le rappel dans le calendrier » arrivera à l'étape 5."),
    ]),

    /* ---- Zone dangereuse ---- */
    formSection("Données", [
      el("p.field__hint", "Efface toutes les données de l'application sur cet appareil (élèves, payeurs, séances…)."),
      el("div.btn-row", [btn("Tout effacer", { onClick: wipe, variant: "danger" })]),
    ]),

    el("p.app-version", `Suivi Piano — version 0 · build ${window.SUIVI_BUILD || "?"}`),
  ];

  async function doExport() {
    await exporterSauvegarde();
    toast("Sauvegarde exportée.", "ok");
    render();
  }

  async function doImport() {
    const file = await pickFile(".json,application/json");
    if (!file) return;
    if (!(await confirmDialog(
      "Restaurer remplacera TOUTES les données actuelles par le contenu du fichier. Continuer ?",
      { danger: true, okLabel: "Restaurer" }
    ))) return;
    try {
      const res = await importerSauvegarde(file);
      toast(`Restauré : ${res.records} enregistrement(s).`, "ok");
      navigate("/eleves");
    } catch (err) {
      toast(err.message || "Échec de la restauration.", "warn");
    }
  }

  function dlTemplate() {
    downloadFile("suivi-piano-modele-eleves.csv", templateCSV(), "text/csv;charset=utf-8");
  }

  async function choisirCsv() {
    const file = await pickFile(".csv,text/csv");
    if (!file) return;
    let rows;
    try {
      rows = parseCSV(await readFileText(file));
    } catch {
      return toast("Fichier CSV illisible.", "warn");
    }
    if (rows.length < 2) return toast("Le fichier ne contient aucune ligne de données.", "warn");
    const parsed = csvToEleves(rows);
    afficherApercu(parsed);
  }

  function afficherApercu({ eleves, payeurs, lignes }) {
    const nbErreurs = lignes.filter((l) => l.erreurs.length).length;
    const nbOk = lignes.length - nbErreurs;
    const nbWarn = lignes.filter((l) => l.avertissements.length).length;

    const table = el("table.preview", [
      el("thead", el("tr", [
        el("th", "Ligne"), el("th", "Élève"), el("th", "Créneau"), el("th", "Foyer"), el("th", "État"),
      ])),
      el("tbody", lignes.map((l) => {
        const c = l.eleve.creneaux[0];
        return el("tr", { class: l.erreurs.length ? "preview__row--err" : l.avertissements.length ? "preview__row--warn" : "" }, [
          el("td", String(l.ligne)),
          el("td", personneNom(l.eleve) || "—"),
          el("td", c ? `${c.jour} ${c.heure} (${c.dureeMin}′)` : "—"),
          el("td", l.foyer || "—"),
          el("td", l.erreurs.length
            ? l.erreurs.join(" ; ")
            : l.avertissements.length ? l.avertissements.join(" ; ") : "OK"),
        ]);
      })),
    ]);

    importResultBox.replaceChildren(
      el("div.preview-wrap", [
        el("p.preview-summary",
          `${lignes.length} ligne(s) — ${nbOk} importable(s), ${nbErreurs} en erreur, ${nbWarn} avec avertissement. ` +
          `${payeurs.length} foyer(s) détecté(s).`
        ),
        el("div.preview-scroll", table),
        el("div.btn-row", [
          btn(`Importer ${nbOk} élève(s)`, {
            onClick: () => faireImport(eleves.filter((_, i) => !lignes[i].erreurs.length), payeurs),
          }),
          btn("Annuler", { onClick: () => importResultBox.replaceChildren(), variant: "ghost" }),
        ]),
      ])
    );
  }

  async function faireImport(eleves, payeurs) {
    if (!eleves.length) return toast("Rien à importer.", "warn");
    const usedPayeurIds = new Set(eleves.map((e) => e.payeurId).filter(Boolean));
    const payeursToSave = payeurs.filter((p) => usedPayeurIds.has(p.id));
    const res = await enregistrerImportCsv(eleves, payeursToSave);
    toast(`${res.eleves} élève(s) et ${res.payeurs} payeur(s) importés.`, "ok");
    navigate("/eleves");
  }

  async function wipe() {
    if (!(await confirmDialog(
      "Effacer définitivement TOUTES les données de l'application sur cet appareil ?",
      { danger: true, okLabel: "Tout effacer" }
    ))) return;
    for (const s of STORES) if (s !== "params") await clearStore(s);
    toast("Données effacées.");
    navigate("/eleves");
  }

  return screen("Paramètres", { children: body });
}

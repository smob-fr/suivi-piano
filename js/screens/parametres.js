// Suivi Piano — écran Paramètres (sauvegarde, import CSV, réglages)

import { el, toast, confirmDialog, fmtDateFR, personneNom } from "../util.js";
import { screen, btn, formSection, fieldText, fieldTextarea } from "../ui.js";
import { getParam, setParam, STORES, clearStore, getAll } from "../db.js";
import {
  exporterSauvegarde, importerSauvegarde, pickFile, readFileText,
  downloadFile, joursDepuisSauvegarde, enregistrerImportCsv,
} from "../backup.js";
import { templateCSV, parseCSV, csvToEleves } from "../csv.js";
import { genererHorizon, creneauxSeChevauchent } from "../planning.js";
import { telechargerRappelICS, activerNotifications, etatNotifications } from "../rappels.js";
import { render, navigate } from "../router.js";

export async function parametresScreen() {
  const jours = await joursDepuisSauvegarde();
  const lastBackup = await getParam("derniereSauvegarde", null);
  const heureRappel = await getParam("heureRappel", "19:00");
  const emetteur = await getParam("emetteur", { nom: "", adresse: "", siren: "", mention: "TVA non applicable, article 293 B du CGI." });
  const emailFactures = await getParam("emailFactures", "");
  const state = { heure: heureRappel };
  const sauverEmetteur = () => setParam("emetteur", emetteur);

  const importResultBox = el("div");

  function notifHint() {
    const e = etatNotifications();
    if (e === "unsupported") return "Notifications non supportées sur cet appareil.";
    if (e === "denied") return "Notifications bloquées — à réautoriser dans les réglages du navigateur.";
    if (e === "granted") return "Notifications autorisées. Le rappel « appli fermée » reste approximatif (dépend du navigateur) ; l'évènement de calendrier ci-dessus est le rappel fiable.";
    return "En complément du calendrier : une notification générique, quand le navigateur réveille l'appli (approximatif).";
  }

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
        "Les colonnes payeur_prenom / payeur_nom servent au crédit d'impôt : vides si l'élève " +
        "se paie lui-même ; renseignées (mêmes valeurs sur plusieurs lignes) pour regrouper " +
        "une famille sous un même payeur. Les colonnes payeur_adr_* ne sont utiles que si le " +
        "payeur habite à une autre adresse que l'élève (sinon celle de l'élève est reprise)."
      ),
      el("div.btn-row", [
        btn("Télécharger le modèle CSV", { onClick: dlTemplate, variant: "ghost" }),
        btn("Choisir un fichier CSV…", { onClick: choisirCsv }),
      ]),
      importResultBox,
    ]),

    /* ---- Émetteur des factures ---- */
    formSection("Émetteur des factures", [
      el("p.field__hint", "Apparaît en haut des factures PDF générées depuis la Synthèse."),
      fieldText("Nom / raison sociale", emetteur.nom, (v) => { emetteur.nom = v; sauverEmetteur(); }),
      fieldTextarea("Adresse", emetteur.adresse, (v) => { emetteur.adresse = v; sauverEmetteur(); }, { rows: 2 }),
      fieldText("SIREN", emetteur.siren, (v) => { emetteur.siren = v; sauverEmetteur(); }),
      fieldText("Mention légale (TVA)", emetteur.mention, (v) => { emetteur.mention = v; sauverEmetteur(); }),
      fieldText("Email destinataire des factures", emailFactures, (v) => setParam("emailFactures", v.trim()), { type: "email" }),
      el("p.field__hint", "Utilisé par « Envoyer les factures par mail » (Synthèse). Sur Android, ouvre le partage : choisis ton appli mail, les PDF sont joints, tu confirmes le destinataire et tu envoies."),
    ]),

    /* ---- Rappel quotidien ---- */
    formSection("Rappel quotidien", [
      fieldText("Heure du rappel", heureRappel, async (v) => {
        state.heure = v || "19:00";
        await setParam("heureRappel", state.heure);
        toast("Heure enregistrée.", "ok");
      }, { type: "time" }),
      el("p.field__hint",
        "Ajoute un évènement récurrent dans l'agenda de ton téléphone (mécanisme le plus fiable). " +
        "Si tu changes l'heure, re-télécharge le fichier."
      ),
      el("div.btn-row", [
        btn("Ajouter le rappel au calendrier", { onClick: () => { telechargerRappelICS(state.heure); toast("Fichier téléchargé — ouvre-le pour l'ajouter au calendrier.", "ok"); } }),
      ]),
      el("p.field__hint", notifHint()),
      el("div.btn-row", [
        btn(etatNotifications() === "granted" ? "Notifications activées ✓" : "Activer les notifications", {
          onClick: async () => {
            const r = await activerNotifications();
            toast(
              r === "granted" ? "Notifications activées." :
              r === "denied" ? "Notifications refusées dans les réglages du navigateur." :
              r === "unsupported" ? "Non supporté sur cet appareil." : "Non activées.",
              r === "granted" ? "ok" : "warn"
            );
            render();
          },
          variant: etatNotifications() === "granted" ? "ghost" : "primary",
        }),
      ]),
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
      try { await genererHorizon(); } catch (e) { console.error(e); }
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
    await marquerConflitsCreneaux(parsed.lignes);
    afficherApercu(parsed);
  }

  async function marquerConflitsCreneaux(lignes) {
    const existants = (await getAll("eleves")).filter((e) => e.statut === "actif");
    const dejaVus = existants.map((e) => ({ nom: personneNom(e), creneaux: e.creneaux || [] }));
    for (const l of lignes) {
      for (const c of l.eleve.creneaux) {
        const clash = dejaVus.find((d) => d.creneaux.some((ac) => creneauxSeChevauchent(c, ac)));
        if (clash) l.avertissements.push(`Créneau ${c.jour} ${c.heure} en conflit avec ${clash.nom}`);
      }
      dejaVus.push({ nom: personneNom(l.eleve) || `ligne ${l.ligne}`, creneaux: l.eleve.creneaux });
    }
  }

  function afficherApercu({ eleves, payeurs, lignes }) {
    const nbErreurs = lignes.filter((l) => l.erreurs.length).length;
    const nbOk = lignes.length - nbErreurs;
    const nbWarn = lignes.filter((l) => l.avertissements.length).length;

    const table = el("table.preview", [
      el("thead", el("tr", [
        el("th", "Ligne"), el("th", "Élève"), el("th", "Créneau"), el("th", "Payeur"), el("th", "État"),
      ])),
      el("tbody", lignes.map((l) => {
        const c = l.eleve.creneaux[0];
        return el("tr", { class: l.erreurs.length ? "preview__row--err" : l.avertissements.length ? "preview__row--warn" : "" }, [
          el("td", String(l.ligne)),
          el("td", personneNom(l.eleve) || "—"),
          el("td", c ? `${c.jour} ${c.heure} (${c.dureeMin}′)` : "—"),
          el("td", l.payeur || "lui-même"),
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
    try { await genererHorizon(); } catch (e) { console.error(e); }
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

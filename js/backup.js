// Suivi Piano — sauvegarde JSON + import de fichiers

import { exportAll, importAll, bulkPut, getParam, setParam } from "./db.js";
import { nowISO, toast } from "./util.js";

/* ---------- Téléchargement / lecture de fichiers ---------- */

export function downloadFile(name, content, mime = "application/octet-stream") {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function pickFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    if (accept) input.accept = accept;
    input.style.display = "none";
    input.addEventListener("change", () => {
      resolve(input.files[0] || null);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  });
}

export function readFileText(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsText(file, "utf-8");
  });
}

/* ---------- Sauvegarde complète (JSON) ---------- */

export async function exporterSauvegarde() {
  const dump = await exportAll();
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  downloadFile(`suivi-piano-sauvegarde-${stamp}.json`, JSON.stringify(dump, null, 2), "application/json");
  await setParam("derniereSauvegarde", nowISO());
}

export async function importerSauvegarde(file) {
  const text = await readFileText(file);
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("Fichier illisible (JSON invalide).");
  }
  return importAll(payload);
}

/* ---------- Import CSV des élèves ---------- */

export async function enregistrerImportCsv(eleves, payeurs) {
  if (payeurs.length) {
    await bulkPut("payeurs", payeurs.map(stripTmpFields));
  }
  await bulkPut("eleves", eleves);
  return { eleves: eleves.length, payeurs: payeurs.length };
}

function stripTmpFields(p) {
  const clean = {};
  for (const [k, v] of Object.entries(p)) {
    if (!k.startsWith("_")) clean[k] = v;
  }
  return clean;
}

/* ---------- Rappel de sauvegarde ---------- */

export async function joursDepuisSauvegarde() {
  const last = await getParam("derniereSauvegarde", null);
  if (!last) return Infinity;
  return Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
}

export async function verifierRappelSauvegarde() {
  const j = await joursDepuisSauvegarde();
  if (j >= 7) {
    toast(
      j === Infinity
        ? "Pense à faire une première sauvegarde (Paramètres)."
        : `Dernière sauvegarde il y a ${j} jours — pense à exporter.`,
      "warn"
    );
  }
}

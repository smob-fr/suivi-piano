// Suivi Piano — génération d'une facture PDF (format calé sur l'import PDF d'Indy)

import { downloadFile } from "./backup.js";

const JSPDF_URL = "js/vendor/jspdf.umd.min.js";
let _jspdf = null;

function chargerJsPDF() {
  if (_jspdf) return Promise.resolve(_jspdf);
  if (window.jspdf?.jsPDF) {
    _jspdf = window.jspdf.jsPDF;
    return Promise.resolve(_jspdf);
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = JSPDF_URL;
    s.onload = () => {
      _jspdf = window.jspdf?.jsPDF;
      _jspdf ? resolve(_jspdf) : reject(new Error("jsPDF indisponible"));
    };
    s.onerror = () => reject(new Error("Chargement jsPDF impossible"));
    document.head.appendChild(s);
  });
}

/**
 * @param {{
 *   num:string, dateEmission:string, titre:string,
 *   emetteur:string[], clientNom:string, clientAdresse:string[],
 *   items:{designation:string, quantite:string, prixUnitaire:string, montant:string}[],
 *   total:string, mentions:string[], filename:string
 * }} d
 */
export async function genererFacturePdf(d) {
  const doc = await construireDoc(d);
  downloadFile(d.filename, doc.output("blob"), "application/pdf");
}

/** Renvoie la facture sous forme de File (pour le partage / l'envoi par mail). */
export async function construireFactureFile(d) {
  const doc = await construireDoc(d);
  return new File([doc.output("blob")], d.filename, { type: "application/pdf" });
}

async function construireDoc(d) {
  const JsPDF = await chargerJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const M = 20; // marge gauche
  const RIGHT = 190;
  let y = 20;
  const F = (s, style = "normal") => { doc.setFont("helvetica", style); doc.setFontSize(s); };
  const txt = (s, x, yy, opt) => doc.text(String(s ?? ""), x, yy, opt);

  F(20, "bold"); txt("FACTURE", M, y); y += 8;
  F(13, "bold"); txt(d.titre || "", M, y); y += 9;

  F(10); txt(`Numéro de facture : ${d.num}`, M, y); y += 5;
  txt(`Date d'émission : ${d.dateEmission}`, M, y); y += 9;

  F(11, "bold"); txt("Émetteur", M, y); y += 5;
  F(10);
  for (const l of d.emetteur) { txt(l, M, y); y += 5; }
  y += 4;

  F(11, "bold"); txt("Facturé à :", M, y); y += 5;
  txt(d.clientNom, M, y); y += 5;
  F(10);
  for (const l of d.clientAdresse) { txt(l, M, y); y += 5; }
  y += 6;

  // ---- tableau des items
  const cols = [
    { t: "Désignation", x: M, w: 100, align: "left" },
    { t: "Quantité", x: M + 100, w: 16, align: "center" },
    { t: "Prix unitaire", x: M + 116, w: 27, align: "right" },
    { t: "Montant", x: M + 143, w: 27, align: "right" },
  ];
  const cellX = (c) => (c.align === "right" ? c.x + c.w - 2 : c.align === "center" ? c.x + c.w / 2 : c.x + 2);
  const rowH = 7;

  const drawRow = (vals, style) => {
    F(9, style);
    doc.setDrawColor(150);
    doc.line(M, y, RIGHT, y);
    doc.line(M, y + rowH, RIGHT, y + rowH);
    for (const c of cols) doc.line(c.x, y, c.x, y + rowH);
    doc.line(RIGHT, y, RIGHT, y + rowH);
    cols.forEach((c, i) => {
      const opt = c.align === "left" ? undefined : { align: c.align };
      txt(vals[i], cellX(c), y + 4.7, opt);
    });
    y += rowH;
  };

  doc.setFillColor(239, 239, 239);
  doc.rect(M, y, RIGHT - M, rowH, "F");
  drawRow(cols.map((c) => c.t), "bold");
  for (const it of d.items) {
    if (y > 265) { doc.addPage(); y = 20; }
    drawRow([it.designation, it.quantite, `${it.prixUnitaire} €`, `${it.montant} €`], "normal");
  }
  y += 6;

  F(11, "bold"); txt(`Total : ${d.total} €`, M, y); y += 8;
  F(9);
  for (const m of d.mentions || []) { txt(m, M, y); y += 5; }

  return doc;
}

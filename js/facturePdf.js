// Suivi Piano — génération d'une facture PDF
// Mise en page calquée sur le modèle de facture fourni (A4, unités en points).

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
 *   emetteur:{nom:string, adresse:string[], siret:string, iban:string, bic:string},
 *   clientNom:string, clientAdresse:string[],
 *   items:{designation:string, quantite:string, prixUnitaire:string, montant:string}[],
 *   total:string, echeance:string, termes:string, filename:string
 * }} d   (montants au format « 35,00 », sans symbole)
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

/* ---- Palette du modèle ---- */
const INK = [34, 44, 54];        // #222C36 — textes
const SOFT = [70, 82, 95];     // texte courant atténué
const MUTED = [138, 147, 158];   // termes, pied de page
const BLUE = [182, 237, 245];    // #B6EDF5 — bandeaux
const LINE = [216, 225, 233];    // #D8E1E9 — filets

const L = 44;      // marge gauche
const R = 551.5;   // bord droit du contenu
const PAGE_H = 841.9;

const NBSP = " ";
const eur = (s) => `${s}${NBSP}€`;

async function construireDoc(d) {
  const JsPDF = await chargerJsPDF();
  const doc = new JsPDF({ unit: "pt", format: "a4" });
  const F = (size, style = "normal", color = INK) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const txt = (s, x, y, opt) => doc.text(String(s ?? ""), x, y, opt);
  const hline = (x1, x2, y) => { doc.setDrawColor(...LINE); doc.setLineWidth(0.8); doc.line(x1, y, x2, y); };

  /* ---------- En-tête : émetteur (gauche) / client (droite) ---------- */
  F(11.9, "bold"); txt(d.emetteur.nom || "[Renseigne l'émetteur dans Paramètres]", L, 57);
  F(10, "normal", SOFT);
  let y = 80.2;
  for (const l of d.emetteur.adresse) { txt(l, L, y); y += 16.6; }

  F(11.9, "bold"); txt(d.clientNom, R, 57, { align: "right" });
  F(10, "normal", SOFT);
  y = 80.2;
  for (const l of d.clientAdresse) { txt(l, R, y, { align: "right" }); y += 16.6; }
  if (d.clientAdresse.length) {
    y += 6.5;
    F(10, "bold", SOFT); txt("Adresse de livraison", R, y, { align: "right" });
    F(10, "normal", SOFT);
    y += 16.5;
    for (const l of d.clientAdresse) { txt(l, R, y, { align: "right" }); y += 16.6; }
  }

  /* ---------- Titre ---------- */
  F(15.9, "bold"); txt(`Facture ${d.num}`, L, 185.2);
  F(10, "normal", SOFT);
  txt(d.titre || "", L, 212.2);
  txt(`Émise le ${d.dateEmission}`, R, 212.2, { align: "right" });

  /* ---------- Tableau ---------- */
  const COL = { lib: L + 8, qte: 298.4, pu: 392.2, tva: 452, tot: 543.8 }; // x d'alignement
  const ROW = 32.3;

  const enteteTableau = (top) => {
    doc.setFillColor(...BLUE);
    doc.roundedRect(L - 0.5, top, R - L + 0.5, 24, 6, 6, "F");
    F(10, "bold");
    txt("Libellé", COL.lib, top + 15.5);
    txt("Quantité", COL.qte, top + 15.5, { align: "right" });
    txt("Prix unitaire HT", COL.pu, top + 15.5, { align: "right" });
    txt("TVA", COL.tva, top + 15.5, { align: "right" });
    txt("Total HT", COL.tot, top + 15.5, { align: "right" });
    return top + 24;
  };

  let top = enteteTableau(232);
  let rowY = top;
  for (const it of d.items) {
    if (rowY + ROW > 740) {
      doc.addPage();
      rowY = enteteTableau(50);
    }
    F(10, "normal", SOFT);
    const base = rowY + 20.5;
    txt(it.designation, COL.lib, base);
    txt(it.quantite, COL.qte, base, { align: "right" });
    txt(eur(it.prixUnitaire), COL.pu, base, { align: "right" });
    txt(`0,00${NBSP}%`, COL.tva, base, { align: "right" });
    txt(eur(it.montant), COL.tot, base, { align: "right" });
    hline(L, R, rowY + ROW);
    rowY += ROW;
  }

  /* ---------- Échéance + totaux ---------- */
  let by = rowY + 18;
  if (by + 120 > 770) { doc.addPage(); by = 60; }

  doc.setFillColor(...BLUE);
  doc.roundedRect(L, by, 202, 23, 6, 6, "F");
  // petite icône calendrier
  doc.setDrawColor(...INK); doc.setLineWidth(0.75);
  doc.roundedRect(L + 10, by + 7, 6.5, 7, 1, 1, "S");
  doc.line(L + 10, by + 9.5, L + 16.5, by + 9.5);
  F(10, "bold"); txt("Échéance de paiement", L + 21.5, by + 15.2);
  F(10, "normal", SOFT); txt(d.echeance || "À réception.", L + 0.7, by + 45.2);

  const lab = 414.3;
  F(10, "bold", SOFT); txt(`Total${NBSP}HT`, lab, by + 15.2);
  F(10, "normal", SOFT); txt(eur(d.total), 543, by + 15.2, { align: "right" });
  F(10, "bold", SOFT); txt("TVA", lab, by + 39.2);
  F(10, "normal", SOFT); txt(eur("0,00"), 543, by + 39.2, { align: "right" });
  hline(414, 551, by + 47);
  F(10, "bold", SOFT); txt(`Total${NBSP}TTC`, lab, by + 71.5);
  F(10, "bold", SOFT); txt(eur(d.total), 543, by + 71.5, { align: "right" });

  /* ---------- Termes et conditions ---------- */
  let ty = by + 129;
  if (ty > 740) { doc.addPage(); ty = 60; }
  F(8, "bold", MUTED); txt("Termes et conditions", L, ty);
  F(8, "normal", MUTED);
  const lignesTermes = doc.splitTextToSize(d.termes || "", R - L);
  txt(lignesTermes, L, ty + 12);

  /* ---------- Pied de page (sur chaque page) ---------- */
  const nb = doc.getNumberOfPages();
  for (let p = 1; p <= nb; p += 1) {
    doc.setPage(p);
    hline(L, R, 755);
    F(8, "bold", MUTED);
    txt(d.emetteur.nom || "", L, 780);
    txt("Mode de paiement", 160.8, 780);
    F(8, "normal", MUTED);
    if (d.emetteur.siret) txt(`SIRET : ${d.emetteur.siret}`, L, 792);
    if (d.emetteur.iban) txt(`IBAN : ${d.emetteur.iban}`, 160.8, 792);
    if (d.emetteur.bic) txt(`BIC : ${d.emetteur.bic}`, 160.8, 804);
    F(7, "bold"); txt(`Facture ${d.num} • ${p}/${nb}`, R + 1.3, 822, { align: "right" });
  }

  return doc;
}

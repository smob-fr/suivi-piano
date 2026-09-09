// Suivi Piano — petits utilitaires partagés

export function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

export function nowISO() {
  return new Date().toISOString();
}

/* ---- Création d'éléments DOM ----
   el("div.card#x", { onclick: fn }, ["texte", el("span", "…")]) */
export function el(spec, props, children) {
  const [tag, ...rest] = String(spec).split(/(?=[.#])/);
  const node = document.createElement(tag || "div");
  for (const token of rest) {
    if (token[0] === "#") node.id = token.slice(1);
    else if (token[0] === ".") node.classList.add(token.slice(1));
  }
  if (props && (Array.isArray(props) || props instanceof Node || typeof props !== "object")) {
    children = props;
    props = null;
  }
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") node.className += " " + v;
      else if (k === "dataset") Object.assign(node.dataset, v);
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k in node) {
        try { node[k] = v; } catch { node.setAttribute(k, v); }
      } else {
        node.setAttribute(k, v);
      }
    }
  }
  appendChildren(node, children);
  return node;
}

function appendChildren(node, children) {
  if (children == null) return;
  if (Array.isArray(children)) {
    children.forEach((c) => appendChildren(node, c));
  } else if (children instanceof Node) {
    node.appendChild(children);
  } else {
    node.appendChild(document.createTextNode(String(children)));
  }
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/* ---- Formatage ---- */
const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
export function fmtEUR(n) {
  return eur.format(Number(n) || 0);
}

export function fmtDuree(min) {
  min = Number(min) || 0;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} h ${m}`;
  if (h) return `${h} h`;
  return `${m} min`;
}

/** Durée compacte pour un libellé de facture : 60 -> "1h", 90 -> "1h30", 45 -> "45min". */
export function dureeCourt(min) {
  min = Number(min) || 0;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h${String(m).padStart(2, "0")}`;
  if (h) return `${h}h`;
  return `${m}min`;
}

export function fmtDateFR(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/* ---- Énumérations et libellés ---- */
export const LIEUX = {
  domicile: "Domicile de l'élève",
  visio: "Visio",
  chez_prof: "Chez le professeur",
};

export const MODES_PAIEMENT = {
  cheque: "Chèque",
  virement: "Virement",
  liquide: "Liquide",
  cesu: "CESU",
  crcesu: "CR-CESU",
};

export const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

export const DUREES = [15, 30, 45, 60, 75, 90];

export const STATUT_SEANCE = {
  prevue: "Prévue",
  effectuee: "Effectuée",
  annulee: "Annulée",
};

/* ---- Toast ---- */
let toastTimer = null;
export function toast(message, kind = "info") {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = el("div#toast-host");
    document.body.appendChild(host);
  }
  const node = el("div.toast", { class: `toast--${kind}` }, message);
  host.appendChild(node);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.remove(), 3600);
}

/* ---- Confirmation (promesse) ---- */
export function confirmDialog(message, { danger = false, okLabel = "Confirmer", cancelLabel = "Annuler" } = {}) {
  return new Promise((resolve) => {
    const overlay = el("div.modal-overlay");
    const close = (val) => {
      overlay.remove();
      resolve(val);
    };
    const box = el("div.modal", [
      el("button.modal-close", { type: "button", "aria-label": "Fermer", onclick: () => close(false) }, "✕"),
      el("p.modal__msg", message),
      el("div.modal__actions", [
        el("button.btn.btn--ghost", { onclick: () => close(false) }, cancelLabel),
        el("button.btn", { class: danger ? "btn--danger" : "btn--primary", onclick: () => close(true) }, okLabel),
      ]),
    ]);
    overlay.appendChild(box);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(false);
    });
    document.body.appendChild(overlay);
  });
}

/* ---- Divers ---- */
export function debounce(fn, ms = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function sortBy(arr, keyFn) {
  return [...arr].sort((a, b) => {
    const ka = keyFn(a);
    const kb = keyFn(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

export function personneNom(p) {
  return [p?.prenom, p?.nom].filter(Boolean).join(" ").trim();
}

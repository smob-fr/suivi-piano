// Suivi Piano — point d'entrée

import { el } from "./util.js";
import { initRouter, route, setNotFound, render, navigate, currentPath } from "./router.js";
import { verifierRappelSauvegarde } from "./backup.js";

import { elevesListScreen } from "./screens/eleves.js";
import { eleveFormScreen } from "./screens/eleveForm.js";
import { payeursListScreen, payeurFormScreen } from "./screens/payeurs.js";
import { parametresScreen } from "./screens/parametres.js";
import { placeholderScreen } from "./screens/placeholder.js";

window.SUIVI_BUILD = "v0.2.1 · 2026-09-07";

/* ---------- Structure de la page ---------- */
const app = document.getElementById("app");
app.replaceChildren();

const header = el("header.app-header", [
  el("h1.app-header__title", "Suivi Piano"),
  el("button.app-header__gear", {
    title: "Paramètres",
    onclick: () => navigate("/parametres"),
    html: "&#9881;",
  }),
]);

const main = el("main.app-main#view");

const NAV = [
  ["/accueil", "Accueil", "&#9737;"],
  ["/agenda", "Agenda", "&#128197;"],
  ["/eleves", "Élèves", "&#128101;"],
  ["/seances", "Séances", "&#9998;"],
  ["/synthese", "Synthèse", "&#931;"],
];

const nav = el("nav.app-nav", NAV.map(([path, label, icon]) =>
  el("button.app-nav__item", {
    dataset: { path },
    onclick: () => navigate(path),
  }, [el("span.app-nav__icon", { html: icon }), el("span.app-nav__label", label)])
));

app.append(header, main, nav);

/* ---------- Routes ---------- */
route("/", () => { navigate("/accueil"); return el("div"); });
route("/accueil", () => placeholderScreen("Accueil", 5));
route("/agenda", () => placeholderScreen("Agenda", 3));
route("/seances", () => placeholderScreen("Séances", 4));
route("/synthese", () => placeholderScreen("Synthèse", 6));

route("/eleves", elevesListScreen);
route("/eleves/:id", eleveFormScreen);
route("/payeurs", payeursListScreen);
route("/payeurs/:id", payeurFormScreen);
route("/parametres", parametresScreen);

setNotFound(() => placeholderScreen("Page introuvable", 0));

/* ---------- Surlignage de l'onglet actif ---------- */
function highlightNav(path) {
  const root = "/" + (path.split("/")[1] || "accueil");
  [...nav.children].forEach((item) => {
    item.classList.toggle("app-nav__item--on", item.dataset.path === root);
  });
}

initRouter(main, { onNavigate: highlightNav });

if (!location.hash) navigate("/accueil");
else render();
highlightNav(currentPath());

/* ---------- Service worker ---------- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

/* ---------- Rappel de sauvegarde (léger, au démarrage) ---------- */
setTimeout(() => { verifierRappelSauvegarde().catch(() => {}); }, 1500);

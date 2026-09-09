// Suivi Piano — point d'entrée

import { el, toast } from "./util.js";
import { initRouter, route, setNotFound, render, navigate, currentPath } from "./router.js";
import { verifierRappelSauvegarde } from "./backup.js";
import { genererHorizon } from "./planning.js";

import { accueilScreen } from "./screens/accueil.js";
import { agendaScreen } from "./screens/agenda.js";
import { seanceScreen } from "./screens/seance.js";
import { seancesListeScreen } from "./screens/seancesListe.js";
import { syntheseScreen } from "./screens/synthese.js";
import { periodesScreen } from "./screens/periodes.js";
import { elevesListScreen } from "./screens/eleves.js";
import { eleveFormScreen } from "./screens/eleveForm.js";
import { payeursListScreen, payeurFormScreen } from "./screens/payeurs.js";
import { parametresScreen } from "./screens/parametres.js";
import { placeholderScreen } from "./screens/placeholder.js";

window.SUIVI_BUILD = "v0.8.0 · 2026-09-09";

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
route("/accueil", accueilScreen);
route("/agenda", agendaScreen);
route("/seances", seancesListeScreen);
route("/seances/:id", seanceScreen);
route("/periodes", periodesScreen);
route("/synthese", syntheseScreen);

route("/eleves", elevesListScreen);
route("/eleves/:id", eleveFormScreen);
route("/payeurs", payeursListScreen);
route("/payeurs/:id", payeurFormScreen);
route("/parametres", parametresScreen);

setNotFound(() => placeholderScreen("Page introuvable", 0));

/* ---------- Surlignage de l'onglet actif ---------- */
function highlightNav(path) {
  const root = "/" + (path.split("/")[1] || "accueil");
  const map = { "/periodes": "/agenda", "/payeurs": "/eleves" };
  const active = map[root] || root;
  [...nav.children].forEach((item) => {
    item.classList.toggle("app-nav__item--on", item.dataset.path === active);
  });
}

initRouter(main, { onNavigate: highlightNav });

if (!location.hash) navigate("/accueil");
else render();
highlightNav(currentPath());

/* ---------- Service worker ---------- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
  let recharge = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (recharge) return;
    recharge = true;
    location.reload();
  });
}

/* ---------- Génération des séances + rappel de sauvegarde ---------- */
setTimeout(async () => {
  try {
    const r = await genererHorizon();
    if (r.crees) render();
  } catch (e) {
    console.error("génération séances", e);
  }
  verifierRappelSauvegarde().catch(() => {});
}, 400);

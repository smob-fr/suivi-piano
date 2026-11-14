// Suivi Piano — point d'entrée

import { el, toast } from "./util.js";
import { initRouter, route, setNotFound, render, navigate, currentPath } from "./router.js";
import { verifierRappelSauvegarde } from "./backup.js";
import { genererHorizon } from "./planning.js";
import { initSync, surEtatSync, surDonneesDistantes } from "./sync.js";

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
import { fusionFoyersScreen } from "./screens/fusionFoyers.js";
import { placeholderScreen } from "./screens/placeholder.js";

window.SUIVI_BUILD = "v0.14.2 · 2026-11-14";

/* ---------- Structure de la page ---------- */
const app = document.getElementById("app");
app.replaceChildren();

const syncBadge = el("button.app-header__sync", {
  title: "Synchronisation",
  hidden: true,
  onclick: () => navigate("/parametres"),
});

const header = el("header.app-header", [
  el("h1.app-header__title", "Suivi Piano"),
  syncBadge,
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
route("/fusion", fusionFoyersScreen);

setNotFound(() => placeholderScreen("Page introuvable", 0));

/* ---------- Surlignage de l'onglet actif ---------- */
function highlightNav(path) {
  const root = "/" + (path.split("/")[1] || "accueil");
  const map = { "/periodes": "/agenda", "/payeurs": "/eleves", "/fusion": "/eleves" };
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
  // Vérifie s'il existe une nouvelle version à chaque ouverture et à chaque retour
  // sur l'appli ; si oui, elle s'installe et la page se recharge (controllerchange).
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
    .then((reg) => {
      const verifier = () => reg.update().catch(() => {});
      verifier();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") verifier();
      });
    })
    .catch(() => {});
  let recharge = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (recharge) return;
    recharge = true;
    location.reload();
  });
}

/* ---------- Synchronisation entre appareils ---------- */
let derniereCleSync = null;
surEtatSync((e) => {
  syncBadge.hidden = !e.configuree;
  let txt = "☁";
  let cls = "";
  let titre = "Synchronisation";
  if (e.statut === "synchro") { txt = "⟳"; titre = "Synchronisation en cours…"; }
  else if (e.statut === "deconnecte") { cls = "warn"; titre = "Non connecté — touche pour te connecter"; }
  else if (e.statut === "horsligne" || e.erreur) { cls = "warn"; titre = e.erreur || e.message; }
  else if (e.statut === "connecte") { cls = "ok"; titre = `Synchronisé (${e.email})`; }
  syncBadge.textContent = txt;
  syncBadge.title = titre;
  syncBadge.className = "app-header__sync" + (cls ? ` app-header__sync--${cls}` : "");
  // L'écran Paramètres affiche le formulaire de connexion ou l'état : on le
  // rafraîchit quand on passe de l'un à l'autre.
  const cle = `${!!e.email}|${e.statut === "chargement" || e.statut === "horsligne"}`;
  if (cle !== derniereCleSync && currentPath() === "/parametres") render();
  derniereCleSync = cle;
});

// Données reçues d'un autre appareil : on régénère le planning et on rafraîchit
// l'écran, sauf sur un formulaire en cours de saisie.
const ROUTES_FORMULAIRE = /^\/(eleves|payeurs|seances)\/[^/]+$|^\/parametres$|^\/fusion$/;
surDonneesDistantes(async () => {
  try { await genererHorizon(); } catch (e) { console.error(e); }
  if (!ROUTES_FORMULAIRE.test(currentPath()) && !document.querySelector(".modal-overlay")) render();
});

initSync().catch((e) => console.error("synchro", e));

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

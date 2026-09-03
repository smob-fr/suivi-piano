// Suivi Piano — squelette v0
const BUILD = "v0.1.0 · 2026-09-03";

document.getElementById("build").textContent = BUILD;

/* ---- Indicateur en ligne / hors ligne ---- */
const net = document.getElementById("net");
function renderNet() {
  const online = navigator.onLine;
  net.textContent = online ? "en ligne" : "hors ligne";
  net.classList.toggle("badge--off", !online);
  net.classList.remove("badge--wait");
}
renderNet();
addEventListener("online", renderNet);
addEventListener("offline", renderNet);

/* ---- Petit utilitaire d'affichage des contrôles ---- */
function mark(id, ok, label) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = label;
  el.classList.remove("check--wait");
  el.classList.add(ok ? "check--ok" : "check--wait");
}

/* ---- Service worker ---- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("sw.js")
    .then(() => mark("chk-sw", true, "Service worker actif — fonctionne hors ligne"))
    .catch(() => mark("chk-sw", false, "Service worker : échec"));
} else {
  mark("chk-sw", false, "Service worker non supporté");
}

/* ---- Test d'ouverture d'IndexedDB ---- */
try {
  const req = indexedDB.open("suivi-piano-check", 1);
  req.onsuccess = () => {
    req.result.close();
    mark("chk-db", true, "Base locale disponible");
  };
  req.onerror = () => mark("chk-db", false, "Base locale : accès refusé");
} catch (e) {
  mark("chk-db", false, "Base locale non supportée");
}

/* ---- Détection du mode installé (standalone) ---- */
function renderInstall() {
  const standalone =
    matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  mark(
    "chk-install",
    standalone,
    standalone ? "Lancée depuis l'écran d'accueil" : "Ouverte dans le navigateur (pas encore installée)"
  );
}
renderInstall();

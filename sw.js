// Suivi Piano — service worker
//
// Stratégie « réseau d'abord » : en ligne, l'appli récupère toujours la dernière
// version ; le cache ne sert que de repli hors ligne.
// Incrémente VERSION à chaque mise en ligne.
const VERSION = "v0.4.2";
const CACHE = `suivi-piano-${VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./js/app.js",
  "./js/router.js",
  "./js/util.js",
  "./js/ui.js",
  "./js/db.js",
  "./js/model.js",
  "./js/csv.js",
  "./js/backup.js",
  "./js/planning.js",
  "./js/seanceOps.js",
  "./js/quickValider.js",
  "./js/screens/accueil.js",
  "./js/screens/agenda.js",
  "./js/screens/seance.js",
  "./js/screens/seancesListe.js",
  "./js/screens/periodes.js",
  "./js/screens/eleves.js",
  "./js/screens/eleveForm.js",
  "./js/screens/payeurs.js",
  "./js/screens/parametres.js",
  "./js/screens/placeholder.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") return caches.match("./index.html");
        throw new Error("hors ligne et non mis en cache");
      })
  );
});

// Suivi Piano — service worker
//
// Stratégie « réseau d'abord » : en ligne, l'appli récupère toujours la dernière
// version ; le cache ne sert que de repli hors ligne.
// Incrémente VERSION à chaque mise en ligne.
const VERSION = "v0.9.0";
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
  "./js/nouvelleSeancePopin.js",
  "./js/rappels.js",
  "./js/facturePdf.js",
  "./js/vendor/jspdf.umd.min.js",
  "./js/screens/accueil.js",
  "./js/screens/agenda.js",
  "./js/screens/seance.js",
  "./js/screens/seancesListe.js",
  "./js/screens/synthese.js",
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

/* ---------- Rappel quotidien (best-effort) ---------- */

async function rappelGenerique() {
  await self.registration.showNotification("Suivi Piano", {
    body: "Pense à saisir tes cours et à préparer demain.",
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    tag: "rappel-quotidien",
    renotify: true,
  });
}

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "verif-quotidienne") event.waitUntil(rappelGenerique());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes("/suivi-piano") && "focus" in c) return c.focus();
      }
      return clients.openWindow("./");
    })
  );
});

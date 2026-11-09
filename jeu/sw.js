// Max et l'Œil de Jade — service worker (version installée)
// Réseau d'abord : en ligne, on récupère toujours la dernière version ;
// le cache sert seulement hors ligne. Incrémente VERSION à chaque mise en ligne.
const VERSION = "jeu-v17";
const FICHIERS = ["./", "./index.html", "./mondes.js", "./game.js", "./levels.js", "./manifest.webmanifest", "./images/accueil.webp", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("jeu-") && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === "basic") { const copie = res.clone(); caches.open(VERSION).then((c) => c.put(req, copie)); }
      return res;
    }).catch(() => caches.match(req).then((r) => r || (req.mode === "navigate" ? caches.match("./index.html") : Promise.reject(new Error("hors ligne")))))
  );
});

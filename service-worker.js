const CACHE = "sid-fc-shell-v1";
const SHELL = [
  "./", "./index.html", "./manifest.webmanifest", "./favicon.svg",
  "./css/style.css?v=20261125.1",
  "./assets/vendor/leaflet/leaflet.css", "./assets/vendor/leaflet/leaflet.js",
  "./assets/vendor/supabase-2.119.0.js",
  "./assets/icons/icon-192.png", "./assets/icons/icon-512.png",
  "./js/config.js?v=20261125.1", "./js/db.js?v=20261125.1", "./js/map.js?v=20261125.1",
  "./js/auth.js?v=20261125.1", "./js/guide.js?v=20261125.1", "./js/inspections.js?v=20261125.1",
  "./js/export.js?v=20261125.1", "./js/chart.js?v=20261125.1", "./js/criteria.js?v=20261125.1",
  "./js/workflows.js?v=20261125.1", "./js/ui.js?v=20261125.1", "./js/main.js?v=20261125.1"
];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("sid-fc-shell-") && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put("./index.html", response.clone()));
      return response;
    }).catch(async () => (await caches.match("./index.html")) || Response.error()));
    return;
  }
  const isAppAsset = ["/css/", "/js/", "/assets/", "/manifest.webmanifest", "/favicon.svg"].some((path) => url.pathname.includes(path));
  if (!isAppAsset) return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});

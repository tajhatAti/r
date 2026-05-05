// Tiny offline-first service worker
const CACHE = "sasp-v1";
const ASSETS = ["./", "index.html", "style.css", "script.js", "manifest.webmanifest"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const { request } = e;
  if (request.method !== "GET") return;
  // Network-first for Supabase / dynamic data
  if (request.url.includes("supabase.co") || request.url.includes("/rest/") || request.url.includes("/rpc/")) return;
  e.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(res => {
      if (res.ok && new URL(request.url).origin === location.origin) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(request, clone));
      }
      return res;
    }).catch(() => cached))
  );
});

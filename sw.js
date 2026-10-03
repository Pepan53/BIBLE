/* Offline režim webu „Kdo si hraje, nezlobí“.
   – Stránky a vlastní soubory: nejdřív internet (ať máš vždy novou verzi), bez internetu uložená kopie.
   – Obrázky odjinud (jw.org, YouTube náhledy): uloží se, jakmile je jednou uvidíš.
   – Tabulka Osy dějin (Google Sheets): nejdřív internet, bez internetu poslední stažená verze.
   Při přidání nového souboru na web ho dopiš do seznamu CORE a zvyš číslo VERZE. */
const VERZE = "v2";
const CORE_CACHE = "bible-core-" + VERZE;
const IMG_CACHE = "bible-img";
const DATA_CACHE = "bible-data";
const CORE = [
  "./", "index.html",
  "biblicke-knihy.html", "casova-osa.html", "mapa-evangelii.html",
  "osa-dejin.html", "rodokmen-jezise.html", "zivot-jezise.html", "celosvetova-zprava.html",
  "Mapa_ctyri_evangelii.svg",
  "assets/common.css", "assets/common.js", "assets/nav-dock.js", "assets/pwa.js",
  "assets/celosvetova-zprava-data.js",
  "assets/osa/gideon-mapa.jpg", "assets/osa/noe-archa.jpg",
  "manifest.webmanifest", "assets/icon-192.png", "assets/icon-512.png",
  "assets/icon-maskable-512.png", "assets/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CORE_CACHE)
    .then(c => Promise.all(CORE.map(u => c.add(new Request(u, {cache: "reload"})).catch(() => null))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("bible-core-") && k !== CORE_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function withTimeout(p, ms){
  return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("timeout")), ms);
    p.then(r => { clearTimeout(t); res(r); }, err => { clearTimeout(t); rej(err); }); });
}

async function networkFirst(req, cacheName, key){
  const cache = await caches.open(cacheName);
  try{
    const res = await withTimeout(fetch(req), 6000);
    if(res && (res.ok || res.type === "opaque")) cache.put(key || req, res.clone());
    return res;
  }catch(err){
    const hit = await cache.match(key || req, {ignoreSearch: true}) || await caches.match(key || req, {ignoreSearch: true});
    if(hit) return hit;
    if(req.mode === "navigate") return (await caches.match("index.html")) || Response.error();
    return Response.error();
  }
}

async function cacheFirst(req){
  const cache = await caches.open(IMG_CACHE);
  const hit = await cache.match(req);
  if(hit) return hit;
  try{
    const res = await fetch(req);
    if(res && (res.ok || res.type === "opaque")){
      cache.put(req, res.clone());
      cache.keys().then(k => { if(k.length > 400) k.slice(0, k.length - 400).forEach(x => cache.delete(x)); });
    }
    return res;
  }catch(err){ return Response.error(); }
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin === self.location.origin){
    // stejný soubor bez ?v=… parametrů
    const key = new Request(url.origin + url.pathname);
    e.respondWith(networkFirst(req, CORE_CACHE, key));
    return;
  }
  if(url.hostname === "docs.google.com" && url.pathname.includes("/gviz/")){
    const u = new URL(url); u.searchParams.delete("t");
    e.respondWith(networkFirst(req, DATA_CACHE, new Request(u.toString())));
    return;
  }
  if(req.destination === "image"){ e.respondWith(cacheFirst(req)); return; }
});

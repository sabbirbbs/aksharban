/* Offline static assets only. No API, user text, or search results are sent to a server. */
const PREFIX='aksharban-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=PREFIX+'release-6105354b357d7394';
const ASSETS=["./", "./index.html", "./alphabet.json", "./manifest.webmanifest", "./core.40eb3e92e0ee.js", "./worker.68967a67fc71.js", "./app.d3291868629a.js", "./navigation.de203a4b99d7.js", "./garden-model.be1f13bb1659.js", "./garden.b8199bf16564.js", "./explorer.acdfaf12a532.js", "./styles.b7bc9282aea9.css", "./assets/icon.svg", "./assets/three.min.js", "./assets/fonts.css", "./assets/font-0.ttf", "./assets/font-1.ttf", "./assets/font-2.ttf", "./assets/font-3.ttf", "./assets/font-4.ttf", "./assets/font-5.ttf", "./assets/font-6.ttf", "./assets/font-7.ttf"];
const URLS=new Set(ASSETS.map(p=>new URL(p,self.registration.scope).href));
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const url=new URL(e.request.url);url.hash='';url.search='';if(!URLS.has(url.href))return;
 e.respondWith(caches.open(CACHE).then(async cache=>{
  if(e.request.mode==='navigate'){
   try{const response=await fetch(e.request);if(response.ok)await cache.put(url.href,response.clone());return response;}catch{return await cache.match(url.href)||await cache.match(new URL('./index.html',self.registration.scope).href);}
  }
  const cached=await cache.match(url.href);if(cached)return cached;
  const response=await fetch(e.request);if(response.ok)await cache.put(url.href,response.clone());return response;
 }));
});

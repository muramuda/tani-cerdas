// Cache sederhana agar aplikasi tetap terbuka tanpa internet
const V="tani-v1",F=["./","index.html","css/style.css","js/data.js","js/app.js","manifest.json","icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(V).then(c=>c.addAll(F))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x))))));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET"||e.request.url.includes("/api/"))return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)))});

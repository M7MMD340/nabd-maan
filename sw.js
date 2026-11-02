// keeps the app opening offline; live data from Supabase is never cached
const V='nabd-93605892';
const SHELL=['./','index.html','data.js?v=93605892','app.js?v=93605892','sync.js?v=93605892','manifest.webmanifest','icons/icon-192.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.hostname.endsWith('supabase.co'))return;
  e.respondWith(fetch(r).then(res=>{if(res.ok&&(u.origin===location.origin||u.hostname==='cdn.jsdelivr.net'||u.hostname.startsWith('fonts.'))){const copy=res.clone();caches.open(V).then(c=>c.put(r,copy))}return res})
    .catch(()=>caches.match(r).then(m=>m||(r.mode==='navigate'?caches.match('index.html'):undefined))))});

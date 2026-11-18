const C='salem-v2';
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
const data=e.request.url.includes('/data/');
e.respondWith(caches.open(C).then(async c=>{const hit=await c.match(e.request);
const net=fetch(e.request,{cache:'no-cache'}).then(r=>{if(r.ok)c.put(e.request,r.clone());return r}).catch(()=>hit);
return data?net:(hit||net)}))});

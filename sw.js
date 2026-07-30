const CACHE = 'onix-v0.47.1';
// La música NO va aquí: los archivos grandes hacen fallar la instalación del
// service worker. Se cachean solos la primera vez que suenan.
const ASSETS = ['./', './index.html', './manifest.webmanifest', './sello.png',
  './icon-192.png', './icon-512.png', './favicon-32.png', './apple-touch-icon.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const esHTML = e.request.mode === 'navigate' ||
    (e.request.headers.get('accept') || '').includes('text/html');

  // El HTML se pide SIEMPRE a la red sin caché intermedia: si no, GitHub
  // Pages sirve la versión vieja durante minutos y parece que nada cambia.
  if (esHTML) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).then(resp => {
        const copia = resp.clone();
        caches.open(CACHE).then(c => { try { c.put(e.request, copia); } catch (err) {} });
        return resp;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // El resto: primero caché (rápido), y si no está, red.
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
    const copia = resp.clone();
    caches.open(CACHE).then(c => { try { c.put(e.request, copia); } catch (err) {} });
    return resp;
  }).catch(() => r)));
});

/* Service Worker - Pedidos Me Mata Limón PWA */
const CACHE = 'pedidos-mml-v1';
const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './config.json',
  './manifest.webmanifest',
  './logo_principal.jpg',
  './icono.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isNav = req.mode === 'navigate';
  // HTML, JS, CSS, JSON, manifest: red primero (evita datos viejos)
  const isAppShell = /\.(html|js|css|json|webmanifest)$/i.test(url.pathname) || url.pathname.endsWith('/');

  // No cachear articulos/detalles del dominio principal de forma agresiva: network first
  const isRemoteCatalog = url.hostname === 'mematalimon.com.ar';

  if (isNav || isAppShell || isRemoteCatalog) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Solo cachear mismo origen
          if (url.origin === self.location.origin && res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Imágenes y resto: cache primero
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});

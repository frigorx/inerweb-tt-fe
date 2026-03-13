// inerWeb — Service Worker principal v6.0
const CACHE_NAME = 'inerweb-v6.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './inerweb_prof.html',
  './inerweb_tuteur.html',
  './inerweb_eleve.html',
  './progression.html',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap',
];

// Install — cache les ressources essentielles
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME && !key.startsWith('inerweb-edu-'))
            .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — stratégie différenciée
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NE PAS cacher les requêtes vers edu/ (le SW d'Édu gère son propre scope)
  if (url.pathname.includes('/edu/')) {
    return;
  }

  // Requêtes API (Apps Script) → network-first avec fallback cache
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Tout le reste → cache-first
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
      .catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});

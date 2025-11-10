// ===== VERSION DU CACHE =====
const CACHE_NAME = 'app-v3'; // changez à chaque déploiement
const urlsToCache = [
  '/Student_Space/connexion/etudiant_connexion.html', // page de connexion
  '/Student_Space/connexion/etudiant_connexion.css',  // CSS page connexion
  '/Student_Space/connexion/etudiant_connexion.js',    // JS page connexion
  '/public_favicon/icons/icon-192.png', // icônes PWA
  '/public_favicon/icons/icon-512.png'
];

// =====================
// INSTALLATION DU SW
// =====================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting(); // force l'activation immédiate
});

// =====================
// ACTIVATION DU SW
// =====================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim(); // prend le contrôle des clients immédiatement
});

// =====================
// FETCH (STRATÉGIE CACHE)
// =====================
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(() => caches.match('/Student_Space/connexion/index.html')) // fallback vers connexion si offline
  );
});

// =====================
// PUSH NOTIFICATIONS
// =====================
self.addEventListener("push", (event) => {
  let data = { title: "Notification", message: "Vous avez une notification", url: "/Student_Space/connexion/index.html" };
  try { data = event.data.json(); } catch(e){}

  const options = {
    body: data.message,
    icon: "/public_favicon/icons/icon-192.png",
    badge: "/public_favicon/icons/icon-32.png",
    data: { url: data.url }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data.url);
    })
  );
});

// =====================
// MISE À JOUR AUTOMATIQUE DU SW
// =====================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

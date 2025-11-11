// =====================
// VERSION DU CACHE
// =====================
const CACHE_NAME = 'app-v4'; // incrémentez à chaque mise à jour
const urlsToCache = [
  '/Student_Space/connexion/etudiant_connexion.html', // page de connexion
  '/Student_Space/connexion/etudiant_connexion.css',  // CSS page connexion
  '/Student_Space/connexion/etudiant_connexion.js',   // JS page connexion
  '/public_favicons/icons/icon-192.png',               // icônes PWA
  '/public_favicons/icons/icon-512.png'
];

// =====================
// INSTALLATION DU SERVICE WORKER
// =====================
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installation en cours...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of urlsToCache) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response.clone());
            console.log('✅ Fichier mis en cache :', url);
          } else {
            console.warn('❌ Fichier introuvable :', url);
          }
        } catch (err) {
          console.error('⚠️ Erreur lors de la mise en cache de', url, err);
        }
      }
    })
  );
  self.skipWaiting(); // active immédiatement le nouveau SW
});

// =====================
// ACTIVATION DU SERVICE WORKER
// =====================
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activation...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ Suppression ancien cache :', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim(); // prend le contrôle immédiatement
});

// =====================
// FETCH : STRATÉGIE CACHE → RÉSEAU
// =====================
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Retourne le cache si trouvé
          return response;
        }
        // Sinon, tente une requête réseau
        return fetch(event.request).catch(() => {
          // Fallback : page de connexion hors ligne
          return caches.match('/Student_Space/connexion/etudiant_connexion.html');
        });
      })
  );
});

// =====================
// PUSH NOTIFICATIONS
// =====================
self.addEventListener("push", (event) => {
  let data = {
    title: "Notification",
    message: "Vous avez une notification",
    url: "/Student_Space/connexion/etudiant_connexion.html"
  };

  try {
    data = event.data.json();
  } catch (e) {
    console.warn("[Service Worker] Données de notification non JSON, utilisation des valeurs par défaut.");
  }

  const options = {
    body: data.message,
    icon: "/public_favicons/icons/icon-192.png",
    badge: "/public_favicons/icons/icon-32.png",
    data: { url: data.url }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// =====================
// ACTION SUR CLIC DE NOTIFICATION
// =====================
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(event.notification.data.url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

// =====================
// MISE À JOUR AUTOMATIQUE DU SERVICE WORKER
// =====================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

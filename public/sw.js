const CACHE_NAME = 'daksha-ai-v-auth-fix-1';
const APP_SHELL = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest', '/robots.txt', '/sitemap.xml'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      for (const asset of APP_SHELL) {
        try {
          await cache.add(asset);
        } catch (error) {
          console.warn(`Unable to precache ${asset}:`, error);
        }
      }
    } catch (error) {
      console.error('Service worker install cache error:', error);
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('daksha-') && key !== CACHE_NAME).map((key) => caches.delete(key)));
    } catch (error) {
      console.error('Service worker activate cache cleanup error:', error);
    }
  })());
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  const bypassPaths = ['/login', '/signup', '/register', '/forgot-password', '/auth', '/api/', '/manifest.webmanifest'];
  if (bypassPaths.some((path) => url.pathname.startsWith(path))) {
    return;
  }

  const staticRequest = ['script', 'style', 'font', 'image'].includes(request.destination);
  if (!staticRequest) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        const cached = await cache.match(request);

        try {
          const response = await fetch(request);

          if (response && response.ok && response.status === 200 && response.type === 'basic' && !response.redirected) {
            await cache.put(request, response.clone());
          }

          return response;
        } catch (error) {
          if (cached) {
            return cached;
          }
          throw error;
        }
      })
      .catch(() => fetch(request))
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'daksha-sync') {
    event.waitUntil(self.registration.showNotification('Daksha AI', { body: 'Your offline changes are syncing now.' }));
  }
});

self.addEventListener('push', (event) => {
  const payload = event.data?.text() || 'You have a new update in Daksha AI.';
  event.waitUntil(self.registration.showNotification('Daksha AI', { body: payload, icon: '/favicon.svg' }));
});

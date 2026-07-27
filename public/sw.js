const CACHE_NAME = 'daksha-ai-v1';
const APP_SHELL = ['/', '/index.html', '/favicon.svg'];

function isVercelBypassUrl(url) {
  if (!url) return false;
  const pathname = url.pathname || '';
  return (
    url.origin === 'https://vercel.com' ||
    url.origin === 'https://vercel.live' ||
    pathname.startsWith('/__vercel/') ||
    pathname.startsWith('/sso-api')
  );
}

function isPreviewManifestRequest(url, request) {
  if (!url || !request) return false;
  const isManifest = request.destination === 'manifest' || url.pathname.endsWith('/manifest.webmanifest') || url.pathname === '/manifest.webmanifest';
  const isVercelPreviewHost = url.hostname.endsWith('.vercel.app');
  return isManifest && isVercelPreviewHost;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);
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
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    } catch (error) {
      console.error('Service worker activate cache cleanup error:', error);
    }
  })());
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;

  if (isVercelBypassUrl(url)) {
    event.respondWith(fetch(request));
    return;
  }

  if (isPreviewManifestRequest(url, request)) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const cached = await caches.match(request);
        if (cached) return cached;

        const response = await fetch(request);

        if (
          request.url.startsWith(self.location.origin) &&
          response &&
          response.ok &&
          response.status === 200 &&
          response.type === 'basic' &&
          !response.redirected
        ) {
          try {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          } catch (error) {
            console.error('Service worker cache put error:', error);
          }
        }

        return response;
      } catch (error) {
        console.error('Service worker fetch handler error:', error);
        return fetch(request);
      }
    })()
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

const CACHE_NAME = 'daksha-ai-v3';
const APP_SHELL = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest'];
const CDN_ASSETS = ['https://www.gstatic.com/firebasejs/ui/2.0.0/firebase-ui.css'];

function isRangeRequest(request) {
  return request.headers.has('range') || request.headers.has('Range');
}

function isStreamingRequest(request) {
  const acceptHeader = request.headers.get('accept') || '';
  return (
    request.destination === 'video' ||
    request.destination === 'audio' ||
    acceptHeader.includes('text/event-stream') ||
    acceptHeader.includes('application/octet-stream')
  );
}

function shouldBypassCache(request, url) {
  if (!request || !url) return true;
  if (isRangeRequest(request)) return true;
  if (isStreamingRequest(request)) return true;
  if (request.cache === 'no-store') return true;
  if (url.searchParams.has('nocache')) return true;
  return false;
}

function shouldCacheResponse(request, response) {
  if (!response) return false;
  if (!response.ok || response.status !== 200) return false;
  if (response.type !== 'basic') return false;
  if (response.redirected) return false;
  if (isRangeRequest(request)) return false;
  if (isStreamingRequest(request)) return false;

  const contentRange = response.headers.get('content-range');
  const cacheControl = response.headers.get('cache-control') || '';
  if (contentRange) return false;
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) return false;
  return true;
}

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
      await Promise.allSettled(CDN_ASSETS.map((asset) => cache.add(asset)));
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

  if (shouldBypassCache(request, url)) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const cached = await caches.match(request);
        if (cached) return cached;

        const response = await fetch(request);

        if (request.url.startsWith(self.location.origin) && shouldCacheResponse(request, response)) {
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

        if (request.mode === 'navigate') {
          const appShell = await caches.match('/index.html');
          if (appShell) return appShell;
        }

        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
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

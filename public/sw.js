// This is the service worker with the combined offline experience (Offline page + Offline copy of pages)

const CACHE = "momfit-offline-v1";

// Install stage sets up the offline page in the cache and opens a new cache
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE).then(function(cache) {
      console.log('[PWA] Cached offline page during install');
      return cache.addAll([
        '/',
        '/index.html',
        '/offline.html',
        '/manifest.json',
        '/favicon.svg',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png'
      ]);
    })
  );
});

// If any fetch fails, it will show the offline page.
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // If the response is valid, clone it and store it in the cache
        if (response.status === 200) {
          let responseClone = response.clone();
          caches.open(CACHE).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(function() {
        // If the network request fails, try to get it from the cache
        return caches.match(event.request)
          .then(function(response) {
            return response || caches.match('/offline.html');
          });
      })
  );
});

// This is an event that can be fired from your page to tell the SW to update the offline page
self.addEventListener('refreshOffline', function(response) {
  return caches.open(CACHE).then(function(cache) {
    console.log('[PWA] Offline page updated from refreshOffline event');
    return cache.put('/offline.html', new Response(offlinePage));
  });
});
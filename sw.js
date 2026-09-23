/* ══════════════════════════════════════════════════════════════════════
   BISE PESHAWAR ONLINE RESULTS SYSTEM — Service Worker
   cloud.bisep.edu.pk · offline-resilient result portal
   ─────────────────────────────────────────────────────────────────────
   Strategy:
   • Navigations  → network-first, offline fallback to cached shell
   • Static files → cache-first (immutable between releases)
   ══════════════════════════════════════════════════════════════════ */
'use strict';

var VERSION = 'bisep-cloud-v4';
var PRECACHE = [
  './',
  './index.html',
  './site.webmanifest',
  './favicon.ico',
  './assets/og-image.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(VERSION).then(function (cache) { return cache.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== VERSION) return caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  /* NEVER intercept the live result API — the countdown→live flip and
     every marksheet lookup must hit the network (and the proxy's own
     edge caches handle caching; a SW cache would freeze stale data). */
  if (new URL(req.url).pathname.indexOf('/api/') === 0) return;

  /* NEVER intercept SEO/AI crawler files — Google Search Console, the
     robots.txt tester and AI fetchers must always see the live copies. */
  var p = new URL(req.url).pathname;
  if (p === '/robots.txt' || p === '/sitemap.xml' || p === '/llms.txt' ||
      (p.endsWith('.xml') && p.indexOf('sitemap') !== -1)) return;

  if (req.mode === 'navigate') {
    /* network-first for page loads — always fresh results */
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(VERSION).then(function (cache) { cache.put('./', copy); });
        return res;
      }).catch(function () {
        return caches.match('./').then(function (cached) {
          return cached || caches.match(req);
        });
      })
    );
    return;
  }

  /* cache-first for everything else */
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res.ok && new URL(req.url).origin === self.location.origin) {
          var copy = res.clone();
          caches.open(VERSION).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      });
    })
  );
});

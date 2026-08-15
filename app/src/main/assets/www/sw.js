'use strict';
/* LifeOS service worker: cache-first offline + notification click. */
const C = 'lifeos-v2';
const ASSETS = ['./', './index.html', './core.js', './app.js', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(cached =>
      cached || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(C).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './index.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cl => {
      for (const c of cl) {
        if ('focus' in c) { c.focus(); if ('navigate' in c) c.navigate(url); return; }
      }
      return clients.openWindow(url);
    })
  );
});

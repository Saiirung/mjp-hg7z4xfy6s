// MilkJelly Pattern offline: the app's own files are kept on the device (the iPad's home-screen app opens without the internet); the Google font
// is kept the first time it loads. A new version = change VERSION (every file is fetched again, the old copy dropped). Only on http(s) —
// opening index.html from a folder (file://) does not use this.
const VERSION = "mjpat-mvsasgrx";
const FILES = ["./", "index.html", "manifest.webmanifest", "css/app.css", "js/brush-templates.js", "js/01-state.js", "js/02-render.js", "js/03-editor.js", "js/04-ui.js",
    "js/05-export.js", "js/06-ready.js", "js/07-draw.js", "js/08-photo.js", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
    const u = new URL(e.request.url); if (e.request.method !== "GET") return;
    if (u.origin === location.origin) {   // the app: the network first (new versions show at once), the kept copy when offline
        e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
    } else if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {   // the font: the kept copy first
        e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); return r; })));
    }
});

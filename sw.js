const CACHE_NAME = 'pawiwahan-v10';
const ASSETS_TO_CACHE = [
    './index.html',
    './style.css',
    './script.js',
    './site.webmanifest',
    './Elemen/Photo%20Gallery/Cover1.webp',
    './Elemen/Elemen%20Pendukung/wave.webp'
];

// Install Service Worker dan simpan aset dasar
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Bersihkan cache versi lama saat service worker baru aktif
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Ambil aset dengan strategi yang tepat
self.addEventListener('fetch', (event) => {
    // Abaikan permintaan non-GET dan scheme non-http (seperti chrome-extension)
    if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

    // Abaikan permintaan Firebase/Google API/Analytics serta streaming audio (.mp3 & Range Requests) agar tidak konflik di Safari/iOS
    if (
        event.request.url.includes('googleapis.com') ||
        event.request.url.includes('firebaseio.com') ||
        event.request.url.includes('google-analytics.com') ||
        event.request.url.includes('googletagmanager.com') ||
        event.request.headers.get('range') ||
        event.request.url.match(/\.mp3$/i)
    ) {
        return;
    }

    // Untuk file kode (HTML, CSS, JS): Network First (selalu ambil versi terbaru dari server, fallback ke cache jika offline)
    if (event.request.url.match(/\.(html|css|js)$/) || event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                return caches.match(event.request).then((cached) => {
                    return cached || caches.match('./index.html');
                });
            })
        );
        return;
    }

    // Untuk media statis (gambar, font, ikon): Cache First (super cepat dan hemat kuota)
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((response) => {
                if (response && response.status === 200 && event.request.url.match(/\.(webp|jpg|jpeg|png|woff2|ico)$/i)) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            }).catch(() => {
                return caches.match(event.request);
            });
        })
    );
});
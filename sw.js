const CACHE_NAME = 'pawiwahan-v1';
const ASSETS_TO_CACHE = [
    './index.html',
    './style.css',
    './script.js',
    './Elemen/Elemen%20Pendukung/Music.mp3',
    './Elemen/Elemen%20Pendukung/wave.png'
];

// Install Service Worker dan simpan aset dasar
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Ambil aset dari cache jika tersedia, jika tidak ambil dari network dan simpan ke cache
self.addEventListener('fetch', (event) => {
    // Abaikan permintaan Firebase/Firestore agar tidak konflik dengan real-time data
    if (event.request.url.includes('firestore.googleapis.com')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((response) => {
                // Hanya simpan file gambar, audio, dan font ke cache secara dinamis
                if (event.request.url.match(/\.(webp|jpg|jpeg|png|mp3|woff2|ico)$/)) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            });
        })
    );
});
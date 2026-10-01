/**
 * ============================================================================
 * 📶 PAWIWAHAN THEME 1 - SERVICE WORKER & SISTEM CACHING PWA
 * ============================================================================
 * Menyediakan ketahanan akses luring (offline), strategi caching bertingkat
 * cerdas (Network-First untuk kode dinamis, Cache-First untuk aset media),
 * serta pembersihan otomatis cache versi lama.
 *
 * @versi 10.0.0
 * @penulis WinandaDev
 * ============================================================================
 */

/* ==========================================================================
   01. DAFTAR ASET CACHE & KONFIGURASI
   ========================================================================== */
const CACHE_NAME = 'pawiwahan-v10';
const ASSETS_TO_CACHE = [
    './index.html',
    './style.css',
    './script.js',
    './site.webmanifest',
    './Elemen/Photo%20Gallery/Cover1.webp',
    './Elemen/Elemen%20Pendukung/wave.webp'
];

/* ==========================================================================
   02. MANAJEMEN SIKLUS HIDUP SERVICE WORKER
   ========================================================================== */

/**
 * Event: Install
 * Menyimpan aset dasar ke dalam cache dan langsung mengaktifkan Service Worker.
 */
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

/**
 * Event: Activate
 * Membersihkan cache versi usang secara otomatis saat Service Worker baru aktif.
 */
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

/* ==========================================================================
   03. INTERSEPSI PERMINTAAN & ROUTER STRATEGI CACHE
   ========================================================================== */

self.addEventListener('fetch', (event) => {
    // 1. Abaikan permintaan non-GET dan skema non-HTTP (misal chrome-extension)
    if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

    // 2. Abaikan API eksternal, Firebase, Analytics, dan audio Range Requests (mencegah isu audio Safari/iOS)
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

    // 3. Strategi: Network-First untuk File Kode (HTML, CSS, JS) & Navigasi
    // Memastikan user selalu mendapatkan update UI terbaru, dengan fallback cache saat offline.
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

    // 4. Strategi: Cache-First untuk Media Statis (WebP, JPG, PNG, Font WOFF2, Favicon)
    // Mengoptimalkan LCP, rendering super cepat, dan menghemat kuota internet pengguna.
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
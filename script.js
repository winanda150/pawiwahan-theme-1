/**
 * ============================================================================
 * ⚡ PAWIWAHAN THEME 1 - MESIN JAVASCRIPT & LOGIKA INTERAKTIF (SCRIPT.JS)
 * ============================================================================
 * Arsitektur: Vanilla ES6+ Modular, Real-Time Firebase Firestore v10.7.1,
 * Web Media Session API, Gestur Sentuh, Autentikasi Kriptografi SHA-256,
 * serta Siklus Hidup Service Worker Progressive Web App (PWA).
 *
 * 📑 DAFTAR ISI MODUL:
 * ----------------------------------------------------------------------------
 * 01. INISIALISASI FIREBASE & KONEKSI CLOUD FIRESTORE
 * 02. KEAMANAN SISI KLIEN & PROTEKSI ANTI-INSPECT
 * 03. SINKRONISASI WAKTU SERVER & PENGHITUNG WAKTU GLOBAL
 * 04. INISIALISASI DOM, PENYESUAIAN NAMA TAMU & ENGINE AOS
 * 05. TATA LETAK COVER, PARTIKEL EMAS & KONTROLER MUSIK
 * 06. PENGHITUNG WAKTU MUNDUR ACARA & SINKRONISASI REAL-TIME
 * 07. LIGHTBOX GALERI FOTO (PINCH, ZOOM, PAN, SWIPE & AUTO-RETRY)
 * 08. STATE FORMULIR HYBRID, KEYBOARD EMOJI & RICH TEXT FORMATTER
 * 09. PENGIRIMAN DATA RSVP & SISTEM ANTI-SPAM
 * 10. AKSES KHUSUS MEMPELAI (AUTENTIKASI SHA-256 & MODERASI)
 * 11. BUKU TAMU REAL-TIME FIRESTORE, BALASAN BERTINGKAT & REAKSI SUKA
 * 12. FUNGSI UTILITAS, SALIN PAPAN KLIP & REGISTRASI PWA SERVICE WORKER
 * ============================================================================
 */

/* ==========================================================================
   01. INISIALISASI FIREBASE & KONEKSI CLOUD FIRESTORE (LAZY LOADED 100% PERFORMANCE)
   ========================================================================== */

// Konfigurasi Firebase diambil murni dari config.js (Single Source of Truth)
const firebaseConfig = (typeof WEDDING_CONFIG !== 'undefined' && WEDDING_CONFIG.firebase)
    ? WEDDING_CONFIG.firebase
    : null;

// Variabel modul Firebase & Firestore (dimuat secara asinkron saat dibutuhkan agar LCP & PageSpeed optimal)
let app = null;
let db = null;
let collection, query, orderBy, onSnapshot, serverTimestamp, limit, doc, updateDoc, deleteDoc, increment, startAfter, getCountFromServer, getDoc, getDocs, setDoc, where, getAggregateFromServer, sum;

let firebaseInitialized = false;
let firebaseInitPromise = null;

async function ensureFirebase() {
    if (firebaseInitialized) return { app, db };
    if (!firebaseConfig || !firebaseConfig.apiKey) {
        console.warn("⚠️ Konfigurasi Firebase belum ditentukan di config.js. Fitur RSVP & Buku Tamu real-time dinonaktifkan.");
        return { app: null, db: null };
    }
    if (firebaseInitPromise) return firebaseInitPromise;

    firebaseInitPromise = (async () => {
        try {
            const [appMod, fsMod] = await Promise.all([
                import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"),
                import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js")
            ]);

            app = appMod.initializeApp(firebaseConfig);
            db = fsMod.initializeFirestore(app, {
                experimentalAutoDetectLongPolling: true,
            });

            collection = fsMod.collection;
            query = fsMod.query;
            orderBy = fsMod.orderBy;
            onSnapshot = fsMod.onSnapshot;
            serverTimestamp = fsMod.serverTimestamp;
            limit = fsMod.limit;
            doc = fsMod.doc;
            updateDoc = fsMod.updateDoc;
            deleteDoc = fsMod.deleteDoc;
            increment = fsMod.increment;
            startAfter = fsMod.startAfter;
            getCountFromServer = fsMod.getCountFromServer;
            getDoc = fsMod.getDoc;
            getDocs = fsMod.getDocs;
            setDoc = fsMod.setDoc;
            where = fsMod.where;
            getAggregateFromServer = fsMod.getAggregateFromServer;
            sum = fsMod.sum;

            firebaseInitialized = true;
            return { app, db };
        } catch (err) {
            firebaseInitPromise = null; // Reset promise agar pemanggilan berikutnya dapat mencoba ulang secara otomatis
            throw err;
        }
    })();

    return firebaseInitPromise;
}

/* ==========================================================================
   02. KEAMANAN SISI KLIEN & PROTEKSI ANTI-INSPECT
   ========================================================================== */

// --- FITUR ANTI-INSPECT & KLIK KANAN ---
// Menghalangi menu klik kanan (kecuali pada input/textarea agar pengguna dapat menempel teks/kata sandi)
document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('input, textarea')) return;
    e.preventDefault();
});

// Menghalangi penyeretan gambar (drag) menggunakan mouse
document.addEventListener('dragstart', (e) => {
    if (e.target.tagName === 'IMG') e.preventDefault();
});

// Menghalangi shortcut keyboard (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
document.addEventListener('keydown', (e) => {
    if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
    ) {
        e.preventDefault();
    }
});

// Pastikan scroll restoration manual agar tidak kembali ke posisi terakhir saat refresh
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0); // Memaksa scroll ke posisi paling atas

/* ==========================================================================
   03. SINKRONISASI WAKTU SERVER & PENGHITUNG WAKTU GLOBAL
   ========================================================================== */

// Variabel untuk menyimpan selisih waktu server dan lokal
let serverTimeOffset = 0;

/**
 * Fungsi untuk mengambil waktu dari server (menggunakan header Date)
 * agar countdown akurat meskipun jam HP user salah.
 */
async function syncTimeWithServer() {
    if (!window.location.protocol.startsWith('http')) return;
    try {
        const start = Date.now();
        const response = await fetch(window.location.href, {
            method: 'HEAD',
            cache: 'no-store' // Memastikan header Date yang diambil adalah waktu server saat ini
        });
        const serverDateStr = response.headers.get('Date');
        if (serverDateStr) {
            const serverTime = new Date(serverDateStr).getTime();
            const end = Date.now();
            // Menghitung offset dengan memperhitungkan sedikit latency network
            serverTimeOffset = serverTime - (start + end) / 2;
        }
    } catch (e) {
        console.error("Gagal sinkronisasi waktu server, menggunakan waktu lokal:", e);
    }
}

/* ==========================================================================
   04. INISIALISASI DOM, PENYESUAIAN NAMA TAMU & ENGINE AOS
   ========================================================================== */

// Logika Buka Undangan dan Putar Musik
document.addEventListener('DOMContentLoaded', () => {
    const btnOpen = document.getElementById('btn-open');
    const cover = document.getElementById('cover');
    const music = document.getElementById('bg-music');
    const particlesContainer = document.getElementById('particles-container');
    const musicControl = document.getElementById('music-control');
    const musicIcon = musicControl?.querySelector('i');
    const musicStatusText = document.getElementById('music-status-text');
    let statusTimeout = null;

    const showMusicStatus = (text) => {
        if (!musicStatusText) return;
        musicStatusText.textContent = text;
        musicStatusText.classList.add('show');
        if (statusTimeout) clearTimeout(statusTimeout);
        statusTimeout = setTimeout(() => {
            musicStatusText.classList.remove('show');
        }, 2000);
    };

    // --- HELPER SANITASI & ENCODING GLOBAL (ZERO HOISTING RISK) ---
    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // --- 00. ENGINE HYDRATION DARI CONFIG.JS ---
    const applyWeddingConfig = () => {
        const cfg = typeof WEDDING_CONFIG !== 'undefined' ? WEDDING_CONFIG : null;
        if (!cfg) return;

        // 0. Sinkronkan Judul Dokumen, Meta Deskripsi & Open Graph (Browser & Webview)
        if (cfg.couple?.shortName) {
            document.title = `Undangan Pawiwahan | ${cfg.couple.shortName}`;
            const metaOgTitle = document.querySelector('meta[property="og:title"]');
            if (metaOgTitle) metaOgTitle.setAttribute('content', `Undangan Pawiwahan | ${cfg.couple.shortName}`);
            const metaTwTitle = document.querySelector('meta[name="twitter:title"]');
            if (metaTwTitle) metaTwTitle.setAttribute('content', `Undangan Pawiwahan | ${cfg.couple.shortName}`);
            const metaSiteName = document.querySelector('meta[property="og:site_name"]');
            if (metaSiteName) metaSiteName.setAttribute('content', `Undangan Pawiwahan ${cfg.couple.shortName}`);
            const metaAuthor = document.querySelector('meta[name="author"]');
            if (metaAuthor) metaAuthor.setAttribute('content', cfg.couple.shortName);
        }
        const coupleFullName = cfg.couple?.fullName || (cfg.mempelai?.groom?.fullName && cfg.mempelai?.bride?.fullName ? `${cfg.mempelai.groom.fullName} & ${cfg.mempelai.bride.fullName}` : '');
        if (coupleFullName) {
            const metaDesc = document.querySelector('meta[name="description"]');
            const descContent = `Undangan Pernikahan Digital ${coupleFullName}. Mohon doa restu dan kehadiran Bapak/Ibu/Saudara/i pada hari bahagia kami.`;
            if (metaDesc) metaDesc.setAttribute('content', descContent);
            const metaOgDesc = document.querySelector('meta[property="og:description"]');
            if (metaOgDesc) metaOgDesc.setAttribute('content', descContent);
            const metaTwDesc = document.querySelector('meta[name="twitter:description"]');
            if (metaTwDesc) metaTwDesc.setAttribute('content', descContent);
        }

        // 1. Sinkronkan teks sederhana dengan atribut [data-bind]
        document.querySelectorAll('[data-bind]').forEach(el => {
            const keyPath = el.getAttribute('data-bind').split('.');
            let val = cfg;
            for (const key of keyPath) {
                if (val && typeof val === 'object' && key in val) {
                    val = val[key];
                } else {
                    val = null;
                    break;
                }
            }
            if (val !== null && val !== undefined) {
                el.textContent = val;
            }
        });

        // 2. Sinkronkan atribut gambar [data-bind-src] dan [data-bind-alt] (Mendukung Loading Skeleton)
        document.querySelectorAll('[data-bind-src]').forEach(el => {
            const keyPath = el.getAttribute('data-bind-src').split('.');
            let val = cfg;
            for (const key of keyPath) {
                if (val && typeof val === 'object' && key in val) {
                    val = val[key];
                } else {
                    val = null;
                    break;
                }
            }
            if (val) {
                if (el.tagName.toLowerCase() === 'img') {
                    const onImageLoad = () => {
                        el.classList.add('loaded');
                        const coverBg = el.closest('.cover-bg');
                        if (coverBg) coverBg.classList.remove('skeleton');
                        const mempelaiWrapper = el.closest('.mempelai-img-wrapper');
                        if (mempelaiWrapper) mempelaiWrapper.classList.remove('skeleton');
                    };

                    el.addEventListener('load', onImageLoad, { once: true });
                    el.addEventListener('error', () => {
                        const coverBg = el.closest('.cover-bg');
                        if (coverBg) coverBg.classList.remove('skeleton');
                        const mempelaiWrapper = el.closest('.mempelai-img-wrapper');
                        if (mempelaiWrapper) mempelaiWrapper.classList.remove('skeleton');
                    }, { once: true });

                    if (el.getAttribute('src') !== val) {
                        const mempelaiWrapper = el.closest('.mempelai-img-wrapper');
                        if (mempelaiWrapper) mempelaiWrapper.classList.add('skeleton');
                        el.classList.remove('loaded');
                        el.src = val;
                    }

                    if (el.complete && el.naturalWidth > 0) {
                        onImageLoad();
                    }
                } else if (el.getAttribute('src') !== val) {
                    el.src = val;
                }
            }
        });

        // 2b. Inisialisasi status loading skeleton foto profil mempelai (fallback cache/native loading)
        document.querySelectorAll('.mempelai-img').forEach(img => {
            const wrapper = img.closest('.mempelai-img-wrapper');
            if (!wrapper) return;

            const onDone = () => {
                img.classList.add('loaded');
                wrapper.classList.remove('skeleton');
            };

            if (img.complete && img.naturalWidth > 0) {
                onDone();
            } else {
                img.addEventListener('load', onDone, { once: true });
                img.addEventListener('error', onDone, { once: true });
            }
        });

        document.querySelectorAll('[data-bind-alt]').forEach(el => {
            const keyPath = el.getAttribute('data-bind-alt').split('.');
            let val = cfg;
            for (const key of keyPath) {
                if (val && typeof val === 'object' && key in val) {
                    val = val[key];
                } else {
                    val = null;
                    break;
                }
            }
            if (val) el.alt = val;
        });

        // 4. Sinkronkan tautan [data-bind-href]
        document.querySelectorAll('[data-bind-href]').forEach(el => {
            const keyPath = el.getAttribute('data-bind-href').split('.');
            let val = cfg;
            for (const key of keyPath) {
                if (val && typeof val === 'object' && key in val) {
                    val = val[key];
                } else {
                    val = null;
                    break;
                }
            }
            if (val) el.href = val;
        });

        // 5. Sinkronkan Audio Musik Latar (Hanya jika belum terpasang dari data-bind-src agar tidak memicu double HTTP fetch)
        if (cfg.couple?.bgMusic && music && !music.getAttribute('src')) {
            music.src = cfg.couple.bgMusic;
        }

        // 6. Render Dinamis Kartu Rekening Bank (Mendukung jumlah bank fleksibel)
        const bankContainer = document.querySelector('.bank-card-container-stacked');
        if (bankContainer && Array.isArray(cfg.gifts?.bankAccounts) && cfg.gifts.bankAccounts.length > 0) {
            bankContainer.innerHTML = cfg.gifts.bankAccounts.map(b => `
                <div class="bank-card">
                    <div class="bank-logo">${escapeHTML(b.bank || '')}</div>
                    <div class="bank-details-flex-wrapper">
                        <div class="bank-number-display">
                            <div class="bank-number">${escapeHTML(b.number || '')}</div>
                        </div>
                        <div class="bank-name">${escapeHTML(b.holder || '')}</div>
                        <button class="btn-copy" data-copy="${escapeHTML(b.number || '')}" aria-label="Salin nomor rekening ${escapeHTML(b.bank || '')}">
                            <i class="bi bi-copy"></i> Salin Nomor
                        </button>
                    </div>
                </div>
            `).join('');
        }

        // 7. Render Dinamis Kartu Rangkaian Acara (Generate Link Google Calendar & Maps Otomatis)
        const eventGrid = document.querySelector('.event-grid');
        if (eventGrid && Array.isArray(cfg.events?.list) && cfg.events.list.length > 0) {
            eventGrid.innerHTML = cfg.events.list.map((ev, idx) => {
                const cal = ev.calendar || {};
                const eventTitle = ev.title || 'Acara Pernikahan';
                const calTitle = cal.title || eventTitle;
                const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calTitle)}&dates=${encodeURIComponent(cal.dates || '')}&details=${encodeURIComponent(cal.details || '')}&location=${encodeURIComponent(cal.location || ev.address || '')}`;
                const delay = (idx + 1) * 200;
                return `
                    <div class="event-card" data-aos="fade-up" data-aos-delay="${delay}">
                        <div class="event-arch">
                            <i class="bi ${escapeHTML(ev.icon || 'bi-calendar-event')} event-icon-top"></i>
                            <h3 class="cinzel-font">${escapeHTML(eventTitle)}</h3>
                            <div class="event-info">
                                <div class="info-item">
                                    <p>${escapeHTML(ev.dayDate || '')}</p>
                                </div>
                                <div class="info-item">
                                    <p>${escapeHTML(ev.time || '')}</p>
                                </div>
                                <div class="info-item">
                                    <p><span>Bertempat di</span><br>${escapeHTML(ev.address || '')}</p>
                                </div>
                            </div>
                            <div class="event-buttons">
                                <a href="${calUrl}" target="_blank" rel="noopener noreferrer" class="btn-event" aria-label="Simpan Jadwal ${escapeHTML(eventTitle)} ke Kalender">
                                    <i class="bi bi-calendar-plus"></i> Simpan Kalender
                                </a>
                                <a href="${escapeHTML(ev.mapsUrl || '#')}" target="_blank" rel="noopener noreferrer" class="btn-event outline" aria-label="Lihat Lokasi ${escapeHTML(eventTitle)} di Google Maps">
                                    <i class="bi bi-geo-alt-fill"></i> Lihat Lokasi
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    };

    // Terapkan data konfigurasi segera saat DOM siap
    applyWeddingConfig();

    // --- Logika untuk mengambil nama tamu dari URL (Segera dieksekusi agar layout stabil sejak awal) ---
    const guestNameElement = document.getElementById('guest-name');

    // Fungsi untuk mengecilkan font secara otomatis jika nama terlalu panjang (Zero-Reflow, Aman & Mulus)
    const adjustGuestNameSize = () => {
        if (!guestNameElement) return;
        const text = guestNameElement.textContent ? guestNameElement.textContent.trim() : '';
        const len = text.length;
        if (len > 35) {
            guestNameElement.style.fontSize = "1.1rem";
        } else if (len > 24) {
            guestNameElement.style.fontSize = "1.3rem";
        } else {
            guestNameElement.style.fontSize = "";
        }
    };

    // Fungsi pembaruan nama tamu dari URL (Mendukung inisialisasi awal & update realtime saat hash/URL berubah tanpa reload)
    const updateGuestNameFromUrl = () => {
        if (!guestNameElement) return;

        let rawGuestParam = null;
        // Prioritaskan jika pengguna mengetik ?to langsung di dalam hash (misal: #hash/?to=Made atau #hash?to=Made)
        if (window.location.hash.includes('to=')) {
            const hashMatch = window.location.hash.match(/[?&]to=([^&#]+)/);
            if (hashMatch && hashMatch[1]) {
                rawGuestParam = decodeURIComponent(hashMatch[1].replace(/\+/g, ' '));
            }
        }

        // Jika tidak ada di hash, ambil dari search parameter baku (?to=...)
        if (!rawGuestParam) {
            const urlParams = new URLSearchParams(window.location.search);
            rawGuestParam = urlParams.get('to');
        }

        // Sanitasi: Bersihkan garis miring di akhir nama agar tidak ada tanda '/' di cover
        const guestParam = rawGuestParam ? rawGuestParam.replace(/\/+$/, '').trim() : '';
        const targetText = (guestParam && guestParam !== "") ? guestParam : "Tamu Undangan";

        guestNameElement.textContent = targetText;

        // Jalankan penyesuaian ukuran font
        adjustGuestNameSize();
    };

    // Jalankan saat pertama dimuat
    updateGuestNameFromUrl();

    // Fungsi untuk (re)inisialisasi AOS agar durasi & offset selalu sinkron dengan lebar layar
    const initAOS = () => {
        const width = window.innerWidth;
        let aosDuration = 1100; // Default Desktop: Lebih elegan dan lambat
        let aosOffset = 90;

        if (width < 768) {
            aosOffset = 50;
            aosDuration = 900; // Mobile: Ditingkatkan agar transisi terlihat jelas
        } else if (width <= 1024) {
            aosOffset = 80;
            aosDuration = 900; // Tablet: Seimbang antara responsif dan estetika
        }

        if (typeof AOS !== 'undefined') {
            AOS.init({
                duration: aosDuration,
                once: true,
                offset: aosOffset,
                easing: 'ease-in-out',
                mirror: false
            });
        }
    };

    // Jalankan inisialisasi AOS saat idle atau saat cover dibuka agar zero layout thrashing
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => initAOS(), { timeout: 2500 });
    } else {
        setTimeout(initAOS, 1000);
    }

    // Jalankan sinkronisasi waktu server secara asinkron di background tanpa menghalangi render
    syncTimeWithServer().then(() => {
        if (typeof updateCountdown === 'function') {
            updateCountdown();
        }
    });

    /* ==========================================================================
       05. TATA LETAK COVER, PARTIKEL EMAS & KONTROLER MUSIK
       ========================================================================== */

    // --- Logika Sinkronisasi Layout Cover saat Rotasi Layar ---
    let lastWidth = window.innerWidth; // Melacak lebar untuk membedakan rotasi vs resize bar browser mobile

    const handleOrientationChange = () => {
        if (!cover) return;

        const currentWidth = window.innerWidth;
        const isOpened = cover.classList.contains('opened');

        // Deteksi apakah ini perubahan orientasi nyata (lebar berubah) 
        // atau sekadar UI browser (address bar) yang muncul/hilang (lebar tetap).
        const isRotation = currentWidth !== lastWidth;

        // Jika sudah dibuka dan bukan rotasi, jangan update tinggi untuk cegah jumping saat scroll
        if (isOpened && !isRotation) return;

        // Kunci tinggi hanya jika cover telah dibuka
        if (isOpened) {
            cover.style.height = `${window.innerHeight}px`;
        }

        // Pengondisian orientasi: Gunakan matchMedia agar zero-reflow
        if (window.matchMedia('(orientation: landscape)').matches) {
            cover.classList.add('is-landscape');
        } else {
            cover.classList.remove('is-landscape');
        }

        adjustGuestNameSize();

        // Jika terjadi rotasi (lebar berubah), perbarui pengaturan AOS sesuai breakpoint baru
        if (isRotation) {
            initAOS();
        }

        // Hanya paksa scroll ke atas jika cover belum dibuka
        if (!isOpened) {
            window.scrollTo(0, 0);
        }

        lastWidth = currentWidth;
    };

    handleOrientationChange(); // Jalankan sekali saat inisialisasi
    window.addEventListener('orientationchange', handleOrientationChange);

    // Gunakan sedikit delay (debounce) untuk resize agar tidak berat
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(handleOrientationChange, 250);
    });

    if (btnOpen && cover && music) {
        btnOpen.addEventListener('click', () => {
            // Putar Musik
            music.play().catch(error => console.log("Musik tertunda oleh kebijakan browser:", error));

            // Konfigurasi Media Session
            if ('mediaSession' in navigator) {
                try {
                    const cfgCouple = (typeof WEDDING_CONFIG !== 'undefined' && WEDDING_CONFIG.couple) ? WEDDING_CONFIG.couple : {};
                    const coverArt = cfgCouple.mediaSessionCover || cfgCouple.coverImage1 || '';

                    const sessionMetadata = {
                        title: 'Undangan Pawiwahan',
                        artist: cfgCouple.shortName || 'Undangan Pernikahan',
                        album: 'Wedding Invitation'
                    };

                    if (coverArt) {
                        let resolvedArtUrl = coverArt;
                        try {
                            resolvedArtUrl = new URL(coverArt, window.location.href).href;
                        } catch (e) {
                            resolvedArtUrl = coverArt;
                        }
                        sessionMetadata.artwork = [
                            { src: resolvedArtUrl, sizes: '512x512', type: 'image/webp' }
                        ];
                    }

                    navigator.mediaSession.metadata = new MediaMetadata(sessionMetadata);

                    // Sinkronisasi kontrol play/pause dari Media Session (Notifikasi HP)
                    navigator.mediaSession.setActionHandler('play', () => {
                        music.play().catch(err => console.log("MediaSession play note:", err));
                    });
                    navigator.mediaSession.setActionHandler('pause', () => music.pause());
                } catch (mediaErr) {
                    console.log("MediaSession setup note:", mediaErr);
                }
            }

            // Tampilkan tombol kontrol musik setelah undangan dibuka
            if (musicControl) {
                musicControl.classList.add('visible');
            }

            // Mulai membuat partikel emas saat tombol diklik
            if (particlesContainer && particlesContainer.innerHTML === "") {
                const particleCount = 40; // Sedikit dikurangi agar lebih ringan di mobile
                const fragment = document.createDocumentFragment(); // Gunakan fragment agar hanya 1x manipulasi DOM
                for (let i = 0; i < particleCount; i++) {
                    const particle = document.createElement('div');
                    particle.className = 'particle';

                    const size = Math.random() * 4 + 2 + 'px';
                    const left = Math.random() * 100 + '%';
                    const duration = Math.random() * 8 + 8 + 's';
                    const delay = (Math.random() * 8) + 's';

                    particle.style.width = size;
                    particle.style.height = size;
                    particle.style.left = left;
                    particle.style.animation = `fall ${duration} linear infinite`;
                    particle.style.animationDelay = delay;

                    fragment.appendChild(particle);
                }
                particlesContainer.appendChild(fragment);
            }

            // Kunci tinggi cover dalam pixel agar tidak berubah saat address bar mobile mengecil
            const currentHeight = cover.offsetHeight;
            cover.style.height = currentHeight + 'px';

            // Tandai cover sebagai terbuka
            cover.classList.add('opened');

            // Izinkan Scroll pada Halaman Utama (setelah cover disembunyikan)
            document.documentElement.classList.add('allow-scroll');
            document.body.classList.add('allow-scroll');

            setTimeout(() => {
                // Refresh AOS setelah container benar-benar terbuka/berubah layout (jika library tersedia)
                if (typeof AOS !== 'undefined' && typeof AOS.refresh === 'function') {
                    AOS.refresh();
                }

                const nextSection = document.getElementById('main-content');
                if (nextSection) {
                    nextSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }, 600); // Tambah delay agar transisi cover selesai lebih dulu sebelum refresh AOS & scroll
        });
    }

    // --- Logika Sinkronisasi State Musik & Tombol ---
    if (music && musicControl && musicIcon) {
        music.addEventListener('play', () => {
            musicIcon.className = 'bi bi-volume-up-fill';
            musicControl.classList.add('playing');
            showMusicStatus('Music On');
        });
        music.addEventListener('pause', () => {
            musicIcon.className = 'bi bi-volume-mute-fill';
            musicControl.classList.remove('playing');
            showMusicStatus('Music Off');
        });

        musicControl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (music.paused) {
                music.play().catch(err => console.log("Audio playback note:", err));
            } else {
                music.pause();
            }
        });
    }

    /* ==========================================================================
       06. PENGHITUNG WAKTU MUNDUR ACARA & SINKRONISASI REAL-TIME
       ========================================================================== */

    // --- Logika Countdown (Berdasarkan events.countdown { date, time, timezone } di config.js) ---
    const getCountdownTargetDate = () => {
        const eventsConfig = (typeof WEDDING_CONFIG !== 'undefined') ? WEDDING_CONFIG.events : null;
        if (!eventsConfig || !eventsConfig.countdown || typeof eventsConfig.countdown !== 'object') return 0;

        const cd = eventsConfig.countdown;
        const dateStr = (cd.date || '').trim();
        if (!dateStr) return 0;

        const timeMatch = (cd.time || '08:00').match(/(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?/);
        const timeStr = timeMatch
            ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}:${timeMatch[3] || '00'}`
            : '08:00:00';

        let tzOffset = '+08:00'; // Default WITA (Bali)
        const tzUpper = String(cd.timezone || '').trim().toUpperCase();
        if (tzUpper === 'WIB') tzOffset = '+07:00';
        else if (tzUpper === 'WITA') tzOffset = '+08:00';
        else if (tzUpper === 'WIT') tzOffset = '+09:00';
        else if (tzUpper.startsWith('+') || tzUpper.startsWith('-')) tzOffset = tzUpper;

        // Normalisasi tanggal agar selalu valid di Safari/WebKit (mendukung YYYY-MM-DD maupun DD-MM-YYYY)
        const dateParts = dateStr.split(/[-/]/);
        let normalizedDate = dateStr;
        if (dateParts.length === 3) {
            let year, month, day;
            if (dateParts[0].length === 4) {
                // Format Standar ISO: YYYY-MM-DD atau YYYY/MM/DD
                year = dateParts[0];
                month = dateParts[1].padStart(2, '0');
                day = dateParts[2].padStart(2, '0');
            } else if (dateParts[2].length === 4) {
                // Format Umum Indonesia: DD-MM-YYYY atau DD/MM/YYYY
                year = dateParts[2];
                month = dateParts[1].padStart(2, '0');
                day = dateParts[0].padStart(2, '0');
            } else {
                year = dateParts[0].padStart(4, '0');
                month = dateParts[1].padStart(2, '0');
                day = dateParts[2].padStart(2, '0');
            }
            normalizedDate = `${year}-${month}-${day}`;
        }

        const isoString = `${normalizedDate}T${timeStr}${tzOffset}`;
        const parsed = new Date(isoString).getTime();
        return !isNaN(parsed) ? parsed : 0;
    };
    const targetDate = getCountdownTargetDate();
    const daysEl = document.getElementById("days");
    const hoursEl = document.getElementById("hours");
    const minsEl = document.getElementById("minutes");
    const secsEl = document.getElementById("seconds");
    let countdownInterval;

    function updateCountdown() {
        if (!targetDate) {
            if (countdownInterval) clearInterval(countdownInterval);
            if (daysEl) daysEl.innerText = "00";
            if (hoursEl) hoursEl.innerText = "00";
            if (minsEl) minsEl.innerText = "00";
            if (secsEl) secsEl.innerText = "00";
            return;
        }

        // Gunakan waktu lokal yang sudah dikoreksi dengan offset server
        const correctedNow = Date.now() + serverTimeOffset;
        const distance = targetDate - correctedNow;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        if (distance < 0) {
            if (countdownInterval) clearInterval(countdownInterval);
            if (daysEl) daysEl.innerText = "00";
            if (hoursEl) hoursEl.innerText = "00";
            if (minsEl) minsEl.innerText = "00";
            if (secsEl) secsEl.innerText = "00";
        } else {
            if (daysEl) daysEl.innerText = days.toString().padStart(2, '0');
            if (hoursEl) hoursEl.innerText = hours.toString().padStart(2, '0');
            if (minsEl) minsEl.innerText = minutes.toString().padStart(2, '0');
            if (secsEl) secsEl.innerText = seconds.toString().padStart(2, '0');
        }
    }

    // Jalankan sekali di awal agar tidak ada jeda 1 detik saat halaman dimuat
    updateCountdown();

    // Jalankan interval setiap detik
    countdownInterval = setInterval(updateCountdown, 1000);

    // Sinkronisasi ulang otomatis saat user kembali ke tab undangan (hanya jika acara belum berakhir)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && targetDate && (targetDate - (Date.now() + serverTimeOffset)) > 0) {
            syncTimeWithServer().then(() => updateCountdown());
        }
    });

    /* ==========================================================================
       07. LIGHTBOX GALERI FOTO (PINCH, ZOOM, PAN, SWIPE & AUTO-RETRY)
       ========================================================================== */

    // --- Logika Lightbox Galeri ---
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('btn-close');
    const lightboxLoader = document.getElementById('lightbox-loader');
    const btnDownload = document.getElementById('btn-download');
    const btnZoom = document.getElementById('btn-zoom');
    const btnFullscreen = document.getElementById('btn-fullscreen');

    // --- Logika Auto-Retry Loading Gambar ---
    // Fungsi ini akan mencoba memuat ulang gambar jika terjadi kesalahan jaringan atau gagal muat
    const initImageRetry = (img) => {
        if (!img) return;

        let retries = 0;
        const maxRetries = 10; // Jumlah maksimal percobaan ulang (10 kali)

        img._resetRetry = () => {
            if (img._retryTimer) {
                clearTimeout(img._retryTimer);
                img._retryTimer = null;
            }
            retries = 0;
        };

        img.addEventListener('error', function handleError() {
            if (!this.src || this.src === window.location.href || this.src.startsWith('data:')) return;

            // Mendapatkan URL asli tanpa parameter retry/timestamp sebelumnya
            const currentSrc = this.src.split(/[?&]retry=/)[0].split(/[?&]t=/)[0];
            if (!currentSrc || currentSrc === window.location.href) return;

            if (this._retryTimer) {
                clearTimeout(this._retryTimer);
                this._retryTimer = null;
            }

            if (retries < maxRetries) {
                retries++;
                console.warn(`[Retry] Gagal memuat: ${currentSrc}. Mencoba lagi (${retries}/${maxRetries})...`);

                this._retryTimer = setTimeout(() => {
                    this._retryTimer = null;
                    const separator = currentSrc.includes('?') ? '&' : '?';
                    // Tambahkan query parameter unik untuk memaksa browser mengambil data baru dari server (bypass cache)
                    this.src = `${currentSrc}${separator}retry=${retries}&t=${Date.now()}`;
                }, 2000); // Jeda 2 detik antar percobaan agar tidak membebani koneksi
            }
        });

        img.addEventListener('load', () => {
            if (img._retryTimer) {
                clearTimeout(img._retryTimer);
                img._retryTimer = null;
            }
            if (retries > 0) console.log(`[Retry] Berhasil memuat gambar setelah ${retries} percobaan.`);
            retries = 0; // Reset counter jika gambar akhirnya berhasil dimuat
            const mempelaiWrapper = img.closest('.mempelai-img-wrapper');
            if (mempelaiWrapper) {
                mempelaiWrapper.classList.remove('skeleton');
                img.classList.add('loaded');
            }
            const galleryItem = img.closest('.gallery-item');
            if (galleryItem) {
                galleryItem.classList.remove('skeleton');
                img.classList.add('loaded');
            }
        });
    };

    // Terapkan mekanisme retry ke semua gambar yang ada di HTML serta gambar Lightbox
    document.querySelectorAll('img[src]:not([src=""])').forEach(initImageRetry);
    if (lightboxImg) initImageRetry(lightboxImg);

    // Ambil semua elemen gambar galeri yang ada di HTML
    const allGalleryImages = Array.from(document.querySelectorAll('.gallery-item img'));

    // Inisialisasi status loading skeleton untuk galeri foto (fallback cache/native loading)
    allGalleryImages.forEach(img => {
        const item = img.closest('.gallery-item');
        if (!item) return;

        const onImageDone = () => {
            img.classList.add('loaded');
            item.classList.remove('skeleton');
        };

        if (img.complete && img.naturalWidth > 0) {
            onImageDone();
        } else {
            img.addEventListener('load', onImageDone, { once: true });
            img.addEventListener('error', onImageDone, { once: true });
        }
    });

    let isZoomed = false;
    let currentScale = 1;
    let initialPinchDistance = 0;
    let initialScale = 1;
    let startX = 0, startY = 0;
    let translateX = 0, translateY = 0;
    let isDragging = false;
    let galleryImages = [];
    let isTicking = false;
    let lastTap = 0;
    let lightboxTransitionTimer = null;
    let wasPinching = false;
    let wheelTransitionTimer = null;

    const clearLightboxTransitionClasses = () => {
        if (!lightboxImg) return;
        lightboxImg.classList.remove('changing', 'slide-next-out', 'slide-next-in', 'slide-prev-out', 'slide-prev-in');
    };

    // Helper untuk menghitung jarak antara dua sentuhan (untuk pinch zoom)
    const getDistance = (touches) => {
        if (!touches || touches.length < 2) return 0;
        return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    };

    const updateTransform = () => {
        if (lightboxImg) {
            if (isZoomed) {
                lightboxImg.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${currentScale})`;
            } else {
                lightboxImg.style.transform = '';
            }
        }
        isTicking = false;
    };

    // Fungsi untuk menyaring ulang gambar berdasarkan visibilitas CSS saat ini (zero-reflow)
    const refreshVisibleImages = () => {
        galleryImages = allGalleryImages.filter(img => {
            const parent = img.closest('.gallery-item');
            return parent && parent.offsetParent !== null;
        });
    };

    const lightboxCounter = document.getElementById('lightbox-counter');
    const btnPrev = document.getElementById('lightbox-prev');
    const btnNext = document.getElementById('lightbox-next');
    let currentIndex = 0;

    const resetZoom = () => {
        isZoomed = false;
        currentScale = 1;
        translateX = 0;
        translateY = 0;
        isDragging = false;
        if (wheelTransitionTimer) {
            clearTimeout(wheelTransitionTimer);
            wheelTransitionTimer = null;
        }
        if (lightboxImg) {
            lightboxImg.classList.remove('zoomed');
            lightboxImg.style.transition = '';
            lightboxImg.style.transform = '';
            lightboxImg.style.cursor = 'pointer';
        }
        if (btnZoom) {
            btnZoom.innerHTML = '<i class="bi bi-zoom-in"></i>'; // Kaca pembesar dengan plus
            btnZoom.title = "Zoom Foto";
        }
    };

    const updateLightboxImage = (index, direction = null) => {
        resetZoom();
        if (lightboxTransitionTimer) {
            clearTimeout(lightboxTransitionTimer);
            lightboxTransitionTimer = null;
        }
        if (lightboxImg && typeof lightboxImg._resetRetry === 'function') {
            lightboxImg._resetRetry();
        }
        if (!galleryImages || galleryImages.length === 0 || !lightboxImg) return;

        // Hitung dan perbarui currentIndex segera agar klik cepat beruntun tidak terlewat
        let normalizedIndex = index;
        if (normalizedIndex < 0) normalizedIndex = galleryImages.length - 1;
        if (normalizedIndex >= galleryImages.length) normalizedIndex = 0;
        currentIndex = normalizedIndex;

        const isNext = direction === 'next';
        const isPrev = direction === 'prev';

        // Bersihkan semua kelas transisi sebelumnya agar tidak terjadi stuck opacity: 0 saat arah berubah cepat
        clearLightboxTransitionClasses();

        // Pilih kelas transisi berdasarkan arah (slide atau fade default)
        const outClass = isNext ? 'slide-next-out' : (isPrev ? 'slide-prev-out' : 'changing');
        const inClass = isNext ? 'slide-next-in' : (isPrev ? 'slide-prev-in' : null);

        lightboxImg.classList.add(outClass);
        if (lightboxLoader) {
            lightboxLoader.classList.add('show');
        }

        const targetIndex = currentIndex;
        lightboxTransitionTimer = setTimeout(() => {
            lightboxTransitionTimer = null;
            if (!lightbox || !lightbox.classList.contains('show')) return;
            if (!galleryImages || galleryImages.length === 0 || !galleryImages[targetIndex]) return;

            // Siapkan posisi gambar baru (masih transparan)
            if (isNext || isPrev) {
                lightboxImg.classList.remove(outClass);
                lightboxImg.classList.add(inClass);
                // Trigger reflow agar transition: none pada 'inClass' segera diterapkan
                void lightboxImg.offsetWidth;
            }

            if (lightboxCounter) {
                lightboxCounter.textContent = `${targetIndex + 1} / ${galleryImages.length}`;
            }

            const onImageLoaded = () => {
                lightboxImg.onload = null;
                lightboxImg.onerror = null;
                clearLightboxTransitionClasses();
                if (lightboxLoader) {
                    lightboxLoader.classList.remove('show');
                }
            };

            const onImageError = () => {
                lightboxImg.onload = null;
                lightboxImg.onerror = null;
                clearLightboxTransitionClasses();
                if (lightboxLoader) {
                    lightboxLoader.classList.remove('show');
                }
            };

            // Daftarkan listener sebelum mengubah src agar tidak terjadi race condition pada gambar ter-cache
            const nextSrc = galleryImages[targetIndex].src;
            const nextAlt = galleryImages[targetIndex].alt || 'Pratinjau Foto Galeri';
            const isSameSrc = lightboxImg.getAttribute('src') === nextSrc || lightboxImg.src === nextSrc;
            lightboxImg.onload = onImageLoaded;
            lightboxImg.onerror = onImageError;
            lightboxImg.src = nextSrc;
            lightboxImg.alt = nextAlt;

            // Jika gambar sudah selesai dimuat dari cache browser secara instan (atau gagal pada URL yang sama sebelumnya)
            if (lightboxImg.complete && lightboxImg.naturalWidth > 0) {
                onImageLoaded();
            } else if (isSameSrc && lightboxImg.complete && lightboxImg.naturalWidth === 0) {
                onImageError();
            }
        }, 300);
    };

    const toggleZoom = (mouseX = null, mouseY = null) => {
        isZoomed = !isZoomed;
        if (isZoomed) {
            // Ambil posisi gambar sebelum transformasi diterapkan
            const rect = lightboxImg.getBoundingClientRect();
            lightboxImg.classList.add('zoomed');
            currentScale = 2.5;

            if (mouseX !== null && mouseY !== null) {
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                // Hitung offset agar titik di bawah kursor tetap diam saat di-zoom
                translateX = (centerX - mouseX) * (currentScale - 1);
                translateY = (centerY - mouseY) * (currentScale - 1);
            } else {
                translateX = 0;
                translateY = 0;
            }

            lightboxImg.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${currentScale})`;
            if (btnZoom) {
                btnZoom.innerHTML = '<i class="bi bi-zoom-out"></i>'; // Ikon minus
            }
        } else {
            resetZoom();
        }
    };

    // --- Logika Zoom Menggunakan Roda Gulir Mouse (Scroll Wheel) ---
    const handleWheelZoom = (e) => {
        if (!lightbox || !lightbox.classList.contains('show') || !lightboxImg) return;

        // Cegah browser melakukan scrolling pada halaman latar belakang saat di dalam lightbox
        e.preventDefault();

        // Normalisasi delta mode jika browser menggunakan unit line atau page (misal mouse tertentu di Windows/Linux)
        let delta = e.deltaY;
        if (e.deltaMode === 1) delta *= 30; // DOM_DELTA_LINE
        else if (e.deltaMode === 2) delta *= 300; // DOM_DELTA_PAGE

        // Hitung faktor skala eksponensial (halus untuk roda putar mouse standar maupun trackpad kontinu)
        // delta < 0: putar ke depan (zoom in)
        // delta > 0: putar ke belakang (zoom out)
        const zoomFactor = Math.min(Math.max(Math.exp(-delta * 0.002), 0.6), 1.6);
        const oldScale = currentScale;
        let newScale = oldScale * zoomFactor;

        // Batasi rentang perbesaran antara 1.0x hingga 4.0x
        newScale = Math.min(Math.max(newScale, 1), 4);

        // Jika skala kembali ke batas normal atau diperkecil hingga <= 1.05x
        if (newScale <= 1.05) {
            lightboxImg.style.transition = 'transform 0.15s ease-out';
            resetZoom();
            return;
        }

        // Dapatkan batas koordinat gambar di layar saat ini
        const rect = lightboxImg.getBoundingClientRect();
        const cursorX = e.clientX;
        const cursorY = e.clientY;

        // Periksa apakah posisi kursor berada di dalam batas gambar
        const isCursorInside = (
            cursorX >= rect.left &&
            cursorX <= rect.right &&
            cursorY >= rect.top &&
            cursorY <= rect.bottom
        );

        // Titik pusat gambar di layar saat ini
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Jika kursor berada di dalam gambar, zoom terpusat pada kursor (focal point).
        // Jika kursor berada di luar gambar (pada backdrop gelap), zoom berpusat ke tengah gambar.
        const focalX = isCursorInside ? cursorX : centerX;
        const focalY = isCursorInside ? cursorY : centerY;

        const scaleRatio = newScale / oldScale;

        // Sesuaikan koordinat translasi agar titik di bawah kursor tidak bergeser
        translateX += (centerX - focalX) * (scaleRatio - 1);
        translateY += (centerY - focalY) * (scaleRatio - 1);
        currentScale = newScale;
        isZoomed = true;

        // Terapkan transisi dinamis cepat (0.08s) agar perputaran roda mouse terasa instan dan responsif
        lightboxImg.style.transition = 'transform 0.08s ease-out';
        if (wheelTransitionTimer) clearTimeout(wheelTransitionTimer);
        wheelTransitionTimer = setTimeout(() => {
            if (lightboxImg && !isDragging) {
                lightboxImg.style.transition = '';
            }
            wheelTransitionTimer = null;
        }, 150);

        lightboxImg.classList.add('zoomed');
        lightboxImg.style.cursor = 'grab';

        if (btnZoom) {
            btnZoom.innerHTML = '<i class="bi bi-zoom-out"></i>';
            btnZoom.title = "Perkecil Foto";
        }

        if (!isTicking) {
            requestAnimationFrame(updateTransform);
            isTicking = true;
        }
    };

    // Toggle Zoom Logic via Button
    if (btnZoom) {
        btnZoom.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleZoom();
        });
    }

    // Logika Tombol Layar Penuh (Fullscreen - Aman untuk iOS Safari / WebKit)
    if (btnFullscreen && lightbox) {
        const supportsFullscreen = Boolean(lightbox.requestFullscreen || lightbox.webkitRequestFullscreen);
        if (!supportsFullscreen) {
            btnFullscreen.style.display = 'none';
        } else {
            btnFullscreen.addEventListener('click', (e) => {
                e.stopPropagation();
                const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
                if (!fsEl) {
                    const reqFs = lightbox.requestFullscreen || lightbox.webkitRequestFullscreen;
                    if (typeof reqFs === 'function') {
                        try {
                            const result = reqFs.call(lightbox);
                            if (result && typeof result.catch === 'function') {
                                result.catch(err => console.error(`Gagal mengaktifkan mode layar penuh: ${err.message}`));
                            }
                        } catch (err) {
                            console.error(`Gagal mengaktifkan mode layar penuh: ${err.message}`);
                        }
                    }
                } else {
                    const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
                    if (typeof exitFs === 'function') {
                        try {
                            const result = exitFs.call(document);
                            if (result && typeof result.catch === 'function') {
                                result.catch(err => console.error(`Gagal keluar mode layar penuh: ${err.message}`));
                            }
                        } catch (err) {
                            console.error(`Gagal keluar mode layar penuh: ${err.message}`);
                        }
                    }
                }
            });

            // Pantau perubahan status fullscreen untuk memperbarui ikon
            const updateFullscreenIcon = () => {
                const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
                if (fsEl) {
                    btnFullscreen.innerHTML = '<i class="bi bi-fullscreen-exit"></i>';
                    btnFullscreen.title = "Keluar Layar Penuh";
                } else {
                    btnFullscreen.innerHTML = '<i class="bi bi-arrows-fullscreen"></i>';
                    btnFullscreen.title = "Layar Penuh";
                }
            };
            document.addEventListener('fullscreenchange', updateFullscreenIcon);
            document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
        }
    }

    if (lightboxImg) {
        // Double click on image to toggle zoom
        lightboxImg.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            toggleZoom(e.clientX, e.clientY);
        });

        // Panning Logic (Mouse)
        lightboxImg.addEventListener('mousedown', (e) => {
            if (!isZoomed) return;
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            lightboxImg.style.transition = 'none';
            lightboxImg.style.cursor = 'grabbing';
        });

        // Panning Logic (Touch for Mobile)
        lightboxImg.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                wasPinching = true;
                initialPinchDistance = getDistance(e.touches);
                initialScale = currentScale;
                isDragging = false;
                lightboxImg.style.transition = 'none';
                return;
            }

            const now = Date.now();
            const timesince = now - lastTap;
            if (timesince < 300 && timesince > 0) {
                // Double tap terdeteksi
                if (e.cancelable) e.preventDefault();
                toggleZoom(e.touches[0].clientX, e.touches[0].clientY);
                lastTap = 0; // Reset agar tidak terhitung triple tap
                return;
            }
            lastTap = now;

            if (!isZoomed || e.touches.length > 1) return;
            isDragging = true;
            startX = e.touches[0].clientX - translateX;
            startY = e.touches[0].clientY - translateY;
            lightboxImg.style.transition = 'none';
        }, { passive: false });

        lightboxImg.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && initialPinchDistance > 0) {
                e.preventDefault();
                const currentDistance = getDistance(e.touches);
                const scaleFactor = currentDistance / initialPinchDistance;

                // Batas zoom minimal 1x dan maksimal 4x
                currentScale = Math.min(Math.max(initialScale * scaleFactor, 1), 4);
                isZoomed = currentScale > 1.05;

                if (isZoomed) {
                    lightboxImg.classList.add('zoomed');
                    if (btnZoom) btnZoom.innerHTML = '<i class="bi bi-zoom-out"></i>';
                } else {
                    resetZoom();
                }

                if (!isTicking) {
                    requestAnimationFrame(updateTransform);
                    isTicking = true;
                }
                return;
            }

            if (!isDragging || !isZoomed || e.touches.length > 1) return;
            translateX = e.touches[0].clientX - startX;
            translateY = e.touches[0].clientY - startY;
            if (!isTicking) {
                requestAnimationFrame(updateTransform);
                isTicking = true;
            }
        }, { passive: false });

        lightboxImg.addEventListener('touchend', () => {
            isDragging = false;
            initialPinchDistance = 0;
            if (lightboxImg) lightboxImg.style.transition = '';
        });
    }

    window.addEventListener('mousemove', (e) => {
        if (!isDragging || !isZoomed) return;
        e.preventDefault();
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        if (!isTicking) {
            requestAnimationFrame(updateTransform);
            isTicking = true;
        }
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            if (lightboxImg) {
                lightboxImg.style.transition = '';
                if (isZoomed) lightboxImg.style.cursor = 'grab';
            }
        }
    });

    // Fungsi untuk mengunduh gambar dengan nama kustom
    const downloadImage = async (url, filename) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            // Tunda revocation agar browser (terutama Firefox & Safari/iOS) memiliki waktu membaca stream blob
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } catch (error) {
            // Fallback jika terjadi kendala CORS
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.target = "_blank";
            link.click();
        }
    };

    if (btnDownload) {
        btnDownload.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!galleryImages || !galleryImages[currentIndex]) return;
            const src = galleryImages[currentIndex].src;
            const rawExt = (src.split('.').pop() || '').split(/[#?]/)[0].toLowerCase();
            const extension = (rawExt.length >= 2 && rawExt.length <= 5 && /^[a-z0-9]+$/.test(rawExt)) ? rawExt : 'webp';
            downloadImage(src, `Momen_Bahagia_Ke${currentIndex + 1}.${extension}`);
        });
    }

    let lightboxResizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(lightboxResizeTimer);
        lightboxResizeTimer = setTimeout(() => {
            const prevCount = galleryImages.length;
            const activeImg = galleryImages[currentIndex] || null;
            refreshVisibleImages();
            if (lightbox && lightbox.classList.contains('show') && galleryImages.length > 0) {
                const newIdx = activeImg ? galleryImages.indexOf(activeImg) : -1;
                if (newIdx >= 0) {
                    currentIndex = newIdx;
                    if (lightboxCounter) {
                        lightboxCounter.textContent = `${currentIndex + 1} / ${galleryImages.length}`;
                    }
                } else if (prevCount !== galleryImages.length || currentIndex >= galleryImages.length) {
                    updateLightboxImage(Math.min(currentIndex, galleryImages.length - 1));
                }
            }
        }, 200);
    });

    // Pasang listener ke SEMUA gambar, tetapi tentukan index berdasarkan gambar yang sedang tampil
    allGalleryImages.forEach((img) => {
        img.addEventListener('click', () => {
            if (!lightbox) return;
            // Pastikan data gambar paling update sebelum membuka lightbox
            refreshVisibleImages();

            const foundIdx = galleryImages.indexOf(img);
            currentIndex = foundIdx >= 0 ? foundIdx : 0;
            lightbox.classList.add('show');
            updateLightboxImage(currentIndex);
            // Kunci scroll saat melihat foto
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        });
    });

    if (btnPrev) btnPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        updateLightboxImage(currentIndex - 1, 'prev');
    });

    if (btnNext) btnNext.addEventListener('click', (e) => {
        e.stopPropagation();
        updateLightboxImage(currentIndex + 1, 'next');
    });

    // --- Logika Swipe (Geser) untuk Mobile ---
    let touchstartX = 0;
    let touchstartY = 0;
    let touchendX = 0;
    let touchendY = 0;

    if (lightbox) {
        // Zoom interaktif dengan roda gulir mouse (scroll wheel)
        lightbox.addEventListener('wheel', handleWheelZoom, { passive: false });

        lightbox.addEventListener('touchstart', (e) => {
            if (e.touches.length >= 2) {
                wasPinching = true;
                return;
            }
            touchstartX = e.changedTouches[0].clientX;
            touchstartY = e.changedTouches[0].clientY;
        }, { passive: true });

        lightbox.addEventListener('touchend', (e) => {
            if (wasPinching) {
                if (e.touches.length === 0) wasPinching = false;
                return; // Cegah swipe tak sengaja setelah selesai pinch-zoom
            }
            if (isZoomed) return; // Mencegah pindah foto jika sedang dalam mode zoom (panning)

            touchendX = e.changedTouches[0].clientX;
            touchendY = e.changedTouches[0].clientY;

            const diffX = touchstartX - touchendX;
            const diffY = touchstartY - touchendY;
            const swipeThreshold = 50; // Jarak minimum geser dalam pixel

            // Memastikan geseran horizontal lebih dominan daripada vertikal agar tidak sensitif berlebihan
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
                if (diffX > 0) {
                    updateLightboxImage(currentIndex + 1, 'next'); // Geser ke kiri -> Foto Berikutnya
                } else {
                    updateLightboxImage(currentIndex - 1, 'prev'); // Geser ke kanan -> Foto Sebelumnya
                }
            }
        }, { passive: true });
    }

    // --- Logika Navigasi Keyboard & Modal Escape ---
    document.addEventListener('keydown', (e) => {
        if (lightbox && lightbox.classList.contains('show')) {
            if (e.key === 'ArrowRight') {
                updateLightboxImage(currentIndex + 1, 'next');
            } else if (e.key === 'ArrowLeft') {
                updateLightboxImage(currentIndex - 1, 'prev');
            } else if (e.key === 'Escape') {
                closeLightbox();
            }
        }
        if (e.key === 'Escape') {
            const confirmModal = document.getElementById('custom-confirm-modal');
            if (confirmModal && confirmModal.classList.contains('show') && !isDeleting) {
                confirmModal.classList.remove('show');
                docIdToDelete = null;
                parentIdForReply = null;
            }
            const authModal = document.getElementById('mempelai-auth-modal');
            if (authModal && authModal.classList.contains('show')) {
                authModal.classList.remove('show');
                const pwdInput = document.getElementById('mempelai-password-input');
                if (pwdInput) pwdInput.value = '';
            }
            updateModalScrollLock();
        }
    });

    const closeLightbox = () => {
        if (lightboxTransitionTimer) {
            clearTimeout(lightboxTransitionTimer);
            lightboxTransitionTimer = null;
        }
        wasPinching = false;
        resetZoom();
        clearLightboxTransitionClasses();
        if (lightboxLoader) {
            lightboxLoader.classList.remove('show');
        }
        if (lightboxImg && typeof lightboxImg._resetRetry === 'function') {
            lightboxImg._resetRetry();
        }
        // Keluar dari mode layar penuh jika sedang aktif saat lightbox ditutup
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        if (fsEl) {
            const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
            if (typeof exitFs === 'function') {
                try {
                    const result = exitFs.call(document);
                    if (result && typeof result.catch === 'function') {
                        result.catch(err => console.log("Gagal keluar fullscreen:", err));
                    }
                } catch (err) {
                    console.log("Gagal keluar fullscreen:", err);
                }
            }
        }

        if (lightbox) lightbox.classList.remove('show');
        // Kembalikan scroll jika cover sudah terbuka
        if (document.body.classList.contains('allow-scroll')) {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }
    };

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
    }

    /* ==========================================================================
       08. STATE FORMULIR HYBRID, KEYBOARD EMOJI & RICH TEXT FORMATTER
       ========================================================================== */

    // --- Logika Hybrid Form ---
    const hybridForm = document.getElementById('hybrid-form');
    const statusSelect = document.getElementById('att-status');
    const countGroup = document.getElementById('count-group');

    // Filter input nama agar hanya karakter yang valid untuk nama/gelar (huruf, angka, spasi, titik, koma, petik, ampersand, plus, tanda hubung, garis miring, kurung)
    const nameInput = document.getElementById('att-name');
    if (nameInput) {
        nameInput.addEventListener('input', function () {
            // Normalisasi otomatis tanda petik lengkung/smart punctuation khas iOS/Android/Mac ke karakter standar ASCII
            this.value = this.value
                .replace(/[‘’`]/g, "'")
                .replace(/[“”]/g, "'")
                .replace(/[–—]/g, '-')
                .replace(/[^a-zA-Z0-9\s.,'&\/()+\-]/g, '');
        });
    }

    // Counter karakter untuk ucapan
    const messageInput = document.getElementById('att-message');
    const charCounter = document.getElementById('char-counter');
    if (messageInput && charCounter) {
        messageInput.addEventListener('input', function () {
            const length = this.value.length;
            charCounter.textContent = `${length} / 500`;
            if (length >= 500) {
                charCounter.style.color = '#e74c3c'; // Merah
                charCounter.style.fontWeight = 'bold';
            } else {
                charCounter.style.color = '#999'; // Kembali ke warna asal
                charCounter.style.fontWeight = 'normal';
            }
        });
    }

    // Sembunyikan jumlah tamu jika memilih "Tidak Hadir"
    if (statusSelect && countGroup) {
        // Pastikan sinkron saat pertama kali dimuat (mencegah bug display awal)
        countGroup.style.display = statusSelect.value === 'Tidak Hadir' ? 'none' : 'block';

        statusSelect.addEventListener('change', (e) => {
            countGroup.style.display = e.target.value === 'Tidak Hadir' ? 'none' : 'block';
        });
    }

    // --- Logika Keyboard Emoji Picker Interaktif (Lazy Loaded on Interaction) ---
    const btnEmojiTrigger = document.getElementById('btn-emoji-trigger');
    const emojiDropdown = document.getElementById('emoji-picker-dropdown');
    const emojiPickerEl = emojiDropdown?.querySelector('emoji-picker');

    let isEmojiPickerLoaded = false;
    let emojiLoadPromise = null;
    const loadEmojiPickerElement = async () => {
        if (isEmojiPickerLoaded) return true;
        if (emojiLoadPromise) return emojiLoadPromise;

        emojiLoadPromise = (async () => {
            try {
                await import("https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js");
                isEmojiPickerLoaded = true;
                return true;
            } catch (e) {
                console.warn("Gagal memuat emoji picker modul:", e);
                return false;
            } finally {
                emojiLoadPromise = null;
            }
        })();

        return emojiLoadPromise;
    };

    const toggleEmojiPicker = async (show) => {
        if (!emojiDropdown) return;
        const isVisible = emojiDropdown.style.display !== 'none';
        const willShow = typeof show === 'boolean' ? show : !isVisible;

        if (willShow) {
            const loaded = await loadEmojiPickerElement();
            if (!loaded) {
                showToast("Pemilih emoji membutuhkan koneksi internet.", "error");
                return;
            }
            emojiDropdown.style.display = 'block';
            btnEmojiTrigger?.classList.add('active');
        } else {
            emojiDropdown.style.display = 'none';
            btnEmojiTrigger?.classList.remove('active');
        }
    };

    if (btnEmojiTrigger && emojiDropdown) {
        // Prefetch saat kursor hover atau textarea fokus
        btnEmojiTrigger.addEventListener('mouseenter', loadEmojiPickerElement, { once: true });
        if (messageInput) {
            messageInput.addEventListener('focus', loadEmojiPickerElement, { once: true });
        }

        btnEmojiTrigger.addEventListener('click', async (e) => {
            e.stopPropagation();
            await toggleEmojiPicker();
        });

        // Mencegah klik di dalam dropdown menutup dirinya sendiri
        emojiDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Menangani pemilihan emoji dari picker
        if (emojiPickerEl) {
            emojiPickerEl.addEventListener('emoji-click', (event) => {
                const emoji = event.detail?.unicode;
                if (!emoji || !messageInput) return;

                const startPos = messageInput.selectionStart ?? messageInput.value.length;
                const endPos = messageInput.selectionEnd ?? messageInput.value.length;
                const currentVal = messageInput.value;

                // Hitung estimasi panjang setelah disisipkan
                const newLength = currentVal.length + emoji.length - (endPos - startPos);
                if (newLength > 500) {
                    showToast('Batas maksimal 500 karakter telah tercapai.', 'error');
                    return;
                }

                // Sisipkan emoji tepat pada posisi kursor pengguna
                messageInput.value = currentVal.substring(0, startPos) + emoji + currentVal.substring(endPos);
                const nextCursorPos = startPos + emoji.length;
                messageInput.focus();
                messageInput.setSelectionRange(nextCursorPos, nextCursorPos);

                // Picu event input agar counter karakter terupdate otomatis
                messageInput.dispatchEvent(new Event('input', { bubbles: true }));
            });
        }

        // Tutup emoji picker jika mengklik di luar area
        document.addEventListener('click', (e) => {
            if (emojiDropdown.style.display !== 'none' && !emojiDropdown.contains(e.target) && e.target !== btnEmojiTrigger && !btnEmojiTrigger.contains(e.target)) {
                toggleEmojiPicker(false);
            }
        });

        // Tutup emoji picker saat tombol Escape ditekan
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && emojiDropdown.style.display !== 'none') {
                toggleEmojiPicker(false);
            }
        });
    }

    // --- Helper Universal WhatsApp-Style Emoji Renderer ---
    function applyTwemoji(el) {
        if (typeof twemoji !== 'undefined' && el) {
            try {
                twemoji.parse(el, {
                    folder: 'svg',
                    ext: '.svg',
                    base: 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/'
                });
            } catch (e) {
                console.warn('Twemoji parse note:', e);
            }
        }
    }

    // --- Helper WhatsApp & Markdown Rich Text Formatter (100% XSS-Safe) ---
    function formatRichText(rawStr) {
        if (!rawStr) return '';
        // 1. Sanitasi ketat terhadap XSS & bersihkan null byte agar placeholder aman
        let safe = escapeHTML(rawStr).replace(/\u0000/g, '');

        // 2. Isolasi Code blocks (```code```) dan inline code (`code`) ke placeholder sementara
        // agar simbol _ * ~ > - di dalam blok kode tidak ikut terkonversi menjadi format teks
        const codePlaceholders = [];
        safe = safe.replace(/```([\s\S]+?)```/g, (_, code) => {
            const idx = codePlaceholders.length;
            codePlaceholders.push(`<code class="gb-code-block">${code}</code>`);
            return `\u0000CODEBLOCK${idx}\u0000`;
        });
        safe = safe.replace(/`([^`\n]+?)`/g, (_, code) => {
            const idx = codePlaceholders.length;
            codePlaceholders.push(`<code class="gb-inline-code">${code}</code>`);
            return `\u0000CODEINLINE${idx}\u0000`;
        });

        // 3. Spoiler / Pesan Rahasia (||spoiler||) - Sentuh/klik untuk membuka
        safe = safe.replace(/\|\|([^|\n]+?)\|\|/g, '<span class="gb-spoiler" title="Klik untuk membuka pesan rahasia">$1</span>');

        // 4. Highlight / Penanda Teks (==highlight==)
        safe = safe.replace(/==([^=\n]+?)==/g, '<mark class="gb-highlight">$1</mark>');

        // 5. Kombinasi 3 tingkat: Bold + Italic + Strikethrough (*_~text~_*, dsb.)
        safe = safe.replace(/\*\_~([^\*\_~\n]+?)~\_\*/g, '<strong><em><del>$1</del></em></strong>');
        safe = safe.replace(/~\_\*([^\*\_~\n]+?)\*\_~/g, '<strong><em><del>$1</del></em></strong>');
        safe = safe.replace(/\*~\_([^\*\_~\n]+?)\_~\*/g, '<strong><em><del>$1</del></em></strong>');

        // 6. Kombinasi 2 tingkat:
        // Bold + Italic: ***text***, **_text_**, *_text_*, _*text*_
        safe = safe.replace(/\*\*\*([^\*\n]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        safe = safe.replace(/\*\*\_([^\*\_\n]+?)\_\*\*/g, '<strong><em>$1</em></strong>');
        safe = safe.replace(/(^|[\s(>])\*_([^\*_\s\n][^\*_\n]*?[^\*_\s\n]|\S)_\*(?=[\s.,!?;:<)]|$)/g, '$1<strong><em>$2</em></strong>');
        safe = safe.replace(/(^|[\s(>])_\*([^\*_\s\n][^\*_\n]*?[^\*_\s\n]|\S)\*_(?=[\s.,!?;:<)]|$)/g, '$1<strong><em>$2</em></strong>');

        // Bold + Strikethrough: *~text~*, ~*text*~, **~text~**, ~**text**~
        safe = safe.replace(/\*\*~([^~*\n]+?)~\*\*/g, '<strong><del>$1</del></strong>');
        safe = safe.replace(/~\*\*([^~*\n]+?)\*\*~/g, '<strong><del>$1</del></strong>');
        safe = safe.replace(/(^|[\s(>])\*~([^~*\s\n][^~*\n]*?[^~*\s\n]|\S)~\*(?=[\s.,!?;:<)]|$)/g, '$1<strong><del>$2</del></strong>');
        safe = safe.replace(/(^|[\s(>])~\*([^~*\s\n][^~*\n]*?[^~*\s\n]|\S)\*~(?=[\s.,!?;:<)]|$)/g, '$1<strong><del>$2</del></strong>');

        // Italic + Strikethrough: _~text~_, ~_text_~
        safe = safe.replace(/(^|[\s(>])_~([^~_\s\n][^~_\n]*?[^~_\s\n]|\S)~_(?=[\s.,!?;:<)]|$)/g, '$1<em><del>$2</del></em>');
        safe = safe.replace(/(^|[\s(>])~_([^~_\s\n][^~_\n]*?[^~_\s\n]|\S)_~(?=[\s.,!?;:<)]|$)/g, '$1<em><del>$2</del></em>');

        // 7. Format Tunggal:
        // Bold: **text** (Markdown) & *text* (WhatsApp)
        safe = safe.replace(/\*\*([^\*\n]+?)\*\*/g, '<strong>$1</strong>');
        safe = safe.replace(/(^|[\s(>])\*([^\*\s\n][^\*\n]*?[^\*\s\n]|\S)\*(?=[\s.,!?;:<)]|$)/g, '$1<strong>$2</strong>');

        // Italic: _text_
        safe = safe.replace(/(^|[\s(>])_([^_\s\n][^_\n]*?[^_\s\n]|\S)_(?=[\s.,!?;:<)]|$)/g, '$1<em>$2</em>');

        // Strikethrough: ~~text~~ (Markdown) & ~text~ (WhatsApp)
        safe = safe.replace(/~~([^~\n]+?)~~/g, '<del>$1</del>');
        safe = safe.replace(/(^|[\s(>])~([^~\s\n][^~\n]*?[^~\s\n]|\S)~(?=[\s.,!?;:<)]|$)/g, '$1<del>$2</del>');

        // 8. Line-by-line block formatting (Quote: > text, Bulleted list: - text, Numbered list: 1. text)
        const lines = safe.split('\n');
        const formattedLines = lines.map(line => {
            const trimmed = line.trimStart();
            // Blockquote ala WhatsApp: > quote
            if (trimmed.startsWith('&gt; ') || trimmed.startsWith('&gt;')) {
                const quoteContent = trimmed.replace(/^&gt;\s?/, '');
                return `<blockquote class="gb-quote">${quoteContent}</blockquote>`;
            }
            // Bulleted list ala WhatsApp: - item atau • item
            if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
                const itemContent = trimmed.replace(/^[-•]\s+/, '');
                return `<span class="gb-list-item"><span class="gb-bullet">•</span><span>${itemContent}</span></span>`;
            }
            // Numbered list ala WhatsApp: 1. item, 2. item, dst.
            const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
            if (numMatch) {
                return `<span class="gb-list-item"><span class="gb-num">${numMatch[1]}.</span><span>${numMatch[2]}</span></span>`;
            }
            return line;
        });

        // 9. Kembalikan seluruh blok kode & inline code secara utuh
        let result = formattedLines.join('\n');
        if (codePlaceholders.length > 0) {
            result = result.replace(/\u0000CODE(?:BLOCK|INLINE)(\d+)\u0000/g, (_, idx) => codePlaceholders[Number(idx)] || '');
        }
        return result;
    }

    // --- Helper Aman Parsing LocalStorage (Anti Crash jika Storage Rusak/Dimanipulasi) ---
    function getSafeLocalStorageArray(key) {
        try {
            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    // --- Fungsi Toast Notification ---
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill';
        toast.innerHTML = `<i class="bi bi-${icon}" style="margin-right: 12px; font-size: 1.2rem; color: ${type === 'success' ? '#28a745' : '#dc3545'}"></i> ${escapeHTML(message)}`;

        container.appendChild(toast);

        // Hapus toast setelah 4 detik
        setTimeout(() => {
            toast.style.animation = 'toastFadeOut 0.5s ease forwards';
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    }

    /* ==========================================================================
       09. PENGIRIMAN DATA RSVP & SISTEM ANTI-SPAM
       ========================================================================== */

    let isFormSubmitting = false;

    if (hybridForm) {
        hybridForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isFormSubmitting) return;

            // 0. Anti-Bot Honeypot Trap Detection
            const honeypotVal = (document.getElementById('att-honeypot')?.value || '').trim();
            if (honeypotVal !== '') {
                console.warn("Security Alert: Automated bot submission intercepted and dropped.");
                showToast('Doa & ucapan hangat Anda berhasil terkirim.');
                hybridForm.reset();
                return;
            }

            const submitBtn = hybridForm.querySelector('button[type="submit"]');

            // 1. Validasi Input Ketat (Selaras dengan Firestore Rules & Normalisasi Smart Punctuation)
            const rawName = (document.getElementById('att-name')?.value || '')
                .replace(/[‘’`]/g, "'")
                .replace(/[“”]/g, "'")
                .replace(/[–—]/g, '-')
                .trim();
            const rawMessage = (document.getElementById('att-message')?.value || '').trim();
            const validNameRegex = /^[a-zA-Z0-9 .,'’&\/()+\-]{2,50}$/;

            if (rawName.length < 2 || rawName.length > 50 || !validNameRegex.test(rawName)) {
                showToast('Mohon masukkan nama yang valid (2–50 karakter).', 'error');
                return;
            }

            if (rawMessage.length < 1 || rawMessage.length > 500) {
                showToast('Mohon tuliskan ucapan doa restu antara 1 hingga 500 karakter.', 'error');
                return;
            }

            // 2. Pencegahan Spam & Rate Limiting (Jeda 15 detik untuk Tamu)
            if (!isMempelai) {
                let lastSub = null;
                try {
                    lastSub = localStorage.getItem('last_gb_submission');
                } catch (e) {}
                const now = Date.now();
                const COOLDOWN_MS = 15000;
                if (lastSub && (now - Number(lastSub)) < COOLDOWN_MS) {
                    const remainingSec = Math.ceil((COOLDOWN_MS - (now - Number(lastSub))) / 1000);
                    showToast(`Mohon tunggu ${remainingSec} detik sebelum mengirimkan ucapan berikutnya.`, 'error');
                    return;
                }
            }

            isFormSubmitting = true;
            if (submitBtn) {
                submitBtn.disabled = true;
            }

            try {
                await ensureFirebase();
                if (!db || !doc || !collection || !setDoc) {
                    throw new Error("Layanan buku tamu belum terkonfigurasi.");
                }

                if (replyingToId) {
                    // PROSES BALASAN (Sub-collection)
                    const docRef = doc(db, "messages", replyingToId);
                    const repliesRef = collection(db, "messages", replyingToId, "replies");
                    const newReplyRef = doc(repliesRef);
                    const isSubReply = Boolean(replyingToIsSubReply);
                    const targetName = (replyingToTargetName || (document.getElementById('replying-to-name')?.innerText || ''))
                        .replace(/^@/, '')
                        .replace(/[‘’`]/g, "'")
                        .replace(/[“”]/g, "'")
                        .replace(/[–—]/g, '-')
                        .trim() || 'Tamu';
                    const sanitizedTargetName = isSubReply
                        ? (targetName.substring(0, 50).replace(/[^a-zA-Z0-9 .,'’&\/()+\-]/g, '').trim() || 'Tamu')
                        : '';

                    const replyData = {
                        name: rawName,
                        message: rawMessage,
                        replyTo: sanitizedTargetName,
                        isMempelaiReply: Boolean(isMempelai),
                        timestamp: serverTimestamp(),
                        likes: 0
                    };

                    // Otorisasi via private zero-leak sink jika dalam mode mempelai
                    if (isMempelai) {
                        const adminSecretHash = await getAdminToken();
                        if (adminSecretHash) {
                            await setDoc(doc(db, "admin_actions", `${newReplyRef.id}_reply`), {
                                secret: adminSecretHash,
                                timestamp: serverTimestamp()
                            });
                        }
                    }

                    try {
                        await setDoc(newReplyRef, replyData);
                    } finally {
                        // Pastikan tiket otorisasi balasan segera dibersihkan
                        if (isMempelai) {
                            deleteDoc(doc(db, "admin_actions", `${newReplyRef.id}_reply`)).catch(() => { });
                        }
                    }

                    // Update counter jumlah balasan di dokumen utama
                    await updateDoc(docRef, {
                        replyCount: increment(1)
                    });

                    showToast('Balasan ucapan berhasil dikirimkan.');

                    // Reset Mode Balas
                    replyingToId = null;
                    replyingToTargetName = '';
                    replyingToIsSubReply = false;
                    const replyModeEl = document.getElementById('reply-mode-indicator');
                    if (replyModeEl) replyModeEl.style.display = 'none';
                } else {
                    // PROSES UCAPAN BARU
                    const newDocRef = doc(collection(db, "messages"));
                    const rawStatus = document.getElementById('att-status')?.value || 'Hadir';
                    const isAttending = rawStatus === 'Hadir';
                    const parsedCount = parseInt(document.getElementById('att-count')?.value || '1', 10) || 1;
                    const guestCount = isAttending ? Math.min(10, Math.max(1, parsedCount)) : 0;

                    const messageData = {
                        name: rawName,
                        status: isAttending ? 'Hadir' : 'Tidak Hadir',
                        count: guestCount,
                        message: rawMessage,
                        timestamp: serverTimestamp(),
                        likes: 0,
                        replyCount: 0,
                        isMempelai: Boolean(isMempelai)
                    };

                    // Optimistic counter update di UI (Instan 0ms)
                    const currentCount = parseInt(document.getElementById('message-counter')?.innerText || '0', 10) || 0;
                    updateTotalCount(currentCount + 1);

                    // Otorisasi via private zero-leak sink jika dalam mode mempelai
                    if (isMempelai) {
                        const adminSecretHash = await getAdminToken();
                        if (adminSecretHash) {
                            await setDoc(doc(db, "admin_actions", `${newDocRef.id}_create`), {
                                secret: adminSecretHash,
                                timestamp: serverTimestamp()
                            });
                        }
                    }

                    try {
                        await setDoc(newDocRef, messageData);
                    } finally {
                        // Pastikan tiket otorisasi pesan segera dibersihkan
                        if (isMempelai) {
                            deleteDoc(doc(db, "admin_actions", `${newDocRef.id}_create`)).catch(() => { });
                        }
                    }

                    // Sinkronisasi ulang total hitungan pasti dari server setelah setDoc selesai
                    updateTotalCount();

                    // Jika pengguna sedang berada di halaman 2+, kembali ke halaman 1 agar ucapan barunya langsung terlihat
                    if (currentPage > 1 && typeof loadGuestbook === 'function') {
                        loadGuestbook(1);
                        if (gbList) gbList.scrollTop = 0;
                    }

                    // Jalankan update metadata di background
                    if (guestCount > 0) {
                        setDoc(doc(db, "metadata", "totals"), {
                            totalGuests: increment(guestCount)
                        }, { merge: true }).catch(err => console.warn("Metadata update note:", err));
                    }

                    showToast('Terima kasih! Doa dan konfirmasi kehadiran Anda telah tersimpan.');
                }

                // Simpan timestamp pengiriman terakhir (Kecuali jika Mempelai)
                if (!isMempelai) {
                    try {
                        localStorage.setItem('last_gb_submission', Date.now());
                    } catch (e) {}
                }

                hybridForm.reset();
                toggleEmojiPicker(false);
                if (charCounter) {
                    charCounter.textContent = '0 / 500';
                    charCounter.style.color = '#999';
                    charCounter.style.fontWeight = 'normal';
                }
                const msgInputEl = document.getElementById('att-message');
                if (msgInputEl) msgInputEl.placeholder = "Tuliskan ucapan manis Anda...";

                // Reset status kehadiran ke default "Pilih Konfirmasi" dan pastikan container muncul
                const formRow = statusSelect?.closest('.form-row');
                if (formRow) formRow.style.display = 'flex';
                if (statusSelect) {
                    statusSelect.value = '';
                    statusSelect.required = true;
                }
                if (countGroup) countGroup.style.display = 'block';

            } catch (error) {
                console.error("Error submitting form: ", error);
                // Revert optimistic counter update jika penyimpanan pesan gagal
                updateTotalCount();
                if (error.code === 'permission-denied' || error.message?.includes('permission')) {
                    showToast('Format data tidak memenuhi kriteria validasi. Silakan periksa kembali.', 'error');
                } else {
                    showToast('Tidak dapat mengirim saat ini. Periksa koneksi internet Anda dan coba lagi.', 'error');
                }
            } finally {
                isFormSubmitting = false;
                if (submitBtn) {
                    submitBtn.disabled = false;
                }
            }
        });
    }

    // Helper untuk pemotongan teks secara rapi pada batas kata
    function getTruncatedText(str, maxLength = 180) {
        if (!str || str.length <= maxLength) return str || '';
        const sub = str.substring(0, maxLength);
        const lastSpace = sub.lastIndexOf(' ');
        if (lastSpace > maxLength - 35) {
            return sub.substring(0, lastSpace) + '...';
        }
        return sub + '...';
    }

    /**
     * Memeriksa apakah pesan tergolong singkat atau memiliki baris-baris pendek
     * sehingga lebih rapi ditampilkan dengan rata kiri (left-align) alih-alih justify.
     */
    function isShortOrRaggedMessage(text) {
        if (!text) return true;
        const trimmed = text.trim();
        if (trimmed.length <= 85) return true;
        const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length > 1 && lines.some(l => l.length < 35)) return true;
        return false;
    }

    // --- Logika Event Delegation untuk Read More (Gaya Instagram Seamless) ---
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.read-more-btn');
        if (btn) {
            const msgContainer = btn.closest('.gb-message');
            const msgEl = msgContainer?.querySelector('.msg-text');
            if (!msgEl) return;

            const fullText = msgEl.dataset.full || '';

            // Tandai status bahwa pesan ini sudah dibuka penuh agar tidak tertutup saat ada update real-time
            msgEl.dataset.expanded = 'true';

            // Hapus class jika sudah ada untuk reset animasi
            msgEl.classList.remove('fade-in-text');
            void msgEl.offsetWidth; // Force reflow agar animasi bisa dipicu ulang

            msgEl.innerHTML = formatRichText(fullText);
            msgEl.classList.add('fade-in-text');
            applyTwemoji(msgEl);

            // Perbarui class penataan tipografi berdasarkan panjang teks lengkap
            if (msgContainer) {
                msgContainer.classList.toggle('short-msg', isShortOrRaggedMessage(fullText));
            }

            // Hapus tombol selengkapnya ala Instagram agar tampilan pesan terbuka bersih
            btn.remove();
        }
    });

    /* ==========================================================================
       10. AKSES KHUSUS MEMPELAI (AUTENTIKASI SHA-256 & MODERASI)
       ========================================================================== */

    // --- Logika Akses Khusus (Admin & Mempelai) ---
    let isMempelai = false;
    try {
        isMempelai = sessionStorage.getItem('isMempelai') === 'true' && (!!sessionStorage.getItem('mToken') || !!sessionStorage.getItem('mKey'));
    } catch (e) {
        isMempelai = false;
    }

    // --- Helper Generator Kode Sesi Acak 22 Karakter Kriptografis Unik ---
    function generateAdminSessionCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const randomBytes = new Uint8Array(22);
        if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
            window.crypto.getRandomValues(randomBytes);
        } else {
            for (let i = 0; i < 22; i++) {
                randomBytes[i] = Math.floor(Math.random() * 256);
            }
        }
        return Array.from(randomBytes, byte => chars[byte % chars.length]).join('');
    }

    // --- Penyelarasan & Sinkronisasi URL Mode Mempelai / Admin ---
    function syncAdminUrlState(isAdminActive) {
        const pathname = window.location.pathname;
        let search = window.location.search || '';

        // Deteksi cerdas jika pengguna mengetik '?to=...' di dalam hash (misal #abc/?to=Made atau #abc?to=Made)
        if (window.location.hash.includes('to=')) {
            const hashMatch = window.location.hash.match(/[?&]to=([^&#]+)/);
            if (hashMatch && hashMatch[1]) {
                search = `?to=${encodeURIComponent(hashMatch[1].replace(/\+/g, ' '))}`;
            }
        }

        if (isAdminActive) {
            let code = null;
            try {
                code = sessionStorage.getItem('mAdminHash');
                if (!code || code.length < 16) {
                    code = generateAdminSessionCode();
                    sessionStorage.setItem('mAdminHash', code);
                }
            } catch (e) {
                code = generateAdminSessionCode();
            }

            // Bentuk URL sesuai spesifikasi:
            // Jika ada parameter ?to=... maka akhiri dengan '/' sebelum '#kode'
            // Jika tanpa nama tamu maka langsung '/#kode'
            let newUrl = '';
            if (search && search.includes('to=')) {
                const cleanSearch = search.replace(/\/+$/, '');
                newUrl = `${pathname}${cleanSearch}/#${code}`;
            } else {
                newUrl = `${pathname}#${code}`;
            }

            const currentFullUrl = window.location.pathname + window.location.search + window.location.hash;
            if (currentFullUrl !== newUrl) {
                try {
                    window.history.replaceState(null, document.title, newUrl);
                } catch (e) {}
            }
        } else {
            // Jika BUKAN admin (misal tamu biasa atau copy-paste URL admin oleh orang lain):
            try {
                sessionStorage.removeItem('mAdminHash');
            } catch (e) {}

            // Bersihkan hash kode acak dari bilah alamat browser agar URL kembali bersih
            const cleanSearch = search.replace(/\/+$/, '');
            const cleanUrl = `${pathname}${cleanSearch}`;
            const currentFullUrl = window.location.pathname + window.location.search + window.location.hash;
            if (currentFullUrl !== cleanUrl) {
                try {
                    window.history.replaceState(null, document.title, cleanUrl);
                } catch (e) {}
            }
        }
    }

    // Inisialisasi status tampilan mempelai jika sudah login di session sebelumnya
    if (isMempelai) {
        document.getElementById('guestbook-list')?.classList.add('mempelai-mode');
    }
    // Sinkronisasi status URL (format kode acak jika admin, atau bersihkan jika bukan admin)
    syncAdminUrlState(isMempelai);

    // --- Listener Realtime untuk Perubahan Hash / URL tanpa Reload ---
    // Memungkinkan pengubahan nama tamu dan perbaikan URL secara instan saat pengguna
    // mengetik/mengubah ?to=... di address bar tanpa perlu refresh halaman.
    window.addEventListener('hashchange', () => {
        updateGuestNameFromUrl();
        syncAdminUrlState(isMempelai);
    });

    window.addEventListener('popstate', () => {
        updateGuestNameFromUrl();
        syncAdminUrlState(isMempelai);
    });

    // Implementasi Pure JS SHA-256 sebagai fallback saat running di non-Secure Context (LAN HTTP / IP pengujian lokal)
    function jsSha256(ascii) {
        function rightRotate(value, amount) {
            return (value >>> amount) | (value << (32 - amount));
        }
        const mathPow = Math.pow;
        const maxWord = mathPow(2, 32);
        let result = '';
        const words = [];
        const asciiBitLength = ascii.length * 8;
        const hash = [];
        const k = [];
        let primeCounter = 0;
        const isPrime = {};
        for (let candidate = 2; primeCounter < 64; candidate++) {
            if (!isPrime[candidate]) {
                for (let i = 0; i < 313; i += candidate) {
                    isPrime[i] = true;
                }
                hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
                k[primeCounter++] = (mathPow(candidate, 1/3) * maxWord) | 0;
            }
        }
        ascii += '\x80';
        while (ascii.length % 64 - 56) ascii += '\x00';
        for (let i = 0; i < ascii.length; i++) {
            const j = ascii.charCodeAt(i);
            words[i >> 2] |= j << ((3 - i) % 4) * 8;
        }
        words[words.length] = ((asciiBitLength / maxWord) | 0);
        words[words.length] = (asciiBitLength | 0);
        for (let j = 0; j < words.length;) {
            const w = words.slice(j, j += 16);
            const oldHash = hash.slice(0);
            for (let i = 0; i < 64; i++) {
                const w15 = w[i - 15], w2 = w[i - 2];
                const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
                const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
                w[i] = (i < 16) ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0;
                const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
                const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
                const s0_h = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
                const s1_h = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
                const t1 = hash[7] + s1_h + ch + k[i] + w[i];
                const t2 = s0_h + maj;
                hash[7] = hash[6];
                hash[6] = hash[5];
                hash[5] = hash[4];
                hash[4] = (hash[3] + t1) | 0;
                hash[3] = hash[2];
                hash[2] = hash[1];
                hash[1] = hash[0];
                hash[0] = (t1 + t2) | 0;
            }
            for (let i = 0; i < 8; i++) {
                hash[i] = (hash[i] + oldHash[i]) | 0;
            }
        }
        for (let i = 0; i < 8; i++) {
            for (let j = 3; j + 1; j--) {
                const b = (hash[i] >> (j * 8)) & 255;
                result += ((b < 16) ? 0 : '') + b.toString(16);
            }
        }
        return result;
    }

    // Helper Kriptografi SHA-256 untuk keamanan kata sandi (Akselerasi Native Hardware dengan Fallback Pure JS)
    async function sha256(str) {
        if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle && typeof window.crypto.subtle.digest === 'function') {
            try {
                const buffer = new TextEncoder().encode(str);
                const digest = await crypto.subtle.digest('SHA-256', buffer);
                return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (e) {
                // Fallback jika terjadi kendala pada subtle digest
            }
        }
        const utf8Bytes = new TextEncoder().encode(str);
        let utf8Str = '';
        for (let i = 0; i < utf8Bytes.length; i++) {
            utf8Str += String.fromCharCode(utf8Bytes[i]);
        }
        return jsSha256(utf8Str);
    }

    // Token Otorisasi Server Berlapis (HMAC-style Salted Token, diambil dari config.js)
    const ADMIN_SALT = (typeof WEDDING_CONFIG !== 'undefined' && WEDDING_CONFIG.security?.adminSalt)
        ? WEDDING_CONFIG.security.adminSalt
        : "";

    async function generateAdminToken(plainPass) {
        return await sha256(plainPass + ADMIN_SALT);
    }

    // Helper Aman Mengambil Token Mempelai (Tanpa Menyimpan Plaintext di Storage)
    async function getAdminToken() {
        let token = null;
        try {
            token = sessionStorage.getItem('mToken');
            if (!token) {
                const legacyKey = sessionStorage.getItem('mKey');
                if (legacyKey) {
                    token = await generateAdminToken(legacyKey);
                    sessionStorage.setItem('mToken', token);
                    sessionStorage.removeItem('mKey');
                }
            }
        } catch (e) {
            token = null;
        }
        return token || null;
    }

    // Fungsi untuk menghitung dan menyinkronkan total tamu riil langsung dari database
    async function syncGuestCount(forcedCount = null) {
        const guestCounter = document.getElementById('guest-counter');
        if (!guestCounter) return;

        if (typeof forcedCount === 'number') {
            guestCounter.innerText = Math.max(0, forcedCount);
            return;
        }

        try {
            await ensureFirebase();
            if (!db) return;

            // 1. Ambil data instan dari dokumen metadata/totals (cepat, akurat, dan tidak membutuhkan composite index)
            try {
                const metaSnap = await getDoc(doc(db, "metadata", "totals"));
                if (metaSnap.exists()) {
                    const total = metaSnap.data().totalGuests || 0;
                    guestCounter.innerText = Math.max(0, total);
                    return total;
                }
            } catch (metaErr) {
                // Lanjut ke agregasi server jika metadata belum ada
            }

            // 2. Fallback: Rekonsiliasi langsung melalui agregasi server jika dokumen metadata belum ada
            try {
                const qHadir = query(collection(db, "messages"), where("status", "==", "Hadir"));
                const snapshot = await getAggregateFromServer(qHadir, {
                    totalGuests: sum('count')
                });
                const total = snapshot.data().totalGuests || 0;
                guestCounter.innerText = Math.max(0, total);

                // Perbaiki dokumen metadata/totals
                try {
                    await setDoc(doc(db, "metadata", "totals"), {
                        totalGuests: total
                    }, { merge: true });
                } catch (saveErr) {
                    // Abaikan pembatasan rules
                }
                return total;
            } catch (error) {
                if (guestCounter && guestCounter.innerText === '') {
                    guestCounter.innerText = "0";
                }
            }
        } catch (fbErr) {
            console.warn("Guest counter sync note:", fbErr);
        }
    }

    // Fungsi untuk memantau total tamu secara real-time (Privat untuk Mempelai)
    async function initGuestCounter() {
        const guestStatsWrapper = document.getElementById('guest-stats-wrapper');
        const guestCounter = document.getElementById('guest-counter');

        if (isMempelai && guestStatsWrapper && guestCounter) {
            guestStatsWrapper.style.display = 'inline';

            try {
                await ensureFirebase();
            } catch (err) {
                console.warn("Guest counter init note:", err);
                return;
            }
            if (!db) return;

            // Jalankan sinkronisasi agregasi riil pertama kali
            syncGuestCount();

            // Pastikan listener Firestore hanya didaftarkan sekali
            if (!guestStatsWrapper.dataset.listenerActive) {
                guestStatsWrapper.dataset.listenerActive = "true";
                onSnapshot(doc(db, "metadata", "totals"), (docSnap) => {
                    if (docSnap.exists()) {
                        const count = docSnap.data().totalGuests || 0;
                        guestCounter.innerText = Math.max(0, count);
                    }
                }, (error) => console.warn("Guest counter listener error:", error));
            }
        }
    }
    initGuestCounter(); // Jalankan saat halaman dimuat (untuk cek session)

    // Hash SHA-256 dari kata sandi Mempelai (Level 1: Verifikasi Frontend, diambil dari config.js)
    const MEMPELAI_HASH = (typeof WEDDING_CONFIG !== 'undefined' && WEDDING_CONFIG.security?.mempelaiHash)
        ? WEDDING_CONFIG.security.mempelaiHash
        : "";
    const replyUnsubscribers = {}; // Simpan fungsi unsubscribe untuk listener balasan
    const likeLocks = new Set(); // Mencegah flooding / rapid clicking pada tombol suka

    let replyingToId = null; // Menyimpan ID pesan utama yang sedang dibalas
    let replyingToTargetName = ''; // Menyimpan nama target mention jika membalas sub-reply
    let replyingToIsSubReply = false; // Menyimpan status apakah membalas sub-reply atau pesan utama
    let docIdToDelete = null; // Pindahkan ke sini agar nilainya tidak ter-reset saat modal konfirmasi muncul
    let parentIdForReply = null; // Menyimpan ID pesan utama jika yang dihapus adalah balasan
    let isDeleting = false; // Mencegah race condition / double-delete saat tombol konfirmasi diklik cepat

    // --- Logika Modal Password Modern (Mode Mempelai) ---
    const authModal = document.getElementById('mempelai-auth-modal');
    const authForm = document.getElementById('mempelai-auth-form');
    const pwdInput = document.getElementById('mempelai-password-input');
    const togglePwdBtn = document.getElementById('btn-toggle-mempelai-pwd');
    const cancelAuthBtn = document.getElementById('btn-cancel-auth');

    function updateModalScrollLock() {
        const hasActiveModal = document.querySelector('.custom-modal.show');
        if (hasActiveModal) {
            document.body.classList.add('modal-open');
            document.documentElement.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
            document.documentElement.classList.remove('modal-open');
        }
    }

    const openAuthModal = () => {
        if (!authModal) return;
        authModal.classList.add('show');
        updateModalScrollLock();
        if (pwdInput) {
            pwdInput.value = '';
            pwdInput.type = 'password';
        }
        if (togglePwdBtn) {
            const icon = togglePwdBtn.querySelector('i');
            if (icon) icon.className = 'bi bi-eye';
        }
    };

    const closeAuthModal = () => {
        if (!authModal) return;
        authModal.classList.remove('show');
        updateModalScrollLock();
        if (pwdInput) pwdInput.value = '';
    };

    if (togglePwdBtn && pwdInput) {
        togglePwdBtn.addEventListener('click', () => {
            const isPassword = pwdInput.type === 'password';
            pwdInput.type = isPassword ? 'text' : 'password';
            const icon = togglePwdBtn.querySelector('i');
            if (icon) icon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
            pwdInput.focus();
        });
    }

    if (cancelAuthBtn) {
        cancelAuthBtn.addEventListener('click', closeAuthModal);
    }

    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) closeAuthModal();
        });
    }

    let authFailedAttempts = 0;
    let isAuthSubmitting = false;

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isAuthSubmitting) return;

            const now = Date.now();
            let storedLockout = 0;
            try {
                storedLockout = Number(localStorage.getItem('auth_lockout_until') || '0');
            } catch (e) {}

            if (now < storedLockout) {
                const remaining = Math.ceil((storedLockout - now) / 1000);
                showToast(`Akses sementara dinonaktifkan. Silakan coba kembali dalam ${remaining} detik.`, "error");
                return;
            }

            const pass = pwdInput ? pwdInput.value.trim() : '';
            if (!pass) return;

            const submitAuthBtn = document.getElementById('btn-submit-auth');
            isAuthSubmitting = true;
            if (submitAuthBtn) submitAuthBtn.disabled = true;

            try {
                // Constant Artificial delay 350ms untuk mencegah automated rapid script cracking & timing attack
                await new Promise(res => setTimeout(res, 350));
                const plainHash = await sha256(pass);
                const saltedToken = await generateAdminToken(pass);

                // Verifikasi terhadap hash plain ATAU hash salted token dari config
                if (MEMPELAI_HASH && (plainHash === MEMPELAI_HASH || saltedToken === MEMPELAI_HASH)) {
                    authFailedAttempts = 0;
                    try {
                        localStorage.removeItem('auth_lockout_until');
                        localStorage.removeItem('auth_total_fails');
                        sessionStorage.setItem('isMempelai', 'true');
                        sessionStorage.setItem('mToken', saltedToken);
                        sessionStorage.removeItem('mKey'); // Hapus password plaintext demi keamanan
                    } catch (e) {}
                    const wasAlreadyAdmin = Boolean(isMempelai);
                    isMempelai = true;
                    document.getElementById('guestbook-list')?.classList.add('mempelai-mode');
                    initGuestCounter(); // Tampilkan statistik tamu saat login berhasil
                    syncAdminUrlState(true); // Perbarui URL menjadi ber-hash kode acak sesi admin
                    if (wasAlreadyAdmin) {
                        showToast("Sesi Aktif: Anda telah terautentikasi dalam Mode Mempelai");
                    } else {
                        showToast("Autentikasi Berhasil: Mode Mempelai Aktif");
                    }
                    closeAuthModal();
                } else {
                    authFailedAttempts++;
                    let totalFails = 1;
                    try {
                        totalFails = Number(localStorage.getItem('auth_total_fails') || '0') + 1;
                        localStorage.setItem('auth_total_fails', String(totalFails));
                    } catch (e) {}

                    if (authFailedAttempts >= 5 || totalFails >= 5) {
                        // Progressive exponential lockout: 30s -> 60s -> 300s
                        let lockoutDuration = 30000;
                        if (totalFails >= 10) lockoutDuration = 300000; // 5 menit
                        else if (totalFails >= 7) lockoutDuration = 60000; // 1 menit

                        try {
                            localStorage.setItem('auth_lockout_until', String(Date.now() + lockoutDuration));
                        } catch (e) {}
                        authFailedAttempts = 0;
                        showToast(`Batas percobaan terlampaui. Akses ditangguhkan selama ${lockoutDuration / 1000} detik.`, "error");
                    } else {
                        const attemptsLeft = Math.max(1, 5 - authFailedAttempts);
                        showToast(`Kata sandi tidak sesuai. Sisa kesempatan: ${attemptsLeft}`, "error");
                    }

                    const modalBox = authModal.querySelector('.auth-modal-content');
                    if (modalBox) {
                        modalBox.classList.remove('shake');
                        void modalBox.offsetWidth; // Force reflow agar animasi shake bisa dipicu ulang
                        modalBox.classList.add('shake');
                    }
                    if (pwdInput) {
                        pwdInput.select();
                        pwdInput.focus();
                    }
                }
            } finally {
                isAuthSubmitting = false;
                if (submitAuthBtn) submitAuthBtn.disabled = false;
            }
        });
    }

    // Pemicu login: klik cepat judul section 5x (otomatis reset jika jeda > 2 detik)
    const sectionTitle = document.querySelector('#attendance .section-title');
    let clickCount = 0;
    let clickResetTimer = null;
    if (sectionTitle) {
        sectionTitle.addEventListener('click', () => {
            clickCount++;
            clearTimeout(clickResetTimer);
            if (clickCount >= 5) {
                openAuthModal();
                clickCount = 0;
            } else {
                clickResetTimer = setTimeout(() => {
                    clickCount = 0;
                }, 2000);
            }
        });
    }

    /* ==========================================================================
       11. BUKU TAMU REAL-TIME FIRESTORE, BALASAN BERTINGKAT & REAKSI SUKA
       ========================================================================== */

    /**
     * Memformat timestamp komentar ke format tanggal lokal Indonesia beserta zona waktu (WIB, WITA, WIT, atau GMT).
     * Otomatis mendeteksi zona waktu perangkat pengguna yang sedang membuka halaman.
     */
    function formatGuestbookDate(rawTimestamp) {
        if (!rawTimestamp) return 'Baru saja';
        try {
            const dateObj = rawTimestamp.toDate ? rawTimestamp.toDate() : new Date(rawTimestamp);
            if (isNaN(dateObj.getTime())) return 'Baru saja';

            const offset = -dateObj.getTimezoneOffset(); // Menit selisih dari UTC
            let tzLabel = 'WITA';
            if (offset === 420) {
                tzLabel = 'WIB';
            } else if (offset === 480) {
                tzLabel = 'WITA';
            } else if (offset === 540) {
                tzLabel = 'WIT';
            } else {
                const sign = offset >= 0 ? '+' : '-';
                const hours = Math.floor(Math.abs(offset) / 60);
                const mins = Math.abs(offset) % 60;
                tzLabel = `GMT${sign}${hours}${mins ? `:${mins}` : ''}`;
            }

            const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
            return `${dateStr} pukul ${timeStr} ${tzLabel}`;
        } catch (e) {
            return 'Baru saja';
        }
    }

    // Inisialisasi tampilan jika sudah login di session sebelumnya
    function createReplyItemElement(rDoc, parentId, parentName) {
        const rData = rDoc.data();
        const rDocId = rDoc.id;
        const rLikes = rData.likes || 0;
        const likedReplies = getSafeLocalStorageArray('liked_replies');
        const isReplyLiked = likedReplies.includes(rDocId);

        const rMessage = rData.message || '';
        const rIsLong = rMessage.length > 180;
        const rPreviewText = rIsLong ? getTruncatedText(rMessage, 180) : rMessage;

        const rFullDate = formatGuestbookDate(rData.timestamp);

        const safeName = escapeHTML(rData.name || 'Tamu');
        const safePreview = formatRichText(rPreviewText);
        const rIsShort = isShortOrRaggedMessage(rPreviewText);

        // Aturan Tag / Mention:
        // - Jika membalas di bagian dalam balasan (sub-reply), rData.replyTo terisi -> Tampilkan tag @NamaTarget
        // - Jika membalas pesan komentar utama, rData.replyTo kosong -> Bersih tanpa tag
        const cleanReplyTo = (rData.replyTo || '').replace(/^@/, '').trim();
        const rawTarget = cleanReplyTo;
        const mentionHTML = rawTarget
            ? `<span class="reply-to-mention">@${escapeHTML(rawTarget)}</span>`
            : '';

        const replyItem = document.createElement('div');
        replyItem.id = `reply-${rDocId}`;
        replyItem.dataset.parentName = parentName || '';
        replyItem.className = 'gb-reply-item fade-in-text';
        replyItem.style.marginBottom = '20px';
        replyItem.innerHTML = `
            <div class="gb-header-row">
                <div class="gb-avatar"><i class="bi bi-person-circle"></i></div>
                <div class="gb-info">
                    <div class="gb-top-row">
                        <span class="gb-name">${safeName}</span>${(rData.isMempelaiReply || rData.isMempelai) ? '<i class="bi bi-patch-check-fill verified-icon"></i>' : ''}
                        <button class="delete-btn" data-id="${escapeHTML(rDocId)}" data-parent-id="${escapeHTML(parentId)}" title="Hapus Balasan" aria-label="Hapus balasan"><i class="bi bi-trash"></i></button>
                    </div>
                    <div class="gb-meta"><span class="gb-time">${rFullDate}</span></div>
                </div>
            </div>
            <p class="gb-message${rIsShort ? ' short-msg' : ''}">${mentionHTML}<span class="msg-text">${safePreview}</span>${rIsLong ? '<button type="button" class="read-more-btn" aria-label="Baca selengkapnya">selengkapnya</button>' : ''}</p>
            <div class="gb-actions" style="margin-top: -5px;">
                <button class="reply-btn" data-id="${escapeHTML(parentId)}" data-name="${safeName}" data-parent-name="${escapeHTML(parentName)}" data-is-subreply="true">Balas</button>
                <button class="like-btn" data-id="${escapeHTML(rDocId)}" data-parent-id="${escapeHTML(parentId)}" data-likes="${rLikes}" aria-label="${isReplyLiked ? 'Batal menyukai balasan ini' : 'Sukai balasan ini'}">
                    <i class="bi ${isReplyLiked ? 'bi-heart-fill' : 'bi-heart'}"></i> <span class="like-count ${isReplyLiked ? 'liked' : ''}">${rLikes > 0 ? rLikes : ''}</span>
                </button>
            </div>
        `;
        const rMsgTextEl = replyItem.querySelector('.msg-text');
        if (rMsgTextEl) {
            rMsgTextEl.dataset.rawPreview = rPreviewText;
            if (rIsLong) rMsgTextEl.dataset.full = rMessage;
        }
        applyTwemoji(replyItem);
        return replyItem;
    }

    function updateReplyItemElement(existingReply, rDoc, parentName = '') {
        const rData = rDoc.data();
        const rLikes = rData.likes || 0;
        const likedReplies = getSafeLocalStorageArray('liked_replies');
        const isReplyLiked = likedReplies.includes(rDoc.id);

        const rMessage = rData.message || '';
        const rIsLong = rMessage.length > 180;
        const rPreviewText = rIsLong ? getTruncatedText(rMessage, 180) : rMessage;

        const rFullDate = formatGuestbookDate(rData.timestamp);

        const rHeader = existingReply.querySelector(':scope > .gb-header-row > .gb-info > .gb-top-row') || existingReply.querySelector('.gb-header-row > .gb-info > .gb-top-row');
        const rNameEl = rHeader ? rHeader.querySelector('.gb-name') : existingReply.querySelector('.gb-name');
        if (rNameEl) rNameEl.textContent = rData.name || 'Tamu';

        const rTimeEl = existingReply.querySelector('.gb-time');
        if (rTimeEl) rTimeEl.textContent = rFullDate;

        const cleanReplyTo = (rData.replyTo || '').replace(/^@/, '').trim();
        const rawTarget = cleanReplyTo;

        const rMsgContainer = existingReply.querySelector('.gb-message');
        if (rMsgContainer) {
            rMsgContainer.classList.toggle('short-msg', isShortOrRaggedMessage(rPreviewText));
            const mentionEl = rMsgContainer.querySelector('.reply-to-mention');

            if (rawTarget) {
                if (!mentionEl) {
                    const newMention = document.createElement('span');
                    newMention.className = 'reply-to-mention';
                    newMention.textContent = `@${rawTarget}`;
                    rMsgContainer.prepend(newMention);
                } else {
                    mentionEl.textContent = `@${rawTarget}`;
                }
            } else if (mentionEl) {
                mentionEl.remove();
            }
        }

        const rMsgTextEl = rMsgContainer?.querySelector('.msg-text');
        if (rMsgTextEl) {
            const rReadMoreBtn = rMsgContainer.querySelector('.read-more-btn');
            const rIsExpanded = rMsgTextEl.dataset.expanded === 'true' || (rReadMoreBtn && rReadMoreBtn.dataset.expanded === 'true');
            if (!rIsExpanded && rMsgTextEl.dataset.rawPreview !== rPreviewText) {
                rMsgTextEl.dataset.rawPreview = rPreviewText;
                rMsgTextEl.innerHTML = formatRichText(rPreviewText);
                applyTwemoji(rMsgTextEl);
            }
            if (rIsLong) rMsgTextEl.dataset.full = rMessage;
        }

        const rReplyBtn = existingReply.querySelector('.reply-btn');
        if (rReplyBtn) {
            rReplyBtn.dataset.name = rData.name || 'Tamu';
            rReplyBtn.dataset.isSubreply = 'true';
        }

        const rLikeBtn = existingReply.querySelector('.like-btn');
        if (rLikeBtn) {
            rLikeBtn.dataset.likes = rLikes;
            rLikeBtn.setAttribute('aria-label', isReplyLiked ? 'Batal menyukai balasan ini' : 'Sukai balasan ini');
            const countSpan = rLikeBtn.querySelector('.like-count');
            if (countSpan) {
                countSpan.textContent = rLikes > 0 ? rLikes : '';
                countSpan.classList.toggle('liked', isReplyLiked);
            }
            const icon = rLikeBtn.querySelector('i');
            if (icon) icon.className = `bi ${isReplyLiked ? 'bi-heart-fill' : 'bi-heart'}`;
        }

        const rVerifiedIcon = rHeader ? rHeader.querySelector('.verified-icon') : existingReply.querySelector('.verified-icon');
        const isVerified = Boolean(rData.isMempelaiReply || rData.isMempelai);
        if (isVerified && !rVerifiedIcon && rNameEl) {
            const icon = document.createElement('i');
            icon.className = 'bi bi-patch-check-fill verified-icon';
            rNameEl.after(icon);
        } else if (!isVerified && rVerifiedIcon) {
            rVerifiedIcon.remove();
        }
    }

    document.addEventListener('click', async (e) => {
        // 0. Toggle Spoiler / Pesan Rahasia
        const spoiler = e.target.closest('.gb-spoiler');
        if (spoiler) {
            spoiler.classList.toggle('revealed');
        }

        // 1. Klik Tombol Balas (Publik)
        const confirmModal = document.getElementById('custom-confirm-modal');
        if (e.target.classList.contains('reply-btn') || e.target.closest('.reply-btn')) {
            const btn = e.target.classList.contains('reply-btn') ? e.target : e.target.closest('.reply-btn');
            const docId = btn.dataset.id;
            const docName = (btn.dataset.name || 'Tamu').trim();
            const isSubReply = btn.dataset.isSubreply === 'true';

            replyingToId = docId;
            replyingToIsSubReply = isSubReply;
            replyingToTargetName = docName.replace(/^@/, '').trim();

            // Tampilkan indikator balas di form
            const indicator = document.getElementById('reply-mode-indicator');
            const nameSpan = document.getElementById('replying-to-name');
            if (indicator) indicator.style.display = 'flex';
            if (nameSpan) nameSpan.innerText = `@${replyingToTargetName}`;

            // Scroll ke form
            document.querySelector('.attendance-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Fokus ke textarea ucapan
            const msgInputReply = document.getElementById('att-message');
            if (msgInputReply) {
                msgInputReply.placeholder = `Tulis balasan untuk @${replyingToTargetName}...`;
                msgInputReply.focus();
            }

            // Sembunyikan input kehadiran & jumlah tamu saat mode balas
            const formRow = statusSelect?.closest('.form-row');
            if (formRow) formRow.style.display = 'none';
            if (statusSelect) statusSelect.required = false; // Hilangkan required agar form bisa dikirim tanpa status
        }

        // 2. Klik Cancel Balas
        if (e.target.id === 'cancel-reply' || e.target.closest('#cancel-reply')) {
            replyingToId = null;
            replyingToTargetName = '';
            replyingToIsSubReply = false;
            toggleEmojiPicker(false);
            const cancelIndicator = document.getElementById('reply-mode-indicator');
            if (cancelIndicator) cancelIndicator.style.display = 'none';
            const cancelMsgInput = document.getElementById('att-message');
            if (cancelMsgInput) cancelMsgInput.placeholder = "Tuliskan ucapan manis Anda...";

            // Kembalikan tampilan input kehadiran
            const formRow = statusSelect?.closest('.form-row');
            if (formRow) formRow.style.display = 'flex';
            if (statusSelect) {
                statusSelect.required = true;
                if (countGroup) countGroup.style.display = statusSelect.value === 'Tidak Hadir' ? 'none' : 'block';
            }
        }

        // 3. Klik Tombol Like (Anti-Bot Debounced)
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) {
            const docId = likeBtn.dataset.id;
            const parentId = likeBtn.dataset.parentId; // Jika ada, berarti ini like untuk balasan
            const likeLockKey = parentId ? `${parentId}_${docId}` : docId;

            if (likeLocks.has(likeLockKey)) return; // Mencegah spam klik instan / bot loop
            likeLocks.add(likeLockKey);

            const currentLikes = parseInt(likeBtn.dataset.likes || '0', 10);
            const likeCountSpan = likeBtn.querySelector('.like-count');
            const likeIcon = likeBtn.querySelector('i');

            // Gunakan key penyimpanan yang berbeda untuk ucapan utama dan balasan
            const storageKey = parentId ? 'liked_replies' : 'liked_messages';
            let likedItems = getSafeLocalStorageArray(storageKey);
            const isAlreadyLiked = likedItems.includes(docId);

            // Fungsi untuk membuat efek hamburan hati
            const spawnHearts = (el) => {
                const rect = el.getBoundingClientRect();
                const heartCount = 6; // Jumlah hati yang muncul

                for (let i = 0; i < heartCount; i++) {
                    const heart = document.createElement('i');
                    heart.className = 'bi bi-heart-fill floating-heart';

                    // Randomisasi properti untuk efek menyebar
                    const tx = (Math.random() - 0.5) * 80; // Sebaran horizontal dikurangi agar proporsional dengan jarak vertikal
                    const rot = (Math.random() - 0.5) * 45; // Rotasi
                    const duration = 0.6 + Math.random() * 0.4; // Durasi dipercepat karena jarak tempuh lebih pendek
                    const size = (8 + Math.random() * 6) + 'px'; // Ukuran diperkecil (8px - 14px) agar lebih kecil dari tombol
                    const opacity = 0.4 + Math.random() * 0.6; // Variasi transparansi antara 0.4 dan 1.0

                    heart.style.setProperty('--tx', `${tx}px`);
                    heart.style.setProperty('--rot', `${rot}deg`);
                    heart.style.setProperty('--op', opacity);
                    heart.style.setProperty('--duration', `${duration}s`);
                    heart.style.setProperty('--size', size);

                    // Posisi awal di tengah tombol
                    heart.style.left = `${rect.left + rect.width / 2}px`;
                    heart.style.top = `${rect.top + rect.height / 2}px`;

                    document.body.appendChild(heart);

                    // Hapus elemen dari DOM setelah animasi selesai
                    setTimeout(() => heart.remove(), duration * 1000);
                }
            };

            likeBtn.disabled = true;
            const prevLikedItems = [...likedItems];

            try {
                if (!db) await ensureFirebase();
                if (!db || !doc || !updateDoc || !increment) {
                    throw new Error("Firebase belum siap.");
                }

                // Tentukan referensi dokumen (ucapan utama vs balasan)
                const docRef = parentId
                    ? doc(db, "messages", parentId, "replies", docId)
                    : doc(db, "messages", docId);

                if (isAlreadyLiked) {
                    // PROSES UNLIKE
                    // Tambahkan animasi shiver (getar ke kiri-kanan)
                    likeBtn.classList.add('shiver-effect');
                    likeBtn.addEventListener('animationend', () => {
                        likeBtn.classList.remove('shiver-effect');
                    }, { once: true });

                    likeIcon.classList.remove('bi-heart-fill');
                    likeIcon.classList.add('bi-heart');

                    likeCountSpan.classList.remove('liked'); // Hapus kelas 'liked' dari angka
                    const newLikes = Math.max(0, currentLikes - 1);
                    likeCountSpan.textContent = newLikes > 0 ? newLikes : '';
                    likeBtn.dataset.likes = newLikes;
                    likeBtn.setAttribute('aria-label', parentId ? 'Sukai balasan ini' : 'Sukai ucapan ini');

                    likedItems = likedItems.filter(id => id !== docId);
                    try {
                        localStorage.setItem(storageKey, JSON.stringify(likedItems));
                    } catch (storageErr) { }

                    await updateDoc(docRef, { likes: increment(-1) });
                } else {
                    // PROSES LIKE
                    spawnHearts(likeBtn); // Jalankan animasi scattered hearts

                    likeIcon.classList.remove('bi-heart');
                    likeIcon.classList.add('bi-heart-fill');

                    likeCountSpan.classList.add('liked'); // Tambahkan kelas 'liked' ke angka
                    const newLikes = currentLikes + 1;
                    likeCountSpan.textContent = newLikes > 0 ? newLikes : '';
                    likeBtn.dataset.likes = newLikes;
                    likeBtn.setAttribute('aria-label', parentId ? 'Batal menyukai balasan ini' : 'Batal menyukai ucapan ini');

                    likedItems.push(docId);
                    try {
                        localStorage.setItem(storageKey, JSON.stringify(likedItems));
                    } catch (storageErr) { }

                    await updateDoc(docRef, { likes: increment(1) });
                }
            } catch (error) {
                console.error("Error liking message:", error);
                showToast("Tidak dapat memperbarui tanda suka. Silakan coba lagi.", "error");
                // Revert UI, dataset, aria-label, dan localStorage jika update Firestore gagal
                if (isAlreadyLiked) {
                    likeCountSpan.classList.add('liked'); // Kembalikan warna merah jika sebelumnya sudah liked
                    likeIcon.classList.remove('bi-heart');
                    likeIcon.classList.add('bi-heart-fill');
                    likeBtn.setAttribute('aria-label', parentId ? 'Batal menyukai balasan ini' : 'Batal menyukai ucapan ini');
                } else {
                    likeIcon.classList.remove('bi-heart-fill');
                    likeIcon.classList.add('bi-heart');
                    likeCountSpan.classList.remove('liked'); // Hapus warna merah jika sebelumnya belum liked
                    likeBtn.setAttribute('aria-label', parentId ? 'Sukai balasan ini' : 'Sukai ucapan ini');
                }
                likeCountSpan.textContent = currentLikes > 0 ? currentLikes : '';
                likeBtn.dataset.likes = currentLikes;
                try {
                    localStorage.setItem(storageKey, JSON.stringify(prevLikedItems));
                } catch (storageErr) { }
            } finally {
                setTimeout(() => {
                    likeBtn.disabled = false;
                    likeLocks.delete(likeLockKey);
                }, 800);
            }
        }

        // 3. Klik Tombol Hapus (Hanya Mempelai)
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            if (!confirmModal) return;
            docIdToDelete = deleteBtn.dataset.id;
            parentIdForReply = deleteBtn.dataset.parentId || null;

            const adminToken = await getAdminToken();
            if (!isMempelai || !adminToken) {
                showToast("Sesi telah berakhir. Silakan masuk kembali untuk melanjutkan.", "error");
                openAuthModal();
                return;
            }

            const modalTitle = confirmModal.querySelector('h3');
            const modalDesc = confirmModal.querySelector('p');
            if (modalTitle && modalDesc) {
                if (parentIdForReply) {
                    modalTitle.textContent = "Hapus Balasan?";
                    modalDesc.textContent = "Apakah Anda yakin ingin menghapus balasan ini? Tindakan ini tidak dapat dibatalkan.";
                } else {
                    modalTitle.textContent = "Hapus Ucapan?";
                    modalDesc.textContent = "Apakah Anda yakin ingin menghapus ucapan ini? Tindakan ini tidak dapat dibatalkan.";
                }
            }

            confirmModal.classList.add('show');
            updateModalScrollLock();
        }

        if (e.target.id === 'btn-delete-confirm' && docIdToDelete) {
            if (isDeleting) return;
            isDeleting = true;

            const confirmDeleteBtn = e.target;
            confirmDeleteBtn.disabled = true;

            const targetDocId = docIdToDelete;
            const targetParentId = parentIdForReply;

            try {
                if (!db) await ensureFirebase();
                if (!db) throw new Error("Firebase belum siap.");

                const adminSecretHash = await getAdminToken();
                if (!adminSecretHash) {
                    showToast("Sesi autentikasi telah kedaluwarsa. Silakan verifikasi ulang kata sandi Anda.", "error");
                    confirmModal?.classList.remove('show');
                    updateModalScrollLock();
                    openAuthModal();
                    return;
                }

                if (targetParentId) {
                    const replyRef = doc(db, "messages", targetParentId, "replies", targetDocId);
                    // 1. Otorisasi hapus balasan via private zero-leak sink
                    await setDoc(doc(db, "admin_actions", `${targetDocId}_delete_reply`), {
                        secret: adminSecretHash,
                        timestamp: serverTimestamp()
                    });
                    try {
                        // 2. Hapus balasan dari sub-koleksi
                        await deleteDoc(replyRef);
                    } finally {
                        // 3. Bersihkan tiket otorisasi balasan secara instan
                        deleteDoc(doc(db, "admin_actions", `${targetDocId}_delete_reply`)).catch(() => { });
                    }
                    // 4. Kurangi counter balasan di dokumen utama
                    try {
                        await updateDoc(doc(db, "messages", targetParentId), {
                            replyCount: increment(-1)
                        });
                    } catch (cntErr) {
                        console.warn("Reply count update note:", cntErr);
                    }
                } else {
                    // Optimistic counter update di UI (Instan 0ms)
                    const currentCount = parseInt(document.getElementById('message-counter')?.innerText || '0', 10) || 0;
                    updateTotalCount(Math.max(0, currentCount - 1));

                    // Ambil data pesan dulu untuk tahu berapa tamu yang harus dikurangi setelah hapus berhasil
                    const msgRef = doc(db, "messages", targetDocId);
                    const msgSnap = await getDoc(msgRef);
                    let guestCountToRemove = 0;

                    if (msgSnap.exists()) {
                        const msgData = msgSnap.data();
                        if (msgData.status === 'Hadir' && msgData.count > 0) {
                            guestCountToRemove = msgData.count;
                            // Optimistic update counter total tamu di UI
                            const currentGuests = parseInt(document.getElementById('guest-counter')?.innerText || '0', 10) || 0;
                            syncGuestCount(Math.max(0, currentGuests - guestCountToRemove));
                        }

                        // Hapus semua sub-koleksi balasan terlebih dahulu agar tidak menjadi phantom document
                        try {
                            const repliesSnap = await getDocs(collection(db, "messages", targetDocId, "replies"));
                            for (const rDoc of repliesSnap.docs) {
                                try {
                                    await setDoc(doc(db, "admin_actions", `${rDoc.id}_delete_reply`), {
                                        secret: adminSecretHash,
                                        timestamp: serverTimestamp()
                                    });
                                    await deleteDoc(rDoc.ref);
                                } finally {
                                    deleteDoc(doc(db, "admin_actions", `${rDoc.id}_delete_reply`)).catch(() => { });
                                }
                            }
                        } catch (subErr) {
                            console.warn("Sub-replies cleanup note:", subErr);
                        }
                    }

                    // Bersihkan listener balasan aktif jika ada
                    if (replyUnsubscribers[targetDocId]) {
                        replyUnsubscribers[targetDocId]();
                        delete replyUnsubscribers[targetDocId];
                    }

                    // 1. Otorisasi hapus pesan utama via private zero-leak sink
                    await setDoc(doc(db, "admin_actions", `${targetDocId}_delete`), {
                        secret: adminSecretHash,
                        timestamp: serverTimestamp()
                    });
                    try {
                        // 2. Hapus pesan utama secara permanen TERLEBIH DAHULU sebelum kurangi metadata/totals
                        await deleteDoc(msgRef);
                    } finally {
                        // 3. Bersihkan tiket otorisasi pesan utama secara instan
                        deleteDoc(doc(db, "admin_actions", `${targetDocId}_delete`)).catch(() => { });
                    }

                    // 4. Kurangi totalGuests di metadata/totals HANYA setelah deleteDoc berhasil (mencegah drift data)
                    if (guestCountToRemove > 0) {
                        try {
                            await setDoc(doc(db, "metadata", "totals"), {
                                totalGuests: increment(-guestCountToRemove)
                            }, { merge: true });
                        } catch (metaErr) {
                            console.warn("Metadata total update note:", metaErr);
                        }
                    }

                    // 5. Sinkronisasi ulang total hitungan pasti dari server setelah deleteDoc selesai
                    await updateTotalCount();
                    if (isMempelai) {
                        await syncGuestCount();
                    }
                }
                showToast("Ucapan berhasil dihapus dari buku tamu.");
            } catch (error) {
                console.error("Gagal menghapus pesan:", error);
                // Rollback counter optimistik jika terjadi kegagalan penghapusan
                updateTotalCount();
                if (isMempelai) {
                    syncGuestCount();
                }
                if (error.code === 'permission-denied' || error.message?.includes('permission')) {
                    showToast("Akses ditolak: Anda tidak memiliki izin untuk menghapus ucapan ini.", "error");
                } else {
                    showToast("Gagal menghapus ucapan. Silakan periksa koneksi Anda dan coba lagi.", "error");
                }
            } finally {
                isDeleting = false;
                confirmDeleteBtn.disabled = false;
                confirmModal?.classList.remove('show');
                updateModalScrollLock();
                docIdToDelete = null;
                parentIdForReply = null;
            }
        }

        if (confirmModal && (e.target.id === 'btn-cancel-confirm' || e.target === confirmModal)) {
            if (isDeleting) return;
            confirmModal.classList.remove('show');
            updateModalScrollLock();
            docIdToDelete = null;
            parentIdForReply = null;
        }

        // 4. Klik Tombol Pin / Unpin Ucapan (Hanya Mempelai)
        const pinBtn = e.target.closest('.pin-btn');
        if (pinBtn) {
            const docId = pinBtn.dataset.id;
            const isCurrentlyPinned = pinBtn.dataset.pinned === 'true';

            const adminSecretHash = await getAdminToken();
            if (!isMempelai || !adminSecretHash) {
                showToast("Sesi telah berakhir. Silakan masuk kembali untuk menyematkan ucapan.", "error");
                openAuthModal();
                return;
            }

            pinBtn.disabled = true;
            try {
                if (!db) await ensureFirebase();
                if (!db) throw new Error("Firebase belum siap.");

                const msgRef = doc(db, "messages", docId);
                // Otorisasi aksi pin/unpin via private zero-leak sink
                await setDoc(doc(db, "admin_actions", `${docId}_pin`), {
                    secret: adminSecretHash,
                    timestamp: serverTimestamp()
                });

                try {
                    if (isCurrentlyPinned) {
                        await updateDoc(msgRef, {
                            isPinned: false
                        });
                        showToast("Sematan ucapan berhasil dilepas.");
                    } else {
                        await updateDoc(msgRef, {
                            isPinned: true,
                            pinnedAt: serverTimestamp()
                        });
                        showToast("Ucapan berhasil disematkan di posisi teratas.");
                    }
                } finally {
                    deleteDoc(doc(db, "admin_actions", `${docId}_pin`)).catch(() => { });
                }
            } catch (error) {
                console.error("Error toggling pin status:", error);
                if (error.code === 'permission-denied' || error.message?.includes('permission')) {
                    showToast("Akses ditolak: Anda tidak memiliki izin untuk mengubah status sematan.", "error");
                } else {
                    showToast("Gagal memperbarui sematan ucapan. Silakan coba lagi.", "error");
                }
            } finally {
                setTimeout(() => { pinBtn.disabled = false; }, 500);
            }
        }

        if (e.target.classList.contains('view-reply-btn') || e.target.closest('.view-reply-btn')) {
            const btn = e.target.classList.contains('view-reply-btn') ? e.target : e.target.closest('.view-reply-btn');
            const docId = btn.dataset.id;
            const parentName = btn.dataset.parentName || '';
            const parentItem = btn.closest('.guestbook-item');
            const replyContent = parentItem ? parentItem.querySelector('.gb-reply') : document.getElementById(`reply-content-${docId}`);

            if (replyContent) {
                const isHidden = replyContent.style.display === 'none';

                if (isHidden) {
                    // Pasang listener jika belum ada atau jika kontainer kosong
                    if (!replyUnsubscribers[docId] || replyContent.children.length === 0) {
                        if (replyUnsubscribers[docId]) {
                            replyUnsubscribers[docId]();
                            delete replyUnsubscribers[docId];
                        }

                        replyContent.innerHTML = `
                            <div class="text-center" style="padding: 10px 0;">
                                <div class="spinner" style="width: 20px; height: 20px; border-width: 2px; margin: 0 auto;"></div>
                                <p style="color: #999; margin-top: 5px; font-size: 0.75rem; font-style: italic;">Memuat balasan...</p>
                            </div>
                        `;

                        try {
                            if (!db) await ensureFirebase();
                        } catch (fbErr) {
                            console.warn("Reply Firebase init note:", fbErr);
                        }
                        if (!db || !collection || !query || !orderBy || !onSnapshot) {
                            replyContent.innerHTML = '<p style="color: #dc3545; font-size: 0.8rem; margin: 5px 0;">Gagal memuat balasan.</p>';
                            replyContent.style.display = 'block';
                            return;
                        }

                        const repliesRef = collection(db, "messages", docId, "replies");
                        const qReplies = query(repliesRef, orderBy("timestamp", "asc"));
                        let isInitialReply = true;

                        replyUnsubscribers[docId] = onSnapshot(qReplies, (snapshot) => {
                            if (snapshot.empty) {
                                replyContent.innerHTML = '<p style="color: #999; font-style: italic; font-size: 0.8rem; margin: 5px 0;">Belum ada balasan.</p>';
                                return;
                            }

                            if (isInitialReply) {
                                replyContent.innerHTML = '';
                                snapshot.docs.forEach((rDoc) => {
                                    const replyItem = createReplyItemElement(rDoc, docId, parentName);
                                    replyContent.appendChild(replyItem);
                                });
                                isInitialReply = false;
                            } else {
                                snapshot.docChanges().forEach((change) => {
                                    const rDoc = change.doc;
                                    const rDocId = rDoc.id;
                                    const existingReply = replyContent.querySelector(`#reply-${rDocId}`) || document.getElementById(`reply-${rDocId}`);

                                    if (change.type === "added") {
                                        if (!existingReply) {
                                            const replyItem = createReplyItemElement(rDoc, docId, parentName);
                                            replyContent.appendChild(replyItem);
                                        }
                                    } else if (change.type === "modified" && existingReply) {
                                        updateReplyItemElement(existingReply, rDoc, parentName);
                                    } else if (change.type === "removed" && existingReply) {
                                        existingReply.remove();
                                    }
                                });
                            }
                        }, (error) => {
                            console.warn("Reply listener error:", error);
                            replyContent.innerHTML = '<p style="color: #dc3545; font-size: 0.8rem; margin: 5px 0;">Gagal memuat balasan.</p>';
                        });
                    }
                    replyContent.style.display = 'block';
                    btn.innerHTML = `<i class="bi bi-chevron-up"></i> Sembunyikan balasan`;
                } else {
                    // Sembunyikan dan bersihkan listener agar hemat memori & kuota
                    if (replyUnsubscribers[docId]) {
                        replyUnsubscribers[docId]();
                        delete replyUnsubscribers[docId];
                    }
                    replyContent.style.display = 'none';
                    replyContent.innerHTML = '';
                    btn.innerHTML = `<i class="bi bi-arrow-return-right"></i> Lihat ${btn.dataset.count || 0} balasan lainnya`;
                }
            }
        }
    });
    const gbList = document.getElementById('guestbook-list');
    const messageCounter = document.getElementById('message-counter');
    const btnPrevGb = document.getElementById('btn-prev-gb');
    const btnNextGb = document.getElementById('btn-next-gb');

    let unsubscribeGb = null;
    let unsubscribePinned = null;
    const pinnedIds = new Set();
    let aosRefreshTimer = null;
    let currentPage = 1;
    const pageCursors = [null]; // Menyimpan document cursor untuk setiap halaman: pageCursors[1] = null, pageCursors[2] = doc10, dst.
    let lastRecordedMobileHeight = 0;

    async function updateTotalCount(forcedCount = null) {
        try {
            const counterEl = messageCounter || document.getElementById('message-counter');
            const paginationControls = document.getElementById('pagination-controls');

            if (typeof forcedCount === 'number') {
                if (counterEl) counterEl.innerText = forcedCount;
                if (paginationControls) {
                    paginationControls.style.display = (currentPage > 1 || forcedCount > 10) ? 'flex' : 'none';
                }
                return forcedCount;
            }

            if (!db) await ensureFirebase();
            if (!db || !collection || !getCountFromServer) return;

            const coll = collection(db, "messages");
            const snapshot = await getCountFromServer(coll);
            const total = snapshot.data().count;
            if (counterEl) counterEl.innerText = total;

            if (paginationControls) {
                paginationControls.style.display = (currentPage > 1 || total > 10) ? 'flex' : 'none';
            }
            return total;
        } catch (error) {
            console.error("Gagal mengambil total ucapan:", error);
        }
    }

    function createMessageElement(docSnap, isInitial = false, isPinnedContainer = false) {
        const data = docSnap.data();
        const docId = docSnap.id;
        const likedMessages = getSafeLocalStorageArray('liked_messages');
        const isPinned = data.isPinned === true;

        const date = formatGuestbookDate(data.timestamp);

        const statusClass = data.status === 'Hadir' ? 'status-hadir' : 'status-absen';
        const message = data.message || '';
        const isLong = message.length > 180;
        const previewText = isLong ? getTruncatedText(message, 180) : message;
        const likes = data.likes || 0;
        const isAlreadyLiked = likedMessages.includes(docId);

        const safeName = escapeHTML(data.name || 'Tamu');
        const safeStatus = escapeHTML(data.status || 'Hadir');
        const safePreview = formatRichText(previewText);
        const isShort = isShortOrRaggedMessage(previewText);

        const item = document.createElement('div');
        item.id = isPinnedContainer ? `pinned-msg-${docId}` : `msg-${docId}`;
        item.dataset.id = docId;
        item.className = `guestbook-item ${isPinned ? 'is-pinned ' : ''}${isInitial ? 'fade-in-up' : ''}`;
        item.innerHTML = `
            <div class="gb-header-row">
                <div class="gb-avatar">
                    <i class="bi bi-person-circle"></i>
                </div>
                <div class="gb-info">
                    <div class="gb-top-row">
                        <span class="gb-name">${safeName}</span>${data.isMempelai ? '<i class="bi bi-patch-check-fill verified-icon"></i>' : ''}
                        <span class="status-badge ${statusClass}">${safeStatus}</span>
                        <span class="gb-pinned-icon ${isPinned ? 'show' : ''}" title="Pesan Disematkan" aria-label="Pesan Disematkan"><i class="bi bi-pin-angle-fill"></i></span>
                        <div class="gb-admin-actions">
                            <button class="pin-btn ${isPinned ? 'pinned' : ''}" data-id="${escapeHTML(docId)}" data-pinned="${isPinned}" title="${isPinned ? 'Lepas Sematan' : 'Sematkan Ucapan'}" aria-label="${isPinned ? 'Lepas sematan ucapan' : 'Sematkan ucapan'}">
                                <i class="bi ${isPinned ? 'bi-pin-angle-fill' : 'bi-pin-angle'}"></i>
                            </button>
                            <button class="delete-btn" data-id="${escapeHTML(docId)}" title="Hapus Ucapan" aria-label="Hapus ucapan"><i class="bi bi-trash"></i></button>
                        </div>
                    </div>
                    <div class="gb-meta">
                        <span class="gb-time">${date}</span>
                    </div>
                </div>
            </div>
            <p class="gb-message${isShort ? ' short-msg' : ''}"><span class="msg-text">${safePreview}</span>${isLong ? '<button type="button" class="read-more-btn" aria-label="Baca selengkapnya">selengkapnya</button>' : ''}</p>
            <div class="gb-actions">
                <button class="reply-btn" data-id="${escapeHTML(docId)}" data-name="${safeName}" data-is-subreply="false">Balas</button>
                <button class="like-btn" data-id="${escapeHTML(docId)}" data-likes="${likes}" aria-label="${isAlreadyLiked ? 'Batal menyukai ucapan ini' : 'Sukai ucapan ini'}">
                    <i class="bi ${isAlreadyLiked ? 'bi-heart-fill' : 'bi-heart'}"></i> <span class="like-count ${isAlreadyLiked ? 'liked' : ''}">${likes > 0 ? likes : ''}</span>
                </button>
            </div>
            ${(data.replyCount > 0) ? `
            <div class="reply-toggle-container">
                <div id="reply-content-${docId}" class="gb-reply fade-in-text" style="display: none;"></div>
                <button class="view-reply-btn" data-id="${docId}" data-count="${data.replyCount || 0}" data-parent-name="${safeName}">
                    <i class="bi bi-arrow-return-right"></i> Lihat ${data.replyCount || 0} balasan lainnya
                </button>
            </div>
            ` : ''}
        `;
        const msgTextEl = item.querySelector('.msg-text');
        if (msgTextEl) {
            msgTextEl.dataset.rawPreview = previewText;
            if (isLong) msgTextEl.dataset.full = message;
        }
        applyTwemoji(item);
        return item;
    }

    function updateMessageElement(existingItem, docSnap) {
        const data = docSnap.data();
        const isPinned = data.isPinned === true;
        const date = formatGuestbookDate(data.timestamp);

        const statusClass = data.status === 'Hadir' ? 'status-hadir' : 'status-absen';
        const message = data.message || '';
        const isLong = message.length > 180;
        const previewText = isLong ? getTruncatedText(message, 180) : message;
        const likes = data.likes || 0;
        const likedMessages = getSafeLocalStorageArray('liked_messages');
        const isAlreadyLiked = likedMessages.includes(docSnap.id);

        existingItem.classList.toggle('is-pinned', isPinned);

        // Hapus elemen badge lama jika masih ada di DOM
        const oldPinnedBadge = existingItem.querySelector('.gb-pinned-badge');
        if (oldPinnedBadge) oldPinnedBadge.remove();

        // Perbarui atau sisipkan ikon sematan pojok kanan (tampil untuk mode publik/non-admin)
        let pinnedIcon = existingItem.querySelector('.gb-pinned-icon');
        if (!pinnedIcon) {
            const topRow = existingItem.querySelector(':scope > .gb-header-row > .gb-info > .gb-top-row') || existingItem.querySelector('.gb-header-row > .gb-info > .gb-top-row');
            const adminActions = topRow?.querySelector('.gb-admin-actions');
            if (topRow) {
                pinnedIcon = document.createElement('span');
                pinnedIcon.className = `gb-pinned-icon ${isPinned ? 'show' : ''}`;
                pinnedIcon.title = 'Pesan Disematkan';
                pinnedIcon.setAttribute('aria-label', 'Pesan Disematkan');
                pinnedIcon.innerHTML = '<i class="bi bi-pin-angle-fill"></i>';
                if (adminActions) {
                    topRow.insertBefore(pinnedIcon, adminActions);
                } else {
                    topRow.appendChild(pinnedIcon);
                }
            }
        } else {
            pinnedIcon.classList.toggle('show', isPinned);
        }

        const pinBtn = existingItem.querySelector('.pin-btn');
        if (pinBtn) {
            pinBtn.dataset.pinned = isPinned;
            pinBtn.classList.toggle('pinned', isPinned);
            pinBtn.title = isPinned ? 'Lepas Sematan' : 'Sematkan Ucapan';
            pinBtn.setAttribute('aria-label', isPinned ? 'Lepas sematan ucapan' : 'Sematkan ucapan');
            const pinIcon = pinBtn.querySelector('i');
            if (pinIcon) {
                pinIcon.className = `bi ${isPinned ? 'bi-pin-angle-fill' : 'bi-pin-angle'}`;
            }
        }

        const mainHeader = existingItem.querySelector(':scope > .gb-header-row > .gb-info > .gb-top-row') || existingItem.querySelector('.gb-header-row > .gb-info > .gb-top-row');
        const nameEl = mainHeader ? mainHeader.querySelector('.gb-name') : existingItem.querySelector('.gb-name');
        if (nameEl) nameEl.textContent = data.name;

        const verifiedIcon = mainHeader ? mainHeader.querySelector('.verified-icon') : null;
        if (data.isMempelai && !verifiedIcon && nameEl) {
            const icon = document.createElement('i');
            icon.className = 'bi bi-patch-check-fill verified-icon';
            nameEl.after(icon);
        } else if (!data.isMempelai && verifiedIcon) {
            verifiedIcon.remove();
        }

        const badgeEl = mainHeader ? mainHeader.querySelector('.status-badge') : existingItem.querySelector('.status-badge');
        if (badgeEl) {
            badgeEl.textContent = data.status;
            badgeEl.className = `status-badge ${statusClass}`;
        }

        const timeEl = existingItem.querySelector(':scope > .gb-header-row > .gb-info > .gb-meta > .gb-time') || existingItem.querySelector('.gb-time');
        if (timeEl) timeEl.textContent = date;

        const msgContainer = existingItem.querySelector(':scope > .gb-message') || existingItem.querySelector('.gb-message');
        if (msgContainer) {
            msgContainer.classList.toggle('short-msg', isShortOrRaggedMessage(previewText));
        }
        const msgTextEl = msgContainer?.querySelector('.msg-text');
        if (msgTextEl) {
            const readMoreBtn = msgContainer.querySelector('.read-more-btn');
            const isExpanded = msgTextEl.dataset.expanded === 'true' || (readMoreBtn && readMoreBtn.dataset.expanded === 'true');
            if (!isExpanded && msgTextEl.dataset.rawPreview !== previewText) {
                msgTextEl.dataset.rawPreview = previewText;
                msgTextEl.innerHTML = formatRichText(previewText);
                applyTwemoji(msgTextEl);
            }
            if (isLong) msgTextEl.dataset.full = message;
        }

        const likeBtn = existingItem.querySelector(':scope > .gb-actions > .like-btn') || existingItem.querySelector('.like-btn');
        if (likeBtn) {
            likeBtn.dataset.likes = likes;
            likeBtn.setAttribute('aria-label', isAlreadyLiked ? 'Batal menyukai ucapan ini' : 'Sukai ucapan ini');
            const countSpan = likeBtn.querySelector('.like-count');
            if (countSpan) {
                countSpan.textContent = likes > 0 ? likes : '';
                countSpan.classList.toggle('liked', isAlreadyLiked);
            }
            const icon = likeBtn.querySelector('i');
            if (icon) icon.className = `bi ${isAlreadyLiked ? 'bi-heart-fill' : 'bi-heart'}`;
        }

        const replyBtn = existingItem.querySelector(':scope > .gb-actions > .reply-btn') || existingItem.querySelector('.reply-btn');
        if (replyBtn) {
            replyBtn.dataset.name = data.name || 'Tamu';
            replyBtn.dataset.isSubreply = 'false';
        }

        const viewReplyBtn = existingItem.querySelector(':scope > .reply-toggle-container > .view-reply-btn') || existingItem.querySelector('.view-reply-btn');
        if (viewReplyBtn) {
            viewReplyBtn.dataset.count = data.replyCount || 0;
            viewReplyBtn.dataset.parentName = data.name || '';
            const replyContent = existingItem.querySelector('.gb-reply');
            const isVisible = replyContent && replyContent.style.display !== 'none';
            viewReplyBtn.innerHTML = isVisible
                ? `<i class="bi bi-chevron-up"></i> Sembunyikan balasan`
                : `<i class="bi bi-arrow-return-right"></i> Lihat ${data.replyCount || 0} balasan lainnya`;

            if ((data.replyCount || 0) <= 0) {
                if (replyUnsubscribers[docSnap.id]) {
                    replyUnsubscribers[docSnap.id]();
                    delete replyUnsubscribers[docSnap.id];
                }
                existingItem.querySelector('.reply-toggle-container')?.remove();
            }
        } else if (data.replyCount > 0) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = `
                <div class="reply-toggle-container">
                    <div id="reply-content-${docSnap.id}" class="gb-reply fade-in-text" style="display: none;"></div>
                    <button class="view-reply-btn" data-id="${docSnap.id}" data-count="${data.replyCount || 0}" data-parent-name="${escapeHTML(data.name || 'Tamu')}">
                        <i class="bi bi-arrow-return-right"></i> Lihat ${data.replyCount || 0} balasan lainnya
                    </button>
                </div>
            `;
            const toggleContainer = tempDiv.firstElementChild;
            if (toggleContainer) existingItem.appendChild(toggleContainer);
        }
    }

    function getPinnedTimestamp(docSnap) {
        const data = docSnap.data({ serverTimestamps: 'estimate' });
        if (data.pinnedAt) {
            if (typeof data.pinnedAt.toMillis === 'function') return data.pinnedAt.toMillis();
            if (data.pinnedAt instanceof Date) return data.pinnedAt.getTime();
            if (typeof data.pinnedAt === 'number') return data.pinnedAt;
        }
        if (data.timestamp) {
            if (typeof data.timestamp.toMillis === 'function') return data.timestamp.toMillis();
            if (data.timestamp instanceof Date) return data.timestamp.getTime();
            if (typeof data.timestamp === 'number') return data.timestamp;
        }
        return Date.now();
    }

    function initPinnedMessagesListener() {
        if (unsubscribePinned) unsubscribePinned();
        const pinnedContainer = document.getElementById('pinned-messages-list');
        if (!pinnedContainer) return;

        const qPinned = query(collection(db, "messages"), where("isPinned", "==", true));
        unsubscribePinned = onSnapshot(qPinned, (snapshot) => {
            pinnedIds.clear();
            const hasStructuralChange = snapshot.docChanges().some(c => c.type === 'added' || c.type === 'removed');
            if (!snapshot.metadata.hasPendingWrites && hasStructuralChange) {
                updateTotalCount();
                if (isMempelai) {
                    syncGuestCount();
                }
            }
            if (snapshot.empty) {
                pinnedContainer.querySelectorAll('.guestbook-item').forEach(el => {
                    const id = el.dataset.id;
                    if (id && replyUnsubscribers[id]) {
                        replyUnsubscribers[id]();
                        delete replyUnsubscribers[id];
                    }
                });
                pinnedContainer.style.display = 'none';
                pinnedContainer.innerHTML = '';
                return;
            }

            // Urutkan ucapan yang disematkan: pinnedAt / waktu semat terbaru di posisi paling atas (index 0)
            const sortedDocs = snapshot.docs.slice().sort((a, b) => {
                const timeA = getPinnedTimestamp(a);
                const timeB = getPinnedTimestamp(b);
                return timeB - timeA;
            });

            const currentPinnedIds = new Set();
            sortedDocs.forEach(docSnap => {
                pinnedIds.add(docSnap.id);
                currentPinnedIds.add(docSnap.id);
            });

            // 1. Hapus elemen pin yang sudah tidak disematkan beserta listener balasannya agar tidak memory leak
            pinnedContainer.querySelectorAll('.guestbook-item').forEach(el => {
                const id = el.dataset.id;
                if (!currentPinnedIds.has(id)) {
                    if (id && replyUnsubscribers[id]) {
                        replyUnsubscribers[id]();
                        delete replyUnsubscribers[id];
                    }
                    el.remove();
                }
            });

            // 2. Render atau perbarui elemen pin serta sinkronkan urutan DOM (terbaru di paling atas)
            sortedDocs.forEach((docSnap, index) => {
                const docId = docSnap.id;
                let item = pinnedContainer.querySelector(`#pinned-msg-${docId}`);
                if (item) {
                    updateMessageElement(item, docSnap);
                } else {
                    item = createMessageElement(docSnap, true, true);
                }

                // Pastikan posisi elemen di DOM sesuai persis dengan urutan index hasil sorting
                const currentChildAtIndex = pinnedContainer.children[index];
                if (currentChildAtIndex !== item) {
                    pinnedContainer.insertBefore(item, currentChildAtIndex || null);
                }
            });

            pinnedContainer.style.display = currentPage === 1 ? 'flex' : 'none';

            // 3. Pastikan tidak ada duplikat di daftar pesan reguler sekaligus bersihkan listener balasan yang terputus
            sortedDocs.forEach(docSnap => {
                const regItem = document.querySelector(`#regular-messages-list #msg-${docSnap.id}`);
                if (regItem) {
                    if (replyUnsubscribers[docSnap.id]) {
                        replyUnsubscribers[docSnap.id]();
                        delete replyUnsubscribers[docSnap.id];
                    }
                    regItem.remove();
                }
            });

            if (typeof AOS !== 'undefined') {
                clearTimeout(aosRefreshTimer);
                aosRefreshTimer = setTimeout(() => {
                    AOS.refresh();
                }, 250);
            }
        }, (error) => {
            console.warn("Pinned messages listener error:", error);
        });
    }

    function getQueryForPage(page) {
        const pinnedCount = (pinnedIds ? pinnedIds.size : 0);
        const pageLimit = (page === 1) ? Math.max(1, 10 - pinnedCount) : 10;
        const fetchLimit = pageLimit + pinnedCount + 1;
        if (page === 1 || !pageCursors[page]) {
            return query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(fetchLimit));
        }
        return query(collection(db, "messages"), orderBy("timestamp", "desc"), startAfter(pageCursors[page]), limit(fetchLimit));
    }

    function loadGuestbook(page = 1) {
        if (unsubscribeGb) unsubscribeGb();
        // Bersihkan semua listener balasan aktif dari halaman sebelumnya
        Object.values(replyUnsubscribers).forEach(unsub => unsub && typeof unsub === 'function' && unsub());
        for (const key in replyUnsubscribers) delete replyUnsubscribers[key];

        currentPage = page;
        let isInitialLoad = true;
        const targetList = document.getElementById('regular-messages-list') || gbList;

        const pinnedContainer = document.getElementById('pinned-messages-list');
        if (btnNextGb) btnNextGb.disabled = true;
        if (btnPrevGb) btnPrevGb.disabled = true;

        // Pada tampilan mobile, pertahankan tinggi sebelumnya agar saat berpindah halaman tidak terjadi layout shift / mengecil tiba-tiba
        if (window.innerWidth <= 767 && gbList) {
            const h = gbList.offsetHeight;
            if (h > lastRecordedMobileHeight) {
                lastRecordedMobileHeight = h;
            }
            if (lastRecordedMobileHeight > 0) {
                gbList.style.minHeight = `${lastRecordedMobileHeight}px`;
            }
        } else if (gbList) {
            gbList.style.minHeight = '';
        }

        // Tampilkan loading spinner hanya jika kontainer belum memiliki pesan sebelumnya (pemuatan perdana)
        // Jika sudah ada pesan (navigasi antar halaman), redupkan konten sebelumnya agar transisi halus tanpa flicker
        const hasExistingMessages = targetList.children.length > 0 && !targetList.querySelector('#gb-loading') && !targetList.querySelector('.empty-msg');
        
        if (pinnedContainer) {
            if (currentPage === 1) {
                if (hasExistingMessages) {
                    pinnedContainer.style.opacity = '0.35';
                    pinnedContainer.style.transition = 'opacity 0.2s ease';
                }
                pinnedContainer.style.display = (pinnedIds && pinnedIds.size > 0) ? 'flex' : 'none';
            } else {
                pinnedContainer.style.display = 'none';
            }
        }

        let spinnerTimer = null;
        if (hasExistingMessages) {
            targetList.style.opacity = '0.35';
            targetList.style.transition = 'opacity 0.2s ease';
            spinnerTimer = setTimeout(() => {
                if (isInitialLoad) {
                    targetList.innerHTML = `
                        <div id="gb-loading" class="text-center" style="padding: 40px 0; min-height: 200px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                            <div class="spinner" style="margin: 0 auto;"></div>
                            <p style="color: #999; margin-top: 15px; font-size: 0.9rem; font-style: italic;">Memuat ucapan...</p>
                        </div>
                    `;
                    targetList.style.opacity = '1';
                }
            }, 250);
        } else {
            targetList.innerHTML = `
                <div id="gb-loading" class="text-center" style="padding: 40px 0; min-height: 200px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <div class="spinner" style="margin: 0 auto;"></div>
                    <p style="color: #999; margin-top: 15px; font-size: 0.9rem; font-style: italic;">Memuat ucapan...</p>
                </div>
            `;
            targetList.style.opacity = '1';
        }

        const q = getQueryForPage(currentPage);

        unsubscribeGb = onSnapshot(q, (snapshot) => {
            if (spinnerTimer) clearTimeout(spinnerTimer);

            const hasStructuralChange = snapshot.docChanges().some(c => c.type === 'added' || c.type === 'removed');
            if (!snapshot.metadata.hasPendingWrites && hasStructuralChange) {
                updateTotalCount();
                if (isMempelai) {
                    syncGuestCount();
                }
            }

            const unpinnedDocs = snapshot.docs.filter(docSnap => docSnap.data().isPinned !== true);
            const pinnedCount = (pinnedIds ? pinnedIds.size : 0);
            const pageLimit = (currentPage === 1) ? Math.max(1, 10 - pinnedCount) : 10;

            if (unpinnedDocs.length === 0) {
                // Abaikan snapshot kosong sementara dari cache lokal agar tidak memicu kedipan sebelum respons server tiba
                if (snapshot.metadata.fromCache) {
                    return;
                }

                // Jika halaman > 1 memang kosong di server (mis. pesan terakhir di halaman tersebut dihapus), kembali ke halaman sebelumnya
                if (currentPage > 1) {
                    loadGuestbook(currentPage - 1);
                    return;
                }

                // Cek apakah masih ada pesan yang disematkan (pinned) di database
                const actualPinnedCount = Math.max(pinnedCount, snapshot.docs.length);

                if (actualPinnedCount === 0) {
                    updateTotalCount(0);
                    if (isMempelai) {
                        syncGuestCount(0);
                    }
                    targetList.innerHTML = '<div class="guestbook-item text-center empty-msg"><p style="color: #999; font-style: italic; margin-bottom: 0;">Belum ada ucapan. Jadilah yang pertama memberikan ucapan!</p></div>';
                } else {
                    // Semua pesan saat ini berstatus disematkan -> bersihkan spinner/kontainer reguler tanpa error
                    targetList.innerHTML = '';
                    if (pinnedContainer) {
                        pinnedContainer.style.display = 'flex';
                        pinnedContainer.style.opacity = '1';
                    }
                }

                targetList.style.opacity = '1';
                isInitialLoad = false;
                if (btnNextGb) btnNextGb.disabled = true;
                if (btnPrevGb) btnPrevGb.disabled = true;
                const paginationControls = document.getElementById('pagination-controls');
                if (paginationControls) {
                    paginationControls.style.display = 'none';
                }
                return;
            }

            // Ambil maksimal pesan reguler sesuai kuota (Halaman 1: 10 - pinned, Halaman selanjutnya: 10)
            const visibleDocs = unpinnedDocs.slice(0, pageLimit);

            // Simpan cursor untuk halaman berikutnya berdasarkan dokumen reguler terakhir
            if (visibleDocs.length > 0) {
                pageCursors[currentPage + 1] = visibleDocs[visibleDocs.length - 1];
            }

            // Update status tombol navigasi
            const hasNextPage = unpinnedDocs.length > pageLimit;
            const isNextDisabled = !hasNextPage;
            const isPrevDisabled = currentPage === 1;

            if (btnNextGb) btnNextGb.disabled = isNextDisabled;
            if (btnPrevGb) btnPrevGb.disabled = isPrevDisabled;

            const paginationControls = document.getElementById('pagination-controls');
            if (paginationControls) {
                if (currentPage > 1 || hasNextPage) {
                    paginationControls.style.display = 'flex';
                } else {
                    paginationControls.style.display = 'none';
                }
            }

            const pageIndicator = document.getElementById('page-indicator');
            if (pageIndicator) {
                pageIndicator.textContent = `Halaman ${currentPage}`;
            }

            if (isInitialLoad) {
                // Bersihkan kontainer dan render dokumen reguler
                targetList.innerHTML = '';
                visibleDocs.forEach((docSnap) => {
                    const item = createMessageElement(docSnap, true, false);
                    targetList.appendChild(item);
                });
                targetList.style.opacity = '1';
                if (pinnedContainer && currentPage === 1) {
                    pinnedContainer.style.display = (pinnedIds && pinnedIds.size > 0) ? 'flex' : 'none';
                    pinnedContainer.style.opacity = '1';
                }
                isInitialLoad = false;

                // Rekam dan kunci tinggi di tampilan mobile
                if (window.innerWidth <= 767 && gbList) {
                    requestAnimationFrame(() => {
                        const h = gbList.offsetHeight;
                        if (h > lastRecordedMobileHeight) {
                            lastRecordedMobileHeight = h;
                        }
                        if (lastRecordedMobileHeight > 0) {
                            gbList.style.minHeight = `${lastRecordedMobileHeight}px`;
                        }
                    });
                } else if (gbList) {
                    gbList.style.minHeight = '';
                }
            } else {
                // Rekonsiliasi real-time langsung terhadap visibleDocs agar urutan & kuota pageLimit selalu presisi
                // (kebal terhadap pergeseran index akibat pesan pinned maupun dokumen lookahead)
                const emptyMsg = targetList.querySelector('.empty-msg');
                if (emptyMsg) emptyMsg.remove();

                const visibleIds = new Set(visibleDocs.map(d => d.id));

                // 1. Hapus item DOM yang tidak lagi masuk halaman ini (dihapus, disematkan, atau tergeser ke halaman berikutnya)
                targetList.querySelectorAll(':scope > .guestbook-item').forEach((el) => {
                    const id = el.dataset.id;
                    if (!id || !visibleIds.has(id)) {
                        if (id && replyUnsubscribers[id]) {
                            replyUnsubscribers[id]();
                            delete replyUnsubscribers[id];
                        }
                        el.remove();
                    }
                });

                // 2. Perbarui in-place atau buat item baru serta sinkronkan urutan persis sesuai visibleDocs
                visibleDocs.forEach((docSnap, index) => {
                    const docId = docSnap.id;
                    let item = targetList.querySelector(`#msg-${docId}`);
                    if (item) {
                        updateMessageElement(item, docSnap);
                    } else {
                        item = createMessageElement(docSnap, false, false);
                    }

                    const currentChildAtIndex = targetList.children[index];
                    if (currentChildAtIndex !== item) {
                        targetList.insertBefore(item, currentChildAtIndex || null);
                    }
                });
            }

            if (typeof AOS !== 'undefined') {
                clearTimeout(aosRefreshTimer);
                aosRefreshTimer = setTimeout(() => {
                    AOS.refresh();
                }, 250);
            }
        }, (error) => {
            console.warn("Guestbook listener error:", error);
            if (spinnerTimer) clearTimeout(spinnerTimer);
            if (currentPage > 1) {
                // Fallback otomatis ke halaman 1 jika kursor halaman sebelumnya tidak valid / terhapus
                loadGuestbook(1);
            } else {
                targetList.innerHTML = '<div class="guestbook-item text-center empty-msg"><p style="color: #dc3545; font-size: 0.85rem; margin-bottom: 0;">Gagal memuat ucapan. Silakan periksa koneksi internet Anda.</p></div>';
                targetList.style.opacity = '1';
            }
            if (btnPrevGb) btnPrevGb.disabled = (currentPage === 1);
            if (btnNextGb) btnNextGb.disabled = false;
        });
    }

    // --- Inisialisasi Buku Tamu Secara Cerdas (Lazy Loading untuk Best Practices 100%) ---
    let isGuestbookInitialized = false;
    const initGuestbook = async () => {
        if (isGuestbookInitialized) return;
        isGuestbookInitialized = true;

        try {
            await ensureFirebase();
        } catch (err) {
            isGuestbookInitialized = false; // Izinkan percobaan ulang otomatis saat jaringan kembali pulih
            console.warn("Guestbook Firebase init note:", err);
            return;
        }
        if (!db) {
            isGuestbookInitialized = false;
            return;
        }

        if (gbList) {
            initPinnedMessagesListener();
            loadGuestbook(1);

            if (btnNextGb && !btnNextGb.dataset.listenerAttached) {
                btnNextGb.dataset.listenerAttached = "true";
                btnNextGb.addEventListener('click', () => {
                    if (btnNextGb.disabled) return;
                    btnNextGb.disabled = true;
                    if (btnPrevGb) btnPrevGb.disabled = true;
                    if (window.innerWidth <= 767 && gbList) {
                        const h = gbList.offsetHeight;
                        if (h > lastRecordedMobileHeight) lastRecordedMobileHeight = h;
                        if (lastRecordedMobileHeight > 0) gbList.style.minHeight = `${lastRecordedMobileHeight}px`;
                    }
                    loadGuestbook(currentPage + 1);
                    gbList.scrollTop = 0;
                });
            }

            if (btnPrevGb && !btnPrevGb.dataset.listenerAttached) {
                btnPrevGb.dataset.listenerAttached = "true";
                btnPrevGb.addEventListener('click', () => {
                    if (btnPrevGb.disabled || currentPage <= 1) return;
                    btnPrevGb.disabled = true;
                    if (btnNextGb) btnNextGb.disabled = true;
                    if (window.innerWidth <= 767 && gbList) {
                        const h = gbList.offsetHeight;
                        if (h > lastRecordedMobileHeight) lastRecordedMobileHeight = h;
                        if (lastRecordedMobileHeight > 0) gbList.style.minHeight = `${lastRecordedMobileHeight}px`;
                    }
                    loadGuestbook(currentPage - 1);
                    gbList.scrollTop = 0;
                });
            }

            window.addEventListener('resize', () => {
                if (window.innerWidth > 767 && gbList) {
                    gbList.style.minHeight = '';
                } else if (window.innerWidth <= 767 && gbList && lastRecordedMobileHeight > 0) {
                    gbList.style.minHeight = `${lastRecordedMobileHeight}px`;
                }
            });
        }
    };

    // 1. Muat saat tombol 'Buka Undangan' diklik
    if (btnOpen) {
        btnOpen.addEventListener('click', initGuestbook, { once: true });
    }

    // 2. Atau saat bagian buku tamu mulai terlihat di layar
    const attendanceSection = document.getElementById('attendance');
    if (attendanceSection && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    initGuestbook();
                    observer.disconnect();
                }
            });
        }, { rootMargin: '300px' });
        observer.observe(attendanceSection);
    } else {
        // Fallback untuk browser lama
        window.addEventListener('scroll', () => {
            if (window.scrollY > 200) initGuestbook();
        }, { passive: true, once: true });
    }

    // --- Sinkronisasi Tinggi Box Kanan Otomatis (Responsive) ---
    const formContainer = document.querySelector('.attendance-form-container');
    const listContainer = document.querySelector('.attendance-list-container');

    if (formContainer && listContainer) {
        const syncHeight = () => {
            if (window.innerWidth >= 768) {
                listContainer.style.height = `${formContainer.offsetHeight}px`;
            } else {
                listContainer.style.height = 'auto';
            }
        };

        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(syncHeight);
            ro.observe(formContainer);
        }
        window.addEventListener('resize', syncHeight);
    }

    /* ==========================================================================
       12. FUNGSI UTILITAS, SALIN PAPAN KLIP & REGISTRASI PWA SERVICE WORKER
       ========================================================================== */

    // --- Logika Copy to Clipboard dengan Event Delegation (Mendukung Kartu Dinamis dari config.js) ---
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-copy');
        if (!btn) return;
        if (btn.classList.contains('copied')) return; // Mencegah race condition saat tombol ditekan cepat

        const textToCopy = btn.dataset.copy;
        if (!textToCopy) return;

        const handleSuccess = () => {
            const originalHTML = btn.innerHTML;
            btn.classList.add('copied');
            btn.innerHTML = '<i class="bi bi-check2"></i> Berhasil!';
            showToast('Nomor rekening berhasil disalin ke papan klip!');
            if (btn._copyTimer) clearTimeout(btn._copyTimer);
            btn._copyTimer = setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.remove('copied');
                btn._copyTimer = null;
            }, 2000);
        };

        const handleFallback = (text) => {
            try {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.setAttribute("readonly", "");
                textArea.style.position = "fixed";
                textArea.style.top = "0";
                textArea.style.left = "-9999px";
                textArea.style.fontSize = "16px";
                textArea.style.opacity = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.setSelectionRange(0, 99999);
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    handleSuccess();
                } else {
                    showToast('Gagal menyalin nomor rekening. Silakan salin secara manual.', 'error');
                }
            } catch (err) {
                showToast('Gagal menyalin nomor rekening. Silakan salin secara manual.', 'error');
            }
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy)
                .then(handleSuccess)
                .catch(() => handleFallback(textToCopy));
        } else {
            handleFallback(textToCopy);
        }
    });

    // --- Update Tahun Copyright Otomatis ---
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // --- Pendaftaran Service Worker (PWA Caching & Offline Optimization - Race Condition Safe) ---
    if ('serviceWorker' in navigator) {
        const registerSW = () => {
            navigator.serviceWorker.register('./sw.js').catch(err => {
                console.log('SW registration note:', err);
            });
        };

        if (document.readyState === 'complete') {
            registerSW();
        } else {
            window.addEventListener('load', registerSW);
        }
    }
});
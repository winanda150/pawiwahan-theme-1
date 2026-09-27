import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { initializeFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit, doc, updateDoc, deleteDoc, increment, deleteField, startAfter, endBefore, limitToLast, getCountFromServer, getDoc, getDocs, setDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBfSALZx3_bnG4GI7djWenNDM5UjHZLuPM",
    authDomain: "pawiwahan-theme-1.firebaseapp.com",
    projectId: "pawiwahan-theme-1",
    storageBucket: "pawiwahan-theme-1.firebasestorage.app",
    messagingSenderId: "714291588176",
    appId: "1:714291588176:web:addd15e45c498bd565b555",
    measurementId: "G-0R22TRVSEL"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
// Menggunakan initializeFirestore dengan auto-detect long polling yang fleksibel dan efisien
const db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
});

// --- FITUR ANTI-INSPECT & KLIK KANAN ---
// Menghalangi menu klik kanan
document.addEventListener('contextmenu', (e) => e.preventDefault());

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

// Variabel untuk menyimpan selisih waktu server dan lokal
let serverTimeOffset = 0;

/**
 * Fungsi untuk mengambil waktu dari server (menggunakan header Date)
 * agar countdown akurat meskipun jam HP user salah.
 */
async function syncTimeWithServer() {
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

// Logika Buka Undangan dan Putar Musik
document.addEventListener('DOMContentLoaded', async () => {
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

        AOS.init({
            duration: aosDuration,
            once: true,
            offset: aosOffset,
            easing: 'ease-in-out',
            mirror: false
        });
    };

    // Jalankan inisialisasi pertama kali
    initAOS();

    // Jalankan sinkronisasi waktu saat halaman dimuat
    await syncTimeWithServer();

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

    // --- Logika untuk mengambil nama tamu dari URL ---
    const guestNameElement = document.getElementById('guest-name');

    // Fungsi untuk mengecilkan font secara otomatis jika nama terlalu panjang (O(1) tanpa Forced Reflow)
    const adjustGuestNameSize = () => {
        if (!guestNameElement) return;
        const container = guestNameElement.parentElement;
        if (!container) return;

        const maxWidth = container.offsetWidth * 0.85; // Batas maksimal lebar (85% dari lebar container)
        guestNameElement.style.fontSize = ""; // Reset ke default CSS
        const currentSize = parseFloat(window.getComputedStyle(guestNameElement).fontSize) || 28;

        // Gunakan inline-block dan nowrap sementara untuk mengukur lebar teks asli
        guestNameElement.style.whiteSpace = 'nowrap';
        guestNameElement.style.display = 'inline-block';

        const currentWidth = guestNameElement.offsetWidth;
        if (currentWidth > maxWidth && maxWidth > 0) {
            const scale = maxWidth / currentWidth;
            const targetSize = Math.max(12, Math.floor(currentSize * scale));
            guestNameElement.style.fontSize = targetSize + 'px';
        }

        // Kembalikan ke normal
        guestNameElement.style.display = 'block';
        guestNameElement.style.whiteSpace = 'normal';
    };

    if (guestNameElement) {
        const urlParams = new URLSearchParams(window.location.search);
        const guestParam = urlParams.get('to'); // Mengambil nilai dari parameter 'to'

        if (guestParam && guestParam.trim() !== "") {
            guestNameElement.textContent = guestParam;
        } else {
            guestNameElement.textContent = "Tamu Undangan";
        }

        // Jalankan saat pertama dimuat dan setiap kali jendela di-resize
        adjustGuestNameSize();
        window.addEventListener('resize', adjustGuestNameSize);
    }

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

        // Gunakan innerHeight untuk menghitung tinggi nyata (menghindari masalah address bar di mobile)
        const vh = window.innerHeight;
        cover.style.height = `${vh}px`;

        // Pengondisian orientasi: Tambahkan class jika dalam mode landscape
        if (currentWidth > window.innerHeight) {
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
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: 'Undangan Pawiwahan',
                    artist: 'Edi & Winda',
                    album: 'Wedding Invitation',
                    artwork: [
                        { src: 'Elemen/Photo%20Gallery/Foto5.webp', sizes: '512x512', type: 'image/webp' }
                    ]
                });

                // Sinkronisasi kontrol play/pause dari Media Session (Notifikasi HP)
                navigator.mediaSession.setActionHandler('play', () => music.play());
                navigator.mediaSession.setActionHandler('pause', () => music.pause());
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
                // Refresh AOS setelah container benar-benar terbuka/berubah layout
                AOS.refresh();

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
            music.paused ? music.play() : music.pause();
        });
    }

    // --- Logika Countdown ---
    const targetDate = new Date("2026-01-30T08:00:00+08:00").getTime(); // Waktu Mempelai (Tahun-Bulan-Tanggal)
    const daysEl = document.getElementById("days");
    const hoursEl = document.getElementById("hours");
    const minsEl = document.getElementById("minutes");
    const secsEl = document.getElementById("seconds");
    let countdownInterval;

    function updateCountdown() {
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

    // Sinkronisasi ulang otomatis saat user kembali ke tab undangan
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            syncTimeWithServer().then(() => updateCountdown());
        }
    });

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
        let retries = 0;
        const maxRetries = 10; // Jumlah maksimal percobaan ulang (10 kali)

        img.addEventListener('error', function handleError() {
            // Mendapatkan URL asli tanpa parameter retry/timestamp sebelumnya
            const currentSrc = this.src.split(/[?&]retry=/)[0].split(/[?&]t=/)[0];

            if (retries < maxRetries) {
                retries++;
                console.warn(`[Retry] Gagal memuat: ${currentSrc}. Mencoba lagi (${retries}/${maxRetries})...`);

                setTimeout(() => {
                    const separator = currentSrc.includes('?') ? '&' : '?';
                    // Tambahkan query parameter unik untuk memaksa browser mengambil data baru dari server (bypass cache)
                    this.src = `${currentSrc}${separator}retry=${retries}&t=${Date.now()}`;
                }, 2000); // Jeda 2 detik antar percobaan agar tidak membebani koneksi
            }
        });

        img.addEventListener('load', () => {
            if (retries > 0) console.log(`[Retry] Berhasil memuat gambar setelah ${retries} percobaan.`);
            retries = 0; // Reset counter jika gambar akhirnya berhasil dimuat
        });
    };

    // Terapkan mekanisme retry ke semua gambar (Galeri, Mempelai, Cover, dan Lightbox)
    document.querySelectorAll('img').forEach(initImageRetry);

    // Ambil semua elemen gambar galeri yang ada di HTML
    const allGalleryImages = Array.from(document.querySelectorAll('.gallery-item img'));

    let isZoomed = false;
    let currentScale = 1;
    let initialPinchDistance = 0;
    let initialScale = 1;
    let startX = 0, startY = 0;
    let translateX = 0, translateY = 0;
    let isDragging = false;
    let galleryImages = [];
    let isTicking = false;

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

    // Fungsi untuk menyaring ulang gambar berdasarkan visibilitas CSS saat ini
    const refreshVisibleImages = () => {
        galleryImages = allGalleryImages.filter(img => {
            const parent = img.closest('.gallery-item');
            return window.getComputedStyle(parent).display !== 'none';
        });
    };

    // Inisialisasi awal dan perbarui setiap kali ukuran layar berubah
    refreshVisibleImages();

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
        if (lightboxImg) {
            lightboxImg.classList.remove('zoomed');
            lightboxImg.style.transform = '';
        }
        if (btnZoom) {
            btnZoom.innerHTML = '<i class="bi bi-zoom-in"></i>'; // Kaca pembesar dengan plus
            btnZoom.title = "Zoom Foto";
        }
    };

    const updateLightboxImage = (index, direction = null) => {
        resetZoom();
        const isNext = direction === 'next';
        const isPrev = direction === 'prev';

        // Pilih kelas transisi berdasarkan arah (slide atau fade default)
        const outClass = isNext ? 'slide-next-out' : (isPrev ? 'slide-prev-out' : 'changing');
        const inClass = isNext ? 'slide-next-in' : (isPrev ? 'slide-prev-in' : null);

        lightboxImg.classList.add(outClass);
        if (lightboxLoader) {
            lightboxLoader.classList.add('show');
        }

        setTimeout(() => {
            if (index < 0) index = galleryImages.length - 1;
            if (index >= galleryImages.length) index = 0;
            currentIndex = index;

            // Siapkan posisi gambar baru (masih transparan)
            if (isNext || isPrev) {
                lightboxImg.classList.remove(outClass);
                lightboxImg.classList.add(inClass);
                // Trigger reflow agar transition: none pada 'inClass' segera diterapkan
                void lightboxImg.offsetWidth;
            }

            lightboxImg.src = galleryImages[currentIndex].src;

            if (lightboxCounter) {
                lightboxCounter.textContent = `${currentIndex + 1} / ${galleryImages.length}`;
            }

            // Mulai animasi masuk setelah gambar baru berhasil dimuat
            lightboxImg.onload = () => {
                if (isNext || isPrev) {
                    lightboxImg.classList.remove(inClass);
                } else {
                    lightboxImg.classList.remove('changing');
                }
                if (lightboxLoader) {
                    lightboxLoader.classList.remove('show');
                }
            };
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

    // Toggle Zoom Logic via Button
    btnZoom.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleZoom();
    });

    // Logika Tombol Layar Penuh (Fullscreen)
    if (btnFullscreen) {
        btnFullscreen.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!document.fullscreenElement) {
                lightbox.requestFullscreen().catch(err => {
                    console.error(`Gagal mengaktifkan mode layar penuh: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        });

        // Pantau perubahan status fullscreen untuk memperbarui ikon
        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                btnFullscreen.innerHTML = '<i class="bi bi-fullscreen-exit"></i>';
                btnFullscreen.title = "Keluar Layar Penuh";
            } else {
                btnFullscreen.innerHTML = '<i class="bi bi-arrows-fullscreen"></i>';
                btnFullscreen.title = "Layar Penuh";
            }
        });
    }

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
        lightboxImg.style.cursor = 'grabbing';
    });

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
        isDragging = false;
        if (isZoomed) lightboxImg.style.cursor = 'grab';
    });

    // Helper untuk menghitung jarak antara dua sentuhan (untuk pinch zoom)
    const getDistance = (touches) => {
        return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    };

    // Panning Logic (Touch for Mobile)
    let lastTap = 0;
    lightboxImg.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            initialPinchDistance = getDistance(e.touches);
            initialScale = currentScale;
            isDragging = false;
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
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            // Fallback jika terjadi kendala CORS
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.target = "_blank";
            link.click();
        }
    };

    btnDownload.addEventListener('click', (e) => {
        e.stopPropagation();
        const src = galleryImages[currentIndex].src;
        const extension = src.split('.').pop().split(/\#|\?/)[0];
        downloadImage(src, `Momen_Bahagia_Ke${currentIndex + 1}.${extension}`);
    });

    window.addEventListener('resize', () => {
        refreshVisibleImages();
        if (lightbox && lightbox.classList.contains('show')) {
            updateLightboxImage(currentIndex);
        }
    });

    // Pasang listener ke SEMUA gambar, tetapi tentukan index berdasarkan gambar yang sedang tampil
    allGalleryImages.forEach((img) => {
        img.addEventListener('click', () => {
            // Pastikan data gambar paling update sebelum membuka lightbox
            refreshVisibleImages();

            currentIndex = galleryImages.indexOf(img);
            updateLightboxImage(currentIndex);
            lightbox.classList.add('show');
            // Kunci scroll saat melihat foto
            document.body.style.overflow = 'hidden';
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

    lightbox.addEventListener('touchstart', (e) => {
        touchstartX = e.changedTouches[0].clientX;
        touchstartY = e.changedTouches[0].clientY;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
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
            if (confirmModal && confirmModal.classList.contains('show')) {
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
        }
    });

    const closeLightbox = () => {
        resetZoom();
        // Keluar dari mode layar penuh jika sedang aktif saat lightbox ditutup
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.log("Gagal keluar fullscreen:", err));
        }

        lightbox.classList.remove('show');
        // Kembalikan scroll jika cover sudah terbuka
        if (document.body.classList.contains('allow-scroll')) {
            document.body.style.overflow = '';
        }
    };

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
    }

    // --- Logika Hybrid Form ---
    const hybridForm = document.getElementById('hybrid-form');
    const statusSelect = document.getElementById('att-status');
    const countGroup = document.getElementById('count-group');

    // Filter input nama agar hanya karakter yang valid untuk nama/gelar (huruf, spasi, titik, koma, petik, tanda hubung)
    const nameInput = document.getElementById('att-name');
    if (nameInput) {
        nameInput.addEventListener('input', function () {
            this.value = this.value.replace(/[^a-zA-Z\s.,'\-]/g, '');
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

    // --- Helper Sanitasi HTML Global (Pencegahan XSS) ---
    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
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

    if (hybridForm) {
        hybridForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = hybridForm.querySelector('button');
            if (submitBtn.innerText === 'Berhasil!') return; // Mencegah klik ganda saat pesan sukses tampil

            const originalText = submitBtn.innerText;

            // Pencegahan spam: Jeda 10 detik antar pengiriman (kecuali mode Mempelai)
            if (!isMempelai) {
                const lastSub = localStorage.getItem('last_gb_submission');
                const now = Date.now();
                const COOLDOWN_MS = 10000;
                if (lastSub && (now - Number(lastSub)) < COOLDOWN_MS) {
                    const remainingSec = Math.ceil((COOLDOWN_MS - (now - Number(lastSub))) / 1000);
                    showToast(`Mohon tunggu ${remainingSec} detik sebelum mengirim lagi.`, 'error');
                    return;
                }
            }

            submitBtn.disabled = true;
            submitBtn.innerText = 'Mengirim...';

            try {
                if (replyingToId) {
                    // PROSES BALASAN (Sub-collection)
                    const docRef = doc(db, "messages", replyingToId);
                    const repliesRef = collection(db, "messages", replyingToId, "replies");

                    // 1. Siapkan data balasan
                    const replyData = {
                        name: document.getElementById('att-name').value,
                        message: document.getElementById('att-message').value,
                        replyTo: document.getElementById('replying-to-name').innerText, // Mencatat siapa yang dibalas
                        isMempelaiReply: isMempelai,
                        timestamp: serverTimestamp(),
                        likes: 0 // Inisialisasi field likes pada balasan
                    };

                    // Hanya tambahkan adminKey jika sedang dalam mode mempelai (token server bertingkat)
                    if (isMempelai) {
                        const mKey = sessionStorage.getItem('mKey') || "";
                        replyData.adminKey = await generateAdminToken(mKey);
                    }

                    const newReplyRef = await addDoc(repliesRef, replyData);

                    // 2. Jika ini balasan mempelai, hapus adminKey dari dokumen segera setelah terverifikasi
                    if (isMempelai) {
                        await updateDoc(newReplyRef, { adminKey: deleteField() });
                    }

                    // 3. Update counter jumlah balasan di dokumen utama
                    await updateDoc(docRef, {
                        replyCount: increment(1)
                    });

                    showToast('Balasan Anda telah terkirim.');

                    // Reset Mode Balas
                    replyingToId = null;
                    document.getElementById('reply-mode-indicator').style.display = 'none';
                } else {
                    // PROSES UCAPAN BARU
                    const guestCount = document.getElementById('att-status').value === 'Hadir' ? Number(document.getElementById('att-count').value) : 0;

                    const messageData = {
                        name: document.getElementById('att-name').value,
                        status: document.getElementById('att-status').value,
                        count: guestCount,
                        message: document.getElementById('att-message').value,
                        timestamp: serverTimestamp(),
                        likes: 0,
                        replyCount: 0,
                        isMempelai: isMempelai
                    };

                    if (isMempelai) {
                        const mKey = sessionStorage.getItem('mKey') || "";
                        messageData.adminKey = await generateAdminToken(mKey);
                    }

                    const newDoc = await addDoc(collection(db, "messages"), messageData);

                    if (isMempelai) {
                        await updateDoc(newDoc, { adminKey: deleteField() });
                    }

                    // Jalankan update metadata di background agar tidak memblokir UI sukses
                    if (guestCount > 0) {
                        setDoc(doc(db, "metadata", "totals"), {
                            totalGuests: increment(guestCount)
                        }, { merge: true }).catch(err => console.error("Metadata update failed:", err));
                    }

                    showToast('Terima kasih! Ucapan Anda telah tersimpan.');
                }

                // Simpan timestamp pengiriman terakhir (Kecuali jika Mempelai)
                if (!isMempelai) {
                    localStorage.setItem('last_gb_submission', Date.now());
                }

                submitBtn.innerText = 'Berhasil!';
                hybridForm.reset();
                if (charCounter) {
                    charCounter.textContent = '0 / 500';
                    charCounter.style.color = '#999';
                    charCounter.style.fontWeight = 'normal';
                }
                document.getElementById('att-message').placeholder = "Tuliskan ucapan manis Anda...";

                // Reset status kehadiran ke default "Pilih Konfirmasi" dan pastikan container muncul
                const formRow = statusSelect?.closest('.form-row');
                if (formRow) formRow.style.display = 'flex';
                if (statusSelect) {
                    statusSelect.value = '';
                    statusSelect.required = true;
                }
                if (countGroup) countGroup.style.display = 'block';

                setTimeout(() => {
                    submitBtn.innerText = originalText;
                }, 3000);
            } catch (error) {
                console.error("Error: ", error);
                showToast('Gagal mengirim. Silakan coba lagi.', 'error');
                submitBtn.innerText = originalText; // Revert teks jika gagal
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    // --- Logika Event Delegation untuk Read More ---
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('read-more-btn')) {
            const btn = e.target;
            const msgEl = btn.previousElementSibling;
            const fullText = msgEl.dataset.full;
            const isExpanded = btn.dataset.expanded === 'true';

            // Hapus class jika sudah ada untuk reset animasi
            msgEl.classList.remove('fade-in-text');
            void msgEl.offsetWidth; // Force reflow agar animasi bisa dipicu ulang

            if (isExpanded) {
                msgEl.textContent = fullText.substring(0, 200) + '...';
                btn.textContent = 'Baca Selengkapnya';
                btn.dataset.expanded = 'false';
            } else {
                msgEl.textContent = fullText;
                btn.textContent = 'Sembunyikan';
                btn.dataset.expanded = 'true';
            }

            // Tambahkan class untuk memicu animasi fade-in
            msgEl.classList.add('fade-in-text');
        }
    });

    // --- Logika Akses Khusus (Admin & Mempelai) ---
    let isMempelai = sessionStorage.getItem('isMempelai') === 'true' && !!sessionStorage.getItem('mKey');

    // Inisialisasi status tampilan mempelai jika sudah login di session sebelumnya
    if (isMempelai) {
        document.getElementById('guestbook-list')?.classList.add('mempelai-mode');
    }

    // Fungsi untuk memantau total tamu secara real-time (Privat untuk Mempelai)
    function initGuestCounter() {
        const guestStatsWrapper = document.getElementById('guest-stats-wrapper');
        const guestCounter = document.getElementById('guest-counter');

        if (isMempelai && guestStatsWrapper && guestCounter) {
            guestStatsWrapper.style.display = 'inline';
            // Pastikan listener Firestore hanya didaftarkan sekali
            if (!guestStatsWrapper.dataset.listenerActive) {
                guestStatsWrapper.dataset.listenerActive = "true";
                onSnapshot(doc(db, "metadata", "totals"), (docSnap) => {
                    if (docSnap.exists()) {
                        guestCounter.innerText = docSnap.data().totalGuests || 0;
                    }
                }, (error) => console.warn("Guest counter listener error:", error));
            }
        }
    }
    initGuestCounter(); // Jalankan saat halaman dimuat (untuk cek session)

    // Helper Kriptografi SHA-256 untuk keamanan kata sandi
    async function sha256(str) {
        const buffer = new TextEncoder().encode(str);
        const digest = await crypto.subtle.digest('SHA-256', buffer);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Token Otorisasi Server Berlapis (HMAC-style Salted Token)
    async function generateAdminToken(plainPass) {
        return await sha256(plainPass + "@pawiwahan-secure-backend-key-2026");
    }

    // Hash SHA-256 dari kata sandi Mempelai (Level 1: Verifikasi Frontend)
    const MEMPELAI_HASH = "e58fb6b9713fea3141744cbf988eb1852d68816e16f9615ad2621b6e16377a47";
    const replyUnsubscribers = {}; // Simpan fungsi unsubscribe untuk listener balasan

    let replyingToId = null; // Menyimpan ID pesan yang sedang dibalas
    let docIdToDelete = null; // Pindahkan ke sini agar nilainya tidak ter-reset saat modal konfirmasi muncul
    let parentIdForReply = null; // Menyimpan ID pesan utama jika yang dihapus adalah balasan

    // --- Logika Modal Password Modern (Mode Mempelai) ---
    const authModal = document.getElementById('mempelai-auth-modal');
    const authForm = document.getElementById('mempelai-auth-form');
    const pwdInput = document.getElementById('mempelai-password-input');
    const togglePwdBtn = document.getElementById('btn-toggle-mempelai-pwd');
    const cancelAuthBtn = document.getElementById('btn-cancel-auth');

    const openAuthModal = () => {
        if (!authModal) return;
        authModal.classList.add('show');
        if (pwdInput) {
            pwdInput.value = '';
            pwdInput.type = 'password';
            setTimeout(() => pwdInput.focus(), 150);
        }
        if (togglePwdBtn) {
            const icon = togglePwdBtn.querySelector('i');
            if (icon) icon.className = 'bi bi-eye';
        }
    };

    const closeAuthModal = () => {
        if (!authModal) return;
        authModal.classList.remove('show');
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

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pass = pwdInput ? pwdInput.value : '';
            const inputHash = await sha256(pass);

            if (inputHash === MEMPELAI_HASH) {
                isMempelai = true;
                sessionStorage.setItem('isMempelai', 'true');
                sessionStorage.setItem('mKey', pass);
                document.getElementById('guestbook-list')?.classList.add('mempelai-mode');
                initGuestCounter(); // Tampilkan statistik tamu saat login berhasil
                showToast("Mode Mempelai Aktif");
                closeAuthModal();
            } else {
                showToast("Kata sandi salah.", "error");
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
        });
    }

    // Pemicu login: klik judul section 5x
    const sectionTitle = document.querySelector('#attendance .section-title');
    let clickCount = 0;
    if (sectionTitle) {
        sectionTitle.addEventListener('click', () => {
            clickCount++;
            if (clickCount === 5) {
                openAuthModal();
                clickCount = 0;
            }
        });
    }

    // Inisialisasi tampilan jika sudah login di session sebelumnya
    function createReplyItemElement(rDoc, parentId, parentName) {
        const rData = rDoc.data();
        const rDocId = rDoc.id;
        const rLikes = rData.likes || 0;
        const likedReplies = JSON.parse(localStorage.getItem('liked_replies') || '[]');
        const isReplyLiked = likedReplies.includes(rDocId);

        const rMessage = rData.message || '';
        const rIsLong = rMessage.length > 200;
        const rPreviewText = rIsLong ? rMessage.substring(0, 200) + '...' : rMessage;

        let rFullDate = 'Baru saja';
        if (rData.timestamp) {
            try {
                const rDateObj = rData.timestamp.toDate ? rData.timestamp.toDate() : new Date(rData.timestamp);
                if (!isNaN(rDateObj.getTime())) {
                    const rDateStr = rDateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
                    const rTimeStr = rDateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
                    rFullDate = `${rDateStr} pukul ${rTimeStr} Wita`;
                }
            } catch (e) {
                rFullDate = 'Baru saja';
            }
        }

        const safeName = escapeHTML(rData.name || 'Tamu');
        const safePreview = escapeHTML(rPreviewText);
        const safeReplyTo = escapeHTML(rData.replyTo || '');

        const mentionHTML = rData.replyTo && rData.replyTo !== parentName
            ? `<span class="reply-to-mention">${safeReplyTo}</span>`
            : '';

        const replyItem = document.createElement('div');
        replyItem.id = `reply-${rDocId}`;
        replyItem.className = 'gb-reply-item fade-in-text';
        replyItem.style.marginBottom = '20px';
        replyItem.innerHTML = `
            <div class="gb-header-row">
                <div class="gb-avatar"><i class="bi bi-person-circle"></i></div>
                <div class="gb-info">
                    <div class="gb-top-row">
                        <span class="gb-name">${safeName}</span>${rData.isMempelaiReply ? '<i class="bi bi-patch-check-fill verified-icon"></i>' : ''}
                        <button class="delete-btn" data-id="${rDocId}" data-parent-id="${parentId}" title="Hapus Balasan" aria-label="Hapus balasan"><i class="bi bi-trash"></i></button>
                    </div>
                    <div class="gb-meta"><span class="gb-time">${rFullDate}</span></div>
                </div>
            </div>
            <p class="gb-message">${mentionHTML}<span class="msg-text">${safePreview}</span>${rIsLong ? '<button class="read-more-btn" data-expanded="false">Baca Selengkapnya</button>' : ''}</p>
            <div class="gb-actions" style="margin-top: -5px;">
                <button class="reply-btn" data-id="${parentId}" data-name="${safeName}">Balas</button>
                <button class="like-btn" data-id="${rDocId}" data-parent-id="${parentId}" data-likes="${rLikes}" aria-label="${isReplyLiked ? 'Batal menyukai balasan ini' : 'Sukai balasan ini'}">
                    <i class="bi ${isReplyLiked ? 'bi-heart-fill' : 'bi-heart'}"></i> <span class="like-count ${isReplyLiked ? 'liked' : ''}">${rLikes > 0 ? rLikes : ''}</span>
                </button>
            </div>
        `;
        if (rIsLong) replyItem.querySelector('.msg-text').dataset.full = rMessage;
        return replyItem;
    }

    function updateReplyItemElement(existingReply, rDoc) {
        const rData = rDoc.data();
        const rLikes = rData.likes || 0;
        const likedReplies = JSON.parse(localStorage.getItem('liked_replies') || '[]');
        const isReplyLiked = likedReplies.includes(rDoc.id);

        const rMessage = rData.message || '';
        const rIsLong = rMessage.length > 200;
        const rPreviewText = rIsLong ? rMessage.substring(0, 200) + '...' : rMessage;

        let rFullDate = 'Baru saja';
        if (rData.timestamp) {
            try {
                const rDateObj = rData.timestamp.toDate ? rData.timestamp.toDate() : new Date(rData.timestamp);
                if (!isNaN(rDateObj.getTime())) {
                    const rDateStr = rDateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
                    const rTimeStr = rDateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
                    rFullDate = `${rDateStr} pukul ${rTimeStr} Wita`;
                }
            } catch (e) {
                rFullDate = 'Baru saja';
            }
        }

        const rNameEl = existingReply.querySelector('.gb-name');
        if (rNameEl) rNameEl.textContent = rData.name || 'Tamu';

        const rTimeEl = existingReply.querySelector('.gb-time');
        if (rTimeEl) rTimeEl.textContent = rFullDate;

        const rMsgContainer = existingReply.querySelector('.gb-message');
        const rMsgTextEl = rMsgContainer?.querySelector('.msg-text');
        if (rMsgTextEl) {
            const rReadMoreBtn = rMsgContainer.querySelector('.read-more-btn');
            const rIsExpanded = rReadMoreBtn && rReadMoreBtn.dataset.expanded === 'true';
            if (!rIsExpanded) rMsgTextEl.textContent = rPreviewText;
            if (rIsLong) rMsgTextEl.dataset.full = rMessage;
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

        const rVerifiedIcon = existingReply.querySelector('.verified-icon');
        if (rData.isMempelaiReply && !rVerifiedIcon && rNameEl) {
            const icon = document.createElement('i');
            icon.className = 'bi bi-patch-check-fill verified-icon';
            rNameEl.after(icon);
        } else if (!rData.isMempelaiReply && rVerifiedIcon) {
            rVerifiedIcon.remove();
        }
    }

    document.addEventListener('click', async (e) => {
        // 1. Klik Tombol Balas (Publik)
        const confirmModal = document.getElementById('custom-confirm-modal');
        if (e.target.classList.contains('reply-btn')) {
            const docId = e.target.dataset.id;
            const docName = e.target.dataset.name;

            replyingToId = docId;

            // Tampilkan indikator balas di form
            const indicator = document.getElementById('reply-mode-indicator');
            const nameSpan = document.getElementById('replying-to-name');
            indicator.style.display = 'flex';
            nameSpan.innerText = docName;

            // Scroll ke form
            document.querySelector('.attendance-card').scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Fokus ke textarea ucapan
            document.getElementById('att-message').placeholder = `Tulis balasan untuk ${docName}...`;
            document.getElementById('att-message').focus();

            // Sembunyikan input kehadiran & jumlah tamu saat mode balas
            const formRow = statusSelect?.closest('.form-row');
            if (formRow) formRow.style.display = 'none';
            if (statusSelect) statusSelect.required = false; // Hilangkan required agar form bisa dikirim tanpa status
        }

        // 2. Klik Cancel Balas
        if (e.target.id === 'cancel-reply') {
            replyingToId = null;
            document.getElementById('reply-mode-indicator').style.display = 'none';
            document.getElementById('att-message').placeholder = "Tuliskan ucapan manis Anda...";

            // Kembalikan tampilan input kehadiran
            const formRow = statusSelect?.closest('.form-row');
            if (formRow) formRow.style.display = 'flex';
            if (statusSelect) {
                statusSelect.required = true;
                if (countGroup) countGroup.style.display = statusSelect.value === 'Tidak Hadir' ? 'none' : 'block';
            }
        }

        // 3. Klik Tombol Like
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) {
            const docId = likeBtn.dataset.id;
            const parentId = likeBtn.dataset.parentId; // Jika ada, berarti ini like untuk balasan
            const currentLikes = parseInt(likeBtn.dataset.likes || '0', 10);
            const likeCountSpan = likeBtn.querySelector('.like-count');
            const likeIcon = likeBtn.querySelector('i');

            // Gunakan key penyimpanan yang berbeda untuk ucapan utama dan balasan
            const storageKey = parentId ? 'liked_replies' : 'liked_messages';
            let likedItems = JSON.parse(localStorage.getItem(storageKey) || '[]');
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

            // Tentukan referensi dokumen (ucapan utama vs balasan)
            const docRef = parentId
                ? doc(db, "messages", parentId, "replies", docId)
                : doc(db, "messages", docId);

            try {
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
                    localStorage.setItem(storageKey, JSON.stringify(likedItems));

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
                    localStorage.setItem(storageKey, JSON.stringify(likedItems));

                    await updateDoc(docRef, { likes: increment(1) });
                }
            } catch (error) {
                console.error("Error liking message:", error);
                showToast("Gagal memperbarui suka.", "error");
                // Revert UI jika terjadi kesalahan
                if (isAlreadyLiked) {
                    likeCountSpan.classList.add('liked'); // Kembalikan warna merah jika sebelumnya sudah liked
                    likeIcon.classList.remove('bi-heart');
                    likeIcon.classList.add('bi-heart-fill');
                } else {
                    likeIcon.classList.remove('bi-heart-fill');
                    likeIcon.classList.add('bi-heart');
                    likeCountSpan.classList.remove('liked'); // Hapus warna merah jika sebelumnya belum liked
                }
                likeCountSpan.textContent = currentLikes > 0 ? currentLikes : '';
            } finally {
                setTimeout(() => { likeBtn.disabled = false; }, 500);
            }
        }

        // 3. Klik Tombol Hapus (Hanya Mempelai)
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            docIdToDelete = deleteBtn.dataset.id;
            parentIdForReply = deleteBtn.dataset.parentId || null;
            
            const mKey = sessionStorage.getItem('mKey');
            if (!isMempelai || !mKey) {
                showToast("Sesi Mempelai belum aktif atau telah kedaluwarsa. Silakan login kembali.", "error");
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
        }

        if (e.target.id === 'btn-delete-confirm' && docIdToDelete) {
            try {
                const mKey = sessionStorage.getItem('mKey');
                if (!mKey) {
                    showToast("Sesi telah kedaluwarsa. Silakan masukkan kata sandi kembali.", "error");
                    openAuthModal();
                    confirmModal.classList.remove('show');
                    return;
                }
                const adminSecretHash = await generateAdminToken(mKey);

                if (parentIdForReply) {
                    const replyRef = doc(db, "messages", parentIdForReply, "replies", docIdToDelete);
                    // 1. Otorisasi hapus balasan ke server Firestore
                    await updateDoc(replyRef, { deleteSecret: adminSecretHash });
                    // 2. Hapus balasan dari sub-koleksi
                    await deleteDoc(replyRef);
                    // 3. Kurangi counter balasan di dokumen utama
                    try {
                        await updateDoc(doc(db, "messages", parentIdForReply), {
                            replyCount: increment(-1)
                        });
                    } catch (cntErr) {
                        console.warn("Reply count update note:", cntErr);
                    }
                } else {
                    // Ambil data pesan dulu untuk tahu berapa tamu yang harus dikurangi
                    const msgRef = doc(db, "messages", docIdToDelete);
                    const msgSnap = await getDoc(msgRef);

                    if (msgSnap.exists()) {
                        const msgData = msgSnap.data();
                        if (msgData.status === 'Hadir' && msgData.count > 0) {
                            try {
                                await setDoc(doc(db, "metadata", "totals"), {
                                    totalGuests: increment(-msgData.count)
                                }, { merge: true });
                            } catch (metaErr) {
                                console.warn("Metadata total update note:", metaErr);
                            }
                        }

                        // Hapus semua sub-koleksi balasan terlebih dahulu agar tidak menjadi phantom document (italic)
                        try {
                            const repliesSnap = await getDocs(collection(db, "messages", docIdToDelete, "replies"));
                            for (const rDoc of repliesSnap.docs) {
                                try {
                                    await updateDoc(rDoc.ref, { deleteSecret: adminSecretHash });
                                    await deleteDoc(rDoc.ref);
                                } catch (rErr) {
                                    console.warn("Reply doc delete note:", rErr);
                                }
                            }
                        } catch (subErr) {
                            console.warn("Sub-replies cleanup note:", subErr);
                        }
                    }

                    // 1. Otorisasi hapus pesan utama ke server Firestore
                    await updateDoc(msgRef, { deleteSecret: adminSecretHash });
                    // 2. Hapus pesan utama secara permanen
                    await deleteDoc(msgRef);
                }
                showToast("Pesan berhasil dihapus.");
            } catch (error) {
                console.error("Gagal menghapus pesan:", error);
                if (error.code === 'permission-denied' || error.message?.includes('permission')) {
                    showToast("Gagal: Izin ditolak. Pastikan Rules Firestore sudah dipublikasikan.", "error");
                } else {
                    showToast("Gagal menghapus pesan. Pastikan Anda memiliki akses yang sah.", "error");
                }
            }
            confirmModal.classList.remove('show');
            docIdToDelete = null;
            parentIdForReply = null;
        }

        if (e.target.id === 'btn-cancel-confirm' || e.target === confirmModal) {
            confirmModal.classList.remove('show');
            docIdToDelete = null;
            parentIdForReply = null;
        }

        // 4. Klik Tombol Pin / Unpin Ucapan (Hanya Mempelai)
        const pinBtn = e.target.closest('.pin-btn');
        if (pinBtn) {
            const docId = pinBtn.dataset.id;
            const isCurrentlyPinned = pinBtn.dataset.pinned === 'true';

            const mKey = sessionStorage.getItem('mKey');
            if (!isMempelai || !mKey) {
                showToast("Sesi Mempelai belum aktif atau telah kedaluwarsa. Silakan login kembali.", "error");
                openAuthModal();
                return;
            }

            pinBtn.disabled = true;
            try {
                const adminSecretHash = await generateAdminToken(mKey);
                const msgRef = doc(db, "messages", docId);
                if (isCurrentlyPinned) {
                    await updateDoc(msgRef, {
                        isPinned: false,
                        adminKey: adminSecretHash
                    });
                    await updateDoc(msgRef, { adminKey: deleteField() });
                    showToast("Sematan ucapan dilepas.");
                } else {
                    await updateDoc(msgRef, {
                        isPinned: true,
                        pinnedAt: serverTimestamp(),
                        adminKey: adminSecretHash
                    });
                    await updateDoc(msgRef, { adminKey: deleteField() });
                    showToast("Ucapan berhasil disematkan!");
                }
            } catch (error) {
                console.error("Error toggling pin status:", error);
                if (error.code === 'permission-denied' || error.message?.includes('permission')) {
                    showToast("Gagal: Izin ditolak. Pastikan Rules Firestore sudah dipublikasikan.", "error");
                } else {
                    showToast("Gagal mengubah status sematan.", "error");
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
                                    const existingReply = document.getElementById(`reply-${rDocId}`);

                                    if (change.type === "added") {
                                        if (!existingReply) {
                                            const replyItem = createReplyItemElement(rDoc, docId, parentName);
                                            replyContent.appendChild(replyItem);
                                        }
                                    } else if (change.type === "modified" && existingReply) {
                                        updateReplyItemElement(existingReply, rDoc);
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
                }

                replyContent.style.display = isHidden ? 'block' : 'none';
                btn.innerHTML = isHidden
                    ? `<i class="bi bi-chevron-up"></i> Sembunyikan balasan`
                    : `<i class="bi bi-arrow-return-right"></i> Lihat ${btn.dataset.count || 0} balasan lainnya`;
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

    async function updateTotalCount() {
        try {
            const coll = collection(db, "messages");
            const snapshot = await getCountFromServer(coll);
            const total = snapshot.data().count;
            if (messageCounter) messageCounter.innerText = total;

            const paginationControls = document.getElementById('pagination-controls');
            if (paginationControls) {
                paginationControls.style.display = total > 10 ? 'flex' : 'none';
            }
        } catch (error) {
            console.error("Gagal mengambil total ucapan:", error);
        }
    }

    function createMessageElement(docSnap, isInitial = false, isPinnedContainer = false) {
        const data = docSnap.data();
        const docId = docSnap.id;
        const likedMessages = JSON.parse(localStorage.getItem('liked_messages') || '[]');
        const isPinned = data.isPinned === true;

        const dateObj = data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)) : new Date();
        const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
        const date = data.timestamp ? `${dateStr} pukul ${timeStr} Wita` : 'Baru saja';

        const statusClass = data.status === 'Hadir' ? 'status-hadir' : 'status-absen';
        const message = data.message || '';
        const isLong = message.length > 200;
        const previewText = isLong ? message.substring(0, 200) + '...' : message;
        const likes = data.likes || 0;
        const isAlreadyLiked = likedMessages.includes(docId);

        const safeName = escapeHTML(data.name || 'Tamu');
        const safeStatus = escapeHTML(data.status || 'Hadir');
        const safePreview = escapeHTML(previewText);

        const item = document.createElement('div');
        item.id = isPinnedContainer ? `pinned-msg-${docId}` : `msg-${docId}`;
        item.dataset.id = docId;
        item.className = `guestbook-item ${isPinned ? 'is-pinned ' : ''}${isInitial ? 'fade-in-up' : ''}`;
        item.innerHTML = `
            ${isPinned ? `
            <div class="gb-pinned-badge">
                <i class="bi bi-pin-angle-fill"></i> Pesan Disematkan
            </div>
            ` : ''}
            <div class="gb-header-row">
                <div class="gb-avatar">
                    <i class="bi bi-person-circle"></i>
                </div>
                <div class="gb-info">
                    <div class="gb-top-row">
                        <span class="gb-name">${safeName}</span>${data.isMempelai ? '<i class="bi bi-patch-check-fill verified-icon"></i>' : ''}
                        <span class="status-badge ${statusClass}">${safeStatus}</span>
                        <div class="gb-admin-actions">
                            <button class="pin-btn ${isPinned ? 'pinned' : ''}" data-id="${docId}" data-pinned="${isPinned}" title="${isPinned ? 'Lepas Sematan' : 'Sematkan Ucapan'}" aria-label="${isPinned ? 'Lepas sematan ucapan' : 'Sematkan ucapan'}">
                                <i class="bi ${isPinned ? 'bi-pin-angle-fill' : 'bi-pin-angle'}"></i>
                            </button>
                            <button class="delete-btn" data-id="${docId}" title="Hapus Ucapan" aria-label="Hapus ucapan"><i class="bi bi-trash"></i></button>
                        </div>
                    </div>
                    <div class="gb-meta">
                        <span class="gb-time">${date}</span>
                    </div>
                </div>
            </div>
            <p class="gb-message"><span class="msg-text">${safePreview}</span>${isLong ? '<button class="read-more-btn" data-expanded="false">Baca Selengkapnya</button>' : ''}</p>
            <div class="gb-actions">
                <button class="reply-btn" data-id="${docId}" data-name="${safeName}">Balas</button>
                <button class="like-btn" data-id="${docId}" data-likes="${likes}" aria-label="${isAlreadyLiked ? 'Batal menyukai ucapan ini' : 'Sukai ucapan ini'}">
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
        if (isLong) item.querySelector('.msg-text').dataset.full = message;
        return item;
    }

    function updateMessageElement(existingItem, docSnap) {
        const data = docSnap.data();
        const isPinned = data.isPinned === true;
        const dateObj = data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)) : new Date();
        const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
        const date = data.timestamp ? `${dateStr} pukul ${timeStr} Wita` : 'Baru saja';

        const statusClass = data.status === 'Hadir' ? 'status-hadir' : 'status-absen';
        const message = data.message || '';
        const isLong = message.length > 200;
        const previewText = isLong ? message.substring(0, 200) + '...' : message;
        const likes = data.likes || 0;
        const likedMessages = JSON.parse(localStorage.getItem('liked_messages') || '[]');
        const isAlreadyLiked = likedMessages.includes(docSnap.id);

        existingItem.classList.toggle('is-pinned', isPinned);

        let pinnedBadge = existingItem.querySelector('.gb-pinned-badge');
        if (isPinned) {
            if (!pinnedBadge) {
                pinnedBadge = document.createElement('div');
                pinnedBadge.className = 'gb-pinned-badge';
                pinnedBadge.innerHTML = '<i class="bi bi-pin-angle-fill"></i> Pesan Disematkan';
                existingItem.prepend(pinnedBadge);
            }
        } else if (pinnedBadge) {
            pinnedBadge.remove();
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

        const nameEl = existingItem.querySelector('.gb-name');
        if (nameEl) nameEl.textContent = data.name;

        const verifiedIcon = existingItem.querySelector('.verified-icon');
        if (data.isMempelai && !verifiedIcon && nameEl) {
            const icon = document.createElement('i');
            icon.className = 'bi bi-patch-check-fill verified-icon';
            nameEl.after(icon);
        } else if (!data.isMempelai && verifiedIcon) {
            verifiedIcon.remove();
        }

        const badgeEl = existingItem.querySelector('.status-badge');
        if (badgeEl) {
            badgeEl.textContent = data.status;
            badgeEl.className = `status-badge ${statusClass}`;
        }

        const timeEl = existingItem.querySelector('.gb-time');
        if (timeEl) timeEl.textContent = date;

        const msgContainer = existingItem.querySelector('.gb-message');
        const msgTextEl = msgContainer?.querySelector('.msg-text');
        if (msgTextEl) {
            const readMoreBtn = msgContainer.querySelector('.read-more-btn');
            const isExpanded = readMoreBtn && readMoreBtn.dataset.expanded === 'true';
            if (!isExpanded) msgTextEl.textContent = previewText;
            if (isLong) msgTextEl.dataset.full = message;
        }

        const likeBtn = existingItem.querySelector('.like-btn');
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

        const viewReplyBtn = existingItem.querySelector('.view-reply-btn');
        if (viewReplyBtn) {
            viewReplyBtn.dataset.count = data.replyCount || 0;
            const replyContent = existingItem.querySelector('.gb-reply');
            const isVisible = replyContent && replyContent.style.display !== 'none';
            viewReplyBtn.innerHTML = isVisible
                ? `<i class="bi bi-chevron-up"></i> Sembunyikan balasan`
                : `<i class="bi bi-arrow-return-right"></i> Lihat ${data.replyCount || 0} balasan lainnya`;

            if ((data.replyCount || 0) <= 0) {
                existingItem.querySelector('.reply-toggle-container')?.remove();
            }
        } else if (data.replyCount > 0) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = `
                <div class="reply-toggle-container">
                    <div id="reply-content-${docSnap.id}" class="gb-reply fade-in-text" style="display: none;"></div>
                    <button class="view-reply-btn" data-id="${docSnap.id}" data-count="${data.replyCount || 0}" data-parent-name="${data.name}">
                        <i class="bi bi-arrow-return-right"></i> Lihat ${data.replyCount || 0} balasan lainnya
                    </button>
                </div>
            `;
            const toggleContainer = tempDiv.firstElementChild;
            if (toggleContainer) existingItem.appendChild(toggleContainer);
        }
    }

    function initPinnedMessagesListener() {
        if (unsubscribePinned) unsubscribePinned();
        const pinnedContainer = document.getElementById('pinned-messages-list');
        if (!pinnedContainer) return;

        const qPinned = query(collection(db, "messages"), where("isPinned", "==", true));
        unsubscribePinned = onSnapshot(qPinned, (snapshot) => {
            pinnedIds.clear();
            if (snapshot.empty) {
                pinnedContainer.style.display = 'none';
                pinnedContainer.innerHTML = '';
                return;
            }

            // Urutkan ucapan yang disematkan berdasarkan pinnedAt atau timestamp terbaru
            const sortedDocs = snapshot.docs.slice().sort((a, b) => {
                const timeA = a.data().pinnedAt?.toMillis?.() || a.data().timestamp?.toMillis?.() || 0;
                const timeB = b.data().pinnedAt?.toMillis?.() || b.data().timestamp?.toMillis?.() || 0;
                return timeB - timeA;
            });

            const currentPinnedIds = new Set();
            sortedDocs.forEach(docSnap => {
                pinnedIds.add(docSnap.id);
                currentPinnedIds.add(docSnap.id);
            });

            // 1. Hapus elemen pin yang sudah tidak disematkan
            pinnedContainer.querySelectorAll('.guestbook-item').forEach(el => {
                const id = el.dataset.id;
                if (!currentPinnedIds.has(id)) {
                    el.remove();
                }
            });

            // 2. Render atau perbarui elemen pin secara in-place (mencegah reset balasan yang terbuka)
            sortedDocs.forEach((docSnap, index) => {
                const docId = docSnap.id;
                const existing = pinnedContainer.querySelector(`#pinned-msg-${docId}`);
                if (existing) {
                    updateMessageElement(existing, docSnap);
                } else {
                    const item = createMessageElement(docSnap, true, true);
                    if (index === 0) {
                        pinnedContainer.prepend(item);
                    } else {
                        const referenceNode = pinnedContainer.children[index];
                        if (referenceNode) {
                            pinnedContainer.insertBefore(item, referenceNode);
                        } else {
                            pinnedContainer.appendChild(item);
                        }
                    }
                }
            });

            pinnedContainer.style.display = 'flex';

            // 3. Pastikan tidak ada duplikat di daftar pesan reguler
            sortedDocs.forEach(docSnap => {
                const regItem = document.querySelector(`#regular-messages-list #msg-${docSnap.id}`);
                if (regItem) regItem.remove();
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
        if (page === 1 || !pageCursors[page]) {
            return query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(10));
        }
        return query(collection(db, "messages"), orderBy("timestamp", "desc"), startAfter(pageCursors[page]), limit(10));
    }

    function loadGuestbook(page = 1) {
        if (unsubscribeGb) unsubscribeGb();
        // Bersihkan semua listener balasan aktif dari halaman sebelumnya
        Object.values(replyUnsubscribers).forEach(unsub => unsub && typeof unsub === 'function' && unsub());
        for (const key in replyUnsubscribers) delete replyUnsubscribers[key];

        currentPage = page;
        let isInitialLoad = true;
        const targetList = document.getElementById('regular-messages-list') || gbList;

        // Reset list dan tampilkan spinner saat memuat halaman
        targetList.innerHTML = `
            <div id="gb-loading" class="text-center" style="padding: 40px 0;">
                <div class="spinner" style="margin: 0 auto;"></div>
                <p style="color: #999; margin-top: 15px; font-size: 0.9rem; font-style: italic;">Memuat ucapan...</p>
            </div>
        `;

        const q = getQueryForPage(currentPage);

        unsubscribeGb = onSnapshot(q, (snapshot) => {
            updateTotalCount();

            if (snapshot.empty) {
                targetList.innerHTML = '<div class="guestbook-item text-center empty-msg"><p style="color: #999; font-style: italic; margin-bottom: 0;">Belum ada ucapan. Jadilah yang pertama memberikan ucapan!</p></div>';
                if (btnNextGb) btnNextGb.disabled = true;
                if (btnPrevGb) btnPrevGb.disabled = currentPage === 1;
                return;
            }

            // Simpan cursor untuk halaman berikutnya (jika ada dokumen)
            if (snapshot.docs.length > 0) {
                pageCursors[currentPage + 1] = snapshot.docs[snapshot.docs.length - 1];
            }

            // Update status tombol navigasi (berikutnya aktif hanya jika ada 10 dokumen)
            if (btnNextGb) btnNextGb.disabled = snapshot.size < 10;
            if (btnPrevGb) btnPrevGb.disabled = currentPage === 1;

            if (isInitialLoad) {
                // Bersihkan kontainer dan render hanya dokumen yang belum disematkan
                targetList.innerHTML = '';
                snapshot.docs.forEach((docSnap) => {
                    if (docSnap.data().isPinned === true) return;
                    const item = createMessageElement(docSnap, true, false);
                    targetList.appendChild(item);
                });
                isInitialLoad = false;
            } else {
                // Real-time update untuk halaman saat ini
                snapshot.docChanges().forEach((change) => {
                    const docSnap = change.doc;
                    const docId = docSnap.id;
                    const isDocPinned = docSnap.data().isPinned === true;
                    const existingItem = targetList.querySelector(`#msg-${docId}`);

                    if (change.type === "added") {
                        if (!existingItem && !isDocPinned) {
                            const emptyMsg = targetList.querySelector('.empty-msg');
                            if (emptyMsg) emptyMsg.remove();

                            const item = createMessageElement(docSnap, false, false);
                            if (change.newIndex === 0) {
                                targetList.prepend(item);
                            } else {
                                const referenceNode = targetList.children[change.newIndex];
                                targetList.insertBefore(item, referenceNode);
                            }
                            if (targetList.children.length > 10) {
                                targetList.lastElementChild?.remove();
                            }
                        }
                    } else if (change.type === "modified") {
                        if (isDocPinned) {
                            // Jika pesan baru saja disematkan -> Hapus dari daftar reguler
                            if (existingItem) existingItem.remove();
                        } else {
                            // Jika pesan reguler diupdate atau baru saja dilepas dari sematan
                            if (existingItem) {
                                updateMessageElement(existingItem, docSnap);
                            } else {
                                const emptyMsg = targetList.querySelector('.empty-msg');
                                if (emptyMsg) emptyMsg.remove();

                                const item = createMessageElement(docSnap, false, false);
                                if (change.newIndex === 0 || targetList.children.length === 0) {
                                    targetList.prepend(item);
                                } else {
                                    const referenceNode = targetList.children[change.newIndex];
                                    if (referenceNode) {
                                        targetList.insertBefore(item, referenceNode);
                                    } else {
                                        targetList.appendChild(item);
                                    }
                                }
                            }
                        }
                    } else if (change.type === "removed" && existingItem) {
                        if (replyUnsubscribers[docId]) {
                            replyUnsubscribers[docId]();
                            delete replyUnsubscribers[docId];
                        }
                        existingItem.remove();
                    }
                });
            }

            if (typeof AOS !== 'undefined') {
                clearTimeout(aosRefreshTimer);
                aosRefreshTimer = setTimeout(() => {
                    AOS.refresh();
                }, 250);
            }
        }, (error) => console.warn("Guestbook listener error:", error));
    }

    // --- Inisialisasi Buku Tamu Secara Cerdas (Lazy Loading untuk Best Practices 100%) ---
    let isGuestbookInitialized = false;
    const initGuestbook = () => {
        if (isGuestbookInitialized) return;
        isGuestbookInitialized = true;

        if (gbList) {
            initPinnedMessagesListener();
            loadGuestbook(1);

            if (btnNextGb && !btnNextGb.dataset.listenerAttached) {
                btnNextGb.dataset.listenerAttached = "true";
                btnNextGb.addEventListener('click', () => {
                    loadGuestbook(currentPage + 1);
                    gbList.scrollTop = 0;
                });
            }

            if (btnPrevGb && !btnPrevGb.dataset.listenerAttached) {
                btnPrevGb.dataset.listenerAttached = "true";
                btnPrevGb.addEventListener('click', () => {
                    if (currentPage > 1) {
                        loadGuestbook(currentPage - 1);
                        gbList.scrollTop = 0;
                    }
                });
            }
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

        const ro = new ResizeObserver(syncHeight);
        ro.observe(formContainer);
        window.addEventListener('resize', syncHeight);
    }

    // --- Logika Copy to Clipboard (dengan Fallback untuk WebView & Browser Lama) ---
    document.querySelectorAll('.btn-copy').forEach(btn => {
        btn.addEventListener('click', () => {
            const textToCopy = btn.dataset.copy;

            const handleSuccess = () => {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i class="bi bi-check2"></i> Berhasil!';
                showToast('Nomor rekening berhasil disalin!');
                setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
            };

            const handleFallback = (text) => {
                try {
                    const textArea = document.createElement("textarea");
                    textArea.value = text;
                    textArea.style.position = "fixed";
                    textArea.style.left = "-999999px";
                    textArea.style.top = "-999999px";
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    if (successful) {
                        handleSuccess();
                    } else {
                        showToast('Gagal menyalin teks.', 'error');
                    }
                } catch (err) {
                    showToast('Gagal menyalin teks.', 'error');
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
    });

    // --- Update Tahun Copyright Otomatis ---
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // --- Pendaftaran Service Worker (PWA Caching & Offline Optimization) ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch(err => {
                console.log('SW registration note:', err);
            });
        });
    }
});
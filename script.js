import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit, doc, updateDoc, deleteDoc, increment, deleteField, startAfter, endBefore, limitToLast, getCountFromServer, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const db = getFirestore(app);

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

    // Fungsi untuk mengecilkan font secara otomatis jika nama terlalu panjang
    const adjustGuestNameSize = () => {
        if (!guestNameElement) return;
        const container = guestNameElement.parentElement;
        if (!container) return;

        const maxWidth = container.offsetWidth * 0.85; // Batas maksimal lebar (85% dari lebar container)
        guestNameElement.style.fontSize = ""; // Reset ke default CSS (agar perhitungan mulai dari awal)
        let currentSize = parseFloat(window.getComputedStyle(guestNameElement).fontSize);

        // Gunakan inline-block dan nowrap sementara untuk mengukur lebar teks asli tanpa terpotong
        guestNameElement.style.whiteSpace = 'nowrap';
        guestNameElement.style.display = 'inline-block';

        while (guestNameElement.offsetWidth > maxWidth && currentSize > 12) {
            currentSize -= 1; // Kecilkan 1 pixel setiap perulangan
            guestNameElement.style.fontSize = currentSize + 'px';
        }

        // Kembalikan ke normal agar tata letak tetap rapi
        guestNameElement.style.display = 'block';
        guestNameElement.style.whiteSpace = 'normal';
    };

    if (guestNameElement) {
        const urlParams = new URLSearchParams(window.location.search);
        const guestParam = urlParams.get('to'); // Mengambil nilai dari parameter 'to'

        if (guestParam && guestParam.trim() !== "") {
            guestNameElement.textContent = guestParam;

            // Isi otomatis nama di form Hybrid
            const attNameInput = document.getElementById('att-name');
            if (attNameInput) attNameInput.value = guestParam.replace(/[^a-zA-Z\s]/g, '').substring(0, 20);
        } else {
            guestNameElement.textContent = "Tamu Undangan"; 
        }

        // Jalankan saat pertama dimuat dan setiap kali jendela di-resize
        adjustGuestNameSize();
        window.addEventListener('resize', adjustGuestNameSize);
    }

    // --- Logika Sinkronisasi Layout Cover saat Rotasi Layar ---
    const handleOrientationChange = () => {
        if (!cover || cover.classList.contains('opened')) return;

        // Gunakan innerHeight untuk menghitung tinggi nyata (menghindari masalah address bar di mobile)
        const vh = window.innerHeight;
        cover.style.height = `${vh}px`;

        // Pengondisian orientasi: Tambahkan class jika dalam mode landscape
        if (window.innerWidth > window.innerHeight) {
            cover.classList.add('is-landscape');
        } else {
            cover.classList.remove('is-landscape');
        }

        // Jalankan penyesuaian ukuran font nama tamu agar tidak overflow setelah rotasi
        adjustGuestNameSize();

        // Memastikan posisi scroll tetap di paling atas saat rotasi
        window.scrollTo(0, 0);
    };

    handleOrientationChange(); // Jalankan sekali saat inisialisasi
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

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
                const particleCount = 50; // Menambah jumlah agar lebih ramai dan padat
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
                    
                    particlesContainer.appendChild(particle);
                }
            }

            // Kunci tinggi cover dalam pixel agar tidak berubah saat address bar mobile mengecil
            const currentHeight = cover.offsetHeight;
            cover.style.height = currentHeight + 'px';

            // Tandai cover sebagai terbuka
            cover.classList.add('opened');

            // Izinkan Scroll pada Halaman Utama (setelah cover disembunyikan)
            document.body.classList.add('allow-scroll');

            // Scroll ke konten dengan delay agar browser sempat memproses perubahan overflow body
            setTimeout(() => {
                const nextSection = document.getElementById('main-content');
                if (nextSection) {
                    nextSection.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }
            }, 100); 
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
    const targetDate = new Date("2026-01-30T08:00:00+08:00").getTime();
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

    // --- Logika Navigasi Keyboard ---
    document.addEventListener('keydown', (e) => {
        if (lightbox.classList.contains('show')) {
            if (e.key === 'ArrowRight') {
                updateLightboxImage(currentIndex + 1, 'next');
            } else if (e.key === 'ArrowLeft') {
                updateLightboxImage(currentIndex - 1, 'prev');
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

    // --- Logika Hybrid Form ---
    const hybridForm = document.getElementById('hybrid-form');
    const statusSelect = document.getElementById('att-status');
    const countGroup = document.getElementById('count-group');

    // Filter input nama agar tidak mengandung karakter khusus atau angka secara real-time
    const nameInput = document.getElementById('att-name');
    if (nameInput) {
        nameInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
        });
    }

    // Counter karakter untuk ucapan
    const messageInput = document.getElementById('att-message');
    const charCounter = document.getElementById('char-counter');
    if (messageInput && charCounter) {
        messageInput.addEventListener('input', function() {
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

    // --- Fungsi Toast Notification ---
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill';
        toast.innerHTML = `<i class="bi bi-${icon}" style="margin-right: 12px; font-size: 1.2rem; color: ${type === 'success' ? '#28a745' : '#dc3545'}"></i> ${message}`;

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

                    // Hanya tambahkan adminKey jika sedang dalam mode mempelai
                    if (isMempelai) replyData.adminKey = "mempelai123";

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
                    
                    const newDoc = await addDoc(collection(db, "messages"), {
                        name: document.getElementById('att-name').value,
                        status: document.getElementById('att-status').value,
                        count: guestCount,
                        message: document.getElementById('att-message').value,
                        timestamp: serverTimestamp(),
                        likes: 0,
                        replyCount: 0
                    });

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
    let isMempelai = sessionStorage.getItem('isMempelai') === 'true';
    
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
                });
            }
        }
    }
    initGuestCounter(); // Jalankan saat halaman dimuat (untuk cek session)

    const MEMPELAI_PASS = "mempelai123";
    const replyUnsubscribers = {}; // Simpan fungsi unsubscribe untuk listener balasan

    let replyingToId = null; // Menyimpan ID pesan yang sedang dibalas
    let docIdToDelete = null; // Pindahkan ke sini agar nilainya tidak ter-reset saat modal konfirmasi muncul
    let parentIdForReply = null; // Menyimpan ID pesan utama jika yang dihapus adalah balasan

    // Fungsi Login (Bisa dipicu dengan klik judul section 5x)
    const sectionTitle = document.querySelector('#attendance .section-title');
    let clickCount = 0;
    sectionTitle.addEventListener('click', () => {
        clickCount++;
        if (clickCount === 5) {
            const pass = prompt("Masukkan kata sandi akses khusus:");
            if (pass === MEMPELAI_PASS) {
                isMempelai = true;
                sessionStorage.setItem('isMempelai', 'true');
                document.getElementById('guestbook-list')?.classList.add('mempelai-mode');
                initGuestCounter(); // Tampilkan statistik tamu saat login berhasil
                showToast("Mode Mempelai Aktif");
            }
            clickCount = 0;
        }
    });

    // Inisialisasi tampilan jika sudah login di session sebelumnya
    if (isMempelai) document.getElementById('guestbook-list')?.classList.add('mempelai-mode');

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
            if (!isMempelai) {
                showToast("Akses ditolak: Hanya mempelai yang memiliki izin untuk menghapus.", "error");
                return;
            }
            confirmModal.classList.add('show');
        }

        if (e.target.id === 'btn-delete-confirm' && docIdToDelete) {
            try {
                if (parentIdForReply) {
                    // Hapus balasan dari sub-koleksi
                    await deleteDoc(doc(db, "messages", parentIdForReply, "replies", docIdToDelete));
                    // Kurangi counter balasan di dokumen utama
                    await updateDoc(doc(db, "messages", parentIdForReply), {
                        replyCount: increment(-1)
                    });
                } else {
                    // Ambil data pesan dulu untuk tahu berapa tamu yang harus dikurangi
                    const msgRef = doc(db, "messages", docIdToDelete);
                    const msgSnap = await getDoc(msgRef);
                    
                    if (msgSnap.exists()) {
                        const msgData = msgSnap.data();
                        if (msgData.status === 'Hadir' && msgData.count > 0) {
                            // Gunakan setDoc dengan merge agar jika dokumen belum ada, tidak error
                            await setDoc(doc(db, "metadata", "totals"), {
                                totalGuests: increment(-msgData.count)
                            }, { merge: true });
                        }
                    }
                    await deleteDoc(msgRef);
                }
                showToast("Pesan berhasil dihapus.");
            } catch (error) {
                showToast("Gagal menghapus pesan.", "error");
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

        // 4. Klik Lihat Balasan (Toggle View)
        if (e.target.classList.contains('view-reply-btn') || e.target.closest('.view-reply-btn')) {
            const btn = e.target.classList.contains('view-reply-btn') ? e.target : e.target.closest('.view-reply-btn');
            const docId = btn.dataset.id;
            const replyContent = document.getElementById(`reply-content-${docId}`);
            
            if (replyContent) {
                const isHidden = replyContent.style.display === 'none';
                
                if (isHidden) {
                    // Aktifkan Real-time listener untuk balasan jika belum ada
                    if (!replyUnsubscribers[docId]) {
                        replyContent.innerHTML = ''; // Bersihkan kontainer saat pertama kali dibuka
                    const repliesRef = collection(db, "messages", docId, "replies");
                    const qReplies = query(repliesRef, orderBy("timestamp", "asc"));
                    
                        replyUnsubscribers[docId] = onSnapshot(qReplies, (snapshot) => {
                            const likedReplies = JSON.parse(localStorage.getItem('liked_replies') || '[]');
                            snapshot.docChanges().forEach((change) => {
                                const rDoc = change.doc;
                                const rData = rDoc.data();
                                const rDocId = rDoc.id;
                                const existingReply = document.getElementById(`reply-${rDocId}`);
                                const rLikes = rData.likes || 0;
                                const isReplyLiked = likedReplies.includes(rDocId);

                                const rMessage = rData.message || '';
                                const rIsLong = rMessage.length > 200;
                                const rPreviewText = rIsLong ? rMessage.substring(0, 200) + '...' : rMessage;

                                const rDateObj = rData.timestamp ? rData.timestamp.toDate() : new Date();
                                const rDateStr = rDateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
                                const rTimeStr = rDateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
                                const rFullDate = rData.timestamp ? `${rDateStr} pukul ${rTimeStr} Wita` : 'Baru saja';
                                
                                const mentionHTML = rData.replyTo && rData.replyTo !== btn.dataset.parentName
                                    ? `<span class="reply-to-mention">${rData.replyTo}</span>` 
                                    : '';

                                const replyHTML = `
                                <div class="gb-header-row">
                                    <div class="gb-avatar"><i class="bi bi-person-circle"></i></div>
                                    <div class="gb-info">
                                        <div class="gb-top-row">
                                            <span class="gb-name">${rData.name}</span>${rData.isMempelaiReply ? '<i class="bi bi-patch-check-fill verified-icon"></i>' : ''}
                                            <button class="delete-btn" data-id="${rDoc.id}" data-parent-id="${docId}" title="Hapus Balasan"><i class="bi bi-trash"></i></button>
                                        </div>
                                        <div class="gb-meta"><span class="gb-time">${rFullDate}</span></div>
                                    </div>
                                </div>
                                <p class="gb-message">${mentionHTML}<span class="msg-text">${rPreviewText}</span>${rIsLong ? '<button class="read-more-btn" data-expanded="false">Baca Selengkapnya</button>' : ''}</p>
                                <div class="gb-actions" style="margin-top: -5px;">
                                    <button class="reply-btn" data-id="${docId}" data-name="${rData.name}">Balas</button>
                                    <button class="like-btn" data-id="${rDocId}" data-parent-id="${docId}" data-likes="${rLikes}">
                                        <i class="bi ${isReplyLiked ? 'bi-heart-fill' : 'bi-heart'}"></i> <span class="like-count ${isReplyLiked ? 'liked' : ''}">${rLikes > 0 ? rLikes : ''}</span>
                                    </button>
                                </div>`;

                                if (change.type === "added") {
                                    const replyItem = document.createElement('div');
                                    replyItem.id = `reply-${rDocId}`;
                                    replyItem.className = 'gb-reply-item fade-in-text';
                                    replyItem.style.marginBottom = '20px';
                                    replyItem.innerHTML = replyHTML;
                                    if (rIsLong) replyItem.querySelector('.msg-text').dataset.full = rMessage;
                                    replyContent.appendChild(replyItem);
                                } else if (change.type === "modified" && existingReply) {
                                    // OPTIMASI: Update komponen balasan secara spesifik (Cegah Flicker)
                                    const rNameEl = existingReply.querySelector('.gb-name');
                                    if (rNameEl) rNameEl.textContent = rData.name;
                                    
                                    const rMsgContainer = existingReply.querySelector('.gb-message');
                                    const rMsgTextEl = rMsgContainer?.querySelector('.msg-text');
                                    if (rMsgTextEl) {
                                        const rReadMoreBtn = rMsgContainer.querySelector('.read-more-btn');
                                        const rIsExpanded = rReadMoreBtn && rReadMoreBtn.dataset.expanded === 'true';
                                        // Update teks hanya jika tidak sedang di-expand agar tidak menutup tiba-tiba
                                        if (!rIsExpanded) rMsgTextEl.textContent = rPreviewText;
                                        if (rIsLong) rMsgTextEl.dataset.full = rMessage;
                                    }
                                    
                                    const rLikeBtn = existingReply.querySelector('.like-btn');
                                    if (rLikeBtn) {
                                        rLikeBtn.dataset.likes = rLikes;
                                        const rCountSpan = rLikeBtn.querySelector('.like-count');
                                        if (rCountSpan) {
                                            rCountSpan.textContent = rLikes > 0 ? rLikes : '';
                                            rCountSpan.classList.toggle('liked', isReplyLiked);
                                        }
                                        const rIcon = rLikeBtn.querySelector('i');
                                        if (rIcon) rIcon.className = `bi ${isReplyLiked ? 'bi-heart-fill' : 'bi-heart'}`;
                                    }

                                    const rVerifiedIcon = existingReply.querySelector('.verified-icon');
                                    if (rData.isMempelaiReply && !rVerifiedIcon) {
                                        const icon = document.createElement('i');
                                        icon.className = 'bi bi-patch-check-fill verified-icon';
                                        rNameEl.after(icon);
                                    } else if (!rData.isMempelaiReply && rVerifiedIcon) {
                                        rVerifiedIcon.remove();
                                    }
                                } else if (change.type === "removed" && existingReply) {
                                    existingReply.remove();
                                }
                            });
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

    let firstVisible = null;
    let lastVisible = null;
    let unsubscribeGb = null;
    let currentPage = 1;

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

    function loadGuestbook(q) {
        if (unsubscribeGb) unsubscribeGb();
        let isInitialLoad = true; 

        // Tampilkan spinner hanya jika list benar-benar kosong (pemuatan pertama kali)
        if (gbList.children.length === 0) {
            gbList.innerHTML = `
                <div id="gb-loading" class="text-center" style="padding: 40px 0;">
                    <div class="spinner" style="margin: 0 auto;"></div>
                    <p style="color: #999; margin-top: 15px; font-size: 0.9rem; font-style: italic;">Memuat ucapan...</p>
                </div>
            `;
        }

        unsubscribeGb = onSnapshot(q, (snapshot) => {
            updateTotalCount();
            
            // Hapus spinner dan pesan kosong jika ada data baru masuk
            const loadingSpinner = document.getElementById('gb-loading');
            const emptyMessage = gbList.querySelector('.empty-msg');
            
            if (snapshot.empty) {
                if (loadingSpinner) loadingSpinner.remove();
                if (!emptyMessage) {
                    gbList.innerHTML = '<div class="guestbook-item text-center empty-msg"><p style="color: #999; font-style: italic; margin-bottom: 0;">Belum ada ucapan. Jadilah yang pertama memberikan ucapan!</p></div>';
                }
                if (btnNextGb) btnNextGb.disabled = true;
                return;
            }

            if (loadingSpinner) loadingSpinner.remove();
            if (emptyMessage) emptyMessage.remove();

            firstVisible = snapshot.docs[0];
            lastVisible = snapshot.docs[snapshot.docs.length - 1];

            const likedMessages = JSON.parse(localStorage.getItem('liked_messages') || '[]');

            // Update status tombol navigasi
            if (btnNextGb) btnNextGb.disabled = snapshot.size < 10;
            if (btnPrevGb) btnPrevGb.disabled = currentPage === 1;
            
            snapshot.docChanges().forEach((change) => {
                const doc = change.doc;
                const data = doc.data();
                const docId = doc.id;
                const existingItem = document.getElementById(`msg-${docId}`);
                
                const dateObj = data.timestamp ? data.timestamp.toDate() : new Date();
                const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
                const date = data.timestamp ? `${dateStr} pukul ${timeStr} Wita` : 'Baru saja';

                const statusClass = data.status === 'Hadir' ? 'status-hadir' : 'status-absen';
                
                const message = data.message || '';
                const isLong = message.length > 200;
                const previewText = isLong ? message.substring(0, 200) + '...' : message;
                const likes = data.likes || 0;
                const isAlreadyLiked = likedMessages.includes(doc.id);

                const itemHTML = `
                    <div class="gb-header-row">
                        <div class="gb-avatar">
                            <i class="bi bi-person-circle"></i>
                        </div>
                        <div class="gb-info">
                            <div class="gb-top-row">
                                <span class="gb-name">${data.name}</span>
                                <span class="status-badge ${statusClass}">${data.status}</span>
                                <button class="delete-btn" data-id="${doc.id}"><i class="bi bi-trash"></i></button>
                            </div>
                            <div class="gb-meta">
                                <span class="gb-time">${date}</span>
                            </div>
                        </div>
                    </div>
                    <p class="gb-message"><span class="msg-text">${previewText}</span>${isLong ? '<button class="read-more-btn" data-expanded="false">Baca Selengkapnya</button>' : ''}</p>
                    <div class="gb-actions">
                        <button class="reply-btn" data-id="${doc.id}" data-name="${data.name}">Balas</button>
                        <button class="like-btn" data-id="${doc.id}" data-likes="${likes}">
                            <i class="bi ${isAlreadyLiked ? 'bi-heart-fill' : 'bi-heart'}"></i> <span class="like-count ${isAlreadyLiked ? 'liked' : ''}">${likes > 0 ? likes : ''}</span>
                        </button>
                    </div>
                    ${(data.replyCount > 0) ? `
                    <div class="reply-toggle-container">
                        <div id="reply-content-${doc.id}" class="gb-reply fade-in-text" style="display: none;"></div>
                        <button class="view-reply-btn" data-id="${doc.id}" data-count="${data.replyCount || 0}" data-parent-name="${data.name}">
                            <i class="bi bi-arrow-return-right"></i> Lihat ${data.replyCount || 0} balasan lainnya
                        </button>
                    </div>
                    ` : ''}
                `;

                if (change.type === "added") {
                    const item = document.createElement('div');
                    item.id = `msg-${docId}`;
                    item.className = `guestbook-item ${isInitialLoad ? 'fade-in-up' : ''}`;
                    item.innerHTML = itemHTML;
                    if (isLong) item.querySelector('.msg-text').dataset.full = message;

                    // Masukkan ke posisi yang benar berdasarkan index
                    if (change.newIndex === 0) {
                        gbList.prepend(item);
                    } else {
                        const referenceNode = gbList.children[change.newIndex];
                        gbList.insertBefore(item, referenceNode);
                    }
                } else if (change.type === "modified" && existingItem) {
                    // OPTIMASI: Update semua field utama secara spesifik
                    const nameEl = existingItem.querySelector('.gb-name');
                    if (nameEl) nameEl.textContent = data.name;

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
                        // Hanya update teks jika tidak sedang di-expand agar tidak 'loncat'
                        if (!isExpanded) msgTextEl.textContent = previewText;
                        if (isLong) msgTextEl.dataset.full = message;
                    }

                    // Update Tombol Like
                    const likeBtn = existingItem.querySelector('.like-btn');
                    if (likeBtn) {
                        likeBtn.dataset.likes = likes;
                        const countSpan = likeBtn.querySelector('.like-count');
                        if (countSpan) {
                            countSpan.textContent = likes > 0 ? likes : '';
                            countSpan.classList.toggle('liked', isAlreadyLiked);
                        }
                        const icon = likeBtn.querySelector('i');
                        if (icon) icon.className = `bi ${isAlreadyLiked ? 'bi-heart-fill' : 'bi-heart'}`;
                    }

                    // Update Kontrol Balasan
                    const viewReplyBtn = existingItem.querySelector('.view-reply-btn');
                    if (viewReplyBtn) {
                        viewReplyBtn.dataset.count = data.replyCount || 0;
                        const replyContent = existingItem.querySelector('.gb-reply');
                        const isVisible = replyContent && replyContent.style.display !== 'none';
                        viewReplyBtn.innerHTML = isVisible 
                            ? `<i class="bi bi-chevron-up"></i> Sembunyikan balasan` 
                            : `<i class="bi bi-arrow-return-right"></i> Lihat ${data.replyCount || 0} balasan lainnya`;
                        
                        // Jika balasan dihapus semua hingga 0, hilangkan foldernya
                        if (data.replyCount === 0) {
                            existingItem.querySelector('.reply-toggle-container')?.remove();
                        }
                    } else if (data.replyCount > 0) {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = itemHTML;
                        const toggleContainer = tempDiv.querySelector('.reply-toggle-container');
                        if (toggleContainer) existingItem.appendChild(toggleContainer);
                    }
                } else if (change.type === "removed" && existingItem) {
                    // Hentikan listener balasan jika pesan dihapus untuk cegah memory leak
                    if (replyUnsubscribers[docId]) {
                        replyUnsubscribers[docId]();
                        delete replyUnsubscribers[docId];
                    }
                    existingItem.remove();
                }
            });

            // Setelah render pertama selesai, set isInitialLoad ke false agar update selanjutnya tidak fade-in ulang
            isInitialLoad = false;
        });
    }

    if (gbList) {
        loadGuestbook(query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(10)));

        if (btnNextGb) {
            btnNextGb.addEventListener('click', () => {
                currentPage++;
                loadGuestbook(query(collection(db, "messages"), orderBy("timestamp", "desc"), startAfter(lastVisible), limit(10)));
            });
        }

        if (btnPrevGb) {
            btnPrevGb.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    loadGuestbook(query(collection(db, "messages"), orderBy("timestamp", "desc"), endBefore(firstVisible), limitToLast(10)));
                }
            });
        }
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

    // --- Logika Copy to Clipboard ---
    document.querySelectorAll('.btn-copy').forEach(btn => {
        btn.addEventListener('click', () => {
            const textToCopy = btn.dataset.copy;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i class="bi bi-check2"></i> Berhasil!';
                showToast('Nomor rekening berhasil disalin!');
                setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
            }).catch(err => {
                showToast('Gagal menyalin teks.', 'error');
            });
        });
    });
});
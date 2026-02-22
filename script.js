// ==========================================
// UNDANGAN PAWIWAHAN EDI & WINDA
// Created by WinandaDev
// ==========================================

// --- FIX: Saat refresh, kembali ke menu awal (cover) ---
// Nonaktifkan scroll restoration browser agar posisi scroll tidak mengingat posisi terakhir
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// Atur posisi scroll ke paling atas saat halaman dimuat
window.addEventListener('beforeunload', function() {
    window.scrollTo(0, 0);
});

// Juga lakukan reset saat halaman pertama kali dimuat
window.addEventListener('load', function() {
    // Sedikit delay untuk memastikan browser mereset posisi scroll
    setTimeout(function() {
        window.scrollTo(0, 0);
    }, 0);
});

// Galeri gambar
document.addEventListener('DOMContentLoaded', function() {
    const galleryItems = document.querySelectorAll('.gallery-item img');
    galleryItems.forEach(img => {
        img.addEventListener('click', function() {
            const gallery = document.createElement('element-gallery');
            gallery.innerHTML = `
                <div class="gallery-overlay">
                    <div class="gallery-background">
                        <div class="gallery-image-wrapper">
                            <svg class="close-gallery" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                            <img src="${this.src}" class="gallery-info">
                        </div>
                    </div>
                </div>
            `;
            const closegallery = gallery.querySelector('.close-gallery');
            closegallery.addEventListener('click', (e) => {
                e.stopPropagation();
                document.body.style.overflow = 'auto';
                gallery.remove();
            });
            document.body.style.overflow = 'hidden';
            document.body.appendChild(gallery);
        });
    });
});

// --- FIX: Refresh AOS saat Wedding Wish section terlihat ---
document.addEventListener('DOMContentLoaded', function() {
    const weddingWishSection = document.getElementById('wedding-wish');
    
    if (weddingWishSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Refresh AOS saat Wedding Wish section terlihat
                    AOS.refresh();
                }
            });
        }, {
            threshold: 0.1 // Trigger when 10% of the section is visible
        });
        
        observer.observe(weddingWishSection);
    }
});

window.addEventListener('load', function() {
    const loadingScreen = document.getElementById('loading-screen');
    const images = document.querySelectorAll('.container-cover img');
    const button = document.querySelector('button[aria-label="Buka Undangan"]');
    const audio = document.getElementById('background-music');
    let loadedImages = 0;
    let musicPlayed = false;

    function imageLoaded() {
        loadedImages++;
        if (loadedImages === images.length) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 500);
            
            // Refresh AOS setelah semua gambar cover selesai dimuat
            AOS.refresh();
        }
    }

    images.forEach(img => {
        if (img.complete) {
            imageLoaded();
        } else {
            img.addEventListener('load', imageLoaded);
            img.addEventListener('error', imageLoaded);
        }
    });

    setTimeout(() => {
        if (!loadingScreen.classList.contains('hidden')) {
            loadingScreen.classList.add('hidden');
        }
    }, 5000);

    button.addEventListener('click', function() {
        document.body.style.overflow = 'auto';
        document.getElementById('invitation').scrollIntoView({
            behavior: 'smooth'
        });
        
        if (!musicPlayed) {
            audio.play();
            musicPlayed = true;
        }

        // Setup Media Session untuk notifikasi mobile
        if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: 'Undangan Pawiwahan | Edi & Winda',
                    artist: 'WinandaDev',
                    artwork: [
                        { src: 'Elemen/Photo%20Gallery/Foto5.webp', sizes: '16x16 32x32 48x48 64x64 128x128 256x256 512x512', type: 'image/webp' }
                    ]
                });
            }
        });

    blockImages();
});

// Fungsi untuk blokir gambar dan halaman
function blockImages() {
    const images = document.querySelectorAll('img');

    // Blokir klik kanan dan seleksi pada gambar
    images.forEach(img => {
        img.addEventListener('dragstart', function(e) {
            e.preventDefault();
            return false;
        });

        img.addEventListener('selectstart', function(e) {
            e.preventDefault();
            return false;
        });

        // For mobile: disable long press
        img.addEventListener('touchstart', function(e) {
            this.touchStartTime = Date.now();
        });

        img.addEventListener('touchend', function(e) {
            if (Date.now() - this.touchStartTime > 500) {
                e.preventDefault();
            }
        });
    });

    // Blokir seluruh halaman
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });

    // Blokir tombol keyboard tertentu
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey && (e.key === 's' || e.key === 'u' || e.key === 'p' || e.key === 'a')) ||
            (e.ctrlKey && e.shiftKey && e.key === 'i') || // Dev tools
            e.key === 'F12') {
            e.preventDefault();
            return false;
        }
    });
}
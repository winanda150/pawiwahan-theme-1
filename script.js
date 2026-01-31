// Tambahkan event listener untuk tombol "Buka Undangan"
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
        audio.play();
        musicPlayed = true;
    });

    // Panggil fungsi untuk blokir gambar
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
    // document.addEventListener('contextmenu', function(e) {
    //     e.preventDefault();
    // });

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
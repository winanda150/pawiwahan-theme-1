/**
 * ============================================================================
 * 💍 PAWIWAHAN THEME 1 - KONFIGURASI DATA PERNIKAHAN (CONFIG.JS)
 * ============================================================================
 * File ini adalah PUSAT DATA tunggal (Single Source of Truth) untuk tema undangan.
 * Anda HANYA PERLU mengubah data di file ini untuk menyesuaikan seluruh isi undangan:
 * nama mempelai, tanggal acara, countdown, nomor rekening, alamat, dan musik.
 *
 * Seluruh teks, link kalender, peta lokasi, dan timer hitung mundur akan otomatis
 * disinkronkan oleh engine script.
 * ============================================================================
 */

const WEDDING_CONFIG = {
    // ------------------------------------------------------------------------
    // 01. INFORMASI UMUM & COVER
    // ------------------------------------------------------------------------
    couple: {
        shortName: "Edi & Winda",
        dateDisplay: "Jumat, 30 Januari 2026",
        bgMusic: "assets/audio/wedding-music.mp3",
        coverImage1: "assets/images/gallery/cover-1.webp",
        coverImage2: "assets/images/gallery/cover-2.webp",
        mediaSessionCover: "assets/images/gallery/gallery-05.webp",
    },

    // ------------------------------------------------------------------------
    // 02. PROFIL MEMPELAI (PRIA & WANITA)
    // ------------------------------------------------------------------------
    mempelai: {
        groom: {
            fullName: "I Putu Edi Pratama",
            order: "Putra pertama dari pasangan",
            father: "Bapak I Made Mudita",
            mother: "Ibu Putu Novita Dewi",
            address: "Jl. Siulan No 52, Penatih Dangin Puri, Kec. Denpasar Timur",
            photo: "assets/images/couple/groom.webp",
            alt: "Foto Mempelai Pria I Putu Edi Pratama"
        },
        bride: {
            fullName: "Winda Aprilia Dewi",
            order: "Putri kedua dari pasangan",
            father: "Bapak Fatur R",
            mother: "Ibu Asri Eka Yanti",
            address: "Jl. Pidada 9, Ubung, Kec. Denpasar Barat",
            photo: "assets/images/couple/bride.webp",
            alt: "Foto Mempelai Wanita Winda Aprilia Dewi"
        }
    },

    // ------------------------------------------------------------------------
    // 03. RANGKAIAN ACARA & COUNTDOWN TIMER
    // ------------------------------------------------------------------------
    events: {
        // Pengaturan Target Timer Hitung Mundur (Waktu WITA Bali)
        countdown: {
            date: "2026-01-30", // Tanggal acara (Format: YYYY-MM-DD)
            time: "08:00"       // Jam mulai acara (Format: HH:MM:SS)
        },
        list: [
            {
                id: "pawiwahan",
                title: "Pawiwahan",
                icon: "bi-flower1",
                dayDate: "Jumat, 30 Januari 2026",
                time: "08.00 WITA - Selesai",
                address: "Jl. Siulan No 52, Penatih Dangin Puri, Denpasar Timur",
                mapsUrl: "https://maps.app.goo.gl/GoNmSRC1TNZwYQiWA",
                calendar: {
                    title: "Pawiwahan Edi dan Winda",
                    dates: "20260130T000000Z/20260130T040000Z",
                    details: "Upacara Manusa Yadnya Pawiwahan Putu Edi Pratama dan Winda Aprilia Dewi",
                    location: "Jl. Siulan No 52, Penatih Dangin Puri, Denpasar Timur"
                }
            },
            {
                id: "resepsi",
                title: "Resepsi",
                icon: "bi-stars",
                dayDate: "Jumat, 30 Januari 2026",
                time: "18.00 WITA - Selesai",
                address: "Jl. Siulan No 52, Penatih Dangin Puri, Denpasar Timur",
                mapsUrl: "https://maps.app.goo.gl/GoNmSRC1TNZwYQiWA",
                calendar: {
                    title: "Resepsi Edi dan Winda",
                    dates: "20260130T100000Z/20260130T140000Z",
                    details: "Resepsi Pernikahan Putu Edi Pratama dan Winda Aprilia Dewi",
                    location: "Jl. Siulan No 52, Penatih Dangin Puri, Denpasar Timur"
                }
            }
        ]
    },

    // ------------------------------------------------------------------------
    // 04. TANDA KASIH DIGITAL (REKENING) & HADIAH FISIK
    // ------------------------------------------------------------------------
    gifts: {
        bankAccounts: [
            {
                bank: "BANK BCA",
                number: "7630456123",
                holder: "I Putu Edi Pratama"
            },
            {
                bank: "BANK MANDIRI",
                number: "0812345678",
                holder: "Winda Aprilia Dewi"
            }
        ],
        physicalGift: {
            recipient: "Edi & Winda (Pawiwahan Office)",
            address: "Jl. Siulan No. 52, Penatih Dangin Puri, Kec. Denpasar Timur, Kota Denpasar, Bali 80238",
            mapsUrl: "https://maps.app.goo.gl/GoNmSRC1TNZwYQiWA"
        }
    },

    // ------------------------------------------------------------------------
    // 05. KONFIGURASI KEAMANAN & FIREBASE (OPSIONAL / DEFAULT)
    // ------------------------------------------------------------------------
    security: {
        // Hash SHA-256 dari kata sandi Mode Mempelai
        mempelaiHash: "e58fb6b9713fea3141744cbf988eb1852d68816e16f9615ad2621b6e16377a47",
        // Salt kriptografi untuk HMAC-style token otorisasi Firestore admin_actions
        adminSalt: "@pawiwahan-secure-backend-key"
    },

    firebase: {
        apiKey: "AIzaSyBfSALZx3_bnG4GI7djWenNDM5UjHZLuPM",
        authDomain: "pawiwahan-theme-1.firebaseapp.com",
        projectId: "pawiwahan-theme-1",
        storageBucket: "pawiwahan-theme-1.firebasestorage.app",
        messagingSenderId: "714291588176",
        appId: "1:714291588176:web:addd15e45c498bd565b555",
        measurementId: "G-0R22TRVSEL"
    }
};

// Pastikan tersedia di scope global window & modul
if (typeof window !== 'undefined') {
    window.WEDDING_CONFIG = WEDDING_CONFIG;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WEDDING_CONFIG;
}

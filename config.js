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
        groomNickname: "Edi",
        brideNickname: "Winda",
        dateDisplay: "Jumat, 30 Januari 2026",
        bgMusic: "assets/audio/wedding-music.mp3",
        coverImage1: "assets/images/gallery/cover-1.webp",
        coverImage2: "assets/images/gallery/cover-2.webp",
    },

    // ------------------------------------------------------------------------
    // 02. PROFIL MEMPELAI (PRIA & WANITA)
    // ------------------------------------------------------------------------
    mempelai: {
        greeting: "Om Swastyastu",
        openingText: "Atas Asung Kertha Wara Nugraha Ida Sang Hyang Widhi Wasa/Tuhan Yang Maha Esa kami bermaksud mengundang Bapak/Ibu/Saudara/i pada Upacara Manusa Yadnya Pawiwahan (Pernikahan) Putra dan Putri kami.",
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
    // 03. AYAT SUCI / MANTRA PERNIKAHAN
    // ------------------------------------------------------------------------
    mantra: {
        sanskrit: '"Ihaiva stam ma vi yaustam, visvam ayur <br> vyasnutam, kridantau putrair naptrbhih, modamanau sve grhe."',
        translation: '"Wahai pasangan suami-isteri, semoga kalian tetap bersatu dan tidak pernah terpisahkan. Semoga kalian mencapai hidup penuh kebahagiaan, tinggal di rumah yang penuh kegembiraan bersama seluruh keturunanmu."',
        source: "- Rg Veda X.85.42 -"
    },

    // ------------------------------------------------------------------------
    // 04. RANGKAIAN ACARA & COUNTDOWN TIMER
    // ------------------------------------------------------------------------
    events: {
        // Target tanggal & jam untuk timer hitung mundur (Format ISO: YYYY-MM-DDTHH:mm:ss+Zona)
        countdownTarget: "2026-01-30T08:00:00+08:00",
        closingText: "Merupakan suatu kebahagiaan dan kehormatan bagi kami, apabila Bapak/Ibu/Saudara/i, berkenan hadir untuk memberikan doa restu. Atas kehadiran dan doa restunya kami ucapkan terima kasih.",
        list: [
            {
                id: "pawiwahan",
                title: "Pawiwahan",
                icon: "bi-flower1",
                dayDate: "Jumat, 30 Januari 2026",
                time: "08.00 WITA - Selesai",
                locationName: "Kediaman Mempelai Pria",
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
                locationName: "Kediaman Mempelai Pria",
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
    // 05. TANDA KASIH DIGITAL (REKENING) & HADIAH FISIK
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
            title: "Hadiah Fisik",
            description: "Jika anda ingin memberikan hadiah fisik atau kado, mohon alamatkan ke alamat rumah kami.",
            recipient: "Edi & Winda (Pawiwahan Office)",
            address: "Jl. Siulan No. 52, Penatih Dangin Puri, Kec. Denpasar Timur, Kota Denpasar, Bali 80238",
            mapsUrl: "https://maps.app.goo.gl/GoNmSRC1TNZwYQiWA"
        }
    },

    // ------------------------------------------------------------------------
    // 06. FOOTER, UCAPAN PENUTUP & SOSIAL MEDIA
    // ------------------------------------------------------------------------
    footer: {
        closingGreeting: "Om Shanti Shanti Shanti Om",
        thankYouMessage: "Suatu kehormatan dan kebahagiaan bagi kami, jika Anda bersedia hadir dan memberikan restu kepada kami.",
        madeByText: "Made with",
        creatorName: "WinandaDev",
        socials: {
            instagram: "https://www.instagram.com/wiinaandaa_",
            whatsapp: "https://wa.me/6285964393536",
            github: "https://github.com/winanda150"
        }
    },

    // ------------------------------------------------------------------------
    // 07. KONFIGURASI KEAMANAN & FIREBASE (OPSIONAL / DEFAULT)
    // ------------------------------------------------------------------------
    security: {
        // Hash SHA-256 dari kata sandi Mode Mempelai
        mempelaiHash: "e58fb6b9713fea3141744cbf988eb1852d68816e16f9615ad2621b6e16377a47",
        // Salt kriptografi untuk HMAC-style token otorisasi Firestore admin_actions
        adminSalt: "@pawiwahan-secure-backend-key"
    },

    /**
     * CATATAN KEAMANAN FIREBASE:
     * Kredensial Firebase Web (apiKey, projectId, dsb.) secara standar memang berada di sisi klien (publik).
     * Seluruh keamanan basis data (baca/tulis/hapus/pin/like) diproteksi secara ketat oleh Cloud Firestore
     * Security Rules (lihat file rules/firestore.rules) dengan otorisasi berbasis zero-trust & token timestamp.
     * Untuk menghubungkan proyek ke Firebase klien baru, ganti konfigurasi di bawah ini dengan config baru
     * dari Firebase Console proyek Anda.
     */
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

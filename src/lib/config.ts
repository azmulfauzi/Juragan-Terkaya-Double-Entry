import type { Warna } from './types'

/**
 * Modal awal setiap peserta, diposting sebagai jurnal pembukaan saat mendaftar:
 *
 *     Kas (1-100)                10.000.000  (D)
 *         Modal Pemilik (3-100)      10.000.000  (K)
 *
 * Angka ini harus sama dengan yang ada di fungsi daftar_peserta() pada
 * supabase/schema.sql — jurnalnya dibuat di server.
 */
export const MODAL_AWAL = 10_000_000

/** Durasi fase memilih warna (detik). */
export const DURASI_PILIH_WARNA = 10

/**
 * Durasi fase menjurnal (detik).
 * Lebih lama dari v1 (30 detik) karena keputusannya dua kali lipat: peserta
 * memilih akun debit DAN akun kredit.
 */
export const DURASI_JURNAL = 45

/** Berapa soal terakhir yang diingat sistem agar tidak cepat berulang. */
export const RIWAYAT_SOAL_MAX = 20

/**
 * TANPA BONUS DAN DENDA ANGKA.
 *
 * Saldo peserta murni hasil jurnalnya sendiri — tidak ada penambahan atau
 * pengurangan buatan untuk jawaban benar/salah. Akurasi sudah menjadi gerbang
 * penilaian di src/lib/peringkat.ts, dan itu yang menutup celah "peserta ceroboh
 * justru kasnya lebih besar". Jangan menggantinya dengan bonus/denda: itu hanya
 * menutupi gejalanya.
 */

/** PIN akses halaman fasilitator. Ubah lewat file .env (VITE_FASILITATOR_PIN). */
export const FASILITATOR_PIN = import.meta.env.VITE_FASILITATOR_PIN || '2024'

/**
 * Warna murni undian nasib.
 *
 * ⚠️ JANGAN PERNAH memetakan warna ke kategori transaksi. Begitu peserta bisa
 *    menebak bahwa satu warna cenderung menguntungkan, unsur keberuntungannya
 *    mati dan game berubah jadi adu hafalan pola. Urutan wajibnya:
 *      1. peserta memilih warna
 *      2. sistem mengundi transaksi acak dari SELURUH bank soal
 *      3. roda diputar untuk menentukan siapa yang membukukan
 */
export const DAFTAR_WARNA: Warna[] = ['merah', 'kuning', 'hijau', 'biru']

interface WarnaMeta {
  label: string
  emoji: string
  hex: string
  /** Kelas Tailwind ditulis lengkap agar tidak hilang saat build. */
  bg: string
  bgHover: string
  border: string
  teks: string
  bgLembut: string
}

export const WARNA_META: Record<Warna, WarnaMeta> = {
  merah: {
    label: 'Merah',
    emoji: '🔴',
    hex: '#dc2626',
    bg: 'bg-red-600',
    bgHover: 'hover:bg-red-500',
    border: 'border-red-500',
    teks: 'text-red-400',
    bgLembut: 'bg-red-500/15',
  },
  kuning: {
    label: 'Kuning',
    emoji: '🟡',
    hex: '#eab308',
    bg: 'bg-yellow-500',
    bgHover: 'hover:bg-yellow-400',
    border: 'border-yellow-400',
    teks: 'text-yellow-400',
    bgLembut: 'bg-yellow-500/15',
  },
  hijau: {
    label: 'Hijau',
    emoji: '🟢',
    hex: '#16a34a',
    bg: 'bg-green-600',
    bgHover: 'hover:bg-green-500',
    border: 'border-green-500',
    teks: 'text-green-400',
    bgLembut: 'bg-green-500/15',
  },
  biru: {
    label: 'Biru',
    emoji: '🔵',
    hex: '#2563eb',
    bg: 'bg-blue-600',
    bgHover: 'hover:bg-blue-500',
    border: 'border-blue-500',
    teks: 'text-blue-400',
    bgLembut: 'bg-blue-500/15',
  },
}

/**
 * ⚠️ Label kategori hanya boleh muncul di EDITOR SOAL dan SETELAH reveal.
 *    Menampilkannya bersama soal sama saja membocorkan jawaban: peserta yang
 *    melihat badge "Kas Keluar" langsung tahu sisi kreditnya Kas. Di v1
 *    kebocoran persis seperti ini lolos sampai sesi berjalan.
 */
export const KATEGORI_META = {
  kas_masuk: { label: 'Kas Masuk', kelas: 'bg-green-500/15 text-green-300 border-green-500/40' },
  kas_keluar: { label: 'Kas Keluar', kelas: 'bg-red-500/15 text-red-300 border-red-500/40' },
  non_kas: { label: 'Non Kas', kelas: 'bg-sky-500/15 text-sky-300 border-sky-500/40' },
  modal: { label: 'Modal / Prive', kelas: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
} as const

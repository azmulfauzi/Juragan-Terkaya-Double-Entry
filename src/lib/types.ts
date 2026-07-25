export type Warna = 'merah' | 'kuning' | 'hijau' | 'biru'

/**
 * Fase permainan.
 * - menunggu    : sebelum putaran dibuka / jeda antar putaran
 * - pilih_warna : peserta memilih warna, TRANSAKSI BELUM DIUNDI (lihat PRD 5.1)
 * - menjurnal   : transaksi & hasil roda sudah tampil, peserta menyusun jurnal
 * - selesai     : permainan ditutup, papan skor akhir
 */
export type Fase = 'menunggu' | 'pilih_warna' | 'menjurnal' | 'selesai'

export type KategoriSoal = 'kas_masuk' | 'kas_keluar' | 'non_kas' | 'modal'

export interface GameState {
  id: number
  berjalan: boolean
  fase: Fase
  putaran: number
  warna_spin: Warna | null
  soal_id: number | null
  fase_mulai: string | null
  reveal: boolean
  show_insight: boolean
  riwayat_soal: number[]
  riwayat_warna: Warna[]
}

export interface Peserta {
  id: string
  nama: string
  created_at: string
}

export interface PilihanWarna {
  id: number
  peserta_id: string
  putaran: number
  warna: Warna
  otomatis: boolean
}

/** Satu baris = satu jurnal dua sisi. Lihat komentar tabel di supabase/schema.sql. */
export interface Jurnal {
  id: number
  peserta_id: string
  putaran: number
  soal_id: number | null
  akun_debit: string | null
  akun_kredit: string | null
  nominal: number
  benar: boolean
  wajib: boolean
  waktu_jawab_ms: number | null
  diterapkan: boolean
  created_at: string
}

export interface Soal {
  id: number
  kategori: KategoriSoal
  teks: string
  nominal: number
  opsi_debit: string[]
  opsi_kredit: string[]
  debit_benar: string
  kredit_benar: string
  insight: string
}

/**
 * Soal tanpa kunci jawaban.
 *
 * Halaman peserta hanya mengambil kolom-kolom ini selama putaran berjalan —
 * kunci jawaban baru diambil setelah fasilitator reveal. Tanpa ini, jawaban
 * benar sudah ada di memori browser peserta sejak soal muncul.
 */
export type SoalTanpaKunci = Pick<
  Soal,
  'id' | 'kategori' | 'teks' | 'nominal' | 'opsi_debit' | 'opsi_kredit'
>

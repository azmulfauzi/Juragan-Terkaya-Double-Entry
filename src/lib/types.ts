export type Warna = 'merah' | 'kuning' | 'hijau' | 'biru'

/**
 * Fase permainan.
 * - menunggu    : sebelum putaran dibuka / jeda antar putaran
 * - pilih_warna : peserta memilih warna, TRANSAKSI BELUM DIUNDI (lihat PRD 5.1)
 * - menjurnal   : transaksi & hasil roda sudah tampil, peserta menyusun jurnal
 * - keputusan   : penawaran asuransi — SELURUH peserta memutuskan, tanpa roda
 * - selesai     : permainan ditutup, papan skor akhir
 */
export type Fase = 'menunggu' | 'pilih_warna' | 'menjurnal' | 'keputusan' | 'selesai'

export type KategoriSoal = 'kas_masuk' | 'kas_keluar' | 'non_kas' | 'modal'

/**
 * Jenis soal — menentukan bagaimana soal itu dijalankan.
 *
 * - biasa     : transaksi biasa. Diundi acak, roda menentukan siapa yang membukukan.
 * - keputusan : penawaran asuransi. TIDAK ikut undian acak; dimunculkan
 *               fasilitator, dan SELURUH peserta memutuskan beli atau tidak.
 *               Tidak dihitung dalam akurasi — ini strategi, bukan ujian.
 * - kejadian  : musibah (kebakaran, kecelakaan). TIDAK ikut undian acak;
 *               dimunculkan fasilitator, roda menentukan siapa yang tertimpa.
 *               Peserta yang punya polis aktif TIDAK menjurnal apa pun.
 */
export type JenisSoal = 'biasa' | 'keputusan' | 'kejadian'

/** Jenis pertanggungan. Menghubungkan soal `keputusan` dengan soal `kejadian`. */
export type Polis = 'kebakaran' | 'kendaraan'

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
  /**
   * Peserta menyatakan tidak ada jurnal yang perlu dicatat — jawaban yang benar
   * bagi pemegang polis saat musibah terjadi. Dibedakan dari "tidak sempat
   * mengirim" (akun kosong dan tanpa_jurnal false), yang dihitung salah.
   */
  tanpa_jurnal: boolean
  created_at: string
}

/** Keputusan peserta atas penawaran asuransi. */
export interface Keputusan {
  id: number
  peserta_id: string
  putaran: number
  soal_id: number | null
  polis: Polis
  ambil: boolean
  created_at: string
}

export interface Soal {
  id: number
  kategori: KategoriSoal
  jenis: JenisSoal
  /** Wajib diisi untuk jenis `keputusan` dan `kejadian`; null untuk `biasa`. */
  polis: Polis | null
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
  'id' | 'kategori' | 'jenis' | 'polis' | 'teks' | 'nominal' | 'opsi_debit' | 'opsi_kredit'
>

/**
 * Bentuk soal di berkas benih (src/data/soal.ts).
 * `jenis` dan `polis` boleh dihilangkan; keduanya diisi 'biasa'/null saat benih
 * dimasukkan, supaya 44 soal lama tidak perlu ditulisi satu per satu.
 */
export type SoalBenih = Omit<Soal, 'jenis' | 'polis'> & {
  jenis?: JenisSoal
  polis?: Polis | null
}

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

/**
 * Ranah transaksi — pertanyaan pertama yang harus dijawab peserta di SETIAP soal.
 *
 * bisnis  : masuk pembukuan usaha, dijurnal debit-kredit
 * pribadi : urusan pemilik, cukup mutasi Dompet Pribadi dengan keterangan
 *
 * Pilihan ini muncul di semua soal tanpa kecuali. Kalau hanya muncul di soal
 * pribadi, keberadaannya sendiri sudah membocorkan jawabannya.
 */
export type Sifat = 'bisnis' | 'pribadi'

/**
 * Nilai satu jawaban, ditentukan percobaan keberapa peserta menjawab benar.
 * Setelah dua kali salah, sistem menunjukkan kuncinya — jawaban ketiga memang
 * sudah dituntun, jadi tidak bernilai.
 */
export const NILAI_PER_PERCOBAAN = [100, 50, 0] as const

export function nilaiPercobaan(percobaan: number): number {
  return NILAI_PER_PERCOBAAN[Math.min(percobaan, 3) - 1] ?? 0
}

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
  /**
   * Porsi dari modal awal yang peserta masukkan ke Dompet Bisnis saat mendaftar.
   * Sisanya (MODAL_AWAL − alokasi_bisnis) menjadi isi awal Dompet Pribadi, yang
   * berada DI LUAR pembukuan sepenuhnya.
   */
  alokasi_bisnis: number
  created_at: string
}

/**
 * Perpindahan uang antar dompet.
 *
 * Ini catatan FAKTA — uangnya benar-benar berpindah sebanyak ini. Jurnal yang
 * menyertainya boleh saja salah akun, dan justru di situlah pelajarannya:
 * uang bergerak menurut kenyataan, sedangkan laporan bergerak menurut catatan.
 */
/**
 * Arah perpindahan uang di Dompet Pribadi.
 *
 * topup          : pribadi → bisnis (pribadi berkurang)
 * prive          : bisnis → pribadi (pribadi bertambah)
 * pribadi_keluar : belanja pribadi, uangnya habis (pribadi berkurang)
 * pribadi_masuk  : pemasukan pribadi di luar usaha (pribadi bertambah)
 */
export type ArahMutasi = 'topup' | 'prive' | 'pribadi_keluar' | 'pribadi_masuk'

export interface Mutasi {
  id: number
  peserta_id: string
  arah: ArahMutasi
  jumlah: number
  putaran: number
  /** Diisi untuk belanja pribadi: keterangan menggantikan jurnal. */
  keterangan: string | null
  soal_id: number | null
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
   * soal      : jawaban atas soal putaran itu (satu per peserta per putaran)
   * pembukaan : jurnal modal awal
   * mutasi    : top up atau prive antar dompet, boleh berkali-kali per putaran
   */
  jenis: 'soal' | 'pembukaan' | 'mutasi'
  /** Percobaan keberapa jawaban ini diselesaikan (1, 2, atau 3). */
  percobaan: number
  /** 100 / 50 / 0 sesuai percobaan. Dihitung juga untuk jurnal latihan. */
  nilai: number
  /** Ranah yang dipilih peserta — salah memilih pun dihitung sebagai percobaan. */
  sifat_dipilih: Sifat | null
  /** true bila jawaban sudah final: benar, atau habis tiga percobaan. */
  selesai: boolean
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
  /** bisnis = dijurnal. pribadi = cukup mutasi Dompet Pribadi. */
  sifat: Sifat
  /** Hanya untuk soal pribadi: uang keluar dari atau masuk ke dompet pribadi. */
  arah_kas: 'keluar' | 'masuk' | null
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
 * Balasan server atas satu percobaan jawaban.
 * `kunci*` hanya terisi setelah dua percobaan gagal — sebelum itu, kunci
 * jawaban memang tidak pernah dikirim ke perangkat peserta.
 */
export interface HasilPercobaan {
  benar: boolean
  percobaan: number
  nilai: number
  /** true bila jawaban ini sudah final: benar, atau percobaan ketiga. */
  selesai: boolean
  kunci_sifat: Sifat | null
  kunci_debit: string | null
  kunci_kredit: string | null
  insight: string | null
}

/**
 * Bentuk soal di berkas benih (src/data/soal.ts).
 * `jenis` dan `polis` boleh dihilangkan; keduanya diisi 'biasa'/null saat benih
 * dimasukkan, supaya 44 soal lama tidak perlu ditulisi satu per satu.
 */
export type SoalBenih = Omit<Soal, 'jenis' | 'polis' | 'sifat' | 'arah_kas'> & {
  jenis?: JenisSoal
  polis?: Polis | null
  sifat?: Sifat
  arah_kas?: 'keluar' | 'masuk' | null
}

import type { SoalBenih } from '../lib/types'

/**
 * BANK SOAL AWAL — 50 kasus (44 transaksi biasa + 6 soal asuransi).
 *
 * Data ini hanya dipakai sekali: saat tabel `soal` di Supabase masih kosong.
 * Setelah itu bank soal hidup di database dan diedit lewat UI fasilitator,
 * sehingga perubahannya tidak hilang saat Reset dan tidak perlu deploy ulang.
 *
 * ── Kenapa sebarannya dijaga ──────────────────────────────────────────────
 * Transaksi diundi acak dari SELURUH bank, tanpa memandang warna. Artinya
 * komposisi bank inilah yang menentukan peluang seseorang kebagian transaksi
 * penambah kas. Bank yang timpang membuat permainan terasa berat sebelah tanpa
 * ada yang tahu sebabnya. Sebaran saat ini:
 *
 *     kas_masuk  11  |  kas_keluar  11  |  non_kas  11  |  modal  11
 *
 * Dari 11 soal kategori `modal`, 7 di antaranya adalah PRIVE — porsinya sengaja
 * besar karena inilah jembatan ke pesan utama v1: memisahkan uang pribadi dari
 * uang usaha.
 *
 * ⚠️ Kategori HANYA untuk pengelolaan bank soal. Sistem tidak pernah memakainya
 *    saat mengundi, dan label ini tidak boleh tampil di layar peserta sebelum
 *    reveal — "Kas Keluar" saja sudah cukup membocorkan sisi kreditnya.
 *
 * ⚠️ Setiap soal wajib lolos validasiSoal() di src/lib/validasi.ts: opsi_debit
 *    memuat debit_benar, opsi_kredit memuat kredit_benar, dan keduanya berbeda.
 *
 * `jenis` boleh dihilangkan — soal tanpa keterangan dianggap 'biasa' (diundi
 * acak, roda menentukan siapa yang membukukan). Enam soal asuransi di bagian
 * bawah memakai jenis 'keputusan' dan 'kejadian'; keduanya TIDAK ikut undian
 * acak dan hanya muncul lewat tombol khusus di halaman fasilitator.
 */
export const SOAL_DEFAULT: SoalBenih[] = [
  // ───────────────────────────── KAS MASUK ─────────────────────────────
  {
    id: 1,
    kategori: 'kas_masuk',
    teks: 'Warung nasimu ramai hari ini. Seluruh dagangan terjual dan pembeli membayar tunai Rp2.500.000.',
    nominal: 2_500_000,
    opsi_debit: ['1-100', '1-200', '4-100', '5-100'],
    opsi_kredit: ['4-100', '1-100', '2-100', '3-100'],
    debit_benar: '1-100',
    kredit_benar: '4-100',
    insight:
      'Uang masuk ke laci → Kas bertambah, dan aset bertambah selalu di sisi Debit. Sumber uangnya adalah penjualan → Pendapatan Penjualan dikredit. Pendapatan tidak pernah didebit saat penjualan terjadi.',
  },
  {
    id: 2,
    kategori: 'kas_masuk',
    teks: 'Hari Minggu pasar sedang ramai. Penjualan tunai sepanjang hari mencapai Rp4.200.000.',
    nominal: 4_200_000,
    opsi_debit: ['1-100', '1-110', '4-100', '1-300'],
    opsi_kredit: ['4-100', '4-200', '1-100', '3-100'],
    debit_benar: '1-100',
    kredit_benar: '4-100',
    insight:
      'Polanya sama dengan penjualan tunai lain: Kas (D) / Pendapatan Penjualan (K). Besar kecilnya nominal tidak mengubah akun yang dipakai.',
  },
  {
    id: 3,
    kategori: 'kas_masuk',
    teks: 'Pelanggan katering yang minggu lalu berhutang datang melunasi tagihannya Rp3.000.000 secara tunai.',
    nominal: 3_000_000,
    opsi_debit: ['1-100', '4-100', '1-200', '2-100'],
    opsi_kredit: ['1-200', '4-100', '1-100', '4-200'],
    debit_benar: '1-100',
    kredit_benar: '1-200',
    insight:
      'Ini BUKAN pendapatan baru. Pendapatannya sudah dicatat saat penjualan kredit terjadi. Yang berubah hanya bentuk asetnya: Piutang berkurang (kredit), Kas bertambah (debit). Mencatatnya sebagai pendapatan lagi membuat omzetmu terhitung dua kali.',
  },
  {
    id: 4,
    kategori: 'kas_masuk',
    teks: 'Pelanggan grosir melunasi sisa piutangnya Rp1.500.000 lewat transfer ke rekening bank usaha.',
    nominal: 1_500_000,
    opsi_debit: ['1-110', '1-100', '1-200', '4-100'],
    opsi_kredit: ['1-200', '1-110', '4-100', '2-100'],
    debit_benar: '1-110',
    kredit_benar: '1-200',
    insight:
      'Uangnya masuk ke rekening, bukan ke laci — jadi yang bertambah adalah Bank, bukan Kas. Sisi kreditnya tetap Piutang Usaha karena tagihannya lunas.',
  },
  {
    id: 5,
    kategori: 'kas_masuk',
    teks: 'Pengajuan pinjaman modal kerja disetujui. Bank mencairkan Rp10.000.000 ke rekening usahamu.',
    nominal: 10_000_000,
    opsi_debit: ['1-110', '2-200', '1-100', '3-100'],
    opsi_kredit: ['2-200', '3-100', '4-200', '1-110'],
    debit_benar: '1-110',
    kredit_benar: '2-200',
    insight:
      'Uang pinjaman memang menambah saldo, tapi ia bukan pendapatan dan bukan modal — ia kewajiban yang harus dikembalikan. Hutang Bank dikredit karena kewajiban bertambah di sisi kredit.',
  },
  {
    id: 6,
    kategori: 'kas_masuk',
    teks: 'Kamu menerima pinjaman dari koperasi pasar sebesar Rp5.000.000 secara tunai.',
    nominal: 5_000_000,
    opsi_debit: ['1-100', '2-200', '3-100', '4-200'],
    opsi_kredit: ['2-200', '4-100', '3-100', '1-100'],
    debit_benar: '1-100',
    kredit_benar: '2-200',
    insight:
      'Kas bertambah, tapi kekayaanmu tidak. Setiap rupiah yang masuk dari pinjaman diimbangi kewajiban sebesar itu juga — inilah kenapa saldo kas besar belum tentu berarti usahamu sehat.',
  },
  {
    id: 7,
    kategori: 'kas_masuk',
    teks: 'Penjual lain menyewa sebagian etalasemu. Ia membayar Rp500.000 tunai untuk bulan ini.',
    nominal: 500_000,
    opsi_debit: ['1-100', '4-200', '5-300', '1-200'],
    opsi_kredit: ['4-200', '4-100', '5-300', '1-100'],
    debit_benar: '1-100',
    kredit_benar: '4-200',
    insight:
      'Uang sewa yang kamu TERIMA adalah pendapatan, bukan beban sewa. Karena bukan dari penjualan barang dagangan, tempatnya di Pendapatan Lain-lain agar omzet inti tetap terbaca jujur.',
  },
  {
    id: 8,
    kategori: 'kas_masuk',
    teks: 'Kamu menerima komisi tunai Rp400.000 dari penjualan produk titipan tetangga.',
    nominal: 400_000,
    opsi_debit: ['1-100', '4-200', '1-300', '2-100'],
    opsi_kredit: ['4-200', '4-100', '1-300', '3-100'],
    debit_benar: '1-100',
    kredit_benar: '4-200',
    insight:
      'Komisi bukan hasil menjual barang milikmu sendiri, jadi ia masuk Pendapatan Lain-lain. Memisahkannya dari Pendapatan Penjualan membuat kamu tahu berapa sebenarnya omzet usaha intimu.',
  },
  {
    id: 9,
    kategori: 'kas_masuk',
    teks: 'Pelanggan membayar pesanan Rp1.750.000 lewat transfer ke rekening bank usaha.',
    nominal: 1_750_000,
    opsi_debit: ['1-110', '1-100', '4-100', '1-200'],
    opsi_kredit: ['4-100', '1-110', '1-200', '4-200'],
    debit_benar: '1-110',
    kredit_benar: '4-100',
    insight:
      'Penjualan tunai dan penjualan lewat transfer sama-sama pendapatan; yang berbeda hanya "wadah" uangnya. Salah memilih Kas padahal uangnya di rekening membuat kas fisikmu terlihat lebih besar dari kenyataan.',
  },
  {
    id: 10,
    kategori: 'kas_masuk',
    teks: 'Pesanan nasi kotak untuk rapat kantor selesai dan langsung dibayar tunai Rp1.900.000.',
    nominal: 1_900_000,
    opsi_debit: ['1-100', '1-200', '4-100', '5-100'],
    opsi_kredit: ['4-100', '1-200', '2-100', '1-100'],
    debit_benar: '1-100',
    kredit_benar: '4-100',
    insight:
      'Barang diserahkan dan uang diterima di saat yang sama → tidak ada piutang sama sekali. Piutang hanya muncul kalau penyerahan barang dan penerimaan uang terjadi di waktu berbeda.',
  },
  {
    id: 11,
    kategori: 'kas_masuk',
    teks: 'Rekening bank usaha menerima bunga tabungan Rp75.000 dari bank.',
    nominal: 75_000,
    opsi_debit: ['1-110', '4-200', '1-100', '2-200'],
    opsi_kredit: ['4-200', '4-100', '2-200', '1-110'],
    debit_benar: '1-110',
    kredit_benar: '4-200',
    insight:
      'Bunga bank menambah saldo rekening tanpa ada barang yang dijual. Karena bukan hasil kegiatan utama usaha, ia dicatat sebagai Pendapatan Lain-lain.',
  },

  // ──────────────────────────── KAS KELUAR ────────────────────────────
  {
    id: 12,
    kategori: 'kas_keluar',
    teks: 'Belanja bahan baku ke pasar induk senilai Rp1.200.000, dibayar tunai di tempat.',
    nominal: 1_200_000,
    opsi_debit: ['1-300', '5-100', '1-100', '2-100'],
    opsi_kredit: ['1-100', '2-100', '1-300', '4-100'],
    debit_benar: '1-300',
    kredit_benar: '1-100',
    insight:
      'Bahan baku yang dibeli belum jadi beban — ia masih tersimpan sebagai Persediaan (aset). Barulah saat barangnya terjual, nilainya pindah ke Harga Pokok Penjualan. Mencatatnya langsung sebagai beban membuat labamu terlihat anjlok padahal barangnya masih ada.',
  },
  {
    id: 13,
    kategori: 'kas_keluar',
    teks: 'Kamu membayar tagihan supplier beras yang jatuh tempo hari ini, Rp4.000.000 tunai.',
    nominal: 4_000_000,
    opsi_debit: ['2-100', '1-300', '5-100', '1-100'],
    opsi_kredit: ['1-100', '2-100', '1-300', '1-110'],
    debit_benar: '2-100',
    kredit_benar: '1-100',
    insight:
      'Barangnya sudah dicatat waktu diambil dari supplier. Yang terjadi sekarang hanya melunasi kewajiban: Hutang Usaha berkurang (debit), Kas berkurang (kredit). Mencatat Persediaan lagi di sini membuat stokmu tercatat dua kali.',
  },
  {
    id: 14,
    kategori: 'kas_keluar',
    teks: 'Membayar gaji dua karyawan warung untuk bulan ini, total Rp3.000.000 tunai.',
    nominal: 3_000_000,
    opsi_debit: ['5-200', '3-200', '5-600', '1-100'],
    opsi_kredit: ['1-100', '5-200', '2-100', '3-100'],
    debit_benar: '5-200',
    kredit_benar: '1-100',
    insight:
      'Gaji karyawan adalah beban usaha — manfaatnya habis di bulan itu juga, tidak menyisakan aset. Beban bertambah di sisi Debit.',
  },
  {
    id: 15,
    kategori: 'kas_keluar',
    teks: 'Membayar sewa kios bulan ini sebesar Rp2.000.000 secara tunai.',
    nominal: 2_000_000,
    opsi_debit: ['5-300', '1-500', '4-200', '1-100'],
    opsi_kredit: ['1-100', '5-300', '2-100', '1-110'],
    debit_benar: '5-300',
    kredit_benar: '1-100',
    insight:
      'Sewa yang kamu BAYAR adalah beban; sewa yang kamu TERIMA adalah pendapatan. Dua-duanya menyangkut kata "sewa" — yang membedakan arah uangnya.',
  },
  {
    id: 16,
    kategori: 'kas_keluar',
    teks: 'Membayar tagihan listrik dan air kios bulan lalu, Rp450.000 tunai.',
    nominal: 450_000,
    opsi_debit: ['5-400', '5-600', '3-200', '1-400'],
    opsi_kredit: ['1-100', '5-400', '2-100', '1-110'],
    debit_benar: '5-400',
    kredit_benar: '1-100',
    insight:
      'Listrik dan air yang dipakai untuk operasional kios adalah beban usaha. Catat di akun bebannya sendiri, jangan digabung ke Beban Lain-lain, supaya kamu bisa melihat pos mana yang membengkak.',
  },
  {
    id: 17,
    kategori: 'kas_keluar',
    teks: 'Mengisi bensin motor operasional untuk belanja bahan baku, Rp150.000 tunai.',
    nominal: 150_000,
    opsi_debit: ['5-500', '5-600', '1-500', '3-200'],
    opsi_kredit: ['1-100', '5-500', '1-110', '2-100'],
    debit_benar: '5-500',
    kredit_benar: '1-100',
    insight:
      'Bensin untuk keperluan usaha masuk Beban Transportasi. Kalau motor yang sama dipakai untuk urusan pribadi, biayanya bukan beban usaha — itu Prive.',
  },
  {
    id: 18,
    kategori: 'kas_keluar',
    teks: 'Membeli mesin pengaduk adonan seharga Rp5.000.000, dibayar tunai.',
    nominal: 5_000_000,
    opsi_debit: ['1-500', '5-600', '1-300', '1-400'],
    opsi_kredit: ['1-100', '2-100', '1-500', '3-100'],
    debit_benar: '1-500',
    kredit_benar: '1-100',
    insight:
      'Mesin dipakai bertahun-tahun, jadi ia aset (Peralatan), bukan beban bulan ini. Kas memang berkurang Rp5.000.000, tapi total asetmu tidak — bentuknya saja yang berubah dari uang menjadi mesin.',
  },
  {
    id: 19,
    kategori: 'kas_keluar',
    teks: 'Membeli kemasan, plastik, dan label seharga Rp350.000 tunai.',
    nominal: 350_000,
    opsi_debit: ['1-400', '1-300', '5-600', '1-500'],
    opsi_kredit: ['1-100', '1-400', '2-100', '4-100'],
    debit_benar: '1-400',
    kredit_benar: '1-100',
    insight:
      'Perlengkapan adalah barang habis pakai penunjang usaha — beda dengan Persediaan yang memang untuk dijual, dan beda dengan Peralatan yang tahan lama.',
  },
  {
    id: 20,
    kategori: 'kas_keluar',
    teks: 'Membayar angsuran pokok pinjaman bank bulan ini sebesar Rp1.500.000 dari kas.',
    nominal: 1_500_000,
    opsi_debit: ['2-200', '5-600', '1-110', '3-200'],
    opsi_kredit: ['1-100', '2-200', '1-110', '3-100'],
    debit_benar: '2-200',
    kredit_benar: '1-100',
    insight:
      'Membayar pokok pinjaman bukan beban — ia mengurangi hutang. Karena itu labamu tidak ikut turun saat mengangsur, walaupun kas jelas berkurang. Inilah kenapa usaha bisa untung tapi kehabisan uang.',
  },
  {
    id: 21,
    kategori: 'kas_keluar',
    teks: 'Membayar iuran kebersihan dan keamanan pasar Rp100.000 tunai.',
    nominal: 100_000,
    opsi_debit: ['5-600', '5-400', '3-200', '1-400'],
    opsi_kredit: ['1-100', '5-600', '2-100', '1-110'],
    debit_benar: '5-600',
    kredit_benar: '1-100',
    insight:
      'Pengeluaran usaha yang tidak punya kategori khusus ditampung di Beban Lain-lain. Wajar ada, tapi kalau isinya makin gemuk, itu tanda kamu perlu menambah akun beban baru.',
  },
  {
    id: 22,
    kategori: 'kas_keluar',
    teks: 'Membayar upah tenaga harian yang membantu saat pesanan menumpuk, Rp600.000 tunai.',
    nominal: 600_000,
    opsi_debit: ['5-200', '5-600', '1-400', '3-200'],
    opsi_kredit: ['1-100', '5-200', '1-110', '2-100'],
    debit_benar: '5-200',
    kredit_benar: '1-100',
    insight:
      'Tenaga harian maupun karyawan tetap sama-sama masuk Beban Gaji. Yang menentukan akun adalah jenis pengeluarannya, bukan status orangnya.',
  },

  // ───────────────────────────── NON KAS ─────────────────────────────
  {
    id: 23,
    kategori: 'non_kas',
    teks: 'Pelanggan katering mengambil pesanan senilai Rp3.000.000 dan berjanji membayar minggu depan.',
    nominal: 3_000_000,
    opsi_debit: ['1-200', '1-100', '4-100', '2-100'],
    opsi_kredit: ['4-100', '1-200', '1-100', '2-100'],
    debit_benar: '1-200',
    kredit_benar: '4-100',
    insight:
      'Pendapatan diakui saat barang atau jasa diserahkan, bukan saat uang diterima. Hak menagih itulah yang dicatat sebagai Piutang Usaha. Kalau menunggu uang cair dulu, penjualan bulan ini tidak akan pernah terbaca di laporanmu.',
  },
  {
    id: 24,
    kategori: 'non_kas',
    teks: 'Kamu mengambil 20 karung beras dari supplier senilai Rp4.000.000 dan akan membayarnya bulan depan.',
    nominal: 4_000_000,
    opsi_debit: ['1-300', '1-100', '2-100', '5-100'],
    opsi_kredit: ['2-100', '1-100', '1-300', '4-100'],
    debit_benar: '1-300',
    kredit_benar: '2-100',
    insight:
      'Barangnya sudah ada di gudangmu, jadi Persediaan bertambah walaupun belum sepeser pun dibayar. Imbalannya kewajiban: Hutang Usaha bertambah di sisi kredit. Inilah contoh transaksi yang sama sekali tidak menyentuh kas.',
  },
  {
    id: 25,
    kategori: 'non_kas',
    teks: 'Menyetorkan uang kas kios sebesar Rp3.000.000 ke rekening bank usaha.',
    nominal: 3_000_000,
    opsi_debit: ['1-110', '1-100', '3-100', '2-200'],
    opsi_kredit: ['1-100', '1-110', '4-200', '3-100'],
    debit_benar: '1-110',
    kredit_benar: '1-100',
    insight:
      'Uangnya hanya berpindah wadah: Bank bertambah, Kas berkurang. Total asetmu sama sekali tidak berubah — dan tidak ada pendapatan maupun beban yang muncul dari perpindahan ini.',
  },
  {
    id: 26,
    kategori: 'non_kas',
    teks: 'Menarik uang Rp2.000.000 dari rekening bank untuk kebutuhan kas harian kios.',
    nominal: 2_000_000,
    opsi_debit: ['1-100', '1-110', '5-600', '3-200'],
    opsi_kredit: ['1-110', '1-100', '2-200', '3-100'],
    debit_benar: '1-100',
    kredit_benar: '1-110',
    insight:
      'Kebalikan dari menyetor ke bank. Perhatikan bahwa menarik uang usaha untuk KEPERLUAN USAHA berbeda dengan menariknya untuk keperluan pribadi — yang terakhir itu Prive.',
  },
  {
    id: 27,
    kategori: 'non_kas',
    teks: 'Mencatat harga pokok barang dagangan yang terjual hari ini sebesar Rp900.000.',
    nominal: 900_000,
    opsi_debit: ['5-100', '1-300', '5-600', '4-100'],
    opsi_kredit: ['1-300', '5-100', '1-100', '2-100'],
    debit_benar: '5-100',
    kredit_benar: '1-300',
    insight:
      'Inilah saat persediaan berubah menjadi beban. Stok berkurang (kredit Persediaan) dan nilainya diakui sebagai Harga Pokok Penjualan (debit). Tanpa jurnal ini, penjualanmu terlihat untung besar karena biaya barangnya tidak pernah muncul.',
  },
  {
    id: 28,
    kategori: 'non_kas',
    teks: 'Mencatat harga pokok pesanan katering yang sudah dikirim, senilai Rp1.600.000.',
    nominal: 1_600_000,
    opsi_debit: ['5-100', '1-300', '5-200', '1-100'],
    opsi_kredit: ['1-300', '5-100', '4-100', '1-100'],
    debit_benar: '5-100',
    kredit_benar: '1-300',
    insight:
      'HPP dicatat saat barangnya diserahkan, mengikuti pendapatannya — bukan saat uang pelanggan cair. Pendapatan dan biayanya harus muncul di periode yang sama supaya labanya bermakna.',
  },
  {
    id: 29,
    kategori: 'non_kas',
    teks: 'Membeli etalase kaca baru seharga Rp3.500.000, dibayar dua bulan lagi.',
    nominal: 3_500_000,
    opsi_debit: ['1-500', '1-400', '5-600', '2-100'],
    opsi_kredit: ['2-100', '1-100', '1-500', '2-200'],
    debit_benar: '1-500',
    kredit_benar: '2-100',
    insight:
      'Aset boleh bertambah tanpa mengeluarkan uang sepeser pun — asal ada kewajiban yang menyertainya. Perhatikan: hutang ke pemasok barang/jasa masuk Hutang Usaha, bukan Hutang Bank.',
  },
  {
    id: 30,
    kategori: 'non_kas',
    teks: 'Kantor kelurahan memesan snack untuk acara senilai Rp2.800.000 dan akan membayar setelah tanggal 10.',
    nominal: 2_800_000,
    opsi_debit: ['1-200', '1-100', '2-100', '4-100'],
    opsi_kredit: ['4-100', '1-200', '4-200', '1-100'],
    debit_benar: '1-200',
    kredit_benar: '4-100',
    insight:
      'Penjualan kredit menaikkan laba tapi tidak menaikkan kas. Peserta yang banyak kebagian transaksi seperti ini akan punya laba bagus dengan kas yang tipis — persis seperti UMKM yang sering menalangi pelanggannya.',
  },
  {
    id: 31,
    kategori: 'non_kas',
    teks: 'Mengambil stok kemasan dari toko langganan senilai Rp600.000, dibayar minggu depan.',
    nominal: 600_000,
    opsi_debit: ['1-400', '1-300', '5-600', '1-500'],
    opsi_kredit: ['2-100', '1-100', '1-400', '4-100'],
    debit_benar: '1-400',
    kredit_benar: '2-100',
    insight:
      'Perlengkapan yang dibeli secara kredit tetap dicatat sebagai aset lebih dulu. Yang membedakan dari pembelian tunai hanya sisi kreditnya: Hutang Usaha, bukan Kas.',
  },
  {
    id: 32,
    kategori: 'non_kas',
    teks: 'Membayar gaji karyawan Rp2.500.000 lewat transfer dari rekening bank usaha.',
    nominal: 2_500_000,
    opsi_debit: ['5-200', '1-110', '3-200', '5-600'],
    opsi_kredit: ['1-110', '1-100', '5-200', '2-100'],
    debit_benar: '5-200',
    kredit_benar: '1-110',
    insight:
      'Bebannya sama, sumber uangnya yang berbeda. Salah memilih Kas padahal uangnya keluar dari rekening akan membuat saldo kas dan saldo bank di laporanmu dua-duanya keliru.',
  },
  {
    id: 33,
    kategori: 'non_kas',
    teks: 'Melunasi hutang ke supplier sebesar Rp1.800.000 lewat transfer bank.',
    nominal: 1_800_000,
    opsi_debit: ['2-100', '2-200', '1-300', '5-100'],
    opsi_kredit: ['1-110', '1-100', '2-100', '1-300'],
    debit_benar: '2-100',
    kredit_benar: '1-110',
    insight:
      'Dua akun berkurang sekaligus: kewajiban dan aset. Neraca tetap seimbang karena sisi kiri dan sisi kanan turun dengan nilai yang sama persis.',
  },

  // ──────────────────────── MODAL & PRIVE ────────────────────────
  {
    id: 34,
    kategori: 'modal',
    teks: 'Pemilik menyetorkan tambahan modal usaha sebesar Rp5.000.000 secara tunai.',
    nominal: 5_000_000,
    opsi_debit: ['1-100', '3-100', '4-100', '2-200'],
    opsi_kredit: ['3-100', '4-100', '2-200', '1-100'],
    debit_benar: '1-100',
    kredit_benar: '3-100',
    insight:
      'Setoran pemilik bukan pendapatan. Usahamu tidak menghasilkan apa pun dari uang ini — pemiliknya yang menambah taruhannya. Mencatatnya sebagai pendapatan membuat labamu terlihat besar palsu.',
  },
  {
    id: 35,
    kategori: 'modal',
    teks: 'Pemilik menyetor tambahan modal Rp7.000.000 langsung ke rekening bank usaha.',
    nominal: 7_000_000,
    opsi_debit: ['1-110', '3-100', '1-100', '4-200'],
    opsi_kredit: ['3-100', '1-110', '4-100', '2-200'],
    debit_benar: '1-110',
    kredit_benar: '3-100',
    insight:
      'Setoran modal boleh masuk lewat rekening. Yang dicatat di sisi debit adalah wadah tempat uangnya benar-benar berada.',
  },
  {
    id: 36,
    kategori: 'modal',
    teks: 'Pemilik menyerahkan motor pribadinya senilai Rp8.000.000 untuk dipakai operasional usaha.',
    nominal: 8_000_000,
    opsi_debit: ['1-500', '1-100', '3-100', '5-500'],
    opsi_kredit: ['3-100', '1-500', '2-200', '4-200'],
    debit_benar: '1-500',
    kredit_benar: '3-100',
    insight:
      'Modal tidak selalu berbentuk uang. Begitu motor itu diserahkan ke usaha, ia menjadi aset usaha dan modal pemilik bertambah — dan sejak saat itu biayanya pun jadi beban usaha.',
  },
  {
    id: 37,
    kategori: 'modal',
    teks: 'Pemilik menyerahkan stok barang dagangan miliknya senilai Rp1.500.000 ke usaha.',
    nominal: 1_500_000,
    opsi_debit: ['1-300', '1-100', '3-100', '5-100'],
    opsi_kredit: ['3-100', '1-300', '4-100', '2-100'],
    debit_benar: '1-300',
    kredit_benar: '3-100',
    insight:
      'Sama seperti setoran uang, hanya bentuknya persediaan. Aset usaha bertambah tanpa ada kewajiban baru, jadi imbangannya pasti Modal Pemilik.',
  },
  {
    id: 38,
    kategori: 'modal',
    teks: 'Pemilik mengambil Rp1.000.000 dari kas usaha untuk membayar SPP sekolah anaknya.',
    nominal: 1_000_000,
    opsi_debit: ['3-200', '5-600', '3-100', '5-200'],
    opsi_kredit: ['1-100', '3-200', '3-100', '1-110'],
    debit_benar: '3-200',
    kredit_benar: '1-100',
    insight:
      'SPP anak bukan beban usaha — usahamu tidak mendapat manfaat apa pun darinya. Ini Prive: pengambilan hak pemilik. Kalau dicatat sebagai beban, laba usahamu terlihat kecil padahal usahanya baik-baik saja. Inilah inti pelajaran memisahkan uang pribadi dan uang usaha.',
  },
  {
    id: 39,
    kategori: 'modal',
    teks: 'Pemilik mengambil Rp2.000.000 dari kas usaha untuk liburan keluarga.',
    nominal: 2_000_000,
    opsi_debit: ['3-200', '5-600', '5-500', '3-100'],
    opsi_kredit: ['1-100', '3-200', '1-110', '2-100'],
    debit_benar: '3-200',
    kredit_benar: '1-100',
    insight:
      'Prive bersaldo normal Debit walaupun ia berkelompok Modal. Di Neraca ia MENGURANGI modal pemilik — semakin sering diambil, semakin tipis modal yang tersisa di usaha.',
  },
  {
    id: 40,
    kategori: 'modal',
    teks: 'Membayar tagihan listrik rumah pribadi Rp300.000 memakai uang kas usaha.',
    nominal: 300_000,
    opsi_debit: ['3-200', '5-400', '5-600', '3-100'],
    opsi_kredit: ['1-100', '3-200', '1-110', '5-400'],
    debit_benar: '3-200',
    kredit_benar: '1-100',
    insight:
      'Jebakan paling sering: melihat kata "listrik" lalu memilih Beban Listrik & Air. Yang menentukan bukan jenis tagihannya, melainkan siapa yang menikmati manfaatnya. Listrik rumah dinikmati keluarga, bukan usaha → Prive.',
  },
  {
    id: 41,
    kategori: 'modal',
    teks: 'Pemilik memakai Rp750.000 dari kas usaha untuk membayar arisan keluarga.',
    nominal: 750_000,
    opsi_debit: ['3-200', '5-600', '1-200', '3-100'],
    opsi_kredit: ['1-100', '3-200', '2-100', '1-110'],
    debit_benar: '3-200',
    kredit_benar: '1-100',
    insight:
      'Arisan bukan investasi usaha dan bukan beban usaha. Selama uangnya keluar untuk kepentingan pribadi pemilik, jurnalnya selalu Prive (D) / Kas (K).',
  },
  {
    id: 42,
    kategori: 'modal',
    teks: 'Pemilik mengambil Rp500.000 dari kas untuk uang saku anak sekolah selama seminggu.',
    nominal: 500_000,
    opsi_debit: ['3-200', '5-200', '5-600', '3-100'],
    opsi_kredit: ['1-100', '3-200', '1-110', '3-100'],
    debit_benar: '3-200',
    kredit_benar: '1-100',
    insight:
      'Nominal kecil tetap harus dicatat. Prive Rp500.000 yang terjadi tiap minggu adalah Rp2.000.000 sebulan — jumlah yang cukup membuat pemilik heran ke mana perginya uang usahanya.',
  },
  {
    id: 43,
    kategori: 'modal',
    teks: 'Pemilik membayar cicilan motor pribadinya Rp900.000 dengan uang usaha.',
    nominal: 900_000,
    opsi_debit: ['3-200', '2-200', '5-500', '1-500'],
    opsi_kredit: ['1-100', '3-200', '2-200', '1-110'],
    debit_benar: '3-200',
    kredit_benar: '1-100',
    insight:
      'Motor pribadi tidak pernah diserahkan ke usaha, jadi cicilannya bukan Hutang Bank usaha dan bukan Beban Transportasi. Uang usaha yang dipakai untuk urusan pribadi selalu berujung di Prive.',
  },
  {
    id: 44,
    kategori: 'modal',
    teks: 'Pemilik mengambil barang dagangan dari kios untuk konsumsi keluarga senilai Rp250.000.',
    nominal: 250_000,
    opsi_debit: ['3-200', '5-100', '5-600', '1-300'],
    opsi_kredit: ['1-300', '1-100', '3-200', '4-100'],
    debit_benar: '3-200',
    kredit_benar: '1-300',
    insight:
      'Prive tidak selalu berupa uang. Barang yang diambil untuk keluarga mengurangi Persediaan, bukan Kas — dan tetap dicatat sebagai Prive, bukan penjualan.',
  },

  // ══════════════════ PENAWARAN ASURANSI (jenis: keputusan) ══════════════════
  //
  // Dimunculkan fasilitator lewat tombol khusus, bukan undian acak. SELURUH
  // peserta memutuskan untuk usahanya sendiri — di luar mekanik roda, karena
  // kalau hanya yang warnanya keluar boleh membeli, yang tertimpa kebakaran
  // nanti hampir pasti orang lain yang tidak pernah ditawari.
  //
  // Tidak dihitung dalam akurasi: ini strategi, bukan ujian. Pelajarannya
  // datang dari akibatnya, bukan dari skornya.
  {
    id: 45,
    kategori: 'kas_keluar',
    jenis: 'keputusan',
    polis: 'kebakaran',
    teks: 'Agen asuransi menawarkan pertanggungan kebakaran untuk kios dan isinya, premi Rp1.200.000 untuk perlindungan 1 tahun penuh. Beli, atau simpan uangnya?',
    nominal: 1_200_000,
    opsi_debit: ['1-600', '5-700', '5-600', '1-400'],
    opsi_kredit: ['1-100', '1-600', '2-100', '5-700'],
    debit_benar: '5-700',
    kredit_benar: '1-100',
    insight:
      'Premi asuransi adalah biaya perlindungan untuk periode berjalan, jadi dicatat sebagai Beban Asuransi. Perhatikan taruhannya: yang membeli kehilangan preminya hari ini dengan pasti, yang menolak menyimpan uangnya tapi menanggung sendiri kalau musibah datang. Premi selalu terasa mahal — sampai kebakaran benar-benar terjadi.',
  },
  {
    id: 46,
    kategori: 'kas_keluar',
    jenis: 'keputusan',
    polis: 'kendaraan',
    teks: 'Asuransi kendaraan untuk motor dan mobil operasional ditawarkan seharga Rp900.000 per tahun. Ambil, atau lewati?',
    nominal: 900_000,
    opsi_debit: ['1-600', '5-700', '5-500', '1-500'],
    opsi_kredit: ['1-100', '1-600', '2-200', '5-500'],
    debit_benar: '5-700',
    kredit_benar: '1-100',
    insight:
      'Sama seperti asuransi kebakaran: preminya beban periode ini, bukan aset dan bukan Beban Transportasi. Kendaraan operasional dipakai tiap hari di jalan — pertanyaannya bukan apakah risikonya ada, tapi apakah usahamu sanggup menanggung sendiri kalau terjadi.',
  },

  // ══════════════════════ MUSIBAH (jenis: kejadian) ══════════════════════
  //
  // Dimunculkan fasilitator, roda menentukan siapa yang tertimpa.
  //
  // Peserta yang punya polis aktif TIDAK menjurnal apa pun — kerugiannya
  // ditanggung penanggung. Yang tidak berasuransi mencatat kerugiannya sendiri,
  // dan di situlah selisih laporannya terlihat mencolok saat dibandingkan.
  {
    id: 47,
    kategori: 'non_kas',
    jenis: 'kejadian',
    polis: 'kebakaran',
    teks: 'Terjadi kebakaran di gudang. Seluruh persediaan barang dagangan senilai Rp3.500.000 habis terbakar.',
    nominal: 3_500_000,
    opsi_debit: ['5-600', '1-300', '5-100', '3-200'],
    opsi_kredit: ['1-300', '1-100', '5-600', '2-100'],
    debit_benar: '5-600',
    kredit_benar: '1-300',
    insight:
      'Barangnya lenyap, jadi Persediaan dikredit; nilainya diakui sebagai kerugian di Beban Lain-lain. Sekarang bandingkan dua peserta: yang berasuransi kasnya berkurang Rp1.200.000 di awal tapi asetnya utuh; yang menolak menghemat Rp1.200.000 tapi kehilangan Rp3.500.000 sekaligus. Premi selalu terasa mahal — sampai kebakaran benar-benar terjadi.',
  },
  {
    id: 48,
    kategori: 'non_kas',
    jenis: 'kejadian',
    polis: 'kebakaran',
    teks: 'Korsleting listrik malam hari membakar sebagian kios. Etalase dan mesin pengaduk senilai Rp2.500.000 rusak total dan tidak bisa dipakai lagi.',
    nominal: 2_500_000,
    opsi_debit: ['5-600', '1-500', '5-400', '3-200'],
    opsi_kredit: ['1-500', '1-100', '5-600', '2-100'],
    debit_benar: '5-600',
    kredit_benar: '1-500',
    insight:
      'Yang musnah kali ini Peralatan, bukan Persediaan — akun kreditnya ikut berubah, tapi polanya sama: aset yang hilang dikredit, kerugiannya didebit. Peralatan yang terbakar tidak bisa dijual dan tidak bisa dipakai; nilainya harus keluar dari neraca.',
  },
  {
    id: 49,
    kategori: 'non_kas',
    jenis: 'kejadian',
    polis: 'kendaraan',
    teks: 'Motor operasional menabrak pembatas jalan saat mengantar pesanan. Biaya kerusakannya Rp2.000.000 dan motor tercatat di akun Peralatan.',
    nominal: 2_000_000,
    opsi_debit: ['5-600', '5-500', '1-500', '3-200'],
    opsi_kredit: ['1-500', '1-100', '5-500', '2-100'],
    debit_benar: '5-600',
    kredit_benar: '1-500',
    insight:
      'Godaannya memilih Beban Transportasi karena menyangkut kendaraan. Tapi Beban Transportasi untuk biaya operasional rutin seperti bensin dan ongkos kirim — kerusakan aset akibat kecelakaan adalah kerugian, dan nilai asetnya berkurang.',
  },
  {
    id: 50,
    kategori: 'non_kas',
    jenis: 'kejadian',
    polis: 'kendaraan',
    teks: 'Mobil pengantaran terlibat kecelakaan. Kendaraan ringsek dan seluruh muatan barang dagangan senilai Rp4.000.000 rusak tidak terselamatkan.',
    nominal: 4_000_000,
    opsi_debit: ['5-600', '1-300', '5-500', '5-100'],
    opsi_kredit: ['1-300', '1-500', '1-100', '5-600'],
    debit_benar: '5-600',
    kredit_benar: '1-300',
    insight:
      'Perhatikan baik-baik apa yang hilang: yang dinilai di sini adalah muatannya, yaitu Persediaan. Peserta yang otomatis memilih Peralatan karena membaca kata "mobil" akan salah. Selalu tanya dulu: aset mana yang benar-benar berkurang?',
  },

  {
    id: 61,
    kategori: 'non_kas',
    jenis: 'kejadian',
    polis: 'kendaraan',
    teks: 'Motor operasional hilang dicuri saat diparkir di depan kios. Nilai tercatatnya Rp6.000.000.',
    nominal: 6_000_000,
    opsi_debit: ['5-600', '1-500', '5-500', '3-200'],
    opsi_kredit: ['1-500', '1-100', '5-600', '2-100'],
    debit_benar: '5-600',
    kredit_benar: '1-500',
    insight:
      'Kehilangan karena pencurian diperlakukan sama seperti kerusakan total: asetnya lenyap, jadi Peralatan dikredit dan nilainya diakui sebagai kerugian. Yang berasuransi kendaraan tidak mencatat apa pun — itulah gunanya premi yang dibayar di awal.',
  },

  // ══════════════════ TRANSAKSI PRIBADI (sifat: pribadi) ══════════════════
  //
  // Tidak satu pun menyebut sumber uangnya. Justru itu ujiannya: peserta harus
  // mengenali sendiri bahwa ini urusan pemilik, bukan urusan usaha — uangnya
  // keluar dari Dompet Pribadi dan tidak ada jurnal yang perlu dibuat.
  //
  // Opsi akunnya tetap diisi supaya peserta yang keliru memilih ranah bisnis
  // tetap bisa menyusun jurnalnya, lalu merasakan sendiri jurnal itu ditolak.
  {
    id: 51,
    kategori: 'modal',
    sifat: 'pribadi',
    arah_kas: 'keluar',
    teks: 'Kamu membeli rangkaian skincare dan perawatan wajah seharga Rp450.000.',
    nominal: 450_000,
    opsi_debit: ['3-200', '5-600', '1-400', '5-500'],
    opsi_kredit: ['1-100', '3-200', '1-110', '2-100'],
    debit_benar: '3-200',
    kredit_benar: '1-100',
    insight:
      'Skincare tidak dipakai usahamu dan tidak menghasilkan pendapatan apa pun untuknya. Ini pengeluaran pemilik, jadi uangnya keluar dari Dompet Pribadi dan tidak ada jurnal yang perlu dibuat sama sekali. Mencatatnya di buku usaha membuat beban usahamu terlihat lebih besar dari yang sebenarnya.',
  },
  {
    id: 52,
    kategori: 'modal',
    sifat: 'pribadi',
    arah_kas: 'keluar',
    teks: 'Keluarga berlibur akhir pekan ke luar kota, total pengeluaran Rp1.500.000.',
    nominal: 1_500_000,
    opsi_debit: ['3-200', '5-500', '5-600', '1-400'],
    opsi_kredit: ['1-100', '3-200', '1-110', '2-100'],
    debit_benar: '3-200',
    kredit_benar: '1-100',
    insight:
      'Liburan keluarga jelas bukan kegiatan usaha. Selama uangnya dari kantong pribadi, buku usahamu tidak perlu tahu sama sekali — cukup catat di Dompet Pribadi supaya kamu tetap tahu ke mana perginya uangmu.',
  },
  {
    id: 53,
    kategori: 'modal',
    sifat: 'pribadi',
    arah_kas: 'keluar',
    teks: 'Servis rutin motor pribadi yang dipakai sehari-hari keluarga, Rp250.000.',
    nominal: 250_000,
    opsi_debit: ['3-200', '5-500', '5-600', '1-500'],
    opsi_kredit: ['1-100', '3-200', '1-110', '2-100'],
    debit_benar: '3-200',
    kredit_benar: '1-100',
    insight:
      'Perhatikan kata "pribadi". Motor operasional yang dipakai mengantar pesanan biayanya masuk Beban Transportasi usaha; motor keluarga tidak. Aset yang sama bisa berbeda perlakuannya tergantung siapa yang memakainya.',
  },
  {
    id: 54,
    kategori: 'modal',
    sifat: 'pribadi',
    arah_kas: 'keluar',
    teks: 'Membeli baju lebaran untuk anak-anak senilai Rp800.000.',
    nominal: 800_000,
    opsi_debit: ['3-200', '1-300', '5-600', '5-200'],
    opsi_kredit: ['1-100', '3-200', '1-110', '4-100'],
    debit_benar: '3-200',
    kredit_benar: '1-100',
    insight:
      'Godaannya mencatat ini sebagai Persediaan karena berupa barang. Tapi persediaan adalah barang untuk DIJUAL; baju yang dipakai keluarga sendiri tidak akan pernah menghasilkan pendapatan.',
  },
  {
    id: 55,
    kategori: 'modal',
    sifat: 'pribadi',
    arah_kas: 'keluar',
    teks: 'Menghadiri kondangan dan memberi amplop Rp300.000.',
    nominal: 300_000,
    opsi_debit: ['3-200', '5-600', '5-500', '1-400'],
    opsi_kredit: ['1-100', '3-200', '2-100', '1-110'],
    debit_benar: '3-200',
    kredit_benar: '1-100',
    insight:
      'Beban Lain-lain milik usaha hanya untuk pengeluaran yang tetap ada hubungannya dengan usaha, seperti iuran keamanan pasar. Amplop kondangan tetangga bukan salah satunya.',
  },
  {
    id: 56,
    kategori: 'modal',
    sifat: 'pribadi',
    arah_kas: 'keluar',
    teks: 'Membayar langganan layanan streaming dan internet rumah Rp200.000.',
    nominal: 200_000,
    opsi_debit: ['3-200', '5-400', '5-600', '1-400'],
    opsi_kredit: ['1-100', '3-200', '1-110', '2-100'],
    debit_benar: '3-200',
    kredit_benar: '1-100',
    insight:
      'Sekali lagi jebakan kata: ada "internet" dan "langganan", terdengar seperti biaya operasional. Tapi yang menikmati adalah keluarga di rumah, bukan kios. Yang menentukan bukan jenis tagihannya, melainkan siapa yang memetik manfaatnya.',
  },
  {
    id: 57,
    kategori: 'modal',
    sifat: 'pribadi',
    arah_kas: 'keluar',
    teks: 'Membelikan anak ponsel baru untuk sekolah seharga Rp2.000.000.',
    nominal: 2_000_000,
    opsi_debit: ['3-200', '1-500', '1-400', '5-600'],
    opsi_kredit: ['1-100', '3-200', '2-100', '1-110'],
    debit_benar: '3-200',
    kredit_benar: '1-100',
    insight:
      'Nominalnya besar dan barangnya awet, jadi terasa pantas masuk Peralatan. Tapi Peralatan hanya untuk aset yang dipakai usaha. Ponsel anak sekolah tidak pernah menghasilkan rupiah untuk kiosmu.',
  },
  {
    id: 58,
    kategori: 'modal',
    sifat: 'pribadi',
    arah_kas: 'keluar',
    teks: 'Membayar iuran keanggotaan gym bulanan Rp350.000.',
    nominal: 350_000,
    opsi_debit: ['3-200', '5-600', '5-200', '1-400'],
    opsi_kredit: ['1-100', '3-200', '1-110', '2-100'],
    debit_benar: '3-200',
    kredit_benar: '1-100',
    insight:
      'Kesehatan pemilik memang menopang usahanya, tapi akuntansi tidak mengakui hubungan sejauh itu. Kalau logika "toh akhirnya untuk usaha juga" diterima, hampir semua pengeluaran pribadi bisa dibenarkan masuk buku usaha.',
  },
  {
    id: 59,
    kategori: 'modal',
    sifat: 'pribadi',
    arah_kas: 'keluar',
    teks: 'Memanggil teknisi untuk servis AC rumah, biayanya Rp400.000.',
    nominal: 400_000,
    opsi_debit: ['3-200', '5-400', '5-600', '1-500'],
    opsi_kredit: ['1-100', '3-200', '1-110', '2-100'],
    debit_benar: '3-200',
    kredit_benar: '1-100',
    insight:
      'Bandingkan dengan servis peralatan kios yang memang beban usaha. Yang membedakan cuma satu: barangnya ada di rumah atau di tempat usaha.',
  },
  {
    id: 60,
    kategori: 'modal',
    sifat: 'pribadi',
    arah_kas: 'keluar',
    teks: 'Mentraktir teman-teman saat reuni sekolah, habis Rp600.000.',
    nominal: 600_000,
    opsi_debit: ['3-200', '5-600', '5-500', '1-300'],
    opsi_kredit: ['1-100', '3-200', '2-100', '1-110'],
    debit_benar: '3-200',
    kredit_benar: '1-100',
    insight:
      'Kalau yang ditraktir adalah pemasok atau pelanggan dalam rangka usaha, ia bisa jadi beban usaha. Reuni sekolah murni urusan pribadi. Niat di balik pengeluaran itulah yang menentukan tempatnya.',
  },
]

# PRD — Juragan Terkaya: Double Entry
### Game Edukasi Jurnal & Laporan Keuangan (Interactive Multiplayer Game)

**Versi dokumen:** 1.0
**Dibuat untuk:** Sanggabiz — materi presentasi/training akuntansi UMKM
**Target implementasi:** Claude Code, project baru dan mandiri
**Hubungan dengan game lama:** Ini **bukan** pengembangan dari *Juragan Terkaya* v1. Game v1 tetap berjalan sendiri; dokumen ini untuk aplikasi baru dengan mekanik jawaban dan penilaian yang berbeda mendasar.

---

## 1. Latar Belakang & Tujuan

Game v1 mengajarkan **dua kebiasaan dasar**: memisahkan uang pribadi dari uang usaha, dan mencatat setiap transaksi. Peserta menjawab pilihan ganda A/B/C tentang *apakah* dan *bagaimana* sebuah transaksi dicatat.

Game ini naik satu tingkat: peserta tidak lagi memilih "dicatat sebagai apa" dalam bahasa awam, melainkan **menyusun jurnal double-entry** — memilih akun yang didebit dan akun yang dikredit. Hasilnya langsung mengalir ke pembukuan pribadi masing-masing peserta:

```
Jurnal  →  Buku Besar (GL)  →  Neraca Saldo (TB)  →  Neraca + Laba Rugi
```

Target audiens: peserta yang sudah paham konsep dasar pencatatan (idealnya alumni sesi v1), pemilik UMKM yang mulai menyusun laporan sendiri, atau staf keuangan pemula.

### Pesan utama yang ingin ditanamkan

1. Setiap transaksi selalu menyentuh **dua sisi** yang nilainya sama.
2. **Pembukuan yang balance belum tentu benar.** Salah memilih akun tetap menghasilkan neraca yang seimbang — tapi laporannya menyesatkan. Ini pelajaran paling penting dan sengaja dijadikan pengalaman langsung, bukan ceramah.
3. Laporan keuangan bukan dokumen terpisah — ia terbentuk otomatis dari jurnal yang kita catat sehari-hari.

---

## 2. Perbedaan Mendasar dari v1

| Aspek | v1 (Juragan Terkaya) | v2 (Double Entry) |
|---|---|---|
| Bentuk jawaban | Pilihan ganda A/B/C | Pilih **akun Debit** + **akun Kredit** |
| Efek jawaban | Saldo bertambah/berkurang sesuai kunci soal | Jurnal diposting ke pembukuan peserta |
| Jawaban salah | Kena denda, transaksi tetap terjadi | **Tetap dijurnal** — buku peserta jadi salah |
| Yang dilihat peserta | Saldo dan catatan transaksi sederhana | GL, Neraca Saldo, Neraca, Laba Rugi |
| Penentu pemenang | Saldo tertinggi | **Akurasi jurnal dulu**, baru saldo |
| Siapa yang mencatat | Hanya peserta yang warnanya keluar | **Sama** — mekanik warna dipertahankan |
| Peserta warna lain | Boleh ikut jawab, tanpa efek saldo | Boleh ikut menjurnal sebagai **latihan**, tanpa diposting |

Mekanik roda warna sengaja dipertahankan: keberuntungan itulah yang membuat papan skor hidup sampai putaran terakhir. Lihat bagian 5.1 untuk konsekuensinya pada pembukuan.

---

## 3. Peran Pengguna

### 3.1 Peserta
- Mengakses lewat satu link yang sama dari HP masing-masing
- Mendaftar cukup dengan **nama asli**, tanpa akun atau password
- Menyusun jurnal setiap transaksi: memilih 1 akun Debit dan 1 akun Kredit
- Dapat membuka pembukuannya sendiri kapan saja (GL, TB, Neraca, L/R)

### 3.2 Fasilitator
- Akses dikunci **PIN** (link game bersifat publik)
- Mengendalikan jalannya putaran: membuka transaksi, menutup waktu, reveal jurnal yang benar, menampilkan insight
- Melihat pembukuan **seluruh peserta**, termasuk membandingkan Neraca antar peserta
- Mengelola bank soal lewat UI, tanpa menyentuh kode

---

## 4. Bagan Akun (Chart of Accounts)

Bagan akun bersifat **tetap** (tidak diedit fasilitator), karena seluruh mesin pembukuan dan struktur laporan bergantung padanya.

| Kode | Nama Akun | Kelompok | Saldo Normal | Muncul di |
|---|---|---|---|---|
| 1-100 | Kas | Aset | Debit | Neraca |
| 1-110 | Bank | Aset | Debit | Neraca |
| 1-200 | Piutang Usaha | Aset | Debit | Neraca |
| 1-300 | Persediaan | Aset | Debit | Neraca |
| 1-400 | Perlengkapan | Aset | Debit | Neraca |
| 1-500 | Peralatan | Aset | Debit | Neraca |
| 2-100 | Hutang Usaha | Kewajiban | Kredit | Neraca |
| 2-200 | Hutang Bank | Kewajiban | Kredit | Neraca |
| 3-100 | Modal Pemilik | Modal | Kredit | Neraca |
| 3-200 | Prive | Modal (kontra) | **Debit** | Neraca |
| 4-100 | Pendapatan Penjualan | Pendapatan | Kredit | Laba Rugi |
| 4-200 | Pendapatan Lain-lain | Pendapatan | Kredit | Laba Rugi |
| 5-100 | Harga Pokok Penjualan | Beban | Debit | Laba Rugi |
| 5-200 | Beban Gaji | Beban | Debit | Laba Rugi |
| 5-300 | Beban Sewa | Beban | Debit | Laba Rugi |
| 5-400 | Beban Listrik & Air | Beban | Debit | Laba Rugi |
| 5-500 | Beban Transportasi | Beban | Debit | Laba Rugi |
| 5-600 | Beban Lain-lain | Beban | Debit | Laba Rugi |

**Catatan implementasi:** *Prive* sengaja bersaldo normal Debit meski berkelompok Modal. Di Neraca ia **mengurangi** Modal. Ini sumber bug klasik — pastikan rumus Modal memakai tanda minus untuk Prive, bukan plus.

---

## 5. Konsep Inti Permainan

### 5.1 Warna menentukan nasib — dan itu inti keseruannya

Setiap putaran, peserta memilih 1 dari 4 warna **sebelum tahu transaksi apa yang akan keluar**. Roda lalu menentukan warna mana yang kena:

- **Warna cocok** → peserta wajib menjurnal, dan jurnalnya **diposting ke pembukuannya**
- **Warna tidak cocok** → boleh ikut menjurnal sebagai **latihan**: dapat umpan balik benar/salah setelah reveal, tapi **tidak diposting** ke pembukuan dan **tidak dihitung** dalam penilaian

Konsekuensinya disengaja: pembukuan tiap peserta berisi rangkaian transaksi yang berbeda-beda. Peserta yang beruntung kebagian beberapa transaksi penambah kas akan punya Neraca yang jauh berbeda dari peserta yang kebagian pembelian dan beban. Justru itu yang membuat tab Perbandingan menarik dibedah bersama.

#### ⚠️ Transaksi harus diundi lepas dari warna

Ini aturan yang menentukan hidup-matinya mekanik ini. **Warna tidak boleh dipetakan ke kategori transaksi tertentu.**

Kalau 🔴 selalu berarti kas masuk dan 🟡 selalu kas keluar, peserta akan hafal setelah dua-tiga putaran, semua memilih 🔴, dan unsur keberuntungannya lenyap. Yang tersisa hanya adu cepat menebak pola.

Karena itu urutannya wajib:

1. Peserta memilih warna (belum ada transaksi apa pun yang ditentukan)
2. Sistem mengundi **satu transaksi acak dari seluruh bank soal**, tanpa memandang warna
3. Roda diputar, menentukan **siapa** yang membukukan transaksi itu

Dengan urutan ini, memilih warna murni untung-untungan — persis seperti yang dimaksud pemilik produk. Berbeda dari v1, di mana soal dikelompokkan per warna.

#### Menjaga keberuntungan tetap wajar

Karena hanya ±25% putaran yang "kena" untuk tiap peserta, jalankan **minimal 12–16 putaran** supaya sebaran warna sempat merata. Pada sesi pendek, pertimbangkan agar roda menghindari warna yang sama keluar tiga kali berturut-turut — mengurangi ketimpangan ekstrem tanpa menghilangkan unsur untung-untungan.

Fasilitator juga dapat melihat berapa kali tiap peserta sudah kebagian, dan menutup game pada titik yang terasa adil.

### 5.2 Modal Awal

Setiap peserta memulai dengan **jurnal pembukaan** yang identik:

```
Kas (1-100)              Rp10.000.000  (D)
    Modal Pemilik (3-100)    Rp10.000.000  (K)
```

Jurnal ini diposting otomatis saat peserta mendaftar, dan muncul di GL sebagai baris pertama. Peserta tidak menyusunnya sendiri.

### 5.3 Alur per Putaran

Jumlah putaran tidak dibatasi sistem — fasilitator yang menentukan kapan berhenti.

**1. Fase pilih warna** (10 detik)
Fasilitator membuka putaran. Semua peserta memilih 1 dari 4 warna; yang tidak sempat memilih dipilihkan sistem secara acak. Warna terkunci begitu dipilih. **Belum ada transaksi yang ditentukan pada tahap ini.**

**2. Fasilitator memutar roda**
Sistem mengundi satu transaksi acak dari bank soal (menghindari soal yang baru dipakai), lalu roda berhenti di satu warna. Peserta berwarna itu berstatus **wajib**; sisanya **latihan**.

**3. Fase menjurnal** (durasi 45 detik — lebih lama dari v1 karena keputusannya dua kali lipat)
Setiap peserta melihat:
- Status dirinya: **wajib** atau **latihan**
- Teks kasus dan **nominalnya**
- Kolom **Debit**: 4 pilihan akun
- Kolom **Kredit**: 4 pilihan akun

Peserta memilih satu akun di tiap kolom, lalu menekan "Catat Jurnal". Setelah dikirim, pilihan terkunci.

Peserta **wajib** yang tidak mengirim sampai waktu habis: jurnalnya tidak diposting, dan dihitung salah untuk akurasi. Peserta **latihan** yang diam saja tidak menanggung apa pun.

**4. Fasilitator menutup waktu dan reveal**
Barulah jurnal yang benar ditampilkan, beserta insight edukatifnya. Sebelum titik ini, **tidak boleh ada satu pun petunjuk jawaban** di layar mana pun — lihat bagian 15.

**5. Posting ke pembukuan**
Jurnal peserta **wajib** diposting serentak saat reveal — benar maupun salah. GL, TB, Neraca, dan L/R mereka langsung ter-update. Jurnal latihan hanya diberi umpan balik, tidak diposting.

**6. Papan skor antar putaran**
Tampilkan peringkat sementara, siapa yang jurnalnya masih 100% benar, dan berapa kali tiap peserta sudah kebagian giliran.

### 5.4 Format Jawaban Debit–Kredit

Setiap soal menyediakan **4 opsi akun untuk Debit** dan **4 opsi akun untuk Kredit**. Opsi ditampilkan sebagai *nama akun* (bukan kode), diurutkan acak per peserta agar tidak bisa saling contek posisi.

**Aturan wajib pada bank soal:**
1. `opsi_debit` **harus** memuat `akun_debit_benar`
2. `opsi_kredit` **harus** memuat `akun_kredit_benar`
3. `akun_debit_benar` ≠ `akun_kredit_benar`
4. Editor soal **menolak menyimpan** kalau salah satu aturan di atas dilanggar

> Aturan 1 dan 2 terdengar sepele, tapi contoh awal yang diberikan pemilik produk justru melanggarnya: kasus "pembelian tidak tunai" (jawaban benar: Persediaan / Hutang Usaha) diberi opsi Debit berisi Kas, Piutang, Hutang, Pendapatan — tanpa Persediaan. Soal seperti itu mustahil dijawab benar, dan hanya ketahuan saat sesi berjalan kalau tidak divalidasi di editor.

**Di antarmuka peserta**, akun yang sudah dipilih di kolom Debit **dinonaktifkan** di kolom Kredit (dan sebaliknya). Mendebit dan mengkredit akun yang sama tidak pernah menjadi jurnal yang sah.

---

## 6. Mesin Pembukuan

### 6.1 Aturan posting

Satu jawaban peserta menghasilkan **satu jurnal dengan dua baris**:

| Akun | Debit | Kredit |
|---|---|---|
| `akun_debit_dipilih` | `nominal` | — |
| `akun_kredit_dipilih` | — | `nominal` |

Nominal diambil dari definisi soal, **bukan** input peserta — supaya seluruh pembukuan bisa dibandingkan secara adil.

### 6.2 Konsekuensi yang harus dipahami tim

Karena kedua sisi selalu bernilai sama, **jurnal yang salah pun tetap balance**. Artinya:

- Neraca Saldo peserta **selalu** seimbang, benar atau salah jurnalnya
- Neraca **selalu** memenuhi Aset = Kewajiban + Modal
- Yang berbeda antar peserta adalah **komposisi akunnya**, bukan keseimbangannya

Ini bukan cacat — ini justru inti pelajarannya, dan sebaiknya ditonjolkan fasilitator: *"Buku kalian semua balance. Tapi coba lihat, kas kalian berbeda-beda. Kenapa?"*

### 6.3 Saldo akun

```
Saldo akun = Σ debit − Σ kredit        (untuk akun bersaldo normal Debit)
Saldo akun = Σ kredit − Σ debit        (untuk akun bersaldo normal Kredit)
```

Saldo ditampilkan positif bila sesuai saldo normalnya. Saldo negatif (misal Kas minus) **tidak dicegah** — biarkan muncul, karena ini sinyal edukatif yang kuat bahwa ada jurnal yang keliru.

---

## 7. Laporan Keuangan

Keempatnya tersedia di **halaman peserta** (pembukuan miliknya sendiri) dan **halaman fasilitator** (pembukuan siapa pun yang dipilih).

### 7.1 Buku Besar (General Ledger)

Dikelompokkan per akun, hanya akun yang pernah tersentuh:

| Putaran | Keterangan | Debit | Kredit | Saldo |
|---|---|---|---|---|
| 0 | Setoran modal awal | 10.000.000 | | 10.000.000 |
| 1 | Penjualan tunai | 2.500.000 | | 12.500.000 |
| 3 | Bayar sewa kios | | 2.000.000 | 10.500.000 |

Saldo berjalan dihitung berurutan sesuai nomor putaran.

### 7.2 Neraca Saldo (Trial Balance)

| Kode | Nama Akun | Debit | Kredit |
|---|---|---|---|
| 1-100 | Kas | 10.500.000 | |
| 4-100 | Pendapatan Penjualan | | 2.500.000 |
| … | | | |
| | **TOTAL** | **X** | **X** |

Kedua total wajib sama. Tampilkan indikator ✅ Seimbang / ⚠️ Tidak seimbang — kalau sampai tidak seimbang, itu **bug pada mesin posting**, bukan kesalahan peserta.

### 7.3 Laporan Laba Rugi

```
Pendapatan
  Pendapatan Penjualan          2.500.000
  Pendapatan Lain-lain                  0
                              -----------
  Total Pendapatan              2.500.000

Beban
  Harga Pokok Penjualan           800.000
  Beban Sewa                    2.000.000
  …
                              -----------
  Total Beban                   2.800.000
                              ===========
LABA (RUGI) BERSIH              (300.000)
```

### 7.4 Neraca

```
ASET                             KEWAJIBAN & MODAL
  Kas            10.500.000        Hutang Usaha        900.000
  Piutang Usaha   1.500.000        Hutang Bank               0
  Persediaan        800.000                          ----------
  …                                Total Kewajiban     900.000
                                   Modal Pemilik    10.000.000
                                   Prive              (500.000)
                                   Laba Berjalan      (300.000)
                                                    ----------
                                   Total Modal       9.200.000
               -----------                          ----------
TOTAL ASET      10.100.000       TOTAL K+M          10.100.000
```

**Rumus Modal:**
```
Total Modal = Modal Pemilik − Prive + Laba Berjalan
Laba Berjalan = Total Pendapatan − Total Beban   (dari L/R, belum ditutup)
```

Tampilkan indikator seimbang/tidak, dengan alasan yang sama seperti TB.

---

## 8. Penentuan Pemenang

Penilaian berjenjang. **Akurasi adalah gerbang utama, saldo adalah pemeringkat.**

**Akurasi hanya dihitung dari putaran saat peserta berstatus wajib.** Jurnal latihan tidak ikut, baik menambah maupun mengurangi. Peserta yang kebagian 3 giliran dan benar semua tetap terhitung 100%, sama seperti yang kebagian 6 giliran dan benar semua.

### Tahap 1 — Kandidat sempurna

Kumpulkan peserta yang **100% jurnalnya benar**: setiap giliran wajib dijawab, dan setiap jurnal tepat pada kedua sisinya.

- **Jika ada** → mereka diurutkan berdasarkan **Saldo Kas tertinggi**. Peserta di luar kelompok ini tidak bisa menang, berapa pun saldonya.
- Peserta yang **belum pernah kebagian giliran sama sekali** tidak masuk kandidat — akurasinya tidak terdefinisi, dan saldonya masih persis modal awal.

### Tahap 2 — Bila tidak ada yang sempurna

Seluruh peserta diurutkan dengan kriteria berjenjang:
1. **Persentase jurnal benar** tertinggi (bukan jumlah absolut — jumlah giliran tiap peserta berbeda karena undian warna)
2. Bila seri → **jumlah jurnal benar** terbanyak
3. Bila masih seri → **rata-rata waktu menjawab** tercepat
4. Bila masih seri → Saldo Kas tertinggi

Kriteria 1 dan 2 sengaja dipisah: persentase menyamakan kedudukan peserta yang jarang kebagian, sementara jumlah absolut menghargai yang lebih sering diuji.

### Kenapa akurasi harus jadi gerbang, bukan sekadar bonus

Karena jurnal yang salah tetap diposting, peserta bisa **tidak sengaja diuntungkan**. Contoh: pembelian tunai Rp1.000.000 yang seharusnya `Persediaan (D) / Kas (K)`, kalau salah dikreditkan ke `Hutang Usaha` maka kasnya **tidak berkurang** — saldo kasnya jadi lebih besar daripada peserta yang menjawab benar.

Kalau peringkat murni memakai saldo, peserta paling ceroboh justru berpeluang menang. Gerbang 100% akurasi menutup celah ini sepenuhnya. **Jangan mengganti mekanisme ini dengan bonus/penalti angka** — itu hanya menutupi gejalanya.

### Yang perlu ditampilkan

Papan skor menampilkan, per peserta: Saldo Kas, **jumlah benar / jumlah giliran wajib**, persentase akurasi, dan rata-rata waktu. Beri lencana khusus (misal 💎) untuk yang masih 100% — ini pendorong keterlibatan yang kuat sepanjang permainan.

Tampilkan juga jumlah giliran secara terbuka, supaya peserta yang jarang kebagian tahu posisinya bukan karena penilaian yang tidak adil, melainkan undian.

---

## 9. Bank Soal

### 9.1 Struktur data soal

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | number | ID unik |
| `kategori` | enum | kas_masuk / kas_keluar / non_kas / modal — **hanya untuk pengelolaan bank soal**, tidak dipakai mengundi (lihat 5.1) |
| `teks` | string | Narasi kasus, **memuat nominal secara eksplisit** |
| `nominal` | number | Nilai yang diposting ke kedua sisi |
| `opsi_debit` | array[4] | Kode akun, wajib memuat `debit_benar` |
| `opsi_kredit` | array[4] | Kode akun, wajib memuat `kredit_benar` |
| `debit_benar` | string | Kode akun |
| `kredit_benar` | string | Kode akun |
| `insight` | string | Pembahasan edukatif setelah reveal |

### 9.2 Cakupan yang harus ada

Minimal **40 soal**, mencakup pola jurnal yang berbeda-beda:

| Pola | Contoh kasus | Jurnal benar |
|---|---|---|
| Penjualan tunai | Warung terjual Rp2.500.000 tunai | Kas / Pendapatan Penjualan |
| Penjualan kredit | Pelanggan ambil barang, bayar minggu depan | Piutang Usaha / Pendapatan Penjualan |
| Pelunasan piutang | Pelanggan melunasi hutangnya | Kas / Piutang Usaha |
| Pembelian tunai | Beli bahan baku dibayar tunai | Persediaan / Kas |
| Pembelian kredit | Ambil barang dari supplier, bayar bulan depan | Persediaan / Hutang Usaha |
| Pelunasan hutang | Bayar supplier | Hutang Usaha / Kas |
| Beban dibayar tunai | Bayar listrik, sewa, gaji | Beban … / Kas |
| Pembelian aset | Beli mesin pengaduk | Peralatan / Kas |
| Setoran modal | Pemilik menambah modal | Kas / Modal Pemilik |
| **Prive** | Ambil uang usaha untuk SPP anak | **Prive / Kas** |
| Pinjaman bank | Terima pinjaman modal | Kas / Hutang Bank |
| Setoran ke bank | Pindahkan kas ke rekening usaha | Bank / Kas |

Soal **Prive** wajib porsinya banyak — inilah jembatan ke pesan utama game v1 tentang memisahkan uang pribadi dan usaha.

Jaga **sebaran kategori tetap berimbang** — kira-kira seperempat kas masuk, seperempat kas keluar, sisanya non-kas dan modal/prive. Karena transaksi diundi acak dari seluruh bank, komposisi bank soal itulah yang menentukan peluang seseorang kebagian transaksi penambah kas. Bank yang timpang membuat permainan terasa berat sebelah tanpa ada yang tahu sebabnya.

### 9.3 Pengambilan soal

Transaksi diundi **acak dari seluruh bank soal**, tidak difilter warna (lihat 5.1). Sistem menghindari repetisi dengan melacak ID soal yang baru dipakai (misal 20 terakhir). Bila habis, boleh mengulang dari awal.

---

## 10. Editor Soal (Fasilitator)

Dapat diakses dari dashboard, tanpa menyentuh kode:

- Daftar seluruh soal dengan **pencarian** (teks/nomor) dan **filter kategori**
- Form edit: teks kasus, nominal, kategori, pilihan akun Debit (4 dropdown dari bagan akun), pilihan akun Kredit (4 dropdown), penanda mana yang benar, insight
- **Validasi wajib sebelum simpan** (lihat 5.4): opsi memuat jawaban benar, dan debit ≠ kredit
- Tambah, duplikat, hapus soal
- Perubahan tersimpan permanen dan **tidak ikut terhapus saat Reset**

---

## 11. Halaman Peserta

### 11.1 Pendaftaran
Cukup nama. Ditampilkan penjelasan singkat modal awal dan jurnal pembukaannya.

### 11.2 Badge status (selalu terlihat)
Nama · Saldo Kas · akurasi berjalan (misal `4/5 benar`) · indikator koneksi

### 11.3 Fase menjurnal
- Kartu kasus + nominal
- Dua kolom pilihan akun (Debit dan Kredit), dengan penonaktifan silang
- Timer ring 45 detik
- Pratinjau jurnal yang akan dikirim, sebelum dikonfirmasi
- Setelah kirim: **hanya konfirmasi terkirim**, tanpa petunjuk benar/salah

### 11.4 Setelah reveal
- Jurnal peserta disandingkan dengan jurnal yang benar
- Insight edukatif
- Bila salah: penjelasan singkat akun mana yang keliru dan dampaknya ke laporan

### 11.5 Tab pembukuan (selalu dapat dibuka)
`📒 Jurnal` · `📗 Buku Besar` · `⚖️ Neraca Saldo` · `🏛️ Neraca` · `📈 Laba Rugi`

Mobile-first: tabel dibuat dapat digeser horizontal, angka rata kanan dengan lebar digit tetap.

---

## 12. Halaman Fasilitator

### 12.1 Tab Kendali
Kontrol putaran, kasus aktif, progress siapa yang sudah mengirim jurnal (**tanpa** benar/salah sebelum reveal), tombol reveal dan insight, papan skor antar putaran.

### 12.2 Tab Pembukuan Peserta
Pilih peserta → lihat GL, TB, Neraca, L/R miliknya. Berguna untuk membedah kesalahan bersama-sama di layar besar setelah reveal.

### 12.3 Tab Perbandingan
Tabel seluruh peserta: Saldo Kas, Total Aset, Laba Bersih, akurasi, rata-rata waktu. Inilah bahan diskusi terkuat — memperlihatkan bagaimana kesalahan jurnal menghasilkan laporan yang berbeda dari transaksi yang sama persis.

### 12.4 Tab Papan Skor
Sesuai aturan bagian 8, dengan lencana 💎 untuk peserta berakurasi 100%.

---

## 13. Model Data

| Entitas | Isi |
|---|---|
| `game_state` | singleton: fase, putaran, soal aktif, penanda reveal, riwayat soal |
| `peserta` | id, nama, waktu daftar |
| `jurnal` | id, peserta_id, putaran, soal_id, akun_debit, akun_kredit, nominal, benar, waktu_jawab_ms, diterapkan |
| `soal` | bank soal (lihat 9.1) |
| `akun` | bagan akun — boleh sebagai konstanta kode, tidak perlu tabel |

**Saldo tidak disimpan sebagai kolom.** Ia selalu dihitung ulang dari tabel `jurnal`. Ini berbeda dari v1 dan disengaja: satu sumber kebenaran, mustahil melenceng antara saldo dan pembukuan.

Untuk 50+ peserta, hitung ulang di sisi klien dari data jurnal yang sudah diambil — jangan satu query per peserta.

---

## 14. Non-Functional Requirements

- **Skala**: 50+ peserta bersamaan tanpa lag berarti
- **Device**: peserta dari HP (mobile-first), fasilitator dari laptop/proyektor
- **Peserta remote**: pemain bergabung dari lokasi berbeda, bukan satu ruangan. Apa pun yang wajib dilihat peserta harus tampil juga di HP mereka, jangan mengandalkan share screen
- **Resiliensi jaringan**: realtime + polling cadangan; peserta yang sempat terputus menyusul state terbaru tanpa merusak data
- **Bahasa**: Bahasa Indonesia sepenuhnya
- **Format angka**: Rupiah pemisah ribuan; di tabel laporan boleh tanpa prefiks `Rp` demi kerapian kolom

---

## 15. Pelajaran dari v1 — Wajib Dibaca Sebelum Implementasi

Delapan hal berikut adalah masalah nyata yang muncul saat membangun dan menguji v1. Semuanya akan terulang di v2 kalau tidak diantisipasi sejak awal.

**1. Menunda pengungkapan hasil itu berantai, bukan satu tempat.**
Menyembunyikan tanda ✅/❌ saja tidak cukup. Di v1 ada tiga kebocoran lain: saldo yang langsung berubah, form lanjutan yang hanya muncul kalau jawaban benar, dan badge jenis transaksi. Di v2 tambahannya: **jangan posting jurnal ke GL sebelum reveal** — peserta bisa membuka tab Buku Besar dan melihat apakah kasnya berubah.

**2. Layar fasilitator harus dianggap terlihat peserta.**
Fasilitator men-share layar. Apa pun di sana — nominal, jenis akun, rekap benar/salah, bahkan tab lain yang tidak sedang dibuka — bocor. Terapkan aturan yang sama ketatnya seperti di halaman peserta.

**3. Supabase menolak `DELETE` tanpa `WHERE`.**
Ekstensi `pg_safeupdate` aktif; fungsi reset gagal dengan error 21000. Tulis `delete from tabel where true`.

**4. Kolom integer menolak pecahan.**
Koreksi jam server menghasilkan milidetik pecahan → `invalid input syntax for type integer`. Bulatkan sebelum menyimpan.

**5. Halaman lama tetap berjalan setelah deploy.**
Peserta yang tab-nya sudah terbuka menjalankan kode lama — di v1 ini membuka jawaban lebih awal dan menulis saldo dengan aturan yang sudah diganti. Sediakan pengecekan versi (bandingkan hash bundel di `index.html` dengan yang sedang berjalan) dan banner "muat ulang". **Dan jangan deploy saat sesi berjalan.**

**6. Timer harus diselaraskan ke jam server.**
Jam HP peserta bisa meleset beberapa menit. Sediakan fungsi `waktu_server()` dan ukur selisihnya sekali di awal.

**7. Realtime saja tidak cukup.**
Sediakan polling cadangan (±5 detik) dan indikator koneksi di layar peserta.

**8. Sediakan pemeriksaan konsistensi yang terlihat.**
Di v1, penanda "saldo tersimpan ≠ hasil hitung ulang" langsung membongkar data rusak akibat klien kedaluwarsa. Di v2 padanannya: indikator seimbang/tidak pada Neraca Saldo dan Neraca. Kalau sampai tidak seimbang, itu bug mesin posting — dan Anda ingin mengetahuinya sebelum peserta yang menemukannya.

---

## 16. Reset & Multi-Sesi

Tombol Reset menghapus seluruh peserta dan jurnal, mengembalikan status game ke awal. **Bank soal tidak ikut terhapus.**

---

## 17. Keputusan yang Sudah Difinalisasi

Empat hal berikut sudah disepakati pemilik produk — bukan lagi bahan diskusi:

| # | Keputusan | Ketetapan |
|---|---|---|
| 1 | **Mekanik warna dipertahankan penuh** | Hanya peserta yang warnanya keluar yang membukukan transaksi. Keberuntungan adalah bagian terseru dari game ini dan tidak boleh dihilangkan demi kerapian pembukuan. Peserta lain boleh menjurnal sebagai latihan tanpa efek. Lihat 5.1 |
| 2 | **Tanpa bonus dan denda angka** | Saldo murni hasil jurnal. Akurasi sudah menjadi gerbang penilaian di bagian 8 |
| 3 | **Durasi menjurnal 45 detik** | Dua keputusan per soal, lebih berat dari pilihan ganda v1 yang 30 detik |
| 4 | Peserta wajib yang tidak sempat mengirim | Tidak diposting, dihitung salah untuk akurasi |

### Satu hal yang tetap perlu dijaga saat implementasi

Keputusan 1 membawa satu risiko yang mudah terlewat: **jangan sekali-kali memetakan warna ke kategori transaksi.** Begitu peserta bisa menebak bahwa satu warna cenderung menguntungkan, unsur keberuntungannya mati dan game berubah jadi adu hafalan pola. Urutan wajibnya — pilih warna dulu, baru undi transaksi, baru putar roda — dijelaskan di bagian 5.1.

---

## 18. Saran Arsitektur Teknis

Stack yang sama dengan v1 sudah terbukti dan bisa langsung dipakai ulang:

- **Frontend**: React + TypeScript + Vite, Tailwind CSS
- **Realtime & database**: Supabase (Postgres + Realtime)
- **Hosting**: Vercel, auto-deploy dari GitHub
- **Autentikasi fasilitator**: PIN sederhana dari environment variable, tanpa sistem auth penuh
- **Struktur laporan**: buat satu modul murni (tanpa React) yang menerima daftar jurnal dan mengembalikan GL, TB, Neraca, dan L/R. Dipakai bersama halaman peserta dan fasilitator — kalau logikanya disalin dua kali, cepat atau lambat angka di HP peserta akan berbeda dengan angka di layar fasilitator, dan itu jenis perbedaan yang memicu perdebatan di tengah presentasi.

---

*Dokumen ini disusun berdasarkan ketentuan dari pemilik produk, ditambah temuan teknis dari pembangunan dan pengujian Juragan Terkaya v1. Bagian 15 dan 17 sebaiknya dibaca lebih dulu sebelum menulis baris kode pertama.*

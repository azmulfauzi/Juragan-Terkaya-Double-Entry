# Juragan Terkaya: Double Entry

Game edukasi menyusun **jurnal double-entry** untuk sesi training akuntansi UMKM Sanggabiz.
Peserta memilih akun Debit dan akun Kredit setiap transaksi, lalu jurnalnya langsung mengalir ke
pembukuannya sendiri:

```
Jurnal  →  Buku Besar  →  Neraca Saldo  →  Neraca + Laba Rugi
```

Ini aplikasi **mandiri**, bukan pengembangan dari Juragan Terkaya v1. Keduanya berjalan sendiri-sendiri
dengan database yang terpisah.

---

## Menyiapkan (sekali saja)

1. **Buat project Supabase baru** di [supabase.com/dashboard](https://supabase.com/dashboard).
   Jangan pakai project v1 — nama tabelnya mirip tapi strukturnya berbeda total.
2. Buka **SQL Editor → New query**, jalankan seluruh isi [`supabase/schema.sql`](supabase/schema.sql).
   Aman dijalankan berulang kali.

   > Untuk database baru, `schema.sql` saja sudah lengkap. Database lama perlu
   > menjalankan migrasinya berurutan:
   > [`migrasi-01-asuransi.sql`](supabase/migrasi-01-asuransi.sql),
   > [`migrasi-02-dua-dompet.sql`](supabase/migrasi-02-dua-dompet.sql),
   > [`migrasi-03-percobaan-dan-ranah.sql`](supabase/migrasi-03-percobaan-dan-ranah.sql),
   > [`migrasi-04-satu-kesempatan.sql`](supabase/migrasi-04-satu-kesempatan.sql), lalu
   > [`migrasi-05-soal-aktif-dan-premi.sql`](supabase/migrasi-05-soal-aktif-dan-premi.sql).
3. Buka **Project Settings → Data API**, salin **Project URL** dan **anon key**.
4. Salin `.env.example` menjadi `.env`, isi kedua nilai tersebut dan tentukan
   `VITE_FASILITATOR_PIN`.
5. Jalankan:

```bash
npm install
```

```bash
npm run dev
```

Bank soal (44 kasus) terisi otomatis dari `src/data/soal.ts` saat halaman fasilitator dibuka
pertama kali. Setelah itu bank soal hidup di database dan diedit lewat UI.

## Memilih soal yang dipakai

Di tab **✏️ Editor Soal** setiap soal punya kotak centang. **Hanya soal yang dicentang yang ikut
diundi**, dan hanya penawaran/special event yang dicentang yang muncul di tombol fasilitator.
Tersedia juga tombol *Centang yang tampil* dan *Lepas yang tampil* yang bekerja pada hasil
pencarian dan filter kategori — praktis untuk menyiapkan sesi 30 menit maupun 2 jam dari bank soal
yang sama, tanpa menghapus apa pun.

Jumlah soal aktif selalu terlihat di header halaman fasilitator.

## Perintah

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | Server pengembangan di port 5174 (v1 memakai 5173, jadi keduanya bisa jalan bersamaan) |
| `npm run build` | Typecheck + build produksi |
| `npm run uji` | Uji mesin pembukuan, aturan peringkat, dan bank soal |

## Halaman

| Rute | Isi |
|---|---|
| `/` | Beranda |
| `/peserta` | Halaman peserta (mobile-first) |
| `/fasilitator` | Dashboard fasilitator, dikunci PIN |

---

## Alur satu putaran

1. **Fasilitator** menekan *Buka Putaran* → peserta punya 10 detik memilih 1 dari 4 warna.
   Pada titik ini transaksinya **belum diundi**.
2. **Fasilitator** menekan *Putar Roda & Undi Transaksi* → sistem mengundi satu soal acak dari
   seluruh bank soal, lalu roda menentukan warna yang kena.
3. Peserta berwarna itu berstatus **wajib**; sisanya boleh menjurnal sebagai **latihan**.
   Durasi menjurnal 45 detik.
4. **Fasilitator** menekan *Tutup Waktu & Reveal* → server menilai seluruh jurnal dan memposting
   jurnal peserta wajib ke pembukuannya, benar maupun salah.
5. *Tampilkan Insight* untuk pembahasan, lalu *Putaran Berikutnya*.

Jalankan **minimal 12–16 putaran** supaya sebaran warna sempat merata.

## Asuransi & musibah

Dua jenis putaran khusus, dimunculkan lewat tombol tersendiri — bukan undian acak.

**🛡️ Tawaran asuransi** (dari fase menunggu). **Seluruh** peserta memutuskan beli atau tidak,
tanpa roda dan tanpa status wajib. Yang membeli harus menjurnal preminya sendiri
(`Asuransi Dibayar Dimuka (D) / Kas (K)`) — polis baru tercatat saat jurnalnya terkirim, supaya
tidak ada yang mendapat perlindungan tanpa kasnya berkurang. Putaran ini **tidak dihitung dalam
akurasi**: ini keputusan strategi, bukan ujian.

**💥 Musibah** (dari fase pilih warna, menggantikan undian acak). Roda tetap menentukan siapa yang
tertimpa. Peserta yang punya polis cocok **tidak menjurnal apa pun** — mereka menekan tombol
"Tidak ada jurnal". Yang tidak berasuransi mencatat kerugiannya sendiri
(`Beban Lain-lain (D) / Persediaan atau Peralatan (K)`). Putaran ini **dihitung normal** dalam
akurasi.

Urutan yang disarankan: tawarkan asuransi di awal, jalankan beberapa putaran biasa, baru
munculkan musibahnya. Bandingkan Neraca dua peserta di tab Perbandingan — premi selalu terasa
mahal sampai kebakaran benar-benar terjadi.

Polis berlaku sampai permainan selesai, dan ikut terhapus saat Reset.

## Dua dompet

Setiap peserta membagi sendiri modal awal Rp10.000.000-nya saat mendaftar:

| | Masuk pembukuan? | Sifat |
|---|---|---|
| 💼 **Dompet Bisnis** | Ya — jurnal pembukaan `Kas (D) / Modal Pemilik (K)` | Bisa tumbuh dari penjualan, tapi terancam kerugian dan kebakaran |
| 👛 **Dompet Pribadi** | **Tidak** — tidak pernah muncul di jurnal, neraca, maupun laba rugi | Aman sepenuhnya, tapi diam saja |

Di sela putaran (saat menunggu atau setelah reveal), peserta bebas memindahkan uang:

- **Top up** pribadi → bisnis, dijurnal `Kas (D) / Modal Pemilik (K)`
- **Prive** bisnis → pribadi, dijurnal `Prive (D) / Kas (K)`

Hanya sisi bisnis yang dijurnal; sisi pribadi cukup mutasi saldo. Perpindahan dibatasi isi dompet
asalnya, dan **tidak dihitung dalam nilai** — sama seperti keputusan asuransi.

**Uang baru berpindah setelah jurnalnya benar.** Peserta yang salah diberi tahu jurnal yang
seharusnya beserta alasannya, lalu diminta membetulkan sendiri. Berbeda dari jawaban soal yang
boleh salah lalu dinilai, di sini catatan yang keliru akan membuat Modal atau Prive-nya salah
sepanjang sisa permainan.

## Menjawab: ranah dulu, baru jurnal

Setiap soal — tanpa kecuali — diawali satu pertanyaan: **ini transaksi bisnis atau pribadi?**
Kalau pilihan itu hanya muncul di soal pribadi, keberadaannya sendiri sudah membocorkan
jawabannya.

- **💼 Bisnis** → susun jurnal debit-kredit seperti biasa.
- **👛 Pribadi** → cukup mutasi Dompet Pribadi dengan keterangan, tanpa jurnal sama sekali.

Sepuluh soal pribadi (skincare, liburan keluarga, servis motor pribadi, dan seterusnya) sengaja
**tidak menyebut sumber uangnya**. Justru itu ujiannya: mengenali sendiri mana yang urusan pemilik.

## Nilai

**Satu kesempatan per soal.** Begitu terkirim, jawaban terkunci dan hasilnya tidak diberitahukan —
benar atau salah baru terbuka setelah fasilitator menekan **Reveal**. Nilainya **100 bila benar,
0 bila salah**.

Setelah reveal, peserta melihat jawabannya sendiri disandingkan dengan jawaban yang benar beserta
insight-nya. Yang salah diminta menekan **🛠️ Betulkan pembukuanku** — nilainya tetap 0, yang
dibetulkan adalah pembukuannya. Buku yang salah akan menyeret seluruh laporan di putaran
berikutnya, dan itu jauh lebih merugikan peserta daripada kehilangan seratus poin.

**Jawaban latihan ikut dinilai.** Peserta yang warnanya tidak keluar tetap menjawab dan tetap
mendapat nilai — hanya jurnalnya saja yang tidak diposting. Karena setiap orang boleh menjawab di
setiap putaran, jumlah kesempatannya sama rata, sehingga nilai bersih dari pengaruh undian.

Penilaian dilakukan di server saat reveal, bukan di browser peserta. Kunci jawaban tidak pernah
dikirim ke perangkat peserta selama putaran berjalan.

## Penentuan pemenang

**Nilai → Kekayaan Bersih → Kecepatan.**

**Kekayaan Bersih = Ekuitas Usaha (Total Aset − Kewajiban) + Dompet Pribadi.**

Sengaja bukan saldo kas. Kebakaran memusnahkan Persediaan tanpa menyentuh Kas sama sekali, jadi
ukuran berbasis kas justru membuat peserta yang menolak asuransi tampak lebih unggul daripada
yang membayar premi — kebalikan dari pelajarannya. Secara aljabar ukuran ini setara dengan
`modal awal + laba bersih − belanja pribadi`: memindahkan uang antar dompet saling menghapus,
karena memang tidak menciptakan kekayaan apa pun.

Premi asuransi karena itu dicatat langsung sebagai **Beban Asuransi**, bukan aset dibayar dimuka.
Selama ia dicatat sebagai aset, premi tidak pernah mengurangi kekayaan siapa pun dan membeli
polis terasa gratis. Sekarang taruhannya jelas: bayar Rp1.200.000 sekarang, atau tanggung
Rp3.500.000 kalau terbakar.

Nilai didahulukan karena ia satu-satunya ukuran yang bersih dari keberuntungan. Kekayaan Bersih
menyusul sebagai pembeda kedua — di situlah undian warna dan keputusan asuransi bekerja.
Keberuntungan tetap punya tempat, hanya saja tidak bisa mengalahkan ketelitian.

Tab **📚 Pemahaman** memisahkan sisi ini sepenuhnya: peserta diurutkan dari jumlah jawaban yang
tepat sejak percobaan pertama, tanpa menyinggung kekayaan sama sekali. Itu bahan evaluasi materi
setelah sesi.

Kenapa bukan saldo saja: jurnal yang salah tetap diposting, dan kesalahan bisa membuat kas terlihat
lebih besar. Pembelian tunai yang salah dikreditkan ke Hutang Usaha membuat kas tidak berkurang —
peserta paling ceroboh justru berpeluang menang kalau peringkatnya murni saldo.

---

## Catatan penting saat sesi berlangsung

- **Jangan deploy saat sesi berjalan.** Halaman peserta yang sudah terbuka tetap menjalankan kode
  lama. Ada banner "muat ulang" otomatis, tapi mencegah jauh lebih murah.
- **Layar fasilitator dianggap terlihat peserta.** Kunci jawaban, rekap benar/salah, dan label
  kategori sengaja tidak muncul sebelum reveal. Jangan membuka tab Editor Soal saat share screen.
- **Reset** menghapus seluruh peserta dan jurnal, tapi **tidak** menghapus bank soal.
- Indikator ✅ Seimbang pada Neraca Saldo dan Neraca adalah pemeriksaan kesehatan. Kalau sampai
  tidak seimbang, itu bug mesin posting — bukan kesalahan peserta.

## Struktur kode

```
src/
  lib/
    akun.ts       Bagan akun (konstanta, tidak diedit fasilitator)
    laporan.ts    ★ Mesin pembukuan — modul murni, satu-satunya tempat rumus laporan
    peringkat.ts  ★ Aturan penentuan pemenang
    undian.ts     ★ Undian soal & roda warna (keduanya sengaja saling lepas)
    dompet.ts     ★ Dua dompet: saldo pribadi, batas alokasi, jurnal mutasi
    validasi.ts   Aturan sahnya sebuah soal
    api.ts        Seluruh akses Supabase
    hooks.ts      Realtime + polling cadangan + timer terselaraskan jam server
    waktu.ts      Sinkronisasi jam server
    versi.ts      Deteksi halaman kedaluwarsa
  components/     Komponen UI, termasuk Pembukuan (5 tab laporan) dan EditorSoal
  pages/          Home, Peserta, Fasilitator
  data/soal.ts    Bank soal awal (44 transaksi bisnis + 6 asuransi + 10 pribadi)
supabase/
  schema.sql                Tabel, RLS, realtime, fungsi reset/penilaian/waktu server
  migrasi-01-asuransi.sql   Tambahan mekanik asuransi untuk database lama
  migrasi-02-dua-dompet.sql Tambahan dua dompet untuk database lama
  migrasi-03-percobaan-dan-ranah.sql  Ranah bisnis/pribadi dan nilai
  migrasi-04-satu-kesempatan.sql      Satu kesempatan, hasil dibuka saat reveal
  migrasi-05-soal-aktif-dan-premi.sql Soal aktif/nonaktif, premi jadi beban
uji/              Uji tanpa kerangka tambahan (npm run uji)
```

Dua modul bertanda ★ sengaja murni — tanpa React dan tanpa jaringan — supaya bisa diuji, dan supaya
angka di HP peserta selalu sama dengan angka di layar fasilitator.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · Supabase (Postgres + Realtime) · Vercel

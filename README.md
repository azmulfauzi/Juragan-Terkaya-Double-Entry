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

   > Kalau database Anda dibuat sebelum mekanik asuransi ada, jalankan juga
   > [`supabase/migrasi-01-asuransi.sql`](supabase/migrasi-01-asuransi.sql). Untuk
   > database baru, `schema.sql` saja sudah lengkap.
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

## Penentuan pemenang

Akurasi adalah gerbang, saldo adalah pemeringkat:

- Peserta yang **100% jurnalnya benar** menjadi kandidat, diurutkan berdasarkan **Saldo Kas**.
- Kalau tidak ada yang sempurna: persentase benar → jumlah benar → rata-rata waktu → saldo kas.
- Akurasi hanya dihitung dari putaran saat peserta berstatus **wajib**.

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
    validasi.ts   Aturan sahnya sebuah soal
    api.ts        Seluruh akses Supabase
    hooks.ts      Realtime + polling cadangan + timer terselaraskan jam server
    waktu.ts      Sinkronisasi jam server
    versi.ts      Deteksi halaman kedaluwarsa
  components/     Komponen UI, termasuk Pembukuan (5 tab laporan) dan EditorSoal
  pages/          Home, Peserta, Fasilitator
  data/soal.ts    Bank soal awal (44 transaksi + 6 soal asuransi)
supabase/
  schema.sql                Tabel, RLS, realtime, fungsi reset/penilaian/waktu server
  migrasi-01-asuransi.sql   Tambahan mekanik asuransi untuk database lama
uji/              Uji tanpa kerangka tambahan (npm run uji)
```

Dua modul bertanda ★ sengaja murni — tanpa React dan tanpa jaringan — supaya bisa diuji, dan supaya
angka di HP peserta selalu sama dengan angka di layar fasilitator.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · Supabase (Postgres + Realtime) · Vercel

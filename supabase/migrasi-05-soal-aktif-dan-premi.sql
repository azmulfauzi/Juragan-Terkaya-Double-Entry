-- ============================================================================
--  MIGRASI 05 — Soal Aktif/Nonaktif & Premi Jadi Beban
-- ============================================================================
--  Jalankan SETELAH migrasi-04-satu-kesempatan.sql.
--  Buka Supabase → SQL Editor → New query → tempel seluruh isi file ini → Run.
--  Aman dijalankan berulang kali dan tidak menghapus data.
--
--  Dua perubahan:
--
--   1. Kolom `aktif` pada bank soal. Hanya soal yang dicentang fasilitator yang
--      ikut diundi, sehingga satu bank soal bisa dipakai untuk sesi pendek
--      maupun panjang tanpa mengubah isinya.
--
--   2. Premi asuransi dicatat langsung sebagai BEBAN, bukan Asuransi Dibayar
--      Dimuka. Alasannya bukan soal kerapian akuntansi melainkan soal keadilan
--      permainan: selama premi dicatat sebagai aset, ia tidak pernah mengurangi
--      kekayaan siapa pun, sehingga membeli polis terasa gratis dan pilihannya
--      kehilangan taruhan. Dengan jadi beban, taruhannya jelas — bayar
--      Rp1.200.000 sekarang, atau tanggung Rp3.500.000 kalau terbakar.
-- ============================================================================

-- ─────────────────────── 1. SOAL AKTIF ───────────────────────

alter table soal add column if not exists aktif boolean not null default true;

comment on column soal.aktif is
  'Hanya soal aktif yang ikut diundi dan muncul di tombol penawaran/special event.';


-- ─────────────────── 2. PREMI ASURANSI JADI BEBAN ───────────────────

update soal
   set debit_benar = '5-700',
       insight = 'Premi asuransi adalah biaya perlindungan untuk periode berjalan, jadi dicatat sebagai Beban Asuransi. Perhatikan taruhannya: yang membeli kehilangan preminya hari ini dengan pasti, yang menolak menyimpan uangnya tapi menanggung sendiri kalau musibah datang. Premi selalu terasa mahal — sampai kebakaran benar-benar terjadi.'
 where jenis = 'keputusan' and polis = 'kebakaran';

update soal
   set debit_benar = '5-700',
       insight = 'Sama seperti asuransi kebakaran: preminya beban periode ini, bukan aset. Kendaraan operasional dipakai tiap hari di jalan — pertanyaannya bukan apakah risikonya ada, tapi apakah usahamu sanggup menanggung sendiri kalau terjadi.'
 where jenis = 'keputusan' and polis = 'kendaraan';


-- ────────────── 3. SATU KEJADIAN BARU: KEHILANGAN KENDARAAN ──────────────

insert into soal (id, kategori, jenis, polis, sifat, arah_kas, teks, nominal,
                  opsi_debit, opsi_kredit, debit_benar, kredit_benar, insight)
values
  (61, 'non_kas', 'kejadian', 'kendaraan', 'bisnis', null,
   'Motor operasional hilang dicuri saat diparkir di depan kios. Nilai tercatatnya Rp6.000.000.',
   6000000,
   '["5-600","1-500","5-500","3-200"]'::jsonb,
   '["1-500","1-100","5-600","2-100"]'::jsonb,
   '5-600', '1-500',
   'Kehilangan karena pencurian diperlakukan sama seperti kerusakan total: asetnya lenyap, jadi Peralatan dikredit dan nilainya diakui sebagai kerugian. Yang berasuransi kendaraan tidak mencatat apa pun — itulah gunanya premi yang dibayar di awal.')
on conflict (id) do nothing;

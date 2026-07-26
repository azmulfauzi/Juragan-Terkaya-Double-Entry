-- ============================================================================
--  MIGRASI 03 — Ranah Bisnis/Pribadi, Percobaan Berulang, dan Nilai
-- ============================================================================
--  Jalankan SETELAH migrasi-02-dua-dompet.sql.
--  Buka Supabase → SQL Editor → New query → tempel seluruh isi file ini → Run.
--  Aman dijalankan berulang kali dan tidak menghapus data.
--
--  Perubahan besar pada cara menilai:
--
--   1. Setiap soal kini diawali pertanyaan "ini transaksi bisnis atau pribadi?"
--   2. Jawaban salah boleh diperbaiki. Nilainya 100 / 50 / 0 sesuai percobaan
--      keberapa peserta menjawab benar. Setelah dua kali salah, kunci jawaban
--      ditunjukkan dan jawaban ketiga tinggal mengikuti — karena itu bernilai 0.
--   3. Jurnal LATIHAN ikut dinilai. Peserta yang warnanya tidak keluar tetap
--      menunjukkan pemahamannya, hanya saja jurnalnya tidak diposting.
--   4. Penilaian pindah dari saat reveal ke saat peserta menjawab. Kunci
--      jawaban tetap tidak pernah dikirim ke perangkat peserta sebelum dua
--      percobaannya gagal — pemeriksaannya dilakukan di server, di sini.
-- ============================================================================

-- ─────────────────────── 1. BANK SOAL ───────────────────────

-- bisnis  : masuk pembukuan usaha, dijurnal debit-kredit
-- pribadi : urusan pemilik, cukup mutasi Dompet Pribadi dengan keterangan
alter table soal add column if not exists sifat text not null default 'bisnis';

-- Hanya untuk soal pribadi: uang keluar dari atau masuk ke dompet pribadi.
alter table soal add column if not exists arah_kas text;


-- ─────────────────────── 2. JURNAL ───────────────────────

alter table jurnal add column if not exists percobaan     int  not null default 1;
alter table jurnal add column if not exists nilai         int  not null default 0;
alter table jurnal add column if not exists sifat_dipilih text;
-- Baris yang sudah final tidak menerima percobaan baru. Data lama dianggap
-- final supaya tidak bisa diutak-atik setelah migrasi.
alter table jurnal add column if not exists selesai boolean not null default true;

-- Nilai untuk data lama: yang benar dianggap benar sejak percobaan pertama.
update jurnal set nilai = 100 where benar and nilai = 0 and jenis = 'soal';


-- ─────────────────────── 3. MUTASI ───────────────────────

-- Belanja pribadi dicatat di sini, bukan di jurnal. Keterangannya menggantikan
-- peran akun debit-kredit.
alter table mutasi add column if not exists keterangan text;
alter table mutasi add column if not exists soal_id    int;

-- Satu soal pribadi hanya boleh menghasilkan satu catatan per peserta.
create unique index if not exists mutasi_satu_per_soal
  on mutasi (peserta_id, soal_id)
  where soal_id is not null;


-- ────────────── 4. SEPULUH SOAL PRIBADI (id 51–60) ──────────────
--
-- Tidak satu pun menyebut sumber uangnya. Justru itu ujiannya: peserta harus
-- mengenali sendiri bahwa ini urusan pemilik, bukan urusan usaha, sehingga
-- uangnya keluar dari Dompet Pribadi dan tidak ada jurnal yang perlu dibuat.
--
-- Opsi akunnya tetap diisi supaya peserta yang keliru memilih "bisnis" tetap
-- bisa menyusun jurnal — dan merasakan sendiri jurnal itu ditolak.

insert into soal (id, kategori, jenis, polis, sifat, arah_kas, teks, nominal,
                  opsi_debit, opsi_kredit, debit_benar, kredit_benar, insight)
values
  (51, 'modal', 'biasa', null, 'pribadi', 'keluar',
   'Kamu membeli rangkaian skincare dan perawatan wajah seharga Rp450.000.', 450000,
   '["3-200","5-600","1-400","5-500"]'::jsonb, '["1-100","3-200","1-110","2-100"]'::jsonb,
   '3-200', '1-100',
   'Skincare tidak dipakai usahamu dan tidak menghasilkan pendapatan apa pun untuknya. Ini pengeluaran pemilik, jadi uangnya keluar dari Dompet Pribadi dan tidak ada jurnal yang perlu dibuat sama sekali. Mencatatnya di buku usaha membuat beban usahamu terlihat lebih besar dari yang sebenarnya.'),

  (52, 'modal', 'biasa', null, 'pribadi', 'keluar',
   'Keluarga berlibur akhir pekan ke luar kota, total pengeluaran Rp1.500.000.', 1500000,
   '["3-200","5-500","5-600","1-400"]'::jsonb, '["1-100","3-200","1-110","2-100"]'::jsonb,
   '3-200', '1-100',
   'Liburan keluarga jelas bukan kegiatan usaha. Selama uangnya dari kantong pribadi, buku usahamu tidak perlu tahu sama sekali — cukup catat di Dompet Pribadi supaya kamu tetap tahu ke mana perginya uangmu.'),

  (53, 'modal', 'biasa', null, 'pribadi', 'keluar',
   'Servis rutin motor pribadi yang dipakai sehari-hari keluarga, Rp250.000.', 250000,
   '["3-200","5-500","5-600","1-500"]'::jsonb, '["1-100","3-200","1-110","2-100"]'::jsonb,
   '3-200', '1-100',
   'Perhatikan kata "pribadi". Motor operasional yang dipakai mengantar pesanan biayanya masuk Beban Transportasi usaha; motor keluarga tidak. Aset yang sama bisa berbeda perlakuannya tergantung siapa yang memakainya.'),

  (54, 'modal', 'biasa', null, 'pribadi', 'keluar',
   'Membeli baju lebaran untuk anak-anak senilai Rp800.000.', 800000,
   '["3-200","1-300","5-600","5-200"]'::jsonb, '["1-100","3-200","1-110","4-100"]'::jsonb,
   '3-200', '1-100',
   'Godaannya mencatat ini sebagai Persediaan karena berupa barang. Tapi persediaan adalah barang untuk DIJUAL; baju yang dipakai keluarga sendiri tidak akan pernah menghasilkan pendapatan.'),

  (55, 'modal', 'biasa', null, 'pribadi', 'keluar',
   'Menghadiri kondangan dan memberi amplop Rp300.000.', 300000,
   '["3-200","5-600","5-500","1-400"]'::jsonb, '["1-100","3-200","2-100","1-110"]'::jsonb,
   '3-200', '1-100',
   'Beban Lain-lain milik usaha hanya untuk pengeluaran yang tetap ada hubungannya dengan usaha, seperti iuran keamanan pasar. Amplop kondangan tetangga bukan salah satunya.'),

  (56, 'modal', 'biasa', null, 'pribadi', 'keluar',
   'Membayar langganan layanan streaming dan internet rumah Rp200.000.', 200000,
   '["3-200","5-400","5-600","1-400"]'::jsonb, '["1-100","3-200","1-110","2-100"]'::jsonb,
   '3-200', '1-100',
   'Sekali lagi jebakan kata: ada "internet" dan "langganan", terdengar seperti biaya operasional. Tapi yang menikmati adalah keluarga di rumah, bukan kios. Yang menentukan bukan jenis tagihannya, melainkan siapa yang memetik manfaatnya.'),

  (57, 'modal', 'biasa', null, 'pribadi', 'keluar',
   'Membelikan anak ponsel baru untuk sekolah seharga Rp2.000.000.', 2000000,
   '["3-200","1-500","1-400","5-600"]'::jsonb, '["1-100","3-200","2-100","1-110"]'::jsonb,
   '3-200', '1-100',
   'Nominalnya besar dan barangnya awet, jadi terasa pantas masuk Peralatan. Tapi Peralatan hanya untuk aset yang dipakai usaha. Ponsel anak sekolah tidak pernah menghasilkan rupiah untuk kiosmu.'),

  (58, 'modal', 'biasa', null, 'pribadi', 'keluar',
   'Membayar iuran keanggotaan gym bulanan Rp350.000.', 350000,
   '["3-200","5-600","5-200","1-400"]'::jsonb, '["1-100","3-200","1-110","2-100"]'::jsonb,
   '3-200', '1-100',
   'Kesehatan pemilik memang menopang usahanya, tapi akuntansi tidak mengakui hubungan sejauh itu. Kalau logika "toh akhirnya untuk usaha juga" diterima, hampir semua pengeluaran pribadi bisa dibenarkan masuk buku usaha.'),

  (59, 'modal', 'biasa', null, 'pribadi', 'keluar',
   'Memanggil teknisi untuk servis AC rumah, biayanya Rp400.000.', 400000,
   '["3-200","5-400","5-600","1-500"]'::jsonb, '["1-100","3-200","1-110","2-100"]'::jsonb,
   '3-200', '1-100',
   'Bandingkan dengan servis peralatan kios yang memang beban usaha. Yang membedakan cuma satu: barangnya ada di rumah atau di tempat usaha.'),

  (60, 'modal', 'biasa', null, 'pribadi', 'keluar',
   'Mentraktir teman-teman saat reuni sekolah, habis Rp600.000.', 600000,
   '["3-200","5-600","5-500","1-300"]'::jsonb, '["1-100","3-200","2-100","1-110"]'::jsonb,
   '3-200', '1-100',
   'Kalau yang ditraktir adalah pemasok atau pelanggan dalam rangka usaha, ia bisa jadi beban usaha. Reuni sekolah murni urusan pribadi. Niat di balik pengeluaran itulah yang menentukan tempatnya.')
on conflict (id) do nothing;


-- ────────────── 5. FUNGSI PENILAIAN PERCOBAAN ──────────────
--
-- Dipanggil setiap kali peserta menekan kirim. Mengembalikan hasilnya, dan
-- kunci jawaban HANYA setelah dua percobaan gagal.

create or replace function coba_jawab(
  p_peserta      uuid,
  p_putaran      int,
  p_sifat        text,
  p_debit        text,
  p_kredit       text,
  p_tanpa_jurnal boolean default false,
  p_waktu_ms     int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_soal_id   int;
  v_warna     text;
  s           soal%rowtype;
  v_ada       jurnal%rowtype;
  v_percobaan int;
  v_benar     boolean;
  v_nilai     int;
  v_selesai   boolean;
  v_wajib     boolean;
  v_polis     boolean;
  v_boleh     boolean;   -- boleh melihat kunci
begin
  select soal_id, warna_spin into v_soal_id, v_warna from game_state where id = 1;
  if v_soal_id is null then
    return jsonb_build_object('benar', false, 'percobaan', 0, 'nilai', 0, 'selesai', false,
                              'kunci_sifat', null, 'kunci_debit', null, 'kunci_kredit', null,
                              'insight', null);
  end if;

  select * into s from soal where id = v_soal_id;

  select * into v_ada
    from jurnal
   where peserta_id = p_peserta and putaran = p_putaran and jenis = 'soal';

  -- Jawaban yang sudah final tidak menerima percobaan baru.
  if found and v_ada.selesai then
    return jsonb_build_object(
      'benar', v_ada.benar, 'percobaan', v_ada.percobaan, 'nilai', v_ada.nilai,
      'selesai', true,
      'kunci_sifat', s.sifat, 'kunci_debit', s.debit_benar, 'kunci_kredit', s.kredit_benar,
      'insight', s.insight);
  end if;

  v_percobaan := coalesce(v_ada.percobaan, 0) + 1;

  v_wajib := exists (
    select 1 from pilihan_warna pw
     where pw.peserta_id = p_peserta and pw.putaran = p_putaran and pw.warna = v_warna
  );

  v_polis := s.jenis = 'kejadian' and exists (
    select 1 from keputusan k
     where k.peserta_id = p_peserta and k.polis = s.polis and k.ambil
  );

  -- ── Menilai jawaban ──
  if p_sifat is distinct from s.sifat then
    v_benar := false;                       -- salah ranah, tidak perlu diperiksa lebih jauh
  elsif s.sifat = 'pribadi' then
    v_benar := true;                        -- ranah benar sudah cukup; tidak ada jurnal
  elsif v_polis then
    v_benar := coalesce(p_tanpa_jurnal, false);   -- pemegang polis: benar justru bila tidak menjurnal
  else
    v_benar := coalesce(p_tanpa_jurnal, false) = false
               and p_debit  = s.debit_benar
               and p_kredit = s.kredit_benar;
  end if;

  v_nilai   := case when v_benar then case v_percobaan when 1 then 100 when 2 then 50 else 0 end
                    else 0 end;
  v_selesai := v_benar or v_percobaan >= 3;

  -- ── Menyimpan ──
  if found then
    update jurnal
       set akun_debit    = case when s.sifat = 'bisnis' and not coalesce(p_tanpa_jurnal, false)
                                then p_debit else null end,
           akun_kredit   = case when s.sifat = 'bisnis' and not coalesce(p_tanpa_jurnal, false)
                                then p_kredit else null end,
           tanpa_jurnal  = coalesce(p_tanpa_jurnal, false),
           sifat_dipilih = p_sifat,
           benar         = v_benar,
           nilai         = v_nilai,
           percobaan     = v_percobaan,
           selesai       = v_selesai,
           wajib         = v_wajib,
           waktu_jawab_ms = coalesce(jurnal.waktu_jawab_ms, p_waktu_ms),
           diterapkan    = v_selesai and v_benar and v_wajib
                           and s.sifat = 'bisnis' and not coalesce(p_tanpa_jurnal, false)
     where id = v_ada.id;
  else
    insert into jurnal (peserta_id, putaran, soal_id, akun_debit, akun_kredit, nominal,
                        benar, wajib, waktu_jawab_ms, diterapkan, jenis, tanpa_jurnal,
                        percobaan, nilai, sifat_dipilih, selesai)
    values (p_peserta, p_putaran, v_soal_id,
            case when s.sifat = 'bisnis' and not coalesce(p_tanpa_jurnal, false) then p_debit end,
            case when s.sifat = 'bisnis' and not coalesce(p_tanpa_jurnal, false) then p_kredit end,
            s.nominal, v_benar, v_wajib, p_waktu_ms,
            v_selesai and v_benar and v_wajib and s.sifat = 'bisnis'
              and not coalesce(p_tanpa_jurnal, false),
            'soal', coalesce(p_tanpa_jurnal, false),
            v_percobaan, v_nilai, p_sifat, v_selesai);
  end if;

  -- Belanja pribadi yang benar dan memang giliranmu: catat mutasi dompet.
  if v_selesai and v_benar and v_wajib and s.sifat = 'pribadi' then
    insert into mutasi (peserta_id, arah, jumlah, putaran, keterangan, soal_id)
    values (p_peserta,
            case when s.arah_kas = 'masuk' then 'pribadi_masuk' else 'pribadi_keluar' end,
            s.nominal, p_putaran, s.teks, s.id)
    on conflict do nothing;
  end if;

  -- Kunci dibuka hanya setelah dua percobaan gagal, atau kalau sudah benar.
  v_boleh := v_benar or v_percobaan >= 2;

  return jsonb_build_object(
    'benar', v_benar,
    'percobaan', v_percobaan,
    'nilai', v_nilai,
    'selesai', v_selesai,
    'kunci_sifat',  case when v_boleh then s.sifat end,
    'kunci_debit',  case when v_boleh and s.sifat = 'bisnis' then s.debit_benar end,
    'kunci_kredit', case when v_boleh and s.sifat = 'bisnis' then s.kredit_benar end,
    'insight',      case when v_boleh then s.insight end);
end;
$$;

grant execute on function coba_jawab(uuid, int, text, text, text, boolean, int)
  to anon, authenticated;


-- ────────────── 6. REVEAL: TINGGAL MERAPIKAN YANG TIDAK MENJAWAB ──────────────
--
-- Penilaian sudah terjadi saat peserta menjawab, jadi fungsi ini kini hanya
-- membuatkan baris bernilai nol untuk peserta wajib yang tidak mengirim apa pun,
-- dan mengunci jawaban yang belum sempat final.

create or replace function terapkan_putaran(p_putaran int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_soal_id int;
  v_warna   text;
  v_nominal bigint;
  v_jenis   text;
  v_debit   text;
  v_kredit  text;
begin
  select soal_id, warna_spin into v_soal_id, v_warna from game_state where id = 1;
  if v_soal_id is null then
    return;
  end if;

  select nominal, jenis, debit_benar, kredit_benar
    into v_nominal, v_jenis, v_debit, v_kredit
    from soal where id = v_soal_id;

  -- Putaran keputusan asuransi memakai alur sendiri (tanpa roda, tanpa nilai).
  if v_jenis = 'keputusan' then
    update jurnal
       set benar      = coalesce(akun_debit = v_debit and akun_kredit = v_kredit, false),
           wajib      = false,
           diterapkan = (akun_debit is not null),
           selesai    = true
     where putaran = p_putaran and jenis = 'soal';
    return;
  end if;

  if v_warna is null then
    return;
  end if;

  -- Peserta wajib yang tidak mengirim apa pun: nilai nol, tidak diposting.
  insert into jurnal (peserta_id, putaran, soal_id, akun_debit, akun_kredit, nominal,
                      benar, wajib, diterapkan, jenis, percobaan, nilai, selesai)
  select pw.peserta_id, p_putaran, v_soal_id, null, null, v_nominal,
         false, true, false, 'soal', 0, 0, true
    from pilihan_warna pw
   where pw.putaran = p_putaran
     and pw.warna   = v_warna
     and not exists (
       select 1 from jurnal j
        where j.peserta_id = pw.peserta_id and j.putaran = p_putaran and j.jenis = 'soal'
     );

  -- Jawaban yang masih menggantung (belum benar dan belum tiga percobaan) dikunci.
  update jurnal
     set selesai = true
   where putaran = p_putaran and jenis = 'soal' and selesai = false;
end;
$$;

grant execute on function terapkan_putaran(int) to anon, authenticated;

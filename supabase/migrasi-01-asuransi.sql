-- ============================================================================
--  MIGRASI 01 — Mekanik Asuransi & Musibah
-- ============================================================================
--  Untuk database yang SUDAH pernah menjalankan schema.sql.
--  Buka Supabase → SQL Editor → New query → tempel seluruh isi file ini → Run.
--  Aman dijalankan berulang kali, dan tidak menghapus data yang sudah ada.
--
--  Yang ditambahkan:
--   1. Kolom `jenis` & `polis` pada bank soal (biasa / keputusan / kejadian)
--   2. Kolom `tanpa_jurnal` pada tabel jurnal
--   3. Tabel `keputusan` — catatan siapa membeli polis apa
--   4. Perbaikan bug: reveal gagal (not-null violation) bila ada peserta wajib
--      yang tidak sempat mengirim jurnal
-- ============================================================================

-- ─────────────────────── 1. BANK SOAL ───────────────────────

alter table soal add column if not exists jenis text not null default 'biasa';
alter table soal add column if not exists polis text;

comment on column soal.jenis is
  'biasa = diundi acak, roda menentukan pembuku. keputusan = penawaran asuransi, '
  'seluruh peserta memutuskan, tanpa roda. kejadian = musibah, dimunculkan '
  'fasilitator dan roda menentukan siapa yang tertimpa.';
comment on column soal.polis is
  'kebakaran | kendaraan — penghubung antara soal keputusan dan soal kejadian.';


-- ──────────────── 1b. ENAM SOAL ASURANSI (id 45–50) ────────────────
-- Bank soal hanya terisi otomatis saat tabelnya masih kosong, sedangkan
-- database ini sudah berisi 44 soal. Karena itu keenamnya disisipkan di sini.
-- "on conflict do nothing" menjaga soal yang sudah pernah Anda edit sendiri.

insert into soal (id, kategori, jenis, polis, teks, nominal,
                  opsi_debit, opsi_kredit, debit_benar, kredit_benar, insight)
values
  (45, 'kas_keluar', 'keputusan', 'kebakaran',
   'Agen asuransi menawarkan pertanggungan kebakaran untuk kios dan isinya, premi Rp1.200.000 untuk perlindungan 1 tahun penuh. Beli, atau simpan uangnya?',
   1200000,
   '["1-600","5-700","5-600","1-400"]'::jsonb,
   '["1-100","1-600","2-100","5-700"]'::jsonb,
   '1-600', '1-100',
   'Premi 1 tahun yang dibayar di muka BELUM menjadi beban — manfaatnya baru akan dinikmati sepanjang tahun ke depan, jadi ia masih aset: Asuransi Dibayar Dimuka. Perhatikan bahwa membeli polis membuat kas berkurang Rp1.200.000 hari ini, sementara yang menolak kasnya utuh. Sampai di sini, yang menolak terlihat lebih pintar.'),

  (46, 'kas_keluar', 'keputusan', 'kendaraan',
   'Asuransi kendaraan untuk motor dan mobil operasional ditawarkan seharga Rp900.000 per tahun. Ambil, atau lewati?',
   900000,
   '["1-600","5-700","5-500","1-500"]'::jsonb,
   '["1-100","1-600","2-200","5-500"]'::jsonb,
   '1-600', '1-100',
   'Sama seperti asuransi kebakaran: dibayar di muka untuk 1 tahun, jadi dicatat sebagai aset, bukan Beban Transportasi. Kendaraan operasional dipakai tiap hari di jalan — pertanyaannya bukan apakah risikonya ada, tapi apakah usahamu sanggup menanggungnya sendiri kalau terjadi.'),

  (47, 'non_kas', 'kejadian', 'kebakaran',
   'Terjadi kebakaran di gudang. Seluruh persediaan barang dagangan senilai Rp3.500.000 habis terbakar.',
   3500000,
   '["5-600","1-300","5-100","3-200"]'::jsonb,
   '["1-300","1-100","5-600","2-100"]'::jsonb,
   '5-600', '1-300',
   'Barangnya lenyap, jadi Persediaan dikredit; nilainya diakui sebagai kerugian di Beban Lain-lain. Sekarang bandingkan dua peserta: yang berasuransi kasnya berkurang Rp1.200.000 di awal tapi asetnya utuh; yang menolak menghemat Rp1.200.000 tapi kehilangan Rp3.500.000 sekaligus. Premi selalu terasa mahal — sampai kebakaran benar-benar terjadi.'),

  (48, 'non_kas', 'kejadian', 'kebakaran',
   'Korsleting listrik malam hari membakar sebagian kios. Etalase dan mesin pengaduk senilai Rp2.500.000 rusak total dan tidak bisa dipakai lagi.',
   2500000,
   '["5-600","1-500","5-400","3-200"]'::jsonb,
   '["1-500","1-100","5-600","2-100"]'::jsonb,
   '5-600', '1-500',
   'Yang musnah kali ini Peralatan, bukan Persediaan — akun kreditnya ikut berubah, tapi polanya sama: aset yang hilang dikredit, kerugiannya didebit. Peralatan yang terbakar tidak bisa dijual dan tidak bisa dipakai; nilainya harus keluar dari neraca.'),

  (49, 'non_kas', 'kejadian', 'kendaraan',
   'Motor operasional menabrak pembatas jalan saat mengantar pesanan. Biaya kerusakannya Rp2.000.000 dan motor tercatat di akun Peralatan.',
   2000000,
   '["5-600","5-500","1-500","3-200"]'::jsonb,
   '["1-500","1-100","5-500","2-100"]'::jsonb,
   '5-600', '1-500',
   'Godaannya memilih Beban Transportasi karena menyangkut kendaraan. Tapi Beban Transportasi untuk biaya operasional rutin seperti bensin dan ongkos kirim — kerusakan aset akibat kecelakaan adalah kerugian, dan nilai asetnya berkurang.'),

  (50, 'non_kas', 'kejadian', 'kendaraan',
   'Mobil pengantaran terlibat kecelakaan. Kendaraan ringsek dan seluruh muatan barang dagangan senilai Rp4.000.000 rusak tidak terselamatkan.',
   4000000,
   '["5-600","1-300","5-500","5-100"]'::jsonb,
   '["1-300","1-500","1-100","5-600"]'::jsonb,
   '5-600', '1-300',
   'Perhatikan baik-baik apa yang hilang: yang dinilai di sini adalah muatannya, yaitu Persediaan. Peserta yang otomatis memilih Peralatan karena membaca kata "mobil" akan salah. Selalu tanya dulu: aset mana yang benar-benar berkurang?')
on conflict (id) do nothing;


-- ─────────────────────── 2. JURNAL ───────────────────────

-- Pernyataan "tidak ada jurnal yang perlu dicatat" — jawaban yang benar bagi
-- pemegang polis saat musibah terjadi. Sengaja dibedakan dari "tidak sempat
-- mengirim" (akun kosong DAN tanpa_jurnal false), yang tetap dihitung salah.
alter table jurnal add column if not exists tanpa_jurnal boolean not null default false;


-- ─────────────────────── 3. TABEL KEPUTUSAN ───────────────────────

create table if not exists keputusan (
  id          bigserial primary key,
  peserta_id  uuid    not null references peserta(id) on delete cascade,
  putaran     int     not null,
  soal_id     int,
  polis       text    not null,          -- 'kebakaran' | 'kendaraan'
  ambil       boolean not null,          -- true = membeli polis
  created_at  timestamptz not null default now(),
  unique (peserta_id, putaran)
);

create index if not exists idx_keputusan_peserta on keputusan (peserta_id);
create index if not exists idx_keputusan_polis   on keputusan (polis);

alter table keputusan enable row level security;
drop policy if exists akses_publik on keputusan;
create policy akses_publik on keputusan
  for all to anon, authenticated using (true) with check (true);

alter table keputusan replica identity full;
do $$
begin
  alter publication supabase_realtime add table keputusan;
exception
  when duplicate_object then null;
end $$;


-- ─────────────────────── 4. RESET ───────────────────────

create or replace function reset_game()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Klausa "where true" wajib ada: Supabase mengaktifkan pg_safeupdate yang
  -- menolak DELETE tanpa WHERE (error 21000) sebagai pengaman.
  delete from keputusan     where true;
  delete from jurnal        where true;
  delete from pilihan_warna where true;
  delete from peserta       where true;

  update game_state
     set berjalan      = false,
         fase          = 'menunggu',
         putaran       = 0,
         warna_spin    = null,
         soal_id       = null,
         fase_mulai    = null,
         reveal        = false,
         show_insight  = false,
         riwayat_soal  = '[]'::jsonb,
         riwayat_warna = '[]'::jsonb
   where id = 1;
end;
$$;

grant execute on function reset_game() to anon, authenticated;


-- ──────────────── 5. PENILAIAN & POSTING SAAT REVEAL ────────────────

create or replace function terapkan_putaran(p_putaran int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_soal_id int;
  v_warna   text;
  v_debit   text;
  v_kredit  text;
  v_nominal bigint;
  v_jenis   text;
  v_polis   text;
begin
  select soal_id, warna_spin into v_soal_id, v_warna
    from game_state where id = 1;

  if v_soal_id is null then
    return;   -- belum ada putaran aktif, tidak ada yang perlu dibukukan
  end if;

  select debit_benar, kredit_benar, nominal, jenis, polis
    into v_debit, v_kredit, v_nominal, v_jenis, v_polis
    from soal where id = v_soal_id;

  -- ── Putaran KEPUTUSAN (penawaran asuransi) ──────────────────────────
  -- Tidak ada roda dan tidak ada peserta wajib: setiap orang memutuskan untuk
  -- usahanya sendiri. Karena itu tidak ada baris kosong yang perlu dibuatkan,
  -- dan tidak ada satu pun yang masuk hitungan akurasi.
  if v_jenis = 'keputusan' then
    update jurnal
       set benar      = coalesce(akun_debit = v_debit and akun_kredit = v_kredit, false),
           wajib      = false,
           diterapkan = (akun_debit is not null)
     where putaran = p_putaran;
    return;
  end if;

  if v_warna is null then
    return;
  end if;

  -- Peserta wajib yang tidak mengirim apa pun sampai waktu habis.
  insert into jurnal (peserta_id, putaran, soal_id, akun_debit, akun_kredit,
                      nominal, benar, wajib, diterapkan)
  select pw.peserta_id, p_putaran, v_soal_id, null, null,
         v_nominal, false, true, false
    from pilihan_warna pw
   where pw.putaran = p_putaran
     and pw.warna   = v_warna
     and not exists (
       select 1 from jurnal j
        where j.peserta_id = pw.peserta_id and j.putaran = p_putaran
     );

  -- Penilaian seluruh jurnal putaran ini, termasuk jurnal latihan.
  --
  -- coalesce() WAJIB ada: pada baris tanpa jawaban, "null = 'x'" bernilai NULL,
  -- sedangkan kolom benar bertanda not null. Tanpa ini, reveal gagal dengan
  -- error 23502 tepat pada saat ada peserta yang kehabisan waktu.
  if v_jenis = 'kejadian' then
    update jurnal j
       set benar = case
             when exists (
               select 1 from keputusan k
                where k.peserta_id = j.peserta_id
                  and k.polis      = v_polis
                  and k.ambil
             )
             -- Punya polis aktif: jawaban yang benar justru TIDAK menjurnal.
             then j.tanpa_jurnal
             else coalesce(j.tanpa_jurnal = false
                           and j.akun_debit  = v_debit
                           and j.akun_kredit = v_kredit, false)
           end
     where j.putaran = p_putaran;
  else
    update jurnal
       set benar = coalesce(tanpa_jurnal = false
                            and akun_debit  = v_debit
                            and akun_kredit = v_kredit, false)
     where putaran = p_putaran;
  end if;

  -- Tandai siapa yang wajib, lalu posting jurnal mereka ke buku besar.
  -- Yang menyatakan "tidak ada jurnal" memang tidak memposting apa pun.
  update jurnal j
     set wajib      = (pw.warna = v_warna),
         diterapkan = (pw.warna = v_warna
                       and j.akun_debit is not null
                       and j.tanpa_jurnal = false)
    from pilihan_warna pw
   where pw.peserta_id = j.peserta_id
     and pw.putaran    = p_putaran
     and j.putaran     = p_putaran;
end;
$$;

grant execute on function terapkan_putaran(int) to anon, authenticated;

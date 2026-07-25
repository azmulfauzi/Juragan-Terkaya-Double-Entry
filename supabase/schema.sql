-- ============================================================================
--  JURAGAN TERKAYA: DOUBLE ENTRY — Skema Database Supabase
-- ============================================================================
--  Cara pakai:
--  1. Buat project Supabase BARU (jangan pakai project Juragan Terkaya v1)
--  2. Buka project tersebut -> menu "SQL Editor" -> "New query"
--  3. Copy-paste SELURUH isi file ini, lalu klik "Run"
--  4. Skrip ini aman dijalankan berulang kali (idempotent)
--
--  Bank soal TIDAK di-seed di sini — aplikasi mengisinya otomatis dari
--  src/data/soal.ts saat halaman fasilitator pertama kali dibuka.
-- ============================================================================

-- ─────────────────────────── TABEL ───────────────────────────

-- Status game global. Hanya ada 1 baris (id = 1).
create table if not exists game_state (
  id            int primary key,
  berjalan      boolean     not null default false,
  -- menunggu | pilih_warna | menjurnal | selesai
  fase          text        not null default 'menunggu',
  putaran       int         not null default 0,
  warna_spin    text,
  soal_id       int,
  fase_mulai    timestamptz,
  reveal        boolean     not null default false,
  show_insight  boolean     not null default false,
  riwayat_soal  jsonb       not null default '[]'::jsonb,
  -- Riwayat hasil roda, dipakai menghindari warna yang sama keluar 3x berturut.
  riwayat_warna jsonb       not null default '[]'::jsonb,
  constraint game_state_hanya_satu_baris check (id = 1)
);

create table if not exists peserta (
  id          uuid        primary key default gen_random_uuid(),
  nama        text        not null,
  created_at  timestamptz not null default now()
);

-- Warna yang dipilih peserta pada setiap putaran.
create table if not exists pilihan_warna (
  id          bigserial primary key,
  peserta_id  uuid    not null references peserta(id) on delete cascade,
  putaran     int     not null,
  warna       text    not null,
  otomatis    boolean not null default false,
  unique (peserta_id, putaran)
);

-- Jurnal peserta. SATU baris = satu jurnal dua sisi (debit & kredit).
--
-- Saldo peserta TIDAK disimpan di mana pun; seluruh laporan keuangan dihitung
-- ulang dari tabel ini (lihat src/lib/laporan.ts). Satu sumber kebenaran.
create table if not exists jurnal (
  id             bigserial primary key,
  peserta_id     uuid    not null references peserta(id) on delete cascade,
  putaran        int     not null,           -- 0 = jurnal pembukaan (modal awal)
  soal_id        int,                        -- null untuk jurnal pembukaan
  akun_debit     text,                       -- null = tidak sempat mengirim
  akun_kredit    text,
  nominal        bigint  not null default 0,
  -- Diisi server saat reveal, bukan oleh peserta — supaya benar/salah tidak
  -- bisa terbaca lebih awal dari devtools.
  benar          boolean not null default false,
  -- true bila warna peserta cocok dengan hasil roda pada putaran itu.
  wajib          boolean not null default false,
  waktu_jawab_ms int,
  -- Jurnal baru masuk ke buku besar saat diterapkan = true (yaitu saat reveal).
  -- Sebelum itu, peserta tidak boleh melihat pengaruhnya di GL/Neraca.
  diterapkan     boolean not null default false,
  -- Pernyataan "tidak ada jurnal yang perlu dicatat" — jawaban yang benar bagi
  -- pemegang polis saat musibah terjadi. Sengaja dibedakan dari "tidak sempat
  -- mengirim" (akun kosong DAN tanpa_jurnal false), yang dihitung salah.
  tanpa_jurnal   boolean not null default false,
  created_at     timestamptz not null default now(),
  unique (peserta_id, putaran)
);

-- Keputusan peserta atas penawaran asuransi. Polis berlaku sampai game selesai.
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

-- Bank soal (dapat diedit penuh lewat UI fasilitator).
create table if not exists soal (
  id           int primary key,
  -- kas_masuk | kas_keluar | non_kas | modal — hanya untuk pengelolaan bank
  -- soal, TIDAK dipakai saat mengundi (lihat PRD 5.1).
  kategori     text   not null default 'non_kas',
  -- biasa     : diundi acak, roda menentukan siapa yang membukukan
  -- keputusan : penawaran asuransi — seluruh peserta memutuskan, tanpa roda
  -- kejadian  : musibah — dimunculkan fasilitator, roda menentukan korbannya
  jenis        text   not null default 'biasa',
  -- kebakaran | kendaraan — penghubung soal keputusan dengan soal kejadian
  polis        text,
  teks         text   not null,
  nominal      bigint not null default 0,
  opsi_debit   jsonb  not null,              -- array 4 kode akun
  opsi_kredit  jsonb  not null,              -- array 4 kode akun
  debit_benar  text   not null,
  kredit_benar text   not null,
  insight      text   not null default ''
);

-- Pastikan baris status game selalu ada.
insert into game_state (id) values (1) on conflict (id) do nothing;

-- Index untuk mempercepat query dashboard saat peserta banyak.
create index if not exists idx_pilihan_warna_putaran on pilihan_warna (putaran);
create index if not exists idx_jurnal_putaran        on jurnal (putaran);
create index if not exists idx_jurnal_peserta        on jurnal (peserta_id);
create index if not exists idx_keputusan_peserta     on keputusan (peserta_id);
create index if not exists idx_keputusan_polis       on keputusan (polis);


-- ─────────────────────── ROW LEVEL SECURITY ───────────────────────
-- Game ini tidak memakai sistem login (peserta cukup isi nama), sehingga semua
-- akses memakai anon key. Kebijakan di bawah sengaja permisif.
--
-- ⚠️  KONSEKUENSI: siapa pun yang punya link + anon key secara teknis bisa
--     membaca tabel `soal` (termasuk kunci jawabannya) dan menulis data.
--     Aplikasi sudah menghindarinya — halaman peserta hanya mengambil kolom
--     soal tanpa kunci jawaban sebelum reveal — tapi ini melindungi tampilan,
--     bukan database. Cukup untuk game presentasi internal. Jangan simpan data
--     sensitif di project Supabase ini.

alter table game_state    enable row level security;
alter table peserta       enable row level security;
alter table pilihan_warna enable row level security;
alter table jurnal        enable row level security;
alter table keputusan     enable row level security;
alter table soal          enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['game_state','peserta','pilihan_warna','jurnal','keputusan','soal']
  loop
    execute format('drop policy if exists akses_publik on %I', t);
    execute format(
      'create policy akses_publik on %I for all to anon, authenticated using (true) with check (true)', t
    );
  end loop;
end $$;


-- ───────────────────────── REALTIME ─────────────────────────

alter table game_state    replica identity full;
alter table peserta       replica identity full;
alter table pilihan_warna replica identity full;
alter table jurnal        replica identity full;
alter table keputusan     replica identity full;

do $$
declare
  t text;
begin
  foreach t in array array['game_state','peserta','pilihan_warna','jurnal','keputusan']
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception
      when duplicate_object then null;   -- sudah terdaftar, lewati
    end;
  end loop;
end $$;


-- ─────────────────── FUNGSI RESET (untuk sesi baru) ───────────────────
-- Menghapus seluruh peserta & jurnal, tapi TIDAK menghapus bank soal.

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


-- ───────────── PENDAFTARAN PESERTA + JURNAL PEMBUKAAN ─────────────
-- Setiap peserta mulai dengan jurnal identik:
--     Kas (1-100)  10.000.000  (D)
--         Modal Pemilik (3-100)  10.000.000  (K)
-- Dibuat di server agar tidak ada peserta yang kehilangan modal awalnya karena
-- koneksi putus di tengah pendaftaran.

create or replace function daftar_peserta(p_nama text)
returns peserta
language plpgsql
security definer
set search_path = public
as $$
declare
  baru peserta;
begin
  insert into peserta (nama) values (btrim(p_nama)) returning * into baru;

  insert into jurnal (peserta_id, putaran, soal_id, akun_debit, akun_kredit,
                      nominal, benar, wajib, diterapkan)
  values (baru.id, 0, null, '1-100', '3-100', 10000000, true, false, true);

  return baru;
end;
$$;

grant execute on function daftar_peserta(text) to anon, authenticated;


-- ──────────────── PENILAIAN & POSTING SAAT REVEAL ────────────────
-- Dipanggil sekali oleh fasilitator saat menekan "Reveal Jurnal Benar".
--
-- Tiga hal terjadi sekaligus, di server:
--   1. Peserta wajib yang tidak sempat mengirim dibuatkan baris kosong
--      (dihitung salah, tapi TIDAK diposting ke buku besar).
--   2. Kolom `benar` diisi dengan membandingkan ke kunci jawaban.
--   3. Jurnal peserta wajib yang terisi di-posting (diterapkan = true).
--
-- Penilaian sengaja tidak dilakukan di browser peserta: kalau `benar` sudah
-- tersimpan sejak peserta menekan kirim, nilainya bisa dibaca lewat devtools
-- sebelum fasilitator reveal.

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

  -- 1. Peserta wajib yang tidak mengirim jurnal sampai waktu habis.
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

  -- 2. Nilai seluruh jurnal putaran ini — termasuk jurnal latihan, karena
  --    peserta latihan tetap berhak tahu jurnalnya benar atau salah.
  --
  --    coalesce() WAJIB ada: pada baris tanpa jawaban, "null = 'x'" bernilai
  --    NULL sedangkan kolom benar bertanda not null. Tanpa ini, reveal gagal
  --    dengan error 23502 tepat pada saat ada peserta yang kehabisan waktu.
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

  -- 3. Tandai siapa yang wajib, lalu posting jurnal mereka ke buku besar.
  --    Peserta yang mendaftar di tengah putaran tidak punya pilihan warna;
  --    baris mereka dibiarkan sebagai latihan (wajib & diterapkan tetap false).
  --    Yang menyatakan "tidak ada jurnal" memang tidak memposting apa pun.
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


-- ─────────────────── WAKTU SERVER (sinkronisasi timer) ───────────────────
-- Jam di HP peserta bisa meleset beberapa menit. Semua klien mengukur selisih
-- jamnya terhadap fungsi ini sekali di awal, agar hitungan mundur 10 dan 45
-- detik berjalan serempak di semua perangkat.

create or replace function waktu_server()
returns timestamptz
language sql
stable
as $$ select now() $$;

grant execute on function waktu_server() to anon, authenticated;

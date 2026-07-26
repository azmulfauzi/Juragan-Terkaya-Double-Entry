-- ============================================================================
--  MIGRASI 02 — Dua Dompet (Bisnis & Pribadi)
-- ============================================================================
--  Jalankan SETELAH migrasi-01-asuransi.sql.
--  Buka Supabase → SQL Editor → New query → tempel seluruh isi file ini → Run.
--  Aman dijalankan berulang kali dan tidak menghapus data.
--
--  Yang ditambahkan:
--   1. Kolom `alokasi_bisnis` pada peserta — porsi modal awal yang masuk buku
--   2. Kolom `jenis` pada jurnal, plus pelonggaran kunci unik supaya satu
--      peserta boleh punya banyak jurnal mutasi dalam satu putaran
--   3. Tabel `mutasi` — catatan fakta perpindahan uang antar dompet
--   4. daftar_peserta() menerima alokasi, terapkan_putaran() hanya menilai
--      jurnal berjenis 'soal'
-- ============================================================================

-- ─────────────────────── 1. PESERTA ───────────────────────

-- Porsi dari Rp10.000.000 yang peserta masukkan ke Dompet Bisnis saat mendaftar.
-- Sisanya menjadi isi awal Dompet Pribadi, yang berada DI LUAR pembukuan.
alter table peserta
  add column if not exists alokasi_bisnis bigint not null default 10000000;


-- ─────────────────────── 2. JURNAL ───────────────────────

-- soal      : jawaban atas soal putaran itu (satu per peserta per putaran)
-- pembukaan : jurnal modal awal
-- mutasi    : top up / prive antar dompet, boleh berkali-kali dalam satu putaran
alter table jurnal add column if not exists jenis text not null default 'soal';

update jurnal set jenis = 'pembukaan' where putaran = 0 and jenis = 'soal';

-- Kunci unik lama melarang peserta punya lebih dari satu jurnal per putaran.
-- Aturan itu tetap berlaku untuk jawaban soal, tapi tidak boleh mengikat
-- mutasi dompet yang memang bisa dilakukan berkali-kali.
alter table jurnal drop constraint if exists jurnal_peserta_id_putaran_key;

create unique index if not exists jurnal_satu_jawaban_per_putaran
  on jurnal (peserta_id, putaran)
  where jenis <> 'mutasi';


-- ─────────────────────── 3. TABEL MUTASI ───────────────────────

-- Catatan FAKTA: uangnya benar-benar berpindah sebanyak ini. Jurnal yang
-- menyertainya boleh saja salah akun — dan justru di situlah pelajarannya.
create table if not exists mutasi (
  id          bigserial primary key,
  peserta_id  uuid   not null references peserta(id) on delete cascade,
  arah        text   not null,          -- 'topup' (pribadi→bisnis) | 'prive' (bisnis→pribadi)
  jumlah      bigint not null check (jumlah > 0),
  putaran     int    not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_mutasi_peserta on mutasi (peserta_id);

alter table mutasi enable row level security;
drop policy if exists akses_publik on mutasi;
create policy akses_publik on mutasi
  for all to anon, authenticated using (true) with check (true);

alter table mutasi replica identity full;
do $$
begin
  alter publication supabase_realtime add table mutasi;
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
  delete from mutasi        where true;
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


-- ────────────── 5. PENDAFTARAN DENGAN PEMBAGIAN DOMPET ──────────────

-- Versi lama (hanya nama) dibuang supaya tidak ada dua fungsi bernama sama
-- dengan perilaku berbeda.
drop function if exists daftar_peserta(text);

create or replace function daftar_peserta(p_nama text, p_alokasi_bisnis bigint)
returns peserta
language plpgsql
security definer
set search_path = public
as $$
declare
  baru    peserta;
  alokasi bigint;
begin
  -- Dibatasi di server juga, bukan hanya di browser: nilai di luar rentang akan
  -- membuat Dompet Pribadi negatif sejak sebelum permainan dimulai.
  alokasi := least(10000000, greatest(1000000, coalesce(p_alokasi_bisnis, 10000000)));

  insert into peserta (nama, alokasi_bisnis)
  values (btrim(p_nama), alokasi)
  returning * into baru;

  -- Hanya porsi bisnis yang masuk pembukuan.
  insert into jurnal (peserta_id, putaran, soal_id, akun_debit, akun_kredit,
                      nominal, benar, wajib, diterapkan, jenis)
  values (baru.id, 0, null, '1-100', '3-100', alokasi, true, false, true, 'pembukaan');

  return baru;
end;
$$;

grant execute on function daftar_peserta(text, bigint) to anon, authenticated;


-- ────────────── 6. PENILAIAN HANYA UNTUK JURNAL JAWABAN ──────────────
--
-- Perbaikan penting: sebelum ini seluruh baris pada putaran berjalan ikut
-- dinilai, termasuk jurnal mutasi dompet yang kebetulan dibuat pada putaran
-- yang sama. Akibatnya jurnal mutasi bisa ditandai salah dan status
-- diterapkan-nya dicabut, sehingga uang yang sudah berpindah hilang dari buku
-- besar. Semua pernyataan di bawah kini dibatasi jenis = 'soal'.

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
    return;
  end if;

  select debit_benar, kredit_benar, nominal, jenis, polis
    into v_debit, v_kredit, v_nominal, v_jenis, v_polis
    from soal where id = v_soal_id;

  -- ── Putaran KEPUTUSAN (penawaran asuransi) ──
  if v_jenis = 'keputusan' then
    update jurnal
       set benar      = coalesce(akun_debit = v_debit and akun_kredit = v_kredit, false),
           wajib      = false,
           diterapkan = (akun_debit is not null)
     where putaran = p_putaran
       and jenis   = 'soal';
    return;
  end if;

  if v_warna is null then
    return;
  end if;

  -- 1. Peserta wajib yang tidak mengirim jurnal sampai waktu habis.
  insert into jurnal (peserta_id, putaran, soal_id, akun_debit, akun_kredit,
                      nominal, benar, wajib, diterapkan, jenis)
  select pw.peserta_id, p_putaran, v_soal_id, null, null,
         v_nominal, false, true, false, 'soal'
    from pilihan_warna pw
   where pw.putaran = p_putaran
     and pw.warna   = v_warna
     and not exists (
       select 1 from jurnal j
        where j.peserta_id = pw.peserta_id
          and j.putaran    = p_putaran
          and j.jenis      = 'soal'
     );

  -- 2. Penilaian. coalesce() wajib: pada baris tanpa jawaban, "null = 'x'"
  --    bernilai NULL sedangkan kolom benar bertanda not null.
  if v_jenis = 'kejadian' then
    update jurnal j
       set benar = case
             when exists (
               select 1 from keputusan k
                where k.peserta_id = j.peserta_id
                  and k.polis      = v_polis
                  and k.ambil
             )
             then j.tanpa_jurnal
             else coalesce(j.tanpa_jurnal = false
                           and j.akun_debit  = v_debit
                           and j.akun_kredit = v_kredit, false)
           end
     where j.putaran = p_putaran
       and j.jenis   = 'soal';
  else
    update jurnal
       set benar = coalesce(tanpa_jurnal = false
                            and akun_debit  = v_debit
                            and akun_kredit = v_kredit, false)
     where putaran = p_putaran
       and jenis   = 'soal';
  end if;

  -- 3. Tandai siapa yang wajib, lalu posting jurnal mereka ke buku besar.
  update jurnal j
     set wajib      = (pw.warna = v_warna),
         diterapkan = (pw.warna = v_warna
                       and j.akun_debit is not null
                       and j.tanpa_jurnal = false)
    from pilihan_warna pw
   where pw.peserta_id = j.peserta_id
     and pw.putaran    = p_putaran
     and j.putaran     = p_putaran
     and j.jenis       = 'soal';
end;
$$;

grant execute on function terapkan_putaran(int) to anon, authenticated;

-- ============================================================================
--  MIGRASI 04 — Satu Kesempatan Menjawab, Hasil Dibuka Saat Reveal
-- ============================================================================
--  Jalankan SETELAH migrasi-03-percobaan-dan-ranah.sql.
--  Buka Supabase → SQL Editor → New query → tempel seluruh isi file ini → Run.
--  Aman dijalankan berulang kali dan tidak menghapus data.
--
--  Perubahan aturan:
--   1. Peserta menjawab SEKALI. Tidak ada percobaan kedua.
--   2. Benar/salah tidak lagi diberitahukan seketika. Penilaian kembali
--      dilakukan saat fasilitator menekan Reveal, seperti rancangan semula —
--      sehingga kunci jawaban tidak pernah ada di perangkat peserta selama
--      putaran berjalan.
--   3. Nilai jadi 100 bila benar, 0 bila salah.
--   4. Setelah reveal, peserta yang salah diminta membetulkan jurnalnya.
--      Nilainya tetap 0; yang dibetulkan adalah pembukuannya, supaya laporan
--      di putaran-putaran berikutnya tidak ikut melenceng.
--   5. Jurnal pembelian polis dinilai sama seperti soal biasa.
-- ============================================================================

-- Penanda bahwa jurnal ini sudah dibetulkan setelah reveal.
alter table jurnal add column if not exists diperbaiki boolean not null default false;

-- Percobaan berulang dihapus dari permainan; kolomnya dibiarkan ada untuk data
-- lama, tapi tidak dipakai lagi.
drop function if exists coba_jawab(uuid, int, text, text, text, boolean, int);


-- ────────────── PENILAIAN SAAT REVEAL ──────────────
--
-- Seluruh jawaban putaran ini dinilai sekaligus, termasuk jawaban LATIHAN:
-- peserta yang warnanya tidak keluar tetap menunjukkan pemahamannya, hanya
-- jurnalnya saja yang tidak diposting.

create or replace function terapkan_putaran(p_putaran int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_soal_id int;
  v_warna   text;
  s         soal%rowtype;
begin
  select soal_id, warna_spin into v_soal_id, v_warna from game_state where id = 1;
  if v_soal_id is null then
    return;
  end if;

  select * into s from soal where id = v_soal_id;

  -- ── Putaran keputusan asuransi ──
  -- Tidak ada roda dan tidak ada peserta wajib. Yang membeli menjurnal
  -- preminya, dan jurnal itu dinilai sama seperti soal biasa.
  if s.jenis = 'keputusan' then
    update jurnal
       set benar      = coalesce(akun_debit = s.debit_benar
                                 and akun_kredit = s.kredit_benar, false),
           nilai      = case when coalesce(akun_debit = s.debit_benar
                                           and akun_kredit = s.kredit_benar, false)
                             then 100 else 0 end,
           wajib      = false,
           selesai    = true,
           diterapkan = (akun_debit is not null)
     where putaran = p_putaran and jenis = 'soal';
    return;
  end if;

  if v_warna is null then
    return;
  end if;

  -- Peserta wajib yang tidak mengirim apa pun sampai waktu habis.
  insert into jurnal (peserta_id, putaran, soal_id, akun_debit, akun_kredit, nominal,
                      benar, wajib, diterapkan, jenis, percobaan, nilai, selesai)
  select pw.peserta_id, p_putaran, v_soal_id, null, null, s.nominal,
         false, true, false, 'soal', 1, 0, true
    from pilihan_warna pw
   where pw.putaran = p_putaran
     and pw.warna   = v_warna
     and not exists (
       select 1 from jurnal j
        where j.peserta_id = pw.peserta_id and j.putaran = p_putaran and j.jenis = 'soal'
     );

  -- Menilai seluruh jawaban, wajib maupun latihan.
  --
  -- Jawaban dianggap benar bila ranahnya tepat, DAN:
  --   soal pribadi  → cukup itu saja, memang tidak ada jurnal
  --   pemegang polis saat musibah → justru harus menyatakan tidak ada jurnal
  --   selebihnya    → kedua sisi jurnalnya tepat
  update jurnal j
     set benar = case
           when j.sifat_dipilih is distinct from s.sifat then false
           when s.sifat = 'pribadi' then true
           when s.jenis = 'kejadian' and exists (
                  select 1 from keputusan k
                   where k.peserta_id = j.peserta_id and k.polis = s.polis and k.ambil
                ) then j.tanpa_jurnal
           else coalesce(j.tanpa_jurnal = false
                         and j.akun_debit  = s.debit_benar
                         and j.akun_kredit = s.kredit_benar, false)
         end,
         selesai = true
   where j.putaran = p_putaran and j.jenis = 'soal';

  update jurnal
     set nilai = case when benar then 100 else 0 end
   where putaran = p_putaran and jenis = 'soal';

  -- Yang warnanya keluar dan jawabannya benar: jurnalnya masuk buku besar.
  update jurnal j
     set wajib      = (pw.warna = v_warna),
         diterapkan = (pw.warna = v_warna and j.benar and s.sifat = 'bisnis'
                       and j.tanpa_jurnal = false and j.akun_debit is not null)
    from pilihan_warna pw
   where pw.peserta_id = j.peserta_id
     and pw.putaran    = p_putaran
     and j.putaran     = p_putaran
     and j.jenis       = 'soal';

  -- Belanja pribadi yang benar dan memang gilirannya: catat mutasi dompet.
  if s.sifat = 'pribadi' then
    insert into mutasi (peserta_id, arah, jumlah, putaran, keterangan, soal_id)
    select j.peserta_id,
           case when s.arah_kas = 'masuk' then 'pribadi_masuk' else 'pribadi_keluar' end,
           s.nominal, p_putaran, s.teks, s.id
      from jurnal j
     where j.putaran = p_putaran and j.jenis = 'soal' and j.wajib and j.benar
    on conflict do nothing;
  end if;
end;
$$;

grant execute on function terapkan_putaran(int) to anon, authenticated;


-- ────────────── PEMBETULAN SETELAH REVEAL ──────────────
--
-- Nilainya tetap 0 — yang dibetulkan adalah pembukuannya. Buku yang salah akan
-- menyeret seluruh laporan di putaran-putaran berikutnya, dan itu jauh lebih
-- merugikan peserta daripada kehilangan seratus poin.
--
-- Hanya bisa dipanggil setelah fasilitator reveal, supaya tidak menjadi jalan
-- pintas untuk mengintip kunci jawaban di tengah putaran.

create or replace function perbaiki_jawaban(p_peserta uuid, p_putaran int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_soal_id int;
  v_reveal  boolean;
  v_warna   text;
  s         soal%rowtype;
  j         jurnal%rowtype;
  v_polis   boolean;
begin
  select soal_id, reveal, warna_spin into v_soal_id, v_reveal, v_warna
    from game_state where id = 1;

  if v_soal_id is null or not v_reveal then
    return jsonb_build_object('ok', false, 'pesan', 'Jawaban baru bisa dibetulkan setelah reveal.');
  end if;

  select * into s from soal where id = v_soal_id;

  select * into j from jurnal
   where peserta_id = p_peserta and putaran = p_putaran and jenis = 'soal';
  if not found then
    return jsonb_build_object('ok', false, 'pesan', 'Belum ada jawaban untuk dibetulkan.');
  end if;
  if j.benar then
    return jsonb_build_object('ok', true, 'pesan', 'Jawabanmu memang sudah benar.');
  end if;

  v_polis := s.jenis = 'kejadian' and exists (
    select 1 from keputusan k
     where k.peserta_id = p_peserta and k.polis = s.polis and k.ambil
  );

  if s.sifat = 'pribadi' then
    -- Urusan pemilik: tidak ada jurnal, cukup catat mutasi dompetnya.
    update jurnal
       set akun_debit = null, akun_kredit = null, tanpa_jurnal = false,
           sifat_dipilih = 'pribadi', diterapkan = false, diperbaiki = true
     where id = j.id;

    if j.wajib then
      insert into mutasi (peserta_id, arah, jumlah, putaran, keterangan, soal_id)
      values (p_peserta,
              case when s.arah_kas = 'masuk' then 'pribadi_masuk' else 'pribadi_keluar' end,
              s.nominal, p_putaran, s.teks, s.id)
      on conflict do nothing;
    end if;

  elsif v_polis then
    -- Pemegang polis: jawaban yang benar adalah tidak menjurnal apa pun.
    update jurnal
       set akun_debit = null, akun_kredit = null, tanpa_jurnal = true,
           sifat_dipilih = 'bisnis', diterapkan = false, diperbaiki = true
     where id = j.id;

  else
    update jurnal
       set akun_debit = s.debit_benar, akun_kredit = s.kredit_benar,
           tanpa_jurnal = false, sifat_dipilih = 'bisnis',
           diterapkan = j.wajib or s.jenis = 'keputusan',
           diperbaiki = true
     where id = j.id;
  end if;

  return jsonb_build_object('ok', true, 'pesan', 'Pembukuanmu sudah dibetulkan.');
end;
$$;

grant execute on function perbaiki_jawaban(uuid, int) to anon, authenticated;

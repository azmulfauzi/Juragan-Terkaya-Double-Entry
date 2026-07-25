import { supabase } from './supabase'
import { SOAL_DEFAULT } from '../data/soal'
import { validasiSoal } from './validasi'
import type {
  GameState,
  Jurnal,
  Keputusan,
  Peserta,
  PilihanWarna,
  Polis,
  Soal,
  SoalTanpaKunci,
  Warna,
} from './types'

/** Membungkus error Supabase jadi pesan yang bisa dibaca manusia. */
function cek<T>(data: T | null, error: { message: string } | null, konteks: string): T {
  if (error) throw new Error(`${konteks}: ${error.message}`)
  if (data === null) throw new Error(`${konteks}: data kosong`)
  return data
}

// ───────────────────────────── STATUS GAME ─────────────────────────────

export async function ambilGameState(): Promise<GameState> {
  const { data, error } = await supabase.from('game_state').select('*').eq('id', 1).single()
  return cek(data, error, 'Gagal membaca status game')
}

export async function ubahGameState(patch: Partial<GameState>): Promise<void> {
  const { error } = await supabase.from('game_state').update(patch).eq('id', 1)
  if (error) throw new Error(`Gagal memperbarui status game: ${error.message}`)
}

/**
 * Menilai dan memposting seluruh jurnal satu putaran sekaligus, di server.
 * Dipanggil saat fasilitator menekan "Reveal" — sampai saat itu tidak ada satu
 * pun jurnal yang masuk buku besar, supaya peserta tidak bisa menebak benar/
 * salah dari berubahnya saldo di tab pembukuannya.
 */
export async function terapkanPutaran(putaran: number): Promise<void> {
  const { error } = await supabase.rpc('terapkan_putaran', { p_putaran: putaran })
  if (error) throw new Error(`Gagal membukukan jurnal putaran: ${error.message}`)
}

export async function resetGame(): Promise<void> {
  const { error } = await supabase.rpc('reset_game')
  if (error) throw new Error(`Gagal mereset game: ${error.message}`)
}

// ─────────────────────────────── PESERTA ───────────────────────────────

/** Mendaftar sekaligus memposting jurnal pembukaan (dilakukan di server). */
export async function daftarPeserta(nama: string): Promise<Peserta> {
  const { data, error } = await supabase.rpc('daftar_peserta', { p_nama: nama.trim() })
  return cek(data as Peserta | null, error, 'Gagal mendaftarkan peserta')
}

export async function ambilPeserta(id: string): Promise<Peserta | null> {
  const { data, error } = await supabase.from('peserta').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Gagal membaca data peserta: ${error.message}`)
  return data
}

export async function ambilSemuaPeserta(): Promise<Peserta[]> {
  const { data, error } = await supabase
    .from('peserta')
    .select('*')
    .order('created_at', { ascending: true })
  return cek(data, error, 'Gagal membaca daftar peserta')
}

// ──────────────────────────── PILIHAN WARNA ────────────────────────────

export async function simpanPilihanWarna(
  pesertaId: string,
  putaran: number,
  warna: Warna,
  otomatis = false,
): Promise<void> {
  const { error } = await supabase
    .from('pilihan_warna')
    .upsert(
      { peserta_id: pesertaId, putaran, warna, otomatis },
      { onConflict: 'peserta_id,putaran', ignoreDuplicates: true },
    )
  if (error) throw new Error(`Gagal menyimpan pilihan warna: ${error.message}`)
}

export async function ambilSemuaPilihanWarna(): Promise<PilihanWarna[]> {
  const { data, error } = await supabase.from('pilihan_warna').select('*')
  return cek(data, error, 'Gagal membaca pilihan warna')
}

export async function ambilPilihanWarnaSaya(
  pesertaId: string,
  putaran: number,
): Promise<PilihanWarna | null> {
  const { data, error } = await supabase
    .from('pilihan_warna')
    .select('*')
    .eq('peserta_id', pesertaId)
    .eq('putaran', putaran)
    .maybeSingle()
  if (error) throw new Error(`Gagal membaca pilihan warna: ${error.message}`)
  return data
}

// ─────────────────────────────── JURNAL ───────────────────────────────

export interface JurnalBaru {
  peserta_id: string
  putaran: number
  soal_id: number
  akun_debit: string | null
  akun_kredit: string | null
  nominal: number
  wajib: boolean
  waktu_jawab_ms: number | null
  /** true bila peserta menyatakan tidak ada jurnal yang perlu dicatat. */
  tanpa_jurnal?: boolean
}

/**
 * Menyimpan jurnal peserta.
 *
 * Kolom `benar` sengaja TIDAK dikirim dari sini — server yang menilainya saat
 * reveal. Kalau nilainya sudah tersimpan sejak peserta menekan kirim, siapa pun
 * bisa membacanya lewat devtools sebelum jawaban dibuka.
 */
export async function simpanJurnal(jurnal: JurnalBaru): Promise<void> {
  const { error } = await supabase
    .from('jurnal')
    .upsert(jurnal, { onConflict: 'peserta_id,putaran', ignoreDuplicates: true })
  if (error) throw new Error(`Gagal menyimpan jurnal: ${error.message}`)
}

export async function ambilSemuaJurnal(): Promise<Jurnal[]> {
  const { data, error } = await supabase
    .from('jurnal')
    .select('*')
    .order('putaran', { ascending: true })
    .order('id', { ascending: true })
  return cek(data, error, 'Gagal membaca jurnal')
}

export async function ambilJurnalPeserta(pesertaId: string): Promise<Jurnal[]> {
  const { data, error } = await supabase
    .from('jurnal')
    .select('*')
    .eq('peserta_id', pesertaId)
    .order('putaran', { ascending: true })
    .order('id', { ascending: true })
  return cek(data, error, 'Gagal membaca jurnal peserta')
}

export async function ambilJurnalSaya(
  pesertaId: string,
  putaran: number,
): Promise<Jurnal | null> {
  const { data, error } = await supabase
    .from('jurnal')
    .select('*')
    .eq('peserta_id', pesertaId)
    .eq('putaran', putaran)
    .maybeSingle()
  if (error) throw new Error(`Gagal membaca jurnal: ${error.message}`)
  return data
}

// ────────────────────────── KEPUTUSAN ASURANSI ──────────────────────────

/**
 * Menyimpan keputusan peserta atas penawaran asuransi.
 *
 * Yang menolak pun dicatat (ambil = false), supaya fasilitator bisa melihat
 * siapa yang sudah memutuskan dan siapa yang masih diam.
 */
export async function simpanKeputusan(
  pesertaId: string,
  putaran: number,
  soalId: number,
  polis: Polis,
  ambil: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('keputusan')
    .upsert(
      { peserta_id: pesertaId, putaran, soal_id: soalId, polis, ambil },
      { onConflict: 'peserta_id,putaran', ignoreDuplicates: true },
    )
  if (error) throw new Error(`Gagal menyimpan keputusan: ${error.message}`)
}

export async function ambilSemuaKeputusan(): Promise<Keputusan[]> {
  const { data, error } = await supabase.from('keputusan').select('*')
  return cek(data, error, 'Gagal membaca keputusan asuransi')
}

export async function ambilKeputusanPeserta(pesertaId: string): Promise<Keputusan[]> {
  const { data, error } = await supabase
    .from('keputusan')
    .select('*')
    .eq('peserta_id', pesertaId)
    .order('putaran', { ascending: true })
  return cek(data, error, 'Gagal membaca keputusan asuransi')
}

/** Polis yang aktif milik seorang peserta. Berlaku sampai permainan selesai. */
export function polisAktif(keputusan: Keputusan[]): Set<Polis> {
  return new Set(keputusan.filter((k) => k.ambil).map((k) => k.polis))
}

// ──────────────────────────────── SOAL ────────────────────────────────

/** Kolom soal TANPA kunci jawaban — inilah yang boleh diambil halaman peserta. */
const KOLOM_TANPA_KUNCI = 'id, kategori, jenis, polis, teks, nominal, opsi_debit, opsi_kredit'

/**
 * Soal untuk ditampilkan ke peserta selama putaran berjalan.
 * Kunci jawaban tidak ikut terkirim ke browser peserta sebelum reveal.
 */
export async function ambilSoalTanpaKunci(id: number): Promise<SoalTanpaKunci | null> {
  const { data, error } = await supabase
    .from('soal')
    .select(KOLOM_TANPA_KUNCI)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Gagal membaca soal: ${error.message}`)
  return data as SoalTanpaKunci | null
}

/** Soal lengkap beserta kunci jawaban — hanya untuk fasilitator & setelah reveal. */
export async function ambilSoalLengkap(id: number): Promise<Soal | null> {
  const { data, error } = await supabase.from('soal').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Gagal membaca soal: ${error.message}`)
  return data
}

export async function ambilSemuaSoal(): Promise<Soal[]> {
  const { data, error } = await supabase.from('soal').select('*').order('id', { ascending: true })
  return cek(data, error, 'Gagal membaca bank soal')
}

/**
 * Teks soal untuk keterangan baris buku besar.
 *
 * `ids` sengaja wajib diisi di halaman peserta: tanpa batasan itu, browser
 * peserta ikut menerima teks seluruh bank soal — termasuk kasus yang belum
 * keluar. Bukan kunci jawaban, tapi tetap bocoran yang tidak perlu ada.
 * Fasilitator boleh mengambil semuanya (memang butuh untuk editor & undian).
 */
export async function ambilJudulSoal(ids?: number[]): Promise<Map<number, string>> {
  if (ids && ids.length === 0) return new Map()

  const kueri = supabase.from('soal').select('id, teks')
  const { data, error } = await (ids ? kueri.in('id', ids) : kueri)
  const baris = cek(data, error, 'Gagal membaca daftar soal')
  return new Map(baris.map((s) => [s.id as number, s.teks as string]))
}

/** Mengisi tabel soal dengan data default jika tabel masih kosong. */
export async function seedSoalJikaKosong(): Promise<Soal[]> {
  const { count, error } = await supabase.from('soal').select('id', { count: 'exact', head: true })
  if (error) throw new Error(`Gagal memeriksa bank soal: ${error.message}`)

  if ((count ?? 0) === 0) {
    // Soal benih boleh tidak menyebut jenis/polis; keduanya diisi di sini agar
    // 44 soal lama tidak perlu ditulisi satu per satu.
    const benih: Soal[] = SOAL_DEFAULT.map((s) => ({
      jenis: 'biasa',
      polis: null,
      ...s,
    }))
    const { error: errInsert } = await supabase.from('soal').insert(benih)
    if (errInsert) throw new Error(`Gagal mengisi bank soal awal: ${errInsert.message}`)
  }
  return ambilSemuaSoal()
}

export async function simpanSoal(soal: Soal): Promise<void> {
  const salah = validasiSoal(soal)
  if (salah) throw new Error(salah)
  const { error } = await supabase.from('soal').upsert(soal, { onConflict: 'id' })
  if (error) throw new Error(`Gagal menyimpan soal: ${error.message}`)
}

export async function hapusSoal(id: number): Promise<void> {
  const { error } = await supabase.from('soal').delete().eq('id', id)
  if (error) throw new Error(`Gagal menghapus soal: ${error.message}`)
}

// Undian soal & roda warna kini tinggal di src/lib/undian.ts — modul murni,
// supaya bisa diuji tanpa menyeret klien Supabase ke dalam bundelnya.

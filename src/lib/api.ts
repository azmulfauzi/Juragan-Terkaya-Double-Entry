import { supabase } from './supabase'
import { SOAL_DEFAULT } from '../data/soal'
import { DAFTAR_WARNA, RIWAYAT_SOAL_MAX } from './config'
import { validasiSoal } from './validasi'
import type {
  GameState,
  Jurnal,
  Peserta,
  PilihanWarna,
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
  akun_debit: string
  akun_kredit: string
  nominal: number
  wajib: boolean
  waktu_jawab_ms: number | null
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

// ──────────────────────────────── SOAL ────────────────────────────────

/** Kolom soal TANPA kunci jawaban — inilah yang boleh diambil halaman peserta. */
const KOLOM_TANPA_KUNCI = 'id, kategori, teks, nominal, opsi_debit, opsi_kredit'

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
    const { error: errInsert } = await supabase.from('soal').insert(SOAL_DEFAULT)
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

// ──────────────────── UNDIAN SOAL & RODA WARNA ────────────────────

/**
 * Memilih 1 soal acak dari SELURUH bank soal, tanpa memandang warna.
 * Menghindari soal yang baru dipakai; bila semuanya sudah terpakai, riwayat
 * diabaikan.
 *
 * ⚠️ Jangan pernah menambahkan filter warna di sini. Begitu warna terhubung ke
 *    jenis transaksi, peserta akan hafal dalam dua-tiga putaran dan unsur
 *    keberuntungannya mati.
 */
export function pilihSoalAcak(semuaSoal: Soal[], riwayat: number[]): Soal | null {
  if (semuaSoal.length === 0) return null

  const belumDipakai = semuaSoal.filter((s) => !riwayat.includes(s.id))
  const kandidat = belumDipakai.length > 0 ? belumDipakai : semuaSoal
  return kandidat[Math.floor(Math.random() * kandidat.length)]
}

/** Menambahkan id soal ke riwayat, memotong agar tidak melebihi batas. */
export function tambahRiwayat(riwayat: number[], soalId: number): number[] {
  return [...riwayat.filter((id) => id !== soalId), soalId].slice(-RIWAYAT_SOAL_MAX)
}

/**
 * Mengundi warna pemenang roda.
 *
 * Warna yang sudah keluar dua kali berturut-turut dikeluarkan dari undian, agar
 * pada sesi pendek tidak ada peserta yang kebagian tiga kali beruntun sementara
 * yang lain belum sekali pun. Unsur untung-untungannya tetap utuh.
 */
export function undiWarna(riwayatWarna: Warna[]): Warna {
  const duaTerakhir = riwayatWarna.slice(-2)
  const beruntun =
    duaTerakhir.length === 2 && duaTerakhir[0] === duaTerakhir[1] ? duaTerakhir[0] : null

  const kandidat = beruntun ? DAFTAR_WARNA.filter((w) => w !== beruntun) : DAFTAR_WARNA
  return kandidat[Math.floor(Math.random() * kandidat.length)]
}

export function tambahRiwayatWarna(riwayat: Warna[], warna: Warna): Warna[] {
  return [...riwayat, warna].slice(-10)
}

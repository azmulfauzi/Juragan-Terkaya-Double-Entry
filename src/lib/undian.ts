/**
 * UNDIAN SOAL & RODA WARNA — modul murni, tanpa akses jaringan.
 *
 * Dipisah dari api.ts supaya bisa diuji tanpa menyeret klien Supabase, dan
 * supaya aturan pentingnya (warna tidak boleh terhubung ke jenis transaksi)
 * berada di satu berkas kecil yang mudah diperiksa.
 */
import { DAFTAR_WARNA, RIWAYAT_SOAL_MAX } from './config'
import type { Soal, Warna } from './types'

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
  // Soal keputusan (penawaran asuransi) dan kejadian (musibah) sengaja tidak
  // ikut diundi — keduanya dimunculkan fasilitator pada momen yang tepat.
  // Kebakaran yang keluar di putaran kedua, saat belum ada yang sempat membeli
  // polis, hanya jadi kerugian biasa tanpa pelajaran apa pun.
  const biasa = semuaSoal.filter((s) => s.jenis === 'biasa')
  if (biasa.length === 0) return null

  const belumDipakai = biasa.filter((s) => !riwayat.includes(s.id))
  const kandidat = belumDipakai.length > 0 ? belumDipakai : biasa
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

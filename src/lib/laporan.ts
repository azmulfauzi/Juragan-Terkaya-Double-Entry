/**
 * MESIN PEMBUKUAN — modul murni, tanpa React dan tanpa akses jaringan.
 *
 * Menerima daftar jurnal satu peserta, mengembalikan Buku Besar, Neraca Saldo,
 * Laba Rugi, dan Neraca. Dipakai bersama oleh halaman peserta dan halaman
 * fasilitator: kalau logikanya disalin dua kali, cepat atau lambat angka di HP
 * peserta akan berbeda dengan angka di layar proyektor — dan itu jenis
 * perbedaan yang memicu perdebatan di tengah presentasi.
 */
import { AKUN_LABA_RUGI, BAGAN_AKUN, KODE_KAS, KODE_MODAL, akun } from './akun'
import type { Akun } from './akun'
import type { Jurnal } from './types'

const KODE_PRIVE = '3-200'

export interface BarisBukuBesar {
  putaran: number
  keterangan: string
  debit: number
  kredit: number
  /** Saldo berjalan, positif bila sesuai saldo normal akunnya. */
  saldo: number
}

export interface AkunBukuBesar {
  akun: Akun
  baris: BarisBukuBesar[]
  saldo: number
}

export interface BarisNeracaSaldo {
  kode: string
  nama: string
  debit: number
  kredit: number
}

export interface NeracaSaldo {
  baris: BarisNeracaSaldo[]
  totalDebit: number
  totalKredit: number
  /**
   * Selalu true bila mesin posting benar. Kalau sampai false, itu BUG di sini
   * atau di database — bukan kesalahan peserta.
   */
  seimbang: boolean
}

export interface BarisLaporan {
  kode: string
  nama: string
  jumlah: number
}

export interface LabaRugi {
  pendapatan: BarisLaporan[]
  totalPendapatan: number
  beban: BarisLaporan[]
  totalBeban: number
  laba: number
}

export interface Neraca {
  aset: BarisLaporan[]
  totalAset: number
  kewajiban: BarisLaporan[]
  totalKewajiban: number
  modalPemilik: number
  prive: number
  labaBerjalan: number
  totalModal: number
  totalKewajibanModal: number
  seimbang: boolean
}

export interface Pembukuan {
  bukuBesar: AkunBukuBesar[]
  neracaSaldo: NeracaSaldo
  labaRugi: LabaRugi
  neraca: Neraca
  /** Ringkasan yang sering dipakai papan skor & tabel perbandingan. */
  saldoKas: number
  totalAset: number
  labaBersih: number
  saldo: (kode: string) => number
}

/** Keterangan baris buku besar; jurnal pembukaan tidak punya soal. */
function keteranganJurnal(j: Jurnal, petaSoal?: Map<number, string>): string {
  if (j.putaran === 0) return 'Setoran modal awal'
  if (j.soal_id != null) {
    const teks = petaSoal?.get(j.soal_id)
    if (teks) return teks
  }
  return `Transaksi putaran ${j.putaran}`
}

/**
 * Menyusun seluruh laporan dari daftar jurnal seorang peserta.
 *
 * Hanya jurnal `diterapkan` yang dihitung. Jurnal latihan dan jurnal yang belum
 * di-reveal sengaja diabaikan: kalau ikut terhitung, peserta bisa membuka tab
 * Buku Besar sebelum reveal dan menebak benar/salah dari berubahnya saldo.
 */
export function susunPembukuan(
  semuaJurnal: Jurnal[],
  petaSoal?: Map<number, string>,
): Pembukuan {
  const jurnal = semuaJurnal
    .filter((j) => j.diterapkan && j.akun_debit && j.akun_kredit)
    .sort((a, b) => a.putaran - b.putaran || a.id - b.id)

  // ── Buku Besar ────────────────────────────────────────────────────────
  const peta = new Map<string, AkunBukuBesar>()

  function ambil(kode: string): AkunBukuBesar | null {
    const a = akun(kode)
    if (!a) return null // kode akun tidak dikenal (bank soal rusak) — lewati
    let entri = peta.get(kode)
    if (!entri) {
      entri = { akun: a, baris: [], saldo: 0 }
      peta.set(kode, entri)
    }
    return entri
  }

  function catat(kode: string, j: Jurnal, sisi: 'D' | 'K') {
    const entri = ambil(kode)
    if (!entri) return
    const debit = sisi === 'D' ? j.nominal : 0
    const kredit = sisi === 'K' ? j.nominal : 0
    // Saldo berjalan mengikuti saldo normal akun: positif berarti "wajar".
    entri.saldo +=
      entri.akun.saldoNormal === 'D' ? debit - kredit : kredit - debit
    entri.baris.push({
      putaran: j.putaran,
      keterangan: keteranganJurnal(j, petaSoal),
      debit,
      kredit,
      saldo: entri.saldo,
    })
  }

  for (const j of jurnal) {
    catat(j.akun_debit as string, j, 'D')
    catat(j.akun_kredit as string, j, 'K')
  }

  const bukuBesar = BAGAN_AKUN.map((a) => peta.get(a.kode)).filter(
    (e): e is AkunBukuBesar => Boolean(e),
  )

  const saldo = (kode: string) => peta.get(kode)?.saldo ?? 0

  // ── Neraca Saldo ──────────────────────────────────────────────────────
  // Saldo ditempatkan di kolom sesuai saldo normalnya. Saldo negatif (misal Kas
  // minus) sengaja TIDAK dicegah dan tetap ditulis di kolom normalnya — itu
  // sinyal edukatif yang kuat bahwa ada jurnal yang keliru, dan totalnya tetap
  // seimbang secara matematis.
  const barisTB: BarisNeracaSaldo[] = bukuBesar.map((e) => ({
    kode: e.akun.kode,
    nama: e.akun.nama,
    debit: e.akun.saldoNormal === 'D' ? e.saldo : 0,
    kredit: e.akun.saldoNormal === 'K' ? e.saldo : 0,
  }))

  const totalDebit = barisTB.reduce((t, b) => t + b.debit, 0)
  const totalKredit = barisTB.reduce((t, b) => t + b.kredit, 0)

  const neracaSaldo: NeracaSaldo = {
    baris: barisTB,
    totalDebit,
    totalKredit,
    seimbang: totalDebit === totalKredit,
  }

  // ── Laba Rugi ─────────────────────────────────────────────────────────
  // Seluruh akun pendapatan & beban selalu ditampilkan (termasuk yang nol),
  // supaya struktur laporannya terlihat utuh sebagai bahan ajar.
  const pendapatan = AKUN_LABA_RUGI.filter((a) => a.kelompok === 'pendapatan').map((a) => ({
    kode: a.kode,
    nama: a.nama,
    jumlah: saldo(a.kode),
  }))
  const beban = AKUN_LABA_RUGI.filter((a) => a.kelompok === 'beban').map((a) => ({
    kode: a.kode,
    nama: a.nama,
    jumlah: saldo(a.kode),
  }))

  const totalPendapatan = pendapatan.reduce((t, b) => t + b.jumlah, 0)
  const totalBeban = beban.reduce((t, b) => t + b.jumlah, 0)
  const labaRugi: LabaRugi = {
    pendapatan,
    totalPendapatan,
    beban,
    totalBeban,
    laba: totalPendapatan - totalBeban,
  }

  // ── Neraca ────────────────────────────────────────────────────────────
  const aset = BAGAN_AKUN.filter((a) => a.kelompok === 'aset')
    .map((a) => ({ kode: a.kode, nama: a.nama, jumlah: saldo(a.kode) }))
    .filter((b) => b.jumlah !== 0 || peta.has(b.kode))
  const kewajiban = BAGAN_AKUN.filter((a) => a.kelompok === 'kewajiban').map((a) => ({
    kode: a.kode,
    nama: a.nama,
    jumlah: saldo(a.kode),
  }))

  const totalAset = aset.reduce((t, b) => t + b.jumlah, 0)
  const totalKewajiban = kewajiban.reduce((t, b) => t + b.jumlah, 0)

  const modalPemilik = saldo(KODE_MODAL)
  // Prive bersaldo normal Debit: saldonya positif berarti pemilik menarik uang,
  // dan itu MENGURANGI modal. Tanda minus di bawah wajib — bukan plus.
  const prive = saldo(KODE_PRIVE)
  const totalModal = modalPemilik - prive + labaRugi.laba
  const totalKewajibanModal = totalKewajiban + totalModal

  const neraca: Neraca = {
    aset,
    totalAset,
    kewajiban,
    totalKewajiban,
    modalPemilik,
    prive,
    labaBerjalan: labaRugi.laba,
    totalModal,
    totalKewajibanModal,
    seimbang: totalAset === totalKewajibanModal,
  }

  return {
    bukuBesar,
    neracaSaldo,
    labaRugi,
    neraca,
    saldoKas: saldo(KODE_KAS),
    totalAset,
    labaBersih: labaRugi.laba,
    saldo,
  }
}

/**
 * Menyusun pembukuan seluruh peserta sekaligus dari SATU daftar jurnal.
 * Untuk 50+ peserta, ini jauh lebih murah daripada satu query per peserta.
 */
export function susunPembukuanSemua(
  jurnal: Jurnal[],
  petaSoal?: Map<number, string>,
): Map<string, Pembukuan> {
  const perPeserta = new Map<string, Jurnal[]>()
  for (const j of jurnal) {
    const daftar = perPeserta.get(j.peserta_id)
    if (daftar) daftar.push(j)
    else perPeserta.set(j.peserta_id, [j])
  }

  const hasil = new Map<string, Pembukuan>()
  for (const [pesertaId, daftar] of perPeserta) {
    hasil.set(pesertaId, susunPembukuan(daftar, petaSoal))
  }
  return hasil
}

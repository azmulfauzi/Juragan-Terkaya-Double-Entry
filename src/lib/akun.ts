/**
 * Bagan Akun (Chart of Accounts).
 *
 * Sengaja berupa konstanta kode, bukan tabel database: seluruh mesin pembukuan
 * dan struktur laporan bergantung padanya, jadi fasilitator TIDAK boleh
 * mengubahnya lewat UI. Menambah akun berarti mengubah file ini dan deploy.
 */

export type Kelompok = 'aset' | 'kewajiban' | 'modal' | 'pendapatan' | 'beban'
export type SaldoNormal = 'D' | 'K'

export interface Akun {
  kode: string
  nama: string
  kelompok: Kelompok
  saldoNormal: SaldoNormal
  /** Akun kontra mengurangi kelompoknya, bukan menambah (lihat Prive). */
  kontra?: boolean
}

export const BAGAN_AKUN: Akun[] = [
  { kode: '1-100', nama: 'Kas', kelompok: 'aset', saldoNormal: 'D' },
  { kode: '1-110', nama: 'Bank', kelompok: 'aset', saldoNormal: 'D' },
  { kode: '1-200', nama: 'Piutang Usaha', kelompok: 'aset', saldoNormal: 'D' },
  { kode: '1-300', nama: 'Persediaan', kelompok: 'aset', saldoNormal: 'D' },
  { kode: '1-400', nama: 'Perlengkapan', kelompok: 'aset', saldoNormal: 'D' },
  { kode: '1-500', nama: 'Peralatan', kelompok: 'aset', saldoNormal: 'D' },
  // Premi asuransi 1 tahun dibayar di muka: manfaatnya belum terpakai, jadi ia
  // masih ASET — bukan beban. Berpindah ke Beban Asuransi seiring waktu.
  { kode: '1-600', nama: 'Asuransi Dibayar Dimuka', kelompok: 'aset', saldoNormal: 'D' },

  { kode: '2-100', nama: 'Hutang Usaha', kelompok: 'kewajiban', saldoNormal: 'K' },
  { kode: '2-200', nama: 'Hutang Bank', kelompok: 'kewajiban', saldoNormal: 'K' },

  { kode: '3-100', nama: 'Modal Pemilik', kelompok: 'modal', saldoNormal: 'K' },
  // ⚠️ Prive berkelompok Modal tapi bersaldo normal DEBIT: di Neraca ia
  //    MENGURANGI modal. Ini sumber bug klasik — rumusnya ada di laporan.ts
  //    dan sengaja memakai tanda minus, bukan plus.
  { kode: '3-200', nama: 'Prive', kelompok: 'modal', saldoNormal: 'D', kontra: true },

  { kode: '4-100', nama: 'Pendapatan Penjualan', kelompok: 'pendapatan', saldoNormal: 'K' },
  { kode: '4-200', nama: 'Pendapatan Lain-lain', kelompok: 'pendapatan', saldoNormal: 'K' },

  { kode: '5-100', nama: 'Harga Pokok Penjualan', kelompok: 'beban', saldoNormal: 'D' },
  { kode: '5-200', nama: 'Beban Gaji', kelompok: 'beban', saldoNormal: 'D' },
  { kode: '5-300', nama: 'Beban Sewa', kelompok: 'beban', saldoNormal: 'D' },
  { kode: '5-400', nama: 'Beban Listrik & Air', kelompok: 'beban', saldoNormal: 'D' },
  { kode: '5-500', nama: 'Beban Transportasi', kelompok: 'beban', saldoNormal: 'D' },
  { kode: '5-600', nama: 'Beban Lain-lain', kelompok: 'beban', saldoNormal: 'D' },
  { kode: '5-700', nama: 'Beban Asuransi', kelompok: 'beban', saldoNormal: 'D' },
]

const PETA_AKUN = new Map(BAGAN_AKUN.map((a) => [a.kode, a]))

export function akun(kode: string): Akun | undefined {
  return PETA_AKUN.get(kode)
}

/** Nama akun untuk ditampilkan; kode yang tidak dikenal ditampilkan apa adanya. */
export function namaAkun(kode: string | null | undefined): string {
  if (!kode) return '—'
  return PETA_AKUN.get(kode)?.nama ?? kode
}

export function labelAkun(kode: string | null | undefined): string {
  if (!kode) return '—'
  const a = PETA_AKUN.get(kode)
  return a ? `${a.kode} ${a.nama}` : kode
}

/** Akun yang muncul di Neraca (aset, kewajiban, modal). */
export const AKUN_NERACA = BAGAN_AKUN.filter(
  (a) => a.kelompok === 'aset' || a.kelompok === 'kewajiban' || a.kelompok === 'modal',
)

/** Akun yang muncul di Laba Rugi (pendapatan, beban). */
export const AKUN_LABA_RUGI = BAGAN_AKUN.filter(
  (a) => a.kelompok === 'pendapatan' || a.kelompok === 'beban',
)

export const KODE_KAS = '1-100'
export const KODE_MODAL = '3-100'

export const LABEL_KELOMPOK: Record<Kelompok, string> = {
  aset: 'Aset',
  kewajiban: 'Kewajiban',
  modal: 'Modal',
  pendapatan: 'Pendapatan',
  beban: 'Beban',
}

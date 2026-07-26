/**
 * DUA DOMPET — modul murni, tanpa React dan tanpa jaringan.
 *
 * Setiap peserta memulai dengan Rp10.000.000 yang ia bagi sendiri:
 *
 *     Dompet Bisnis   → masuk pembukuan (jurnal pembukaan Kas / Modal Pemilik)
 *     Dompet Pribadi  → DI LUAR pembukuan, tidak pernah muncul di jurnal
 *
 * Uang boleh dipindahkan bolak-balik selama permainan:
 *
 *     top up  : pribadi → bisnis, dijurnal  Kas (D) / Modal Pemilik (K)
 *     prive   : bisnis → pribadi, dijurnal  Prive (D) / Kas (K)
 *
 * Sisi bisnis dicatat di jurnal; sisi pribadi cukup mutasi saldo. Inilah bentuk
 * paling jujur dari pesan utama v1: uang usaha dan uang pribadi memang boleh
 * berpindah, asal setiap perpindahannya tercatat di sisi usahanya.
 */
import { MODAL_AWAL } from './config'
import type { Mutasi, Peserta } from './types'

/** Jumlah terkecil yang boleh dialokasikan ke Dompet Bisnis saat mendaftar. */
export const ALOKASI_BISNIS_MIN = 1_000_000

/** Membatasi alokasi awal ke rentang yang masuk akal, dibulatkan ke rupiah penuh. */
export function batasiAlokasi(nilai: number): number {
  if (!Number.isFinite(nilai)) return MODAL_AWAL
  return Math.min(MODAL_AWAL, Math.max(ALOKASI_BISNIS_MIN, Math.round(nilai)))
}

/**
 * Saldo Dompet Pribadi.
 *
 * Sengaja dihitung ulang dari daftar mutasi, bukan disimpan sebagai kolom —
 * alasan yang sama dengan saldo kas bisnis: satu sumber kebenaran, mustahil
 * melenceng.
 */
export function saldoPribadi(alokasiBisnis: number, mutasi: Mutasi[]): number {
  const awal = MODAL_AWAL - alokasiBisnis
  return mutasi.reduce((saldo, m) => {
    const menambah = m.arah === 'prive' || m.arah === 'pribadi_masuk'
    return saldo + (menambah ? m.jumlah : -m.jumlah)
  }, awal)
}

/** Mutasi milik satu peserta saja, dari daftar seluruh peserta. */
export function mutasiPeserta(pesertaId: string, mutasi: Mutasi[]): Mutasi[] {
  return mutasi.filter((m) => m.peserta_id === pesertaId)
}

export function saldoPribadiPeserta(peserta: Peserta, mutasi: Mutasi[]): number {
  return saldoPribadi(peserta.alokasi_bisnis, mutasiPeserta(peserta.id, mutasi))
}

/**
 * Jurnal yang benar untuk tiap arah perpindahan.
 *
 * Top up adalah setoran modal tambahan — bukan pendapatan, karena usahanya
 * tidak menghasilkan apa pun dari uang itu. Prive adalah pengambilan hak
 * pemilik — bukan beban, karena usahanya tidak mendapat manfaat apa pun.
 */
export const JURNAL_MUTASI = {
  topup: { debit: '1-100', kredit: '3-100' },
  prive: { debit: '3-200', kredit: '1-100' },
} as const

/**
 * Pilihan akun yang ditawarkan saat menjurnal perpindahan dompet.
 * Keempatnya sengaja memuat jebakan yang lazim: mencatat top up sebagai
 * pendapatan, dan mencatat prive sebagai beban.
 */
export const OPSI_MUTASI = {
  topup: {
    debit: ['1-100', '1-110', '3-100', '3-200'],
    kredit: ['3-100', '1-100', '4-100', '2-100'],
  },
  prive: {
    debit: ['3-200', '5-600', '1-100', '3-100'],
    kredit: ['1-100', '3-200', '1-110', '2-100'],
  },
} as const

export const LABEL_MUTASI = {
  topup: 'Top up ke Dompet Bisnis',
  prive: 'Prive ke Dompet Pribadi',
  pribadi_keluar: 'Belanja pribadi',
  pribadi_masuk: 'Pemasukan pribadi',
} as const

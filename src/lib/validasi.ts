import { akun } from './akun'
import type { Soal } from './types'

/**
 * Validasi bank soal. Editor menolak menyimpan bila fungsi ini mengembalikan
 * pesan, dan simpanSoal() di api.ts memeriksanya sekali lagi sebelum menulis ke
 * database.
 *
 * Aturan 1 dan 2 terdengar sepele, tapi contoh soal awal justru melanggarnya:
 * kasus "pembelian tidak tunai" (jawaban Persediaan / Hutang Usaha) diberi opsi
 * Debit berisi Kas, Piutang, Hutang, Pendapatan — tanpa Persediaan. Soal
 * seperti itu MUSTAHIL dijawab benar, dan hanya ketahuan di tengah sesi kalau
 * tidak dicegat di sini.
 *
 * Sengaja dipisah dari api.ts agar bisa diuji tanpa menyentuh Supabase.
 */
export function validasiSoal(soal: Soal): string | null {
  if (!soal.teks.trim()) return 'Teks kasus belum diisi.'
  if (!Number.isFinite(soal.nominal) || soal.nominal <= 0) return 'Nominal harus lebih dari 0.'

  if (soal.opsi_debit.length !== 4) return 'Opsi Debit harus tepat 4 akun.'
  if (soal.opsi_kredit.length !== 4) return 'Opsi Kredit harus tepat 4 akun.'

  if (new Set(soal.opsi_debit).size !== 4) return 'Opsi Debit tidak boleh ada yang kembar.'
  if (new Set(soal.opsi_kredit).size !== 4) return 'Opsi Kredit tidak boleh ada yang kembar.'

  for (const kode of [...soal.opsi_debit, ...soal.opsi_kredit]) {
    if (!akun(kode)) return `Kode akun "${kode}" tidak ada di bagan akun.`
  }

  if (!soal.opsi_debit.includes(soal.debit_benar))
    return 'Opsi Debit wajib memuat akun debit yang benar — tanpa itu soal mustahil dijawab benar.'
  if (!soal.opsi_kredit.includes(soal.kredit_benar))
    return 'Opsi Kredit wajib memuat akun kredit yang benar — tanpa itu soal mustahil dijawab benar.'
  if (soal.debit_benar === soal.kredit_benar)
    return 'Akun debit dan kredit yang benar tidak boleh sama.'

  return null
}

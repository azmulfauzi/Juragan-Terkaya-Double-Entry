/** Format angka menjadi Rupiah, contoh: 10000000 -> "Rp10.000.000" */
export function rupiah(nilai: number): string {
  const negatif = nilai < 0
  const angka = Math.abs(Math.round(nilai)).toLocaleString('id-ID')
  return `${negatif ? '-' : ''}Rp${angka}`
}

/**
 * Format angka untuk tabel laporan — tanpa prefiks "Rp" demi kerapian kolom.
 * Nilai negatif ditulis dalam kurung, sesuai kebiasaan laporan keuangan.
 * Nol ditulis "—" agar mata langsung tertuju ke baris yang berisi.
 */
export function angka(nilai: number, nolSebagaiStrip = true): string {
  const bulat = Math.round(nilai)
  if (bulat === 0) return nolSebagaiStrip ? '—' : '0'
  const teks = Math.abs(bulat).toLocaleString('id-ID')
  return bulat < 0 ? `(${teks})` : teks
}

/** "3,4 dtk" — rata-rata waktu menjawab di papan skor. */
export function detik(ms: number | null): string {
  if (ms === null) return '—'
  return `${(ms / 1000).toFixed(1).replace('.', ',')} dtk`
}

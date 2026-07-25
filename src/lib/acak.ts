/**
 * Pengacakan yang stabil.
 *
 * Urutan opsi akun diacak per peserta agar tidak bisa saling contek posisi
 * ("aku pilih yang kedua"). Tapi acaknya harus TETAP selama satu putaran —
 * kalau berubah setiap render, jari peserta akan menekan opsi yang bergeser
 * tepat saat disentuh. Karena itu urutannya diturunkan dari benih (id peserta +
 * id soal), bukan dari Math.random().
 */

function benihDariTeks(teks: string): number {
  let h = 2166136261
  for (let i = 0; i < teks.length; i++) {
    h ^= teks.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Generator acak sederhana (mulberry32) — cukup untuk mengacak 4 opsi. */
function acakBerbenih(benih: number): () => number {
  let a = benih
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function urutanAcak<T>(daftar: T[], kunci: string): T[] {
  const rng = acakBerbenih(benihDariTeks(kunci))
  const hasil = [...daftar]
  for (let i = hasil.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[hasil[i], hasil[j]] = [hasil[j], hasil[i]]
  }
  return hasil
}

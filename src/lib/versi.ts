import { useEffect, useState } from 'react'

/**
 * Deteksi versi aplikasi yang kedaluwarsa.
 *
 * Halaman yang sudah lama terbuka tetap menjalankan kode lamanya walau sudah
 * ada deploy baru. Di v1 akibatnya serius: klien lama membuka kunci jawaban
 * lebih cepat dan menulis saldo dengan aturan yang sudah diganti. Di v2
 * taruhannya sama besar — klien lama bisa memposting jurnal dengan aturan
 * penilaian yang berbeda.
 *
 * Caranya: ambil ulang index.html, lalu bandingkan nama berkas bundel di
 * dalamnya dengan bundel yang sedang dijalankan. Nama berkas mengandung hash
 * isi, jadi berubah setiap kali ada deploy baru.
 *
 * Dan tetap berlaku: JANGAN deploy saat sesi sedang berjalan.
 */
function bundelSaatIni(): string | null {
  const skrip = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]')
  return skrip?.getAttribute('src') ?? null
}

async function adaVersiBaru(): Promise<boolean> {
  const sekarang = bundelSaatIni()
  // Mode pengembangan memakai /src/main.tsx, bukan bundel ber-hash — lewati.
  if (!sekarang) return false

  try {
    const res = await fetch(`/?_cek=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return false
    const html = await res.text()
    const cocok = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)
    if (!cocok) return false
    return !sekarang.includes(cocok[0])
  } catch {
    // Jaringan bermasalah — jangan ganggu peserta dengan peringatan palsu.
    return false
  }
}

/** true bila ada versi baru yang sudah ter-deploy tapi halaman ini belum dimuat ulang. */
export function useVersiKedaluwarsa(jedaMs = 60_000): boolean {
  const [kedaluwarsa, setKedaluwarsa] = useState(false)

  useEffect(() => {
    if (kedaluwarsa) return

    let aktif = true
    const cek = async () => {
      if (await adaVersiBaru()) {
        if (aktif) setKedaluwarsa(true)
      }
    }

    cek()
    const timer = setInterval(cek, jedaMs)
    return () => {
      aktif = false
      clearInterval(timer)
    }
  }, [kedaluwarsa, jedaMs])

  return kedaluwarsa
}

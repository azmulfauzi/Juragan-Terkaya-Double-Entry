/**
 * PENENTUAN PEMENANG — akurasi adalah gerbang, saldo adalah pemeringkat.
 *
 * Kenapa bukan saldo saja: karena jurnal yang salah tetap diposting, peserta
 * bisa tidak sengaja diuntungkan. Pembelian tunai Rp1.000.000 yang seharusnya
 * `Persediaan (D) / Kas (K)`, kalau salah dikreditkan ke `Hutang Usaha`, membuat
 * kasnya TIDAK berkurang — saldonya jadi lebih besar daripada peserta yang
 * menjawab benar. Kalau peringkat murni memakai saldo, peserta paling ceroboh
 * justru berpeluang menang. Gerbang akurasi 100% menutup celah ini sepenuhnya.
 */
import { saldoPribadi } from './dompet'
import { susunPembukuan, susunPembukuanSemua } from './laporan'
import type { Pembukuan } from './laporan'
import type { Jurnal, Mutasi, Peserta } from './types'

export interface StatPeserta {
  peserta: Peserta
  pembukuan: Pembukuan
  saldoKas: number
  /** Uang di luar pembukuan. Aman dari kerugian usaha, tapi juga tidak tumbuh. */
  dompetPribadi: number
  /** Saldo Kas bisnis + Dompet Pribadi — inilah pemeringkat sesungguhnya. */
  totalKekayaan: number
  totalAset: number
  labaBersih: number
  /** Jumlah putaran saat peserta berstatus wajib (giliran sesungguhnya). */
  jumlahWajib: number
  jumlahBenar: number
  /** 0–100. Bernilai null bila peserta belum pernah kebagian giliran. */
  persen: number | null
  /** Rata-rata waktu menjawab (ms) pada giliran wajib; null bila tidak ada. */
  rataWaktuMs: number | null
  /** true bila sudah pernah kebagian giliran DAN seluruh jurnalnya benar. */
  sempurna: boolean
}

export interface HasilPeringkat {
  baris: StatPeserta[]
  /** true bila ada peserta berakurasi 100% — merekalah kandidat pemenang. */
  adaSempurna: boolean
}

function bandingUmum(a: StatPeserta, b: StatPeserta): number {
  // Peserta yang belum pernah kebagian giliran selalu di bawah: akurasinya
  // tidak terdefinisi dan saldonya masih persis modal awal.
  const aKosong = a.jumlahWajib === 0
  const bKosong = b.jumlahWajib === 0
  if (aKosong !== bKosong) return aKosong ? 1 : -1

  // 1. Persentase jurnal benar — menyamakan kedudukan peserta yang jarang
  //    kebagian, karena jumlah giliran tiap orang berbeda akibat undian warna.
  const persenA = a.persen ?? -1
  const persenB = b.persen ?? -1
  if (persenA !== persenB) return persenB - persenA

  // 2. Jumlah jurnal benar — menghargai yang lebih sering diuji.
  if (a.jumlahBenar !== b.jumlahBenar) return b.jumlahBenar - a.jumlahBenar

  // 3. Rata-rata waktu menjawab tercepat.
  const waktuA = a.rataWaktuMs ?? Number.POSITIVE_INFINITY
  const waktuB = b.rataWaktuMs ?? Number.POSITIVE_INFINITY
  if (waktuA !== waktuB) return waktuA - waktuB

  // 4. Total kekayaan tertinggi (kas bisnis + dompet pribadi).
  return b.totalKekayaan - a.totalKekayaan
}

export function hitungPeringkat(
  daftarPeserta: Peserta[],
  jurnal: Jurnal[],
  mutasi: Mutasi[] = [],
  petaSoal?: Map<number, string>,
): HasilPeringkat {
  const pembukuanSemua = susunPembukuanSemua(jurnal, petaSoal)
  // Peserta yang jurnalnya belum ada satu pun (baru mendaftar, atau semuanya
  // belum di-reveal) tetap perlu objek pembukuan supaya tabel tidak pecah.
  const pembukuanKosong = susunPembukuan([], petaSoal)

  const perPeserta = new Map<string, Jurnal[]>()
  for (const j of jurnal) {
    const daftar = perPeserta.get(j.peserta_id)
    if (daftar) daftar.push(j)
    else perPeserta.set(j.peserta_id, [j])
  }

  const mutasiPer = new Map<string, Mutasi[]>()
  for (const m of mutasi) {
    const daftar = mutasiPer.get(m.peserta_id)
    if (daftar) daftar.push(m)
    else mutasiPer.set(m.peserta_id, [m])
  }

  const baris: StatPeserta[] = daftarPeserta.map((peserta) => {
    const pembukuan = pembukuanSemua.get(peserta.id) ?? pembukuanKosong
    const milik = perPeserta.get(peserta.id) ?? []
    const dompetPribadi = saldoPribadi(peserta.alokasi_bisnis, mutasiPer.get(peserta.id) ?? [])

    // Hanya giliran wajib yang dihitung. Jurnal latihan tidak ikut, baik
    // menambah maupun mengurangi (PRD bagian 8).
    const wajib = milik.filter((j) => j.wajib && j.putaran > 0)
    const jumlahWajib = wajib.length
    const jumlahBenar = wajib.filter((j) => j.benar).length

    const waktu = wajib
      .map((j) => j.waktu_jawab_ms)
      .filter((w): w is number => typeof w === 'number')

    return {
      peserta,
      pembukuan,
      saldoKas: pembukuan.saldoKas,
      dompetPribadi,
      totalKekayaan: pembukuan.saldoKas + dompetPribadi,
      totalAset: pembukuan.totalAset,
      labaBersih: pembukuan.labaBersih,
      jumlahWajib,
      jumlahBenar,
      persen: jumlahWajib > 0 ? Math.round((jumlahBenar / jumlahWajib) * 100) : null,
      rataWaktuMs: waktu.length > 0 ? waktu.reduce((t, w) => t + w, 0) / waktu.length : null,
      sempurna: jumlahWajib > 0 && jumlahBenar === jumlahWajib,
    }
  })

  const sempurna = baris.filter((b) => b.sempurna)
  const sisanya = baris.filter((b) => !b.sempurna)

  // Tahap 1: kandidat sempurna diurutkan murni berdasarkan total kekayaan.
  //
  // Dua dompet dijumlahkan supaya keputusan alokasi di awal menjadi taruhan
  // yang sesungguhnya: uang di bisnis bisa tumbuh dari penjualan tapi terancam
  // kebakaran dan salah jurnal, uang di dompet pribadi aman tapi diam saja.
  sempurna.sort(
    (a, b) =>
      b.totalKekayaan - a.totalKekayaan ||
      (a.rataWaktuMs ?? Number.POSITIVE_INFINITY) - (b.rataWaktuMs ?? Number.POSITIVE_INFINITY),
  )
  // Tahap 2: sisanya (dan seluruh peserta bila tidak ada yang sempurna).
  sisanya.sort(bandingUmum)

  return { baris: [...sempurna, ...sisanya], adaSempurna: sempurna.length > 0 }
}

/** "4/5 benar" — dipakai badge peserta dan papan skor. */
export function labelAkurasi(stat: {
  jumlahBenar: number
  jumlahWajib: number
}): string {
  if (stat.jumlahWajib === 0) return 'belum kebagian'
  return `${stat.jumlahBenar}/${stat.jumlahWajib} benar`
}

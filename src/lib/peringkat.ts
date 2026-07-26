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
  /** Rata-rata waktu menjawab (ms) atas seluruh jawaban; null bila belum ada. */
  rataWaktuMs: number | null
  /** true bila seluruh jawabannya tepat sejak percobaan pertama. */
  sempurna: boolean

  // ── Nilai pemahaman: dari SELURUH jawaban, wajib maupun latihan ──
  /** Total poin terkumpul. Inilah pemeringkat utama. */
  nilai: number
  /** Berapa soal yang dijawab sampai final (benar maupun habis percobaan). */
  soalDijawab: number
  /** Jawaban tepat (100 poin). */
  benarSekaliCoba: number
  /** Salah, tapi pembukuannya sudah dibetulkan setelah reveal. Tetap 0 poin. */
  benarSetelahDiperbaiki: number
  /** Salah dan belum dibetulkan, atau tidak menjawab sama sekali. */
  belumBenar: number
  /** Rata-rata poin per soal yang dijawab, 0–100. */
  rataNilai: number | null
}

export interface HasilPeringkat {
  baris: StatPeserta[]
  /** true bila ada peserta berakurasi 100% — merekalah kandidat pemenang. */
  adaSempurna: boolean
}

/**
 * Urutan pemenang: Nilai → Total Kekayaan → Kecepatan.
 *
 * Nilai didahulukan karena ia satu-satunya ukuran yang bersih dari
 * keberuntungan: setiap peserta boleh menjawab di setiap putaran, entah
 * warnanya keluar atau tidak, jadi jumlah kesempatannya sama rata. Peserta
 * yang tidak pernah kebagian giliran tetap bisa juara lewat pemahamannya.
 *
 * Total kekayaan menyusul sebagai pembeda kedua — di situlah undian warna,
 * pilihan dompet, dan keputusan asuransi bekerja. Keberuntungan tetap punya
 * tempat, hanya saja tidak bisa mengalahkan ketelitian.
 */
function bandingUmum(a: StatPeserta, b: StatPeserta): number {
  if (a.nilai !== b.nilai) return b.nilai - a.nilai
  if (a.totalKekayaan !== b.totalKekayaan) return b.totalKekayaan - a.totalKekayaan

  const waktuA = a.rataWaktuMs ?? Number.POSITIVE_INFINITY
  const waktuB = b.rataWaktuMs ?? Number.POSITIVE_INFINITY
  return waktuA - waktuB
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

    // Giliran wajib — menentukan apa yang masuk pembukuannya.
    const wajib = milik.filter((j) => j.wajib && j.putaran > 0 && j.jenis === 'soal')
    const jumlahWajib = wajib.length
    const jumlahBenar = wajib.filter((j) => j.benar).length

    // Nilai pemahaman — dari SELURUH jawaban, wajib maupun latihan. Peserta
    // yang warnanya tidak keluar tetap menunjukkan pemahamannya; hanya
    // jurnalnya saja yang tidak diposting.
    const semuaJawaban = milik.filter((j) => j.jenis === 'soal' && j.putaran > 0)
    const nilai = semuaJawaban.reduce((t, j) => t + (j.nilai ?? 0), 0)
    const soalDijawab = semuaJawaban.length

    const waktu = semuaJawaban
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
      nilai,
      soalDijawab,
      benarSekaliCoba: semuaJawaban.filter((j) => j.benar).length,
      benarSetelahDiperbaiki: semuaJawaban.filter((j) => !j.benar && j.diperbaiki).length,
      belumBenar: semuaJawaban.filter((j) => !j.benar && !j.diperbaiki).length,
      rataNilai: soalDijawab > 0 ? Math.round(nilai / soalDijawab) : null,
      sempurna: soalDijawab > 0 && nilai === soalDijawab * 100,
    }
  })

  // Satu urutan untuk semua — tidak ada lagi pengelompokan bertahap. Nilai
  // sudah membedakan yang teliti dari yang tidak, jauh lebih halus daripada
  // gerbang benar-salah biner yang dipakai sebelumnya.
  const urut = [...baris].sort(bandingUmum)

  return { baris: urut, adaSempurna: urut.some((b) => b.sempurna) }
}

/**
 * Urutan untuk tab Pemahaman: murni soal seberapa paham peserta, tanpa
 * menyinggung kekayaan sama sekali. Inilah bahan evaluasi materi setelah sesi.
 */
export function urutkanPemahaman(baris: StatPeserta[]): StatPeserta[] {
  return [...baris].sort(
    (a, b) =>
      b.benarSekaliCoba - a.benarSekaliCoba ||
      b.nilai - a.nilai ||
      (a.rataWaktuMs ?? Number.POSITIVE_INFINITY) - (b.rataWaktuMs ?? Number.POSITIVE_INFINITY),
  )
}

/** "4/5 benar" — dipakai badge peserta dan papan skor. */
export function labelAkurasi(stat: {
  jumlahBenar: number
  jumlahWajib: number
}): string {
  if (stat.jumlahWajib === 0) return 'belum kebagian'
  return `${stat.jumlahBenar}/${stat.jumlahWajib} benar`
}

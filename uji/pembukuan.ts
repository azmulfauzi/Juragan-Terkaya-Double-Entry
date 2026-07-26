/**
 * Uji mesin pembukuan & aturan peringkat.
 *
 * Dijalankan dengan `npm run uji`. Modul laporan.ts dan peringkat.ts sengaja
 * murni (tanpa React, tanpa jaringan) supaya bisa diuji seperti ini — angka di
 * HP peserta dan di layar fasilitator berasal dari fungsi yang sama persis.
 */
import { saldoPribadi } from '../src/lib/dompet'
import { susunPembukuan } from '../src/lib/laporan'
import { hitungPeringkat } from '../src/lib/peringkat'
import type { Jurnal, Mutasi, Peserta } from '../src/lib/types'

export let gagal = 0
function cek(nama: string, aktual: unknown, harapan: unknown) {
  const ok = JSON.stringify(aktual) === JSON.stringify(harapan)
  if (!ok) gagal++
  console.log(`${ok ? 'OK  ' : 'GAGAL'} ${nama} → ${JSON.stringify(aktual)} (harap ${JSON.stringify(harapan)})`)
}

let idJurnal = 0
function j(
  pesertaId: string,
  putaran: number,
  d: string,
  k: string,
  nominal: number,
  extra: Partial<Jurnal> = {},
): Jurnal {
  return {
    id: ++idJurnal,
    peserta_id: pesertaId,
    putaran,
    soal_id: putaran === 0 ? null : putaran,
    akun_debit: d,
    akun_kredit: k,
    nominal,
    benar: false,
    wajib: putaran > 0,
    waktu_jawab_ms: 5000,
    diterapkan: true,
    tanpa_jurnal: false,
    jenis: 'soal',
    percobaan: 1,
    nilai: 100,
    sifat_dipilih: 'bisnis',
    selesai: true,
    diperbaiki: false,
    created_at: '',
    ...extra,
  }
}

const pembukaan = (p: string, nilai = 10_000_000) =>
  j(p, 0, '1-100', '3-100', nilai, { wajib: false, benar: true, jenis: 'pembukaan' })

// 1. Hanya jurnal pembukaan
{
  const b = susunPembukuan([pembukaan('a')])
  cek('modal awal: saldo kas', b.saldoKas, 10_000_000)
  cek('modal awal: TB seimbang', b.neracaSaldo.seimbang, true)
  cek('modal awal: neraca seimbang', b.neraca.seimbang, true)
  cek('modal awal: total modal', b.neraca.totalModal, 10_000_000)
  cek('modal awal: total aset', b.totalAset, 10_000_000)
}

// 2. Jurnal SALAH tetap balance (contoh dari PRD bagian 8)
//    Pembelian tunai 1jt yang seharusnya Persediaan/Kas, salah jadi Persediaan/Hutang Usaha.
{
  const b = susunPembukuan([pembukaan('b'), j('b', 1, '1-300', '2-100', 1_000_000)])
  cek('jurnal salah: kas TIDAK berkurang', b.saldoKas, 10_000_000)
  cek('jurnal salah: total aset', b.totalAset, 11_000_000)
  cek('jurnal salah: total kewajiban', b.neraca.totalKewajiban, 1_000_000)
  cek('jurnal salah: tetap seimbang', b.neraca.seimbang, true)
  cek('jurnal salah: TB tetap seimbang', b.neracaSaldo.seimbang, true)
}

// 3. Prive MENGURANGI modal (bukan menambah)
{
  const b = susunPembukuan([pembukaan('c'), j('c', 1, '3-200', '1-100', 500_000)])
  cek('prive: saldo kas', b.saldoKas, 9_500_000)
  cek('prive: nilai prive', b.neraca.prive, 500_000)
  cek('prive: total modal berkurang', b.neraca.totalModal, 9_500_000)
  cek('prive: neraca seimbang', b.neraca.seimbang, true)
}

// 4. Pendapatan & beban masuk ke L/R dan mengalir ke laba berjalan di Neraca
{
  const b = susunPembukuan([
    pembukaan('d'),
    j('d', 1, '1-100', '4-100', 2_500_000),
    j('d', 2, '5-300', '1-100', 2_000_000),
    j('d', 3, '5-100', '1-300', 800_000),
  ])
  cek('L/R: total pendapatan', b.labaRugi.totalPendapatan, 2_500_000)
  cek('L/R: total beban', b.labaRugi.totalBeban, 2_800_000)
  cek('L/R: rugi bersih', b.labaBersih, -300_000)
  cek('L/R: laba berjalan di neraca', b.neraca.labaBerjalan, -300_000)
  cek('L/R: neraca seimbang', b.neraca.seimbang, true)
  cek('L/R: persediaan minus (sinyal edukatif)', b.saldo('1-300'), -800_000)
}

// 5. Saldo kas negatif tidak dicegah, dan neraca tetap seimbang
{
  const b = susunPembukuan([pembukaan('e'), j('e', 1, '5-200', '1-100', 12_000_000)])
  cek('kas minus: saldo kas', b.saldoKas, -2_000_000)
  cek('kas minus: neraca tetap seimbang', b.neraca.seimbang, true)
}

// 6. Jurnal belum di-reveal TIDAK boleh masuk buku besar
{
  const b = susunPembukuan([
    pembukaan('f'),
    j('f', 1, '1-100', '4-100', 5_000_000, { diterapkan: false }),
  ])
  cek('belum reveal: kas tidak berubah', b.saldoKas, 10_000_000)
}

// 7. Gerbang akurasi: yang 100% benar menang walau kasnya lebih kecil
{
  const orang = (id: string, nama: string): Peserta => ({
    id,
    nama,
    alokasi_bisnis: 10_000_000,
    created_at: '',
  })
  const daftar = [orang('p1', 'Ani'), orang('p2', 'Budi'), orang('p3', 'Cici')]
  const jurnal: Jurnal[] = [
    pembukaan('p1'),
    pembukaan('p2'),
    pembukaan('p3'),
    // Ani: 2 giliran, dua-duanya benar, kas berkurang karena jujur mencatat.
    j('p1', 1, '1-300', '1-100', 1_000_000, { benar: true }),
    j('p1', 2, '5-300', '1-100', 500_000, { benar: true }),
    // Budi: 2 giliran, salah sampai habis percobaan — nilainya nol, tapi kas
    // justru utuh karena salah kredit ke Hutang.
    j('p2', 1, '1-300', '2-100', 1_000_000, { benar: false, nilai: 0, percobaan: 3 }),
    j('p2', 2, '1-300', '2-100', 500_000, { benar: false, nilai: 0, percobaan: 3 }),
    // Cici: warnanya tidak pernah keluar, tapi jawabannya benar. Jurnalnya
    // tidak diposting — nilainya tetap dihitung penuh.
    j('p3', 1, '1-100', '4-100', 9_000_000, { wajib: false, benar: true, diterapkan: false }),
  ]

  const hasil = hitungPeringkat(daftar, jurnal, [])
  cek('peringkat: ada peserta sempurna', hasil.adaSempurna, true)
  cek('peringkat: juara', hasil.baris[0].peserta.nama, 'Ani')
  cek('peringkat: nilai Ani', hasil.baris[0].nilai, 200)
  cek('peringkat: kas juara lebih kecil dari Budi', hasil.baris[0].saldoKas < 10_000_000, true)

  // Inti aturan baru: yang tidak pernah kebagian giliran tetap dinilai.
  const cici = hasil.baris.find((b) => b.peserta.nama === 'Cici')!
  cek('peringkat: Cici belum pernah kebagian giliran', cici.jumlahWajib, 0)
  cek('peringkat: nilai latihan Cici tetap dihitung', cici.nilai, 100)
  cek('peringkat: Cici mengungguli Budi yang salah terus', hasil.baris[1].peserta.nama, 'Cici')
  cek(
    'peringkat: Budi di urutan terakhir',
    hasil.baris[hasil.baris.length - 1].peserta.nama,
    'Budi',
  )
}

// 9b. Kekayaan Bersih menangkap kebakaran; saldo kas tidak.
//
//     Inilah alasan pemeringkatnya dipindah dari kas ke ekuitas. Kebakaran
//     memusnahkan Persediaan tanpa menyentuh Kas sama sekali, sehingga dengan
//     ukuran berbasis kas peserta yang menolak asuransi justru terlihat lebih
//     unggul daripada yang membayar premi — kebalikan dari pelajarannya.
{
  const orang = (id: string, nama: string): Peserta => ({
    id,
    nama,
    alokasi_bisnis: 10_000_000,
    created_at: '',
  })
  const daftar = [orang('h', 'Hana'), orang('i', 'Iwan')]
  const jurnal: Jurnal[] = [
    pembukaan('h'),
    pembukaan('i'),
    // Keduanya belanja persediaan Rp4.000.000.
    j('h', 1, '1-300', '1-100', 4_000_000, { benar: true }),
    j('i', 1, '1-300', '1-100', 4_000_000, { benar: true }),
    // Hana membeli polis kebakaran Rp1.200.000 — kini dicatat sebagai BEBAN.
    j('h', 2, '5-700', '1-100', 1_200_000, { benar: true, wajib: false }),
    // Kebakaran melahap persediaan Rp3.500.000. Hana terlindungi, jadi tidak
    // ada jurnal sama sekali. Iwan menanggung sendiri.
    j('i', 3, '5-600', '1-300', 3_500_000, { benar: true }),
  ]

  const hasil = hitungPeringkat(daftar, jurnal, [])
  const hana = hasil.baris.find((b) => b.peserta.nama === 'Hana')!
  const iwan = hasil.baris.find((b) => b.peserta.nama === 'Iwan')!

  cek('asuransi: kas Hana justru lebih kecil', hana.saldoKas, 4_800_000)
  cek('asuransi: kas Iwan utuh walau terbakar', iwan.saldoKas, 6_000_000)
  cek('asuransi: ukuran lama (kas) memenangkan Iwan', iwan.saldoKas > hana.saldoKas, true)

  cek('asuransi: kekayaan bersih Hana', hana.totalKekayaan, 8_800_000)
  cek('asuransi: kekayaan bersih Iwan', iwan.totalKekayaan, 6_500_000)
  cek('asuransi: ukuran baru memenangkan yang berasuransi', hasil.baris[0].peserta.nama, 'Hana')
  cek('asuransi: premi benar-benar jadi beban', hana.labaBersih, -1_200_000)
  cek('asuransi: kerugian kebakaran masuk laba Iwan', iwan.labaBersih, -3_500_000)
}

// 10. Nilai 100 / 0 — satu kesempatan menjawab
{
  const orang = (id: string, nama: string): Peserta => ({
    id,
    nama,
    alokasi_bisnis: 10_000_000,
    created_at: '',
  })
  const daftar = [orang('x', 'Fani'), orang('y', 'Gilang')]
  const jurnal: Jurnal[] = [
    pembukaan('x'),
    pembukaan('y'),
    // Fani: dua-duanya benar → 200
    j('x', 1, '1-100', '4-100', 1_000_000, { benar: true, nilai: 100 }),
    j('x', 2, '1-100', '4-100', 1_000_000, { benar: true, nilai: 100 }),
    // Gilang: satu benar, satu salah lalu dibetulkan setelah reveal.
    // Jurnalnya jadi benar dan tetap diposting, tapi nilainya tetap 0.
    j('y', 1, '1-100', '4-100', 1_000_000, { benar: true, nilai: 100 }),
    j('y', 2, '1-100', '4-100', 1_000_000, {
      benar: false,
      nilai: 0,
      diperbaiki: true,
      diterapkan: true,
    }),
  ]

  const hasil = hitungPeringkat(daftar, jurnal, [])
  const fani = hasil.baris.find((b) => b.peserta.nama === 'Fani')!
  const gilang = hasil.baris.find((b) => b.peserta.nama === 'Gilang')!

  cek('nilai: Fani 100 + 100', fani.nilai, 200)
  cek('nilai: Gilang 100 + 0 walau sudah dibetulkan', gilang.nilai, 100)
  cek('nilai: rata-rata Gilang', gilang.rataNilai, 50)
  cek('nilai: benar sekali coba Gilang', gilang.benarSekaliCoba, 1)
  cek('nilai: Fani sempurna', fani.sempurna, true)
  cek('nilai: Gilang tidak sempurna', gilang.sempurna, false)
  // Pembetulan tetap memperbaiki pembukuan walau nilainya nol.
  cek('nilai: kas Gilang ikut terkoreksi', gilang.saldoKas, 12_000_000)
  cek('nilai: kekayaan keduanya sama', fani.totalKekayaan === gilang.totalKekayaan, true)
  cek('nilai: juara ditentukan nilai lebih dulu', hasil.baris[0].peserta.nama, 'Fani')
}

// 8. Dua dompet: uang pribadi berada di luar pembukuan
{
  let idMutasi = 0
  const m = (pesertaId: string, arah: 'topup' | 'prive', jumlah: number): Mutasi => ({
    id: ++idMutasi,
    peserta_id: pesertaId,
    arah,
    jumlah,
    putaran: 1,
    keterangan: null,
    soal_id: null,
    created_at: '',
  })

  // Alokasi 6jt ke bisnis → dompet pribadi berisi 4jt.
  cek('dompet: isi awal pribadi', saldoPribadi(6_000_000, []), 4_000_000)
  cek('dompet: top up mengurangi pribadi', saldoPribadi(6_000_000, [m('a', 'topup', 1_500_000)]), 2_500_000)
  cek('dompet: prive menambah pribadi', saldoPribadi(6_000_000, [m('a', 'prive', 2_000_000)]), 6_000_000)
  cek(
    'dompet: campuran topup dan prive',
    saldoPribadi(6_000_000, [m('a', 'topup', 1_000_000), m('a', 'prive', 500_000)]),
    3_500_000,
  )

  // Jurnal mutasi tetap masuk buku besar seperti jurnal lain.
  const bukuTopUp = susunPembukuan([
    pembukaan('a', 6_000_000),
    j('a', 1, '1-100', '3-100', 1_500_000, { jenis: 'mutasi', wajib: false, benar: true }),
  ])
  cek('dompet: top up menambah kas bisnis', bukuTopUp.saldoKas, 7_500_000)
  cek('dompet: modal ikut bertambah', bukuTopUp.neraca.modalPemilik, 7_500_000)
  cek('dompet: neraca tetap seimbang', bukuTopUp.neraca.seimbang, true)
}

// 9. Peringkat memakai TOTAL kekayaan, bukan kas bisnis saja
{
  const orang = (id: string, nama: string, alokasi: number): Peserta => ({
    id,
    nama,
    alokasi_bisnis: alokasi,
    created_at: '',
  })

  // Dina menaruh 4jt di bisnis dan menyimpan 6jt di dompet pribadi.
  // Eko menaruh seluruhnya di bisnis, lalu kena beban sewa 3jt.
  const daftar = [orang('d', 'Dina', 4_000_000), orang('e', 'Eko', 10_000_000)]
  const jurnal: Jurnal[] = [
    pembukaan('d', 4_000_000),
    pembukaan('e', 10_000_000),
    j('d', 1, '1-100', '4-100', 1_000_000, { benar: true }),
    j('e', 1, '5-300', '1-100', 3_000_000, { benar: true }),
  ]

  const hasil = hitungPeringkat(daftar, jurnal, [])
  const dina = hasil.baris.find((b) => b.peserta.nama === 'Dina')!
  const eko = hasil.baris.find((b) => b.peserta.nama === 'Eko')!

  cek('dua dompet: kas bisnis Dina', dina.saldoKas, 5_000_000)
  cek('dua dompet: dompet pribadi Dina', dina.dompetPribadi, 6_000_000)
  cek('dua dompet: total kekayaan Dina', dina.totalKekayaan, 11_000_000)
  cek('dua dompet: kas bisnis Eko lebih besar', eko.saldoKas > dina.saldoKas, true)
  cek('dua dompet: total kekayaan Eko', eko.totalKekayaan, 7_000_000)
  cek('dua dompet: juara ditentukan total, bukan kas', hasil.baris[0].peserta.nama, 'Dina')
  cek('dua dompet: pribadi tidak masuk total aset', dina.totalAset, 5_000_000)
}

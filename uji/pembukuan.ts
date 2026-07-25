/**
 * Uji mesin pembukuan & aturan peringkat.
 *
 * Dijalankan dengan `npm run uji`. Modul laporan.ts dan peringkat.ts sengaja
 * murni (tanpa React, tanpa jaringan) supaya bisa diuji seperti ini — angka di
 * HP peserta dan di layar fasilitator berasal dari fungsi yang sama persis.
 */
import { susunPembukuan } from '../src/lib/laporan'
import { hitungPeringkat } from '../src/lib/peringkat'
import type { Jurnal, Peserta } from '../src/lib/types'

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
    created_at: '',
    ...extra,
  }
}

const pembukaan = (p: string) => j(p, 0, '1-100', '3-100', 10_000_000, { wajib: false, benar: true })

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
  const orang = (id: string, nama: string): Peserta => ({ id, nama, created_at: '' })
  const daftar = [orang('p1', 'Ani'), orang('p2', 'Budi'), orang('p3', 'Cici')]
  const jurnal: Jurnal[] = [
    pembukaan('p1'),
    pembukaan('p2'),
    pembukaan('p3'),
    // Ani: 2 giliran, dua-duanya benar, kas berkurang karena jujur mencatat.
    j('p1', 1, '1-300', '1-100', 1_000_000, { benar: true }),
    j('p1', 2, '5-300', '1-100', 500_000, { benar: true }),
    // Budi: 2 giliran, salah semua, kas justru utuh (salah kredit ke Hutang).
    j('p2', 1, '1-300', '2-100', 1_000_000, { benar: false }),
    j('p2', 2, '1-300', '2-100', 500_000, { benar: false }),
    // Cici: jurnal latihan saja — tidak dihitung, tidak diposting.
    j('p3', 1, '1-100', '4-100', 9_000_000, { wajib: false, benar: true, diterapkan: false }),
  ]

  const hasil = hitungPeringkat(daftar, jurnal)
  cek('peringkat: ada kandidat sempurna', hasil.adaSempurna, true)
  cek('peringkat: juara', hasil.baris[0].peserta.nama, 'Ani')
  cek('peringkat: kas juara lebih kecil dari Budi', hasil.baris[0].saldoKas < 10_000_000, true)
  cek('peringkat: akurasi Ani', hasil.baris[0].persen, 100)
  cek(
    'peringkat: Cici (latihan saja) belum kebagian',
    hasil.baris.find((b) => b.peserta.nama === 'Cici')!.persen,
    null,
  )
  cek(
    'peringkat: Cici di urutan terakhir',
    hasil.baris[hasil.baris.length - 1].peserta.nama,
    'Cici',
  )
}

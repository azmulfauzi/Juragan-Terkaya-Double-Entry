/**
 * Uji bank soal bawaan.
 *
 * Soal yang opsinya tidak memuat jawaban benar mustahil dijawab benar, dan di
 * v1 kesalahan semacam itu baru ketahuan saat sesi berjalan. Di sini seluruh
 * bank diperiksa sebelum sempat dipakai.
 */
import { SOAL_DEFAULT } from '../src/data/soal'
import { pilihSoalAcak } from '../src/lib/undian'
import { validasiSoal } from '../src/lib/validasi'
import type { KategoriSoal, Polis, Soal } from '../src/lib/types'

export let gagal = 0

/** Benih boleh menghilangkan jenis/polis; di sini dilengkapi seperti saat disimpan. */
const SOAL: Soal[] = SOAL_DEFAULT.map((s) => ({ jenis: 'biasa', polis: null, ...s }))

// 1. Setiap soal wajib lolos validasi editor.
for (const s of SOAL) {
  const pesan = validasiSoal(s)
  if (pesan) {
    gagal++
    console.log(`GAGAL soal #${s.id}: ${pesan}`)
  }
}
console.log(`Validasi: ${SOAL.length - gagal}/${SOAL.length} soal lolos`)

// 2. ID unik.
const id = new Set(SOAL.map((s) => s.id))
if (id.size !== SOAL.length) {
  gagal++
  console.log('GAGAL: ada id soal yang kembar')
}

// 3. Nominal harus disebut di teks kasus (peserta membaca angkanya dari sana).
for (const s of SOAL) {
  if (!s.teks.includes(s.nominal.toLocaleString('id-ID'))) {
    gagal++
    console.log(`GAGAL soal #${s.id}: nominal ${s.nominal} tidak tertulis di teks kasus`)
  }
}

// 4. Insight tidak boleh kosong.
for (const s of SOAL) {
  if (s.insight.trim().length < 40) {
    gagal++
    console.log(`GAGAL soal #${s.id}: insight terlalu pendek`)
  }
}

// 5. Sebaran kategori & porsi Prive.
//    Dihitung dari soal 'biasa' saja — hanya merekalah yang ikut undian acak,
//    jadi hanya komposisi merekalah yang menentukan adil-tidaknya permainan.
const biasa = SOAL.filter((s) => s.jenis === 'biasa')
const hitung: Record<KategoriSoal, number> = {
  kas_masuk: 0,
  kas_keluar: 0,
  non_kas: 0,
  modal: 0,
}
for (const s of biasa) hitung[s.kategori]++
console.log(`Soal biasa (ikut undian acak): ${biasa.length} dari ${SOAL.length}`)
console.log('Sebaran kategori:', hitung)

const prive = biasa.filter((s) => s.debit_benar === '3-200').length
console.log(`Soal Prive: ${prive}`)
if (prive < 5) {
  gagal++
  console.log('GAGAL: porsi soal Prive terlalu sedikit')
}
if (biasa.length < 40) {
  gagal++
  console.log('GAGAL: soal biasa kurang dari 40')
}
for (const k of Object.keys(hitung) as KategoriSoal[]) {
  const rasio = hitung[k] / biasa.length
  if (rasio < 0.15 || rasio > 0.35) {
    gagal++
    console.log(`GAGAL: kategori ${k} timpang (${Math.round(rasio * 100)}%)`)
  }
}

// 5b. Mekanik asuransi: tiap polis butuh pasangan tawaran + musibah.
//     Polis yang tidak pernah ada musibahnya hanya jadi pengeluaran sia-sia.
const POLIS: Polis[] = ['kebakaran', 'kendaraan']
for (const p of POLIS) {
  const tawaran = SOAL.filter((s) => s.jenis === 'keputusan' && s.polis === p).length
  const musibah = SOAL.filter((s) => s.jenis === 'kejadian' && s.polis === p).length
  console.log(`Polis ${p}: ${tawaran} tawaran, ${musibah} musibah`)
  if (tawaran < 1) {
    gagal++
    console.log(`GAGAL: polis ${p} tidak punya soal penawaran`)
  }
  if (musibah < 1) {
    gagal++
    console.log(`GAGAL: polis ${p} tidak punya soal musibah — polisnya jadi sia-sia`)
  }
}

// 5c. Soal asuransi TIDAK boleh ikut undian acak. Kebakaran yang keluar sebelum
//     siapa pun sempat membeli polis hanya jadi kerugian biasa tanpa pelajaran.
for (let i = 0; i < 500; i++) {
  const terpilih = pilihSoalAcak(SOAL, [])
  if (terpilih && terpilih.jenis !== 'biasa') {
    gagal++
    console.log(`GAGAL: soal #${terpilih.id} (${terpilih.jenis}) ikut terundi acak`)
    break
  }
}

// 6. Pola jurnal yang wajib ada (PRD 9.2).
const pola: [string, string, string][] = [
  ['Penjualan tunai', '1-100', '4-100'],
  ['Penjualan kredit', '1-200', '4-100'],
  ['Pelunasan piutang', '1-100', '1-200'],
  ['Pembelian tunai', '1-300', '1-100'],
  ['Pembelian kredit', '1-300', '2-100'],
  ['Pelunasan hutang', '2-100', '1-100'],
  ['Beban dibayar tunai', '5-300', '1-100'],
  ['Pembelian aset', '1-500', '1-100'],
  ['Setoran modal', '1-100', '3-100'],
  ['Prive', '3-200', '1-100'],
  ['Pinjaman bank', '1-110', '2-200'],
  ['Setoran ke bank', '1-110', '1-100'],
  ['Harga pokok penjualan', '5-100', '1-300'],
]
for (const [nama, d, k] of pola) {
  const ada = SOAL_DEFAULT.some((s) => s.debit_benar === d && s.kredit_benar === k)
  if (!ada) {
    gagal++
    console.log(`GAGAL: pola "${nama}" (${d}/${k}) belum ada di bank soal`)
  }
}

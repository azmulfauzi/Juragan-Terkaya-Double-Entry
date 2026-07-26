import { detik, rupiah } from '../lib/format'
import type { HasilPeringkat } from '../lib/peringkat'

interface Props {
  hasil: HasilPeringkat
  /** Baris peserta ini disorot — dipakai di halaman peserta. */
  sorotPesertaId?: string
  /** Batasi jumlah baris (misal Top 5 untuk jeda antar putaran). */
  batas?: number
}

const MEDALI = ['🥇', '🥈', '🥉']

/**
 * Papan skor sesuai aturan penilaian berjenjang.
 *
 * Jumlah giliran ditampilkan terbuka supaya peserta yang jarang kebagian tahu
 * posisinya bukan karena penilaian yang tidak adil, melainkan undian warna.
 */
export default function PapanSkor({ hasil, sorotPesertaId, batas }: Props) {
  const baris = batas ? hasil.baris.slice(0, batas) : hasil.baris

  if (baris.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Belum ada peserta.</p>
  }

  return (
    <div>
      {hasil.adaSempurna && (
        <p className="mb-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-[11px] leading-relaxed text-cyan-200">
          💎 Peserta berakurasi 100% adalah kandidat pemenang, diurutkan berdasarkan Total
          Kekayaan (kas bisnis + dompet pribadi). Peserta di luar kelompok itu tidak bisa menang
          berapa pun kekayaannya — jurnal yang salah bisa membuat kas terlihat lebih besar justru
          karena keliru.
        </p>
      )}

      <div className="scroll-x">
        <table className="w-full min-w-[680px] text-xs">
          <thead>
            <tr className="text-slate-400">
              <th className="px-2 py-1.5 text-left font-medium">#</th>
              <th className="px-2 py-1.5 text-left font-medium">Nama</th>
              <th className="px-2 py-1.5 text-right font-medium">Total Kekayaan</th>
              <th className="px-2 py-1.5 text-right font-medium">💼 Bisnis</th>
              <th className="px-2 py-1.5 text-right font-medium">👛 Pribadi</th>
              <th className="px-2 py-1.5 text-right font-medium">Benar</th>
              <th className="px-2 py-1.5 text-right font-medium">Akurasi</th>
              <th className="px-2 py-1.5 text-right font-medium">Giliran</th>
              <th className="px-2 py-1.5 text-right font-medium">Rata Waktu</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b, i) => (
              <tr
                key={b.peserta.id}
                className={`border-t border-slate-800 ${
                  b.peserta.id === sorotPesertaId ? 'bg-amber-500/10' : ''
                }`}
              >
                <td className="px-2 py-2 text-slate-400">{MEDALI[i] ?? i + 1}</td>
                <td className="px-2 py-2 font-medium text-slate-100">
                  {b.peserta.nama}
                  {b.sempurna && <span className="ml-1" title="Akurasi 100%">💎</span>}
                </td>
                <td className="px-2 py-2 text-right font-semibold tabular-nums text-amber-300">
                  {rupiah(b.totalKekayaan)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-300">
                  {rupiah(b.saldoKas)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-400">
                  {rupiah(b.dompetPribadi)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-300">
                  {b.jumlahBenar}/{b.jumlahWajib}
                </td>
                <td
                  className={`px-2 py-2 text-right tabular-nums ${
                    b.persen === null
                      ? 'text-slate-500'
                      : b.persen === 100
                        ? 'text-green-400'
                        : 'text-slate-300'
                  }`}
                >
                  {b.persen === null ? '—' : `${b.persen}%`}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-400">
                  {b.jumlahWajib}×
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-400">
                  {detik(b.rataWaktuMs)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { MODAL_AWAL } from '../lib/config'
import { rupiah } from '../lib/format'

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <div className="mb-2 text-5xl">📒</div>
          <h1 className="text-2xl font-bold text-slate-100">Games Interaktif Akuntansi</h1>
          <p className="text-lg font-semibold text-amber-400">Double Entry</p>
          <p className="mt-2 text-sm text-slate-400">
            Game menyusun jurnal dua sisi — dan melihat langsung bagaimana catatanmu berubah
            menjadi Buku Besar, Neraca, dan Laba Rugi.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-800/50 p-4 text-sm text-slate-300">
          <p className="mb-2 font-semibold text-slate-100">Cara bermain singkat</p>
          <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed">
            <li>Pilih 1 dari 4 warna — sebelum tahu transaksi apa yang keluar.</li>
            <li>Roda diputar. Kalau warnamu keluar, jurnalmu masuk ke pembukuanmu.</li>
            <li>Susun jurnal: pilih akun Debit dan akun Kredit.</li>
            <li>
              Modal awal setiap peserta {rupiah(MODAL_AWAL)} — dicatat sebagai Kas (D) / Modal
              Pemilik (K).
            </li>
          </ol>
        </div>

        <Link
          to="/peserta"
          className="block w-full rounded-xl bg-amber-500 py-4 text-center text-lg font-bold text-slate-900 transition hover:bg-amber-400 active:scale-[.98]"
        >
          👤 Masuk sebagai Peserta
        </Link>

        <Link
          to="/fasilitator"
          className="mt-3 block w-full rounded-xl border border-slate-600 py-3 text-center text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
        >
          🎛️ Halaman Fasilitator
        </Link>
      </div>
    </div>
  )
}

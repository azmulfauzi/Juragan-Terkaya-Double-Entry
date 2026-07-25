import { useMemo, useState } from 'react'
import { labelAkun } from '../lib/akun'
import { angka, rupiah } from '../lib/format'
import { susunPembukuan } from '../lib/laporan'
import type { Jurnal } from '../lib/types'

interface Props {
  jurnal: Jurnal[]
  petaSoal?: Map<number, string>
  /** Ditampilkan di header, misalnya nama peserta di layar fasilitator. */
  judul?: string
}

type Tab = 'jurnal' | 'gl' | 'tb' | 'neraca' | 'lr'

const TAB: { id: Tab; label: string }[] = [
  { id: 'jurnal', label: '📒 Jurnal' },
  { id: 'gl', label: '📗 Buku Besar' },
  { id: 'tb', label: '⚖️ Neraca Saldo' },
  { id: 'neraca', label: '🏛️ Neraca' },
  { id: 'lr', label: '📈 Laba Rugi' },
]

/**
 * Lima laporan peserta dalam satu komponen, dipakai bersama halaman peserta dan
 * halaman fasilitator. Angkanya berasal dari susunPembukuan() — satu-satunya
 * tempat rumus laporan ditulis.
 */
export default function Pembukuan({ jurnal, petaSoal, judul }: Props) {
  const [tab, setTab] = useState<Tab>('gl')
  const buku = useMemo(() => susunPembukuan(jurnal, petaSoal), [jurnal, petaSoal])

  const terposting = useMemo(
    () =>
      jurnal
        .filter((j) => j.diterapkan && j.akun_debit && j.akun_kredit)
        .sort((a, b) => a.putaran - b.putaran || a.id - b.id),
    [jurnal],
  )

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50">
      {judul && (
        <div className="border-b border-slate-700 px-4 py-3">
          <p className="text-sm font-semibold text-slate-200">{judul}</p>
        </div>
      )}

      <div className="scroll-x flex gap-1 border-b border-slate-700 p-2">
        {TAB.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              tab === t.id
                ? 'bg-amber-500 text-slate-900'
                : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-3">
        {terposting.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Belum ada jurnal yang dibukukan.
          </p>
        ) : (
          <>
            {tab === 'jurnal' && <TabJurnal baris={terposting} petaSoal={petaSoal} />}
            {tab === 'gl' && <TabBukuBesar buku={buku} />}
            {tab === 'tb' && <TabNeracaSaldo buku={buku} />}
            {tab === 'neraca' && <TabNeraca buku={buku} />}
            {tab === 'lr' && <TabLabaRugi buku={buku} />}
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────── 📒 JURNAL ───────────────────────────────

function TabJurnal({
  baris,
  petaSoal,
}: {
  baris: Jurnal[]
  petaSoal?: Map<number, string>
}) {
  return (
    <div className="space-y-2">
      {baris.map((j) => (
        <div key={j.id} className="rounded-xl border border-slate-700 bg-slate-900/50 p-3">
          <div className="mb-2 flex items-start justify-between gap-3">
            <p className="text-xs leading-relaxed text-slate-300">
              {j.putaran === 0
                ? 'Setoran modal awal'
                : (j.soal_id != null && petaSoal?.get(j.soal_id)) ||
                  `Transaksi putaran ${j.putaran}`}
            </p>
            <span className="shrink-0 rounded-md bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
              {j.putaran === 0 ? 'Awal' : `Put. ${j.putaran}`}
            </span>
          </div>
          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between gap-3">
              <span className="text-slate-200">{labelAkun(j.akun_debit)}</span>
              <span className="tabular-nums text-slate-100">{angka(j.nominal)}</span>
            </div>
            <div className="flex justify-between gap-3 pl-5">
              <span className="text-slate-400">{labelAkun(j.akun_kredit)}</span>
              <span className="tabular-nums text-slate-400">{angka(j.nominal)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ────────────────────────────── 📗 BUKU BESAR ──────────────────────────────

function TabBukuBesar({ buku }: { buku: ReturnType<typeof susunPembukuan> }) {
  return (
    <div className="space-y-4">
      {buku.bukuBesar.map((akunGl) => (
        <div key={akunGl.akun.kode} className="rounded-xl border border-slate-700">
          <div className="flex items-center justify-between gap-3 border-b border-slate-700 bg-slate-900/60 px-3 py-2">
            <span className="text-sm font-semibold text-slate-100">
              {akunGl.akun.kode} · {akunGl.akun.nama}
            </span>
            <span
              className={`tabular-nums text-sm font-bold ${
                akunGl.saldo < 0 ? 'text-red-400' : 'text-slate-100'
              }`}
            >
              {angka(akunGl.saldo)}
            </span>
          </div>
          <div className="scroll-x">
            <table className="w-full min-w-[420px] text-xs">
              <thead>
                <tr className="text-slate-400">
                  <th className="px-2 py-1.5 text-left font-medium">Put.</th>
                  <th className="px-2 py-1.5 text-left font-medium">Keterangan</th>
                  <th className="px-2 py-1.5 text-right font-medium">Debit</th>
                  <th className="px-2 py-1.5 text-right font-medium">Kredit</th>
                  <th className="px-2 py-1.5 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {akunGl.baris.map((b, i) => (
                  <tr key={i} className="border-t border-slate-800">
                    <td className="px-2 py-1.5 tabular-nums text-slate-400">{b.putaran}</td>
                    <td className="max-w-[240px] truncate px-2 py-1.5 text-slate-300">
                      {b.keterangan}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-200">
                      {angka(b.debit)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-200">
                      {angka(b.kredit)}
                    </td>
                    <td
                      className={`px-2 py-1.5 text-right font-semibold tabular-nums ${
                        b.saldo < 0 ? 'text-red-400' : 'text-slate-100'
                      }`}
                    >
                      {angka(b.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

// ───────────────────────────── ⚖️ NERACA SALDO ─────────────────────────────

function TabNeracaSaldo({ buku }: { buku: ReturnType<typeof susunPembukuan> }) {
  const tb = buku.neracaSaldo
  return (
    <div>
      <IndikatorSeimbang seimbang={tb.seimbang} />
      <div className="scroll-x mt-3">
        <table className="w-full min-w-[380px] text-xs">
          <thead>
            <tr className="text-slate-400">
              <th className="px-2 py-1.5 text-left font-medium">Kode</th>
              <th className="px-2 py-1.5 text-left font-medium">Nama Akun</th>
              <th className="px-2 py-1.5 text-right font-medium">Debit</th>
              <th className="px-2 py-1.5 text-right font-medium">Kredit</th>
            </tr>
          </thead>
          <tbody>
            {tb.baris.map((b) => (
              <tr key={b.kode} className="border-t border-slate-800">
                <td className="px-2 py-1.5 tabular-nums text-slate-400">{b.kode}</td>
                <td className="px-2 py-1.5 text-slate-200">{b.nama}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-slate-100">
                  {angka(b.debit)}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-slate-100">
                  {angka(b.kredit)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-600 font-bold">
              <td colSpan={2} className="px-2 py-2 text-slate-200">
                TOTAL
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-amber-300">
                {angka(tb.totalDebit)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-amber-300">
                {angka(tb.totalKredit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ──────────────────────────────── 🏛️ NERACA ────────────────────────────────

function TabNeraca({ buku }: { buku: ReturnType<typeof susunPembukuan> }) {
  const n = buku.neraca
  return (
    <div>
      <IndikatorSeimbang seimbang={n.seimbang} />

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-700 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Aset</p>
          {n.aset.map((b) => (
            <BarisAngka key={b.kode} label={b.nama} nilai={b.jumlah} />
          ))}
          <div className="mt-2 border-t border-slate-600 pt-2">
            <BarisAngka label="TOTAL ASET" nilai={n.totalAset} tebal />
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            Kewajiban &amp; Modal
          </p>
          {n.kewajiban.map((b) => (
            <BarisAngka key={b.kode} label={b.nama} nilai={b.jumlah} />
          ))}
          <BarisAngka label="Total Kewajiban" nilai={n.totalKewajiban} garisAtas />

          <div className="mt-2">
            <BarisAngka label="Modal Pemilik" nilai={n.modalPemilik} />
            {/* Prive ditampilkan negatif karena ia MENGURANGI modal. */}
            <BarisAngka label="Prive" nilai={-n.prive} />
            <BarisAngka label="Laba (Rugi) Berjalan" nilai={n.labaBerjalan} />
            <BarisAngka label="Total Modal" nilai={n.totalModal} garisAtas />
          </div>

          <div className="mt-2 border-t border-slate-600 pt-2">
            <BarisAngka label="TOTAL KEWAJIBAN + MODAL" nilai={n.totalKewajibanModal} tebal />
          </div>
        </div>
      </div>

      <p className="mt-3 rounded-lg bg-slate-900/60 p-2 text-[11px] leading-relaxed text-slate-400">
        Total Modal = Modal Pemilik − Prive + Laba Berjalan. Prive bersaldo normal Debit walau
        berkelompok Modal, jadi ia mengurangi — bukan menambah.
      </p>
    </div>
  )
}

// ─────────────────────────────── 📈 LABA RUGI ───────────────────────────────

function TabLabaRugi({ buku }: { buku: ReturnType<typeof susunPembukuan> }) {
  const lr = buku.labaRugi
  return (
    <div className="rounded-xl border border-slate-700 p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Pendapatan</p>
      {lr.pendapatan.map((b) => (
        <BarisAngka key={b.kode} label={b.nama} nilai={b.jumlah} />
      ))}
      <BarisAngka label="Total Pendapatan" nilai={lr.totalPendapatan} garisAtas />

      <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">Beban</p>
      {lr.beban.map((b) => (
        <BarisAngka key={b.kode} label={b.nama} nilai={b.jumlah} />
      ))}
      <BarisAngka label="Total Beban" nilai={lr.totalBeban} garisAtas />

      <div className="mt-3 border-t-2 border-slate-600 pt-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-slate-200">LABA (RUGI) BERSIH</span>
          <span
            className={`tabular-nums text-base font-bold ${
              lr.laba < 0 ? 'text-red-400' : 'text-green-400'
            }`}
          >
            {rupiah(lr.laba)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────── PEMBANTU ────────────────────────────────

function BarisAngka({
  label,
  nilai,
  tebal,
  garisAtas,
}: {
  label: string
  nilai: number
  tebal?: boolean
  garisAtas?: boolean
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 py-1 text-xs ${
        garisAtas ? 'mt-1 border-t border-slate-700 pt-1.5' : ''
      }`}
    >
      <span className={tebal || garisAtas ? 'font-semibold text-slate-200' : 'text-slate-300'}>
        {label}
      </span>
      <span
        className={`tabular-nums ${
          tebal ? 'text-sm font-bold text-amber-300' : garisAtas ? 'font-semibold text-slate-100' : 'text-slate-200'
        } ${nilai < 0 ? 'text-red-400' : ''}`}
      >
        {angka(nilai, false)}
      </span>
    </div>
  )
}

function IndikatorSeimbang({ seimbang }: { seimbang: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
        seimbang
          ? 'border-green-500/40 bg-green-500/10 text-green-300'
          : 'border-red-500/40 bg-red-500/10 text-red-300'
      }`}
    >
      {seimbang ? (
        '✅ Seimbang'
      ) : (
        <>
          ⚠️ Tidak seimbang — ini bug pada mesin posting, bukan kesalahan peserta. Laporkan ke
          fasilitator.
        </>
      )}
    </div>
  )
}

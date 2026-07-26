import { useMemo, useState } from 'react'
import { namaAkun } from '../lib/akun'
import { urutanAcak } from '../lib/acak'
import { simpanMutasi } from '../lib/api'
import { JURNAL_MUTASI, LABEL_MUTASI, OPSI_MUTASI, saldoPribadi } from '../lib/dompet'
import { rupiah } from '../lib/format'
import type { Mutasi } from '../lib/types'

type Arah = 'topup' | 'prive'

interface Props {
  pesertaId: string
  alokasiBisnis: number
  mutasi: Mutasi[]
  /** Saldo Kas menurut pembukuan — batas atas untuk prive. */
  saldoKasBisnis: number
  putaran: number
  /**
   * Perpindahan hanya dibuka di sela putaran. Saat peserta sedang menjawab,
   * panel ini terkunci supaya tidak jadi gangguan di tengah hitungan mundur.
   */
  bolehPindah: boolean
  onSelesai: () => void
  onGalat: (pesan: string) => void
}

/**
 * Dua dompet peserta.
 *
 * Dompet Bisnis adalah Saldo Kas di pembukuan. Dompet Pribadi berada di luar
 * buku sepenuhnya — tidak pernah muncul di jurnal, neraca, maupun laba rugi.
 * Setiap perpindahan antar keduanya menyentuh sisi bisnis, jadi harus dijurnal;
 * sisi pribadinya cukup mutasi saldo.
 */
export default function Dompet({
  pesertaId,
  alokasiBisnis,
  mutasi,
  saldoKasBisnis,
  putaran,
  bolehPindah,
  onSelesai,
  onGalat,
}: Props) {
  const [arah, setArah] = useState<Arah | null>(null)
  const [jumlahTeks, setJumlahTeks] = useState('')
  const [debit, setDebit] = useState<string | null>(null)
  const [kredit, setKredit] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [hasil, setHasil] = useState<{ benar: boolean; pesan: string } | null>(null)

  const pribadi = saldoPribadi(alokasiBisnis, mutasi)
  const maksimum = arah === 'topup' ? pribadi : saldoKasBisnis
  const jumlah = Math.round(Number(jumlahTeks.replace(/[^\d]/g, '')) || 0)
  const jumlahSah = jumlah > 0 && jumlah <= Math.max(0, maksimum)

  const opsiDebit = useMemo(
    () => (arah ? urutanAcak([...OPSI_MUTASI[arah].debit], `${pesertaId}-${arah}-D`) : []),
    [arah, pesertaId],
  )
  const opsiKredit = useMemo(
    () => (arah ? urutanAcak([...OPSI_MUTASI[arah].kredit], `${pesertaId}-${arah}-K`) : []),
    [arah, pesertaId],
  )

  function tutup() {
    setArah(null)
    setJumlahTeks('')
    setDebit(null)
    setKredit(null)
  }

  async function kirim() {
    if (!arah || !jumlahSah || !debit || !kredit) return
    setSibuk(true)
    try {
      await simpanMutasi(pesertaId, arah, jumlah, putaran, debit, kredit)
      const kunci = JURNAL_MUTASI[arah]
      const benar = debit === kunci.debit && kredit === kunci.kredit
      setHasil({
        benar,
        pesan: benar
          ? `${rupiah(jumlah)} berpindah dan jurnalmu tepat.`
          : `${rupiah(jumlah)} tetap berpindah, tapi jurnalmu keliru — seharusnya ${namaAkun(kunci.debit)} (D) / ${namaAkun(kunci.kredit)} (K). Uang bergerak menurut kenyataan, laporan bergerak menurut catatanmu.`,
      })
      tutup()
      onSelesai()
    } catch (e) {
      onGalat(e instanceof Error ? e.message : String(e))
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="text-[10px] uppercase tracking-wide text-amber-300/80">💼 Dompet Bisnis</p>
          <p
            className={`tabular-nums text-base font-bold ${
              saldoKasBisnis < 0 ? 'text-red-400' : 'text-amber-300'
            }`}
          >
            {rupiah(saldoKasBisnis)}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">masuk pembukuan</p>
        </div>
        <div className="rounded-xl border border-slate-600 bg-slate-900/60 p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">👛 Dompet Pribadi</p>
          <p className="tabular-nums text-base font-bold text-slate-200">{rupiah(pribadi)}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">di luar pembukuan</p>
        </div>
      </div>

      {hasil && (
        <p
          className={`animasi-muncul mt-2 rounded-lg border px-3 py-2 text-[11px] leading-relaxed ${
            hasil.benar
              ? 'border-green-500/40 bg-green-500/10 text-green-200'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-100'
          }`}
        >
          {hasil.benar ? '✅ ' : '⚠️ '}
          {hasil.pesan}
        </p>
      )}

      {!arah ? (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              disabled={!bolehPindah || pribadi <= 0}
              onClick={() => {
                setHasil(null)
                setArah('topup')
              }}
              className="rounded-lg border border-slate-600 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-30"
            >
              ⬅️ Top up bisnis
            </button>
            <button
              disabled={!bolehPindah || saldoKasBisnis <= 0}
              onClick={() => {
                setHasil(null)
                setArah('prive')
              }}
              className="rounded-lg border border-slate-600 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-30"
            >
              ➡️ Tarik untuk pribadi
            </button>
          </div>
          {!bolehPindah && (
            <p className="mt-1.5 text-center text-[10px] text-slate-500">
              Perpindahan dompet dibuka di sela putaran, bukan saat sedang menjawab.
            </p>
          )}
        </>
      ) : (
        <div className="animasi-muncul mt-3 rounded-xl border border-slate-600 bg-slate-900/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-100">{LABEL_MUTASI[arah]}</p>
            <button onClick={tutup} className="text-[11px] text-slate-400 underline">
              batal
            </button>
          </div>

          <p className="mb-1 text-[10px] text-slate-400">
            Maksimal {rupiah(Math.max(0, maksimum))}
          </p>
          <input
            inputMode="numeric"
            value={jumlahTeks}
            onChange={(e) => setJumlahTeks(e.target.value)}
            placeholder="Jumlah, contoh 1000000"
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-center text-base tabular-nums text-slate-100 outline-none focus:border-amber-400"
          />
          {jumlah > 0 && (
            <p
              className={`mt-1 text-center text-xs font-semibold ${
                jumlahSah ? 'text-amber-300' : 'text-red-400'
              }`}
            >
              {rupiah(jumlah)}
              {!jumlahSah && ' — melebihi isi dompet'}
            </p>
          )}

          {jumlahSah && (
            <>
              <p className="mb-2 mt-3 text-[11px] font-semibold text-slate-300">
                Sisi bisnisnya harus dijurnal. Sisi pribadi tidak perlu dicatat.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <KolomKecil
                  judul="DEBIT"
                  opsi={opsiDebit}
                  terpilih={debit}
                  nonaktif={kredit}
                  onPilih={setDebit}
                />
                <KolomKecil
                  judul="KREDIT"
                  opsi={opsiKredit}
                  terpilih={kredit}
                  nonaktif={debit}
                  onPilih={setKredit}
                />
              </div>

              <button
                onClick={kirim}
                disabled={!debit || !kredit || sibuk}
                className="mt-3 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-amber-400 active:scale-[.98] disabled:opacity-40"
              >
                {sibuk ? 'Memproses…' : 'Pindahkan & Catat Jurnal'}
              </button>
              <p className="mt-1.5 text-center text-[10px] text-slate-500">
                Tidak dihitung dalam akurasi — sama seperti keputusan asuransi.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function KolomKecil({
  judul,
  opsi,
  terpilih,
  nonaktif,
  onPilih,
}: {
  judul: string
  opsi: string[]
  terpilih: string | null
  nonaktif: string | null
  onPilih: (kode: string) => void
}) {
  return (
    <div className="rounded-lg border border-slate-700 p-1.5">
      <p className="mb-1 text-center text-[10px] font-bold tracking-wide text-slate-400">{judul}</p>
      <div className="space-y-1">
        {opsi.map((kode) => {
          const terkunci = kode === nonaktif
          const aktif = kode === terpilih
          return (
            <button
              key={kode}
              disabled={terkunci}
              onClick={() => onPilih(kode)}
              className={`w-full rounded px-2 py-1.5 text-left text-[11px] font-medium transition ${
                aktif
                  ? 'bg-amber-500 text-slate-900'
                  : terkunci
                    ? 'cursor-not-allowed bg-slate-800/50 text-slate-600 line-through'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {namaAkun(kode)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

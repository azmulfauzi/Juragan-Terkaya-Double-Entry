import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import BannerVersi from '../components/BannerVersi'
import Pembukuan from '../components/Pembukuan'
import SpinWheel from '../components/SpinWheel'
import TimerRing from '../components/TimerRing'
import {
  ambilJudulSoal,
  ambilJurnalPeserta,
  ambilKeputusanPeserta,
  ambilPeserta,
  ambilPilihanWarnaSaya,
  ambilSoalLengkap,
  ambilSoalTanpaKunci,
  daftarPeserta,
  polisAktif,
  simpanJurnal,
  simpanKeputusan,
  simpanPilihanWarna,
} from '../lib/api'
import { namaAkun } from '../lib/akun'
import { urutanAcak } from '../lib/acak'
import {
  DAFTAR_WARNA,
  DURASI_JURNAL,
  DURASI_KEPUTUSAN,
  DURASI_PILIH_WARNA,
  MODAL_AWAL,
  WARNA_META,
} from '../lib/config'
import { rupiah } from '../lib/format'
import {
  bacaIdPeserta,
  simpanIdPeserta,
  useGameState,
  useRealtimeTabel,
  useSisaWaktu,
} from '../lib/hooks'
import { susunPembukuan } from '../lib/laporan'
import { lamaJawabMs } from '../lib/waktu'
import { useVersiKedaluwarsa } from '../lib/versi'
import type {
  Jurnal,
  Keputusan,
  Peserta as TipePeserta,
  PilihanWarna,
  Polis,
  Soal,
  SoalTanpaKunci,
  Warna,
} from '../lib/types'

export default function Peserta() {
  const { state, koneksi } = useGameState()
  const kedaluwarsa = useVersiKedaluwarsa()

  const [peserta, setPeserta] = useState<TipePeserta | null>(null)
  const [memuatPeserta, setMemuatPeserta] = useState(true)
  const [jurnalSaya, setJurnalSaya] = useState<Jurnal[]>([])
  const [keputusanSaya, setKeputusanSaya] = useState<Keputusan[]>([])
  const [pilihanSaya, setPilihanSaya] = useState<PilihanWarna | null>(null)
  const [soal, setSoal] = useState<SoalTanpaKunci | null>(null)
  const [soalLengkap, setSoalLengkap] = useState<Soal | null>(null)
  const [petaSoal, setPetaSoal] = useState<Map<number, string>>(new Map())
  const [galat, setGalat] = useState<string | null>(null)

  const putaran = state?.putaran ?? 0

  // ── Memuat data peserta ────────────────────────────────────────────────
  useEffect(() => {
    const id = bacaIdPeserta()
    if (!id) {
      setMemuatPeserta(false)
      return
    }
    ambilPeserta(id)
      .then((p) => {
        if (!p) simpanIdPeserta(null) // data sudah di-reset fasilitator
        setPeserta(p)
      })
      .catch(() => simpanIdPeserta(null))
      .finally(() => setMemuatPeserta(false))
  }, [])

  const muatJurnal = useCallback(async () => {
    if (!peserta) return
    try {
      const [j, k] = await Promise.all([
        ambilJurnalPeserta(peserta.id),
        ambilKeputusanPeserta(peserta.id),
      ])
      setJurnalSaya(j)
      setKeputusanSaya(k)
    } catch (e) {
      setGalat(e instanceof Error ? e.message : String(e))
    }
  }, [peserta])

  useEffect(() => {
    void muatJurnal()
  }, [muatJurnal])
  useRealtimeTabel(['jurnal', 'keputusan'], muatJurnal)

  // Hanya teks soal yang benar-benar ada di pembukuannya sendiri.
  const idSoalSaya = useMemo(
    () =>
      Array.from(
        new Set(
          jurnalSaya
            .filter((j) => j.diterapkan && j.soal_id != null)
            .map((j) => j.soal_id as number),
        ),
      ),
    [jurnalSaya],
  )

  useEffect(() => {
    ambilJudulSoal(idSoalSaya).then(setPetaSoal).catch(() => undefined)
  }, [idSoalSaya.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pilihan warna putaran berjalan ─────────────────────────────────────
  useEffect(() => {
    if (!peserta || !state) return
    ambilPilihanWarnaSaya(peserta.id, state.putaran)
      .then(setPilihanSaya)
      .catch(() => undefined)
  }, [peserta, state?.putaran, state?.fase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Soal aktif (TANPA kunci jawaban sebelum reveal) ────────────────────
  useEffect(() => {
    if (!state?.soal_id) {
      setSoal(null)
      setSoalLengkap(null)
      return
    }
    ambilSoalTanpaKunci(state.soal_id).then(setSoal).catch(() => undefined)
    setSoalLengkap(null)
  }, [state?.soal_id])

  useEffect(() => {
    if (!state?.reveal || !state.soal_id) return
    ambilSoalLengkap(state.soal_id).then(setSoalLengkap).catch(() => undefined)
  }, [state?.reveal, state?.soal_id])

  const jurnalPutaranIni = useMemo(
    () => jurnalSaya.find((j) => j.putaran === putaran && putaran > 0) ?? null,
    [jurnalSaya, putaran],
  )

  const buku = useMemo(() => susunPembukuan(jurnalSaya, petaSoal), [jurnalSaya, petaSoal])

  const polisSaya = useMemo(() => polisAktif(keputusanSaya), [keputusanSaya])

  const keputusanPutaranIni = useMemo(
    () => keputusanSaya.find((k) => k.putaran === putaran) ?? null,
    [keputusanSaya, putaran],
  )

  const statistik = useMemo(() => {
    const wajib = jurnalSaya.filter((j) => j.wajib && j.putaran > 0)
    return { benar: wajib.filter((j) => j.benar).length, total: wajib.length }
  }, [jurnalSaya])

  // ── Layar pendaftaran ──────────────────────────────────────────────────
  if (memuatPeserta) {
    return <Pusat>Memuat…</Pusat>
  }

  if (!peserta) {
    return (
      <FormDaftar
        onDaftar={(p) => {
          simpanIdPeserta(p.id)
          setPeserta(p)
        }}
      />
    )
  }

  const warnaSaya = pilihanSaya?.warna ?? null
  const wajib = Boolean(state?.warna_spin && warnaSaya && state.warna_spin === warnaSaya)

  return (
    <div className="mx-auto max-w-2xl p-3 pb-16">
      {kedaluwarsa && <BannerVersi />}

      {/* Badge status — selalu terlihat */}
      <div className="mb-3 rounded-2xl border border-slate-700 bg-slate-800/60 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-100">{peserta.nama}</p>
            <p className="text-xs text-slate-400">
              {statistik.total > 0
                ? `${statistik.benar}/${statistik.total} jurnal benar`
                : 'belum kebagian giliran'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Saldo Kas</p>
            <p
              className={`tabular-nums text-lg font-bold ${
                buku.saldoKas < 0 ? 'text-red-400' : 'text-amber-300'
              }`}
            >
              {rupiah(buku.saldoKas)}
            </p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <IndikatorKoneksi status={koneksi} />
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">Putaran {putaran || '—'}</span>
          {[...polisSaya].map((p) => (
            <span
              key={p}
              className="rounded-md border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 font-semibold text-sky-300"
              title="Polis aktif sampai permainan selesai"
            >
              {p === 'kendaraan' ? '🚗' : '🔥'} terlindungi
            </span>
          ))}
        </div>
      </div>

      {galat && (
        <p className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {galat}
        </p>
      )}

      {/* Panggung utama */}
      <div className="mb-4">
        {!state || (state.fase === 'menunggu' && !state.berjalan) ? (
          <Kartu>
            <p className="text-center text-sm text-slate-300">
              Menunggu fasilitator memulai permainan…
            </p>
          </Kartu>
        ) : state.fase === 'pilih_warna' ? (
          <FasePilihWarna
            faseMulai={state.fase_mulai}
            warnaSaya={warnaSaya}
            onPilih={async (w, otomatis) => {
              await simpanPilihanWarna(peserta.id, state.putaran, w, otomatis)
              setPilihanSaya(await ambilPilihanWarnaSaya(peserta.id, state.putaran))
            }}
          />
        ) : state.fase === 'keputusan' ? (
          <FaseKeputusan
            key={`k-${state.putaran}-${state.soal_id}`}
            pesertaId={peserta.id}
            putaran={state.putaran}
            faseMulai={state.fase_mulai}
            soal={soal}
            soalLengkap={soalLengkap}
            reveal={state.reveal}
            showInsight={state.show_insight}
            keputusan={keputusanPutaranIni}
            jurnalSaya={jurnalPutaranIni}
            onTerkirim={muatJurnal}
            onGalat={setGalat}
          />
        ) : state.fase === 'menjurnal' ? (
          <FaseMenjurnal
            key={`${state.putaran}-${state.soal_id}`}
            pesertaId={peserta.id}
            putaran={state.putaran}
            faseMulai={state.fase_mulai}
            warnaSpin={state.warna_spin}
            warnaSaya={warnaSaya}
            wajib={wajib}
            soal={soal}
            soalLengkap={soalLengkap}
            reveal={state.reveal}
            showInsight={state.show_insight}
            jurnalSaya={jurnalPutaranIni}
            punyaPolis={Boolean(soal?.polis && polisSaya.has(soal.polis))}
            onTerkirim={muatJurnal}
            onGalat={setGalat}
          />
        ) : state.fase === 'selesai' ? (
          <Kartu>
            <p className="text-center text-sm font-semibold text-amber-300">
              🏁 Permainan selesai. Lihat pembukuanmu di bawah.
            </p>
          </Kartu>
        ) : (
          <Kartu>
            <p className="text-center text-sm text-slate-300">
              Bersiap untuk putaran berikutnya…
            </p>
          </Kartu>
        )}
      </div>

      <Pembukuan jurnal={jurnalSaya} petaSoal={petaSoal} judul="📊 Pembukuanku" />

      <p className="mt-4 text-center text-[11px] text-slate-500">
        <Link to="/" className="underline">
          Beranda
        </Link>
      </p>
    </div>
  )
}

// ───────────────────────────── PENDAFTARAN ─────────────────────────────

function FormDaftar({ onDaftar }: { onDaftar: (p: TipePeserta) => void }) {
  const [nama, setNama] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  async function kirim(e: FormEvent) {
    e.preventDefault()
    if (!nama.trim()) return
    setSibuk(true)
    try {
      onDaftar(await daftarPeserta(nama))
    } catch (err) {
      setGalat(err instanceof Error ? err.message : String(err))
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={kirim} className="w-full max-w-sm">
        <div className="mb-5 text-center">
          <div className="mb-2 text-4xl">📒</div>
          <h1 className="text-xl font-bold text-slate-100">Daftar Peserta</h1>
          <p className="mt-1 text-sm text-slate-400">Cukup nama aslimu, tanpa akun.</p>
        </div>

        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Nama lengkap"
          autoFocus
          maxLength={40}
          className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-center text-lg text-slate-100 outline-none focus:border-amber-400"
        />

        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/50 p-3 text-xs leading-relaxed text-slate-300">
          <p className="mb-1 font-semibold text-slate-100">Modal awalmu {rupiah(MODAL_AWAL)}</p>
          <p>Begitu mendaftar, jurnal pembukaan ini otomatis tercatat di bukumu:</p>
          <div className="mt-2 space-y-0.5 font-mono text-[11px]">
            <div className="flex justify-between">
              <span>Kas (1-100)</span>
              <span className="tabular-nums">10.000.000</span>
            </div>
            <div className="flex justify-between pl-4 text-slate-400">
              <span>Modal Pemilik (3-100)</span>
              <span className="tabular-nums">10.000.000</span>
            </div>
          </div>
        </div>

        {galat && (
          <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {galat}
          </p>
        )}

        <button
          type="submit"
          disabled={sibuk || !nama.trim()}
          className="mt-4 w-full rounded-xl bg-amber-500 py-3 font-bold text-slate-900 transition hover:bg-amber-400 active:scale-[.98] disabled:opacity-40"
        >
          {sibuk ? 'Mendaftarkan…' : 'Mulai Main'}
        </button>
      </form>
    </div>
  )
}

// ──────────────────────────── FASE PILIH WARNA ────────────────────────────

function FasePilihWarna({
  faseMulai,
  warnaSaya,
  onPilih,
}: {
  faseMulai: string | null
  warnaSaya: Warna | null
  onPilih: (w: Warna, otomatis: boolean) => Promise<void>
}) {
  const sisa = useSisaWaktu(faseMulai, DURASI_PILIH_WARNA)
  const sudahOtomatis = useRef(false)

  // Yang tidak sempat memilih dipilihkan sistem, supaya ia tetap punya peluang
  // kebagian giliran seperti peserta lain.
  useEffect(() => {
    if (warnaSaya || sisa > 0 || sudahOtomatis.current) return
    sudahOtomatis.current = true
    const acak = DAFTAR_WARNA[Math.floor(Math.random() * DAFTAR_WARNA.length)]
    void onPilih(acak, true)
  }, [sisa, warnaSaya, onPilih])

  return (
    <Kartu>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-100">Pilih warnamu</p>
          <p className="text-xs text-slate-400">
            Transaksinya belum diundi — ini murni untung-untungan.
          </p>
        </div>
        <TimerRing sisa={sisa} total={DURASI_PILIH_WARNA} ukuran={64} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {DAFTAR_WARNA.map((w) => {
          const meta = WARNA_META[w]
          const terpilih = warnaSaya === w
          return (
            <button
              key={w}
              disabled={Boolean(warnaSaya) || sisa === 0}
              onClick={() => void onPilih(w, false)}
              className={`rounded-xl py-5 text-lg font-bold text-white transition active:scale-[.97] ${meta.bg} ${
                warnaSaya ? (terpilih ? 'ring-4 ring-white' : 'opacity-30') : meta.bgHover
              } disabled:cursor-not-allowed`}
            >
              {meta.emoji} {meta.label}
            </button>
          )
        })}
      </div>

      {warnaSaya && (
        <p className="mt-3 text-center text-xs text-slate-400">
          Pilihanmu terkunci: {WARNA_META[warnaSaya].emoji} {WARNA_META[warnaSaya].label}
        </p>
      )}
    </Kartu>
  )
}

// ──────────────────────── FASE KEPUTUSAN (ASURANSI) ────────────────────────

const LABEL_POLIS: Record<Polis, string> = {
  kebakaran: '🔥 Asuransi Kebakaran',
  kendaraan: '🚗 Asuransi Kendaraan',
}

/**
 * Penawaran asuransi. Seluruh peserta memutuskan, tanpa roda dan tanpa status
 * wajib — ini keputusan untuk usahanya sendiri, bukan transaksi yang menimpanya.
 *
 * Polis baru tercatat bersamaan dengan jurnalnya dikirim. Kalau keduanya
 * dipisah, peserta bisa menekan "beli" lalu sengaja tidak menjurnal, dan
 * mendapat perlindungan tanpa kasnya berkurang sepeser pun.
 */
function FaseKeputusan({
  pesertaId,
  putaran,
  faseMulai,
  soal,
  soalLengkap,
  reveal,
  showInsight,
  keputusan,
  jurnalSaya,
  onTerkirim,
  onGalat,
}: {
  pesertaId: string
  putaran: number
  faseMulai: string | null
  soal: SoalTanpaKunci | null
  soalLengkap: Soal | null
  reveal: boolean
  showInsight: boolean
  keputusan: Keputusan | null
  jurnalSaya: Jurnal | null
  onTerkirim: () => void
  onGalat: (pesan: string) => void
}) {
  const sisa = useSisaWaktu(faseMulai, DURASI_KEPUTUSAN)
  const [mauBeli, setMauBeli] = useState(false)
  const [debit, setDebit] = useState<string | null>(null)
  const [kredit, setKredit] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  const opsiDebit = useMemo(
    () => (soal ? urutanAcak(soal.opsi_debit, `${pesertaId}-${soal.id}-D`) : []),
    [soal, pesertaId],
  )
  const opsiKredit = useMemo(
    () => (soal ? urutanAcak(soal.opsi_kredit, `${pesertaId}-${soal.id}-K`) : []),
    [soal, pesertaId],
  )

  async function tolak() {
    if (!soal?.polis) return
    setSibuk(true)
    try {
      await simpanKeputusan(pesertaId, putaran, soal.id, soal.polis, false)
      onTerkirim()
    } catch (e) {
      onGalat(e instanceof Error ? e.message : String(e))
    } finally {
      setSibuk(false)
    }
  }

  async function beliDanJurnal() {
    if (!soal?.polis || !debit || !kredit) return
    setSibuk(true)
    try {
      await simpanKeputusan(pesertaId, putaran, soal.id, soal.polis, true)
      await simpanJurnal({
        peserta_id: pesertaId,
        putaran,
        soal_id: soal.id,
        akun_debit: debit,
        akun_kredit: kredit,
        nominal: soal.nominal,
        wajib: false, // keputusan asuransi tidak masuk hitungan akurasi
        waktu_jawab_ms: lamaJawabMs(faseMulai),
      })
      onTerkirim()
    } catch (e) {
      onGalat(e instanceof Error ? e.message : String(e))
    } finally {
      setSibuk(false)
    }
  }

  if (!soal) {
    return (
      <Kartu>
        <p className="text-center text-sm text-slate-300">Menyiapkan penawaran…</p>
      </Kartu>
    )
  }

  const sudahPutus = Boolean(keputusan)
  const membeli = keputusan?.ambil === true
  const habis = sisa === 0

  return (
    <div className="space-y-3">
      <Kartu>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-300">
              {soal.polis ? LABEL_POLIS[soal.polis] : 'Tawaran'}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-100">{soal.teks}</p>
            <p className="mt-2 text-lg font-bold text-amber-300">{rupiah(soal.nominal)}</p>
          </div>
          {!reveal && <TimerRing sisa={sisa} total={DURASI_KEPUTUSAN} ukuran={64} />}
        </div>

        <p className="mb-3 rounded-lg bg-slate-900/60 px-3 py-2 text-[11px] leading-relaxed text-slate-400">
          Keputusan ini milikmu sendiri — tidak ditentukan roda dan tidak dihitung dalam akurasi.
          Yang membeli wajib menjurnal preminya. Polis berlaku sampai permainan selesai.
        </p>

        {sudahPutus ? (
          <div className="rounded-xl border border-slate-600 bg-slate-900/60 p-3">
            {membeli ? (
              <>
                <p className="mb-2 text-center text-xs font-semibold text-sky-300">
                  🛡️ Kamu membeli polis ini. Jurnal yang kamu kirim:
                </p>
                {jurnalSaya && (
                  <BarisJurnal
                    debit={jurnalSaya.akun_debit}
                    kredit={jurnalSaya.akun_kredit}
                    nominal={jurnalSaya.nominal}
                  />
                )}
              </>
            ) : (
              <p className="text-center text-xs font-semibold text-slate-300">
                Kamu memilih tidak berasuransi. Kasmu utuh — dan risikonya kamu tanggung sendiri.
              </p>
            )}
          </div>
        ) : habis ? (
          <p className="rounded-xl border border-slate-600 bg-slate-900/60 px-3 py-2 text-center text-xs text-slate-300">
            ⏱️ Waktu habis. Kamu tidak jadi membeli polis, dan tidak ada yang dicatat.
          </p>
        ) : mauBeli ? (
          <>
            <p className="mb-2 text-xs font-semibold text-sky-300">
              Susun jurnal pembayaran preminya:
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <KolomAkun
                judul="DEBIT"
                warna="text-sky-300"
                opsi={opsiDebit}
                terpilih={debit}
                nonaktif={kredit}
                onPilih={setDebit}
              />
              <KolomAkun
                judul="KREDIT"
                warna="text-purple-300"
                opsi={opsiKredit}
                terpilih={kredit}
                nonaktif={debit}
                onPilih={setKredit}
              />
            </div>

            {debit && kredit && (
              <div className="animasi-muncul mt-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
                <p className="mb-2 text-xs font-semibold text-amber-200">Pratinjau jurnal:</p>
                <BarisJurnal debit={debit} kredit={kredit} nominal={soal.nominal} />
              </div>
            )}

            <button
              onClick={beliDanJurnal}
              disabled={!debit || !kredit || sibuk}
              className="mt-3 w-full rounded-xl bg-amber-500 py-3 font-bold text-slate-900 transition hover:bg-amber-400 active:scale-[.98] disabled:opacity-40"
            >
              {sibuk ? 'Mengirim…' : 'Beli Polis & Catat Jurnal'}
            </button>
            <button
              onClick={() => setMauBeli(false)}
              disabled={sibuk}
              className="mt-2 w-full rounded-xl py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Batal, pikir ulang
            </button>
          </>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => setMauBeli(true)}
              disabled={sibuk}
              className="rounded-xl bg-sky-600 py-4 font-bold text-white transition hover:bg-sky-500 active:scale-[.98] disabled:opacity-40"
            >
              🛡️ Beli polis
            </button>
            <button
              onClick={tolak}
              disabled={sibuk}
              className="rounded-xl border border-slate-600 py-4 font-bold text-slate-300 transition hover:bg-slate-700 active:scale-[.98] disabled:opacity-40"
            >
              Tidak, simpan uangnya
            </button>
          </div>
        )}
      </Kartu>

      {reveal && soalLengkap && (
        <Kartu>
          <p className="mb-2 text-sm font-bold text-slate-100">
            Jurnal yang benar bagi yang membeli
          </p>
          <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-3">
            <BarisJurnal
              debit={soalLengkap.debit_benar}
              kredit={soalLengkap.kredit_benar}
              nominal={soalLengkap.nominal}
            />
          </div>

          {membeli && jurnalSaya && (
            <p
              className={`mt-3 rounded-lg border px-3 py-2 text-xs font-semibold ${
                jurnalSaya.benar
                  ? 'border-green-500/40 bg-green-500/10 text-green-300'
                  : 'border-red-500/40 bg-red-500/10 text-red-200'
              }`}
            >
              {jurnalSaya.benar
                ? '✅ Jurnalmu benar dan sudah dibukukan.'
                : `❌ Jurnalmu belum tepat — seharusnya ${namaAkun(soalLengkap.debit_benar)} (D) / ${namaAkun(soalLengkap.kredit_benar)} (K). Jurnalmu tetap dibukukan apa adanya, tapi polismu tetap aktif.`}
            </p>
          )}

          {showInsight && soalLengkap.insight && (
            <div className="animasi-muncul mt-3 rounded-xl border border-sky-500/40 bg-sky-500/10 p-3">
              <p className="mb-1 text-xs font-bold text-sky-300">💡 Insight</p>
              <p className="text-xs leading-relaxed text-slate-200">{soalLengkap.insight}</p>
            </div>
          )}
        </Kartu>
      )}
    </div>
  )
}

// ───────────────────────────── FASE MENJURNAL ─────────────────────────────

function FaseMenjurnal({
  pesertaId,
  putaran,
  faseMulai,
  warnaSpin,
  warnaSaya,
  wajib,
  soal,
  soalLengkap,
  reveal,
  showInsight,
  jurnalSaya,
  punyaPolis,
  onTerkirim,
  onGalat,
}: {
  pesertaId: string
  putaran: number
  faseMulai: string | null
  warnaSpin: Warna | null
  warnaSaya: Warna | null
  wajib: boolean
  soal: SoalTanpaKunci | null
  soalLengkap: Soal | null
  reveal: boolean
  showInsight: boolean
  jurnalSaya: Jurnal | null
  /** Peserta memegang polis yang cocok dengan musibah putaran ini. */
  punyaPolis: boolean
  onTerkirim: () => void
  onGalat: (pesan: string) => void
}) {
  const sisa = useSisaWaktu(faseMulai, DURASI_JURNAL)
  const [debit, setDebit] = useState<string | null>(null)
  const [kredit, setKredit] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const musibah = soal?.jenis === 'kejadian'

  const sudahKirim = Boolean(jurnalSaya)
  const habis = sisa === 0

  // Urutan opsi diacak per peserta agar tidak bisa saling contek posisi, tapi
  // tetap stabil selama putaran ini supaya tombolnya tidak bergeser saat disentuh.
  const opsiDebit = useMemo(
    () => (soal ? urutanAcak(soal.opsi_debit, `${pesertaId}-${soal.id}-D`) : []),
    [soal, pesertaId],
  )
  const opsiKredit = useMemo(
    () => (soal ? urutanAcak(soal.opsi_kredit, `${pesertaId}-${soal.id}-K`) : []),
    [soal, pesertaId],
  )

  async function kirim(tanpaJurnal = false) {
    if (!soal) return
    if (!tanpaJurnal && (!debit || !kredit)) return
    setSibuk(true)
    try {
      await simpanJurnal({
        peserta_id: pesertaId,
        putaran,
        soal_id: soal.id,
        akun_debit: tanpaJurnal ? null : debit,
        akun_kredit: tanpaJurnal ? null : kredit,
        nominal: soal.nominal,
        wajib,
        waktu_jawab_ms: lamaJawabMs(faseMulai),
        tanpa_jurnal: tanpaJurnal,
      })
      onTerkirim()
    } catch (e) {
      onGalat(e instanceof Error ? e.message : String(e))
    } finally {
      setSibuk(false)
    }
  }

  if (!soal) {
    return (
      <Kartu>
        <p className="text-center text-sm text-slate-300">Menyiapkan transaksi…</p>
      </Kartu>
    )
  }

  return (
    <div className="space-y-3">
      {/* Hasil roda — peserta remote harus melihatnya di HP-nya sendiri */}
      <Kartu>
        <div className="flex flex-col items-center">
          <SpinWheel hasil={warnaSpin} pemicu={putaran} ukuran={180} />
          <div
            className={`mt-2 rounded-xl border px-4 py-2 text-center text-sm font-bold ${
              wajib
                ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                : 'border-slate-600 bg-slate-900/60 text-slate-300'
            }`}
          >
            {wajib ? '🎯 Kamu WAJIB menjurnal' : '📝 Latihan (tidak diposting)'}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Warnamu {warnaSaya ? WARNA_META[warnaSaya].emoji : '—'} · Roda berhenti di{' '}
            {warnaSpin ? WARNA_META[warnaSpin].emoji : '—'}
          </p>
        </div>
      </Kartu>

      {/* Kasus */}
      <Kartu>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm leading-relaxed text-slate-100">{soal.teks}</p>
            <p className="mt-2 text-lg font-bold text-amber-300">{rupiah(soal.nominal)}</p>
          </div>
          {!reveal && <TimerRing sisa={sisa} total={DURASI_JURNAL} ukuran={64} />}
        </div>

        {/* Status polis — informasi milik peserta sendiri, jadi tidak ada yang
            bocor dengan menampilkannya. Menyembunyikannya justru tidak adil:
            di dunia nyata pemilik usaha tahu persis ia berasuransi atau tidak. */}
        {musibah && (
          <div
            className={`mb-3 rounded-xl border px-3 py-2 text-xs font-semibold ${
              punyaPolis
                ? 'border-sky-500/40 bg-sky-500/10 text-sky-200'
                : 'border-red-500/40 bg-red-500/10 text-red-200'
            }`}
          >
            {punyaPolis
              ? '🛡️ Kamu punya polis yang menanggung kejadian ini.'
              : '⚠️ Kamu tidak punya polis untuk kejadian ini.'}
          </div>
        )}

        {sudahKirim ? (
          <div className="rounded-xl border border-slate-600 bg-slate-900/60 p-3">
            {jurnalSaya!.tanpa_jurnal ? (
              <p className="text-center text-xs font-semibold text-slate-200">
                🛡️ Kamu menyatakan tidak ada jurnal yang perlu dicatat.
              </p>
            ) : (
              <>
                <p className="mb-2 text-xs font-semibold text-slate-300">Jurnal yang kamu kirim:</p>
                <BarisJurnal
                  debit={jurnalSaya!.akun_debit}
                  kredit={jurnalSaya!.akun_kredit}
                  nominal={jurnalSaya!.nominal}
                />
              </>
            )}
            {!reveal && (
              <p className="mt-2 text-center text-[11px] text-slate-400">
                ✅ Terkirim. Hasilnya dibuka setelah fasilitator menutup waktu.
              </p>
            )}
          </div>
        ) : habis ? (
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-center text-xs text-red-300">
            ⏱️ Waktu habis.
            {wajib
              ? ' Jurnalmu tidak diposting dan dihitung salah untuk akurasi.'
              : ' Tidak apa-apa, giliran ini hanya latihan buatmu.'}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <KolomAkun
                judul="DEBIT"
                warna="text-sky-300"
                opsi={opsiDebit}
                terpilih={debit}
                nonaktif={kredit}
                onPilih={setDebit}
              />
              <KolomAkun
                judul="KREDIT"
                warna="text-purple-300"
                opsi={opsiKredit}
                terpilih={kredit}
                nonaktif={debit}
                onPilih={setKredit}
              />
            </div>

            {debit && kredit && (
              <div className="animasi-muncul mt-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
                <p className="mb-2 text-xs font-semibold text-amber-200">Pratinjau jurnal:</p>
                <BarisJurnal debit={debit} kredit={kredit} nominal={soal.nominal} />
              </div>
            )}

            <button
              onClick={() => kirim()}
              disabled={!debit || !kredit || sibuk}
              className="mt-3 w-full rounded-xl bg-amber-500 py-3 font-bold text-slate-900 transition hover:bg-amber-400 active:scale-[.98] disabled:opacity-40"
            >
              {sibuk ? 'Mengirim…' : 'Catat Jurnal'}
            </button>

            {/* Tombol ini muncul untuk semua peserta, bukan hanya pemegang
                polis. Yang tidak berasuransi tetap harus sadar bahwa kerugian
                ini menjadi tanggungannya sendiri. */}
            {musibah && (
              <button
                onClick={() => kirim(true)}
                disabled={sibuk}
                className="mt-2 w-full rounded-xl border border-sky-500/50 bg-sky-500/10 py-3 text-sm font-bold text-sky-200 transition hover:bg-sky-500/20 active:scale-[.98] disabled:opacity-40"
              >
                🛡️ Tidak ada jurnal — ditanggung asuransi
              </button>
            )}
          </>
        )}
      </Kartu>

      {/* Setelah reveal */}
      {reveal && soalLengkap && (
        <Kartu>
          {musibah && punyaPolis ? (
            <>
              <p className="mb-2 text-sm font-bold text-slate-100">
                Jawaban yang benar untukmu: tidak ada jurnal
              </p>
              <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-3 text-xs leading-relaxed text-sky-100">
                🛡️ Polismu menanggung kerugian ini, jadi tidak ada nilai yang berkurang dari
                pembukuanmu. Bandingkan nanti dengan peserta yang tidak berasuransi — jurnal di
                bawah inilah yang harus mereka catat.
              </div>
              <p className="mb-2 mt-3 text-xs font-semibold text-slate-400">
                Jurnal bagi yang tidak berasuransi:
              </p>
              <div className="rounded-xl border border-slate-600 bg-slate-900/60 p-3 opacity-80">
                <BarisJurnal
                  debit={soalLengkap.debit_benar}
                  kredit={soalLengkap.kredit_benar}
                  nominal={soalLengkap.nominal}
                />
              </div>
            </>
          ) : (
            <>
              <p className="mb-2 text-sm font-bold text-slate-100">Jurnal yang benar</p>
              <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-3">
                <BarisJurnal
                  debit={soalLengkap.debit_benar}
                  kredit={soalLengkap.kredit_benar}
                  nominal={soalLengkap.nominal}
                />
              </div>
            </>
          )}

          {sudahKirim && (
            <div className="mt-3">
              {jurnalSaya!.benar ? (
                <p className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm font-semibold text-green-300">
                  ✅ Jawabanmu benar{wajib ? ' dan sudah dibukukan.' : ' (latihan).'}
                </p>
              ) : musibah && punyaPolis ? (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  <p className="font-semibold">❌ Seharusnya kamu tidak menjurnal apa pun.</p>
                  <p className="mt-1">
                    Kerugian ini ditanggung asuransimu. Mencatatnya sebagai kerugian membuat
                    labamu terlihat lebih kecil dari yang sebenarnya.
                  </p>
                </div>
              ) : musibah && jurnalSaya!.tanpa_jurnal ? (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  <p className="font-semibold">❌ Kamu tidak punya polis untuk kejadian ini.</p>
                  <p className="mt-1">
                    Kerugiannya menjadi tanggunganmu sendiri, jadi harus dicatat:{' '}
                    {namaAkun(soalLengkap.debit_benar)} (D) / {namaAkun(soalLengkap.kredit_benar)}{' '}
                    (K).
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  <p className="font-semibold">❌ Jurnalmu belum tepat.</p>
                  <ul className="mt-1 space-y-0.5">
                    {jurnalSaya!.akun_debit !== soalLengkap.debit_benar && (
                      <li>
                        Sisi debit: kamu memilih {namaAkun(jurnalSaya!.akun_debit)}, seharusnya{' '}
                        {namaAkun(soalLengkap.debit_benar)}.
                      </li>
                    )}
                    {jurnalSaya!.akun_kredit !== soalLengkap.kredit_benar && (
                      <li>
                        Sisi kredit: kamu memilih {namaAkun(jurnalSaya!.akun_kredit)}, seharusnya{' '}
                        {namaAkun(soalLengkap.kredit_benar)}.
                      </li>
                    )}
                  </ul>
                  {wajib && (
                    <p className="mt-1 text-red-300/80">
                      Jurnal ini tetap diposting ke pembukuanmu — laporanmu akan berbeda dari
                      peserta yang menjawab benar, walaupun tetap seimbang.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {showInsight && soalLengkap.insight && (
            <div className="animasi-muncul mt-3 rounded-xl border border-sky-500/40 bg-sky-500/10 p-3">
              <p className="mb-1 text-xs font-bold text-sky-300">💡 Insight</p>
              <p className="text-xs leading-relaxed text-slate-200">{soalLengkap.insight}</p>
            </div>
          )}
        </Kartu>
      )}
    </div>
  )
}

function KolomAkun({
  judul,
  warna,
  opsi,
  terpilih,
  nonaktif,
  onPilih,
}: {
  judul: string
  warna: string
  opsi: string[]
  terpilih: string | null
  nonaktif: string | null
  onPilih: (kode: string) => void
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-2">
      <p className={`mb-2 text-center text-xs font-bold tracking-wide ${warna}`}>{judul}</p>
      <div className="space-y-1.5">
        {opsi.map((kode) => {
          // Mendebit dan mengkredit akun yang sama tidak pernah jadi jurnal sah.
          const terkunci = kode === nonaktif
          const aktif = kode === terpilih
          return (
            <button
              key={kode}
              disabled={terkunci}
              onClick={() => onPilih(kode)}
              className={`w-full rounded-lg px-2 py-2.5 text-left text-xs font-medium transition ${
                aktif
                  ? 'bg-amber-500 text-slate-900'
                  : terkunci
                    ? 'cursor-not-allowed bg-slate-800/50 text-slate-600 line-through'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-[.98]'
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

function BarisJurnal({
  debit,
  kredit,
  nominal,
}: {
  debit: string | null
  kredit: string | null
  nominal: number
}) {
  return (
    <div className="space-y-1 font-mono text-xs">
      <div className="flex justify-between gap-3">
        <span className="text-slate-100">{namaAkun(debit)}</span>
        <span className="tabular-nums text-slate-100">{nominal.toLocaleString('id-ID')}</span>
      </div>
      <div className="flex justify-between gap-3 pl-5">
        <span className="text-slate-400">{namaAkun(kredit)}</span>
        <span className="tabular-nums text-slate-400">{nominal.toLocaleString('id-ID')}</span>
      </div>
    </div>
  )
}

// ──────────────────────────────── PEMBANTU ────────────────────────────────

function Kartu({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">{children}</div>
  )
}

function Pusat({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
      {children}
    </div>
  )
}

function IndikatorKoneksi({ status }: { status: 'terhubung' | 'lambat' | 'bermasalah' }) {
  const meta = {
    terhubung: { teks: 'Terhubung', kelas: 'text-green-400' },
    lambat: { teks: 'Koneksi lambat', kelas: 'text-yellow-400' },
    bermasalah: { teks: 'Terputus', kelas: 'text-red-400' },
  }[status]
  return <span className={meta.kelas}>● {meta.teks}</span>
}

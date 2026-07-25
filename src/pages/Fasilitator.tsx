import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import BannerVersi from '../components/BannerVersi'
import EditorSoal from '../components/EditorSoal'
import PapanSkor from '../components/PapanSkor'
import Pembukuan from '../components/Pembukuan'
import PinGate from '../components/PinGate'
import SpinWheel from '../components/SpinWheel'
import TimerRing from '../components/TimerRing'
import {
  ambilSemuaJurnal,
  ambilSemuaKeputusan,
  ambilSemuaPeserta,
  ambilSemuaPilihanWarna,
  resetGame,
  seedSoalJikaKosong,
  terapkanPutaran,
  ubahGameState,
} from '../lib/api'
import { pilihSoalAcak, tambahRiwayat, tambahRiwayatWarna, undiWarna } from '../lib/undian'
import { namaAkun } from '../lib/akun'
import {
  DAFTAR_WARNA,
  DURASI_JURNAL,
  DURASI_KEPUTUSAN,
  DURASI_PILIH_WARNA,
  WARNA_META,
} from '../lib/config'
import { angka, detik, rupiah } from '../lib/format'
import { useGameState, useRealtimeTabel, useSisaWaktu } from '../lib/hooks'
import { hitungPeringkat } from '../lib/peringkat'
import { sekarang } from '../lib/waktu'
import { useVersiKedaluwarsa } from '../lib/versi'
import type { Jurnal, Keputusan, Peserta, PilihanWarna, Soal } from '../lib/types'

type Tab = 'kendali' | 'pembukuan' | 'perbandingan' | 'skor' | 'editor'

const TAB: { id: Tab; label: string }[] = [
  { id: 'kendali', label: '🎛️ Kendali' },
  { id: 'pembukuan', label: '📊 Pembukuan Peserta' },
  { id: 'perbandingan', label: '⚖️ Perbandingan' },
  { id: 'skor', label: '🏆 Papan Skor' },
  { id: 'editor', label: '✏️ Editor Soal' },
]

/** Waktu sekarang menurut jam server, siap disimpan ke kolom timestamptz. */
function waktuISO(): string {
  return new Date(sekarang()).toISOString()
}

export default function Fasilitator() {
  const [lolos, setLolos] = useState(false)
  if (!lolos) return <PinGate onBerhasil={() => setLolos(true)} />
  return <Dashboard />
}

function Dashboard() {
  const { state, koneksi } = useGameState()
  const kedaluwarsa = useVersiKedaluwarsa()

  const [tab, setTab] = useState<Tab>('kendali')
  const [peserta, setPeserta] = useState<Peserta[]>([])
  const [jurnal, setJurnal] = useState<Jurnal[]>([])
  const [warna, setWarna] = useState<PilihanWarna[]>([])
  const [keputusan, setKeputusan] = useState<Keputusan[]>([])
  const [daftarSoal, setDaftarSoal] = useState<Soal[]>([])
  const [galat, setGalat] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [pesertaDipilih, setPesertaDipilih] = useState<string | null>(null)

  const muat = useCallback(async () => {
    try {
      const [p, j, w, k] = await Promise.all([
        ambilSemuaPeserta(),
        ambilSemuaJurnal(),
        ambilSemuaPilihanWarna(),
        ambilSemuaKeputusan(),
      ])
      setPeserta(p)
      setJurnal(j)
      setWarna(w)
      setKeputusan(k)
    } catch (e) {
      setGalat(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    void muat()
    seedSoalJikaKosong()
      .then(setDaftarSoal)
      .catch((e) => setGalat(e instanceof Error ? e.message : String(e)))
  }, [muat])

  useRealtimeTabel(['peserta', 'jurnal', 'pilihan_warna', 'keputusan'], muat)

  const petaSoal = useMemo(
    () => new Map(daftarSoal.map((s) => [s.id, s.teks])),
    [daftarSoal],
  )

  const peringkat = useMemo(
    () => hitungPeringkat(peserta, jurnal, petaSoal),
    [peserta, jurnal, petaSoal],
  )

  const soalAktif = useMemo(
    () => daftarSoal.find((s) => s.id === state?.soal_id) ?? null,
    [daftarSoal, state?.soal_id],
  )

  const petaNama = useMemo(
    () => new Map(peserta.map((p) => [p.id, p.nama])),
    [peserta],
  )

  const soalKeputusan = useMemo(
    () => daftarSoal.filter((s) => s.jenis === 'keputusan'),
    [daftarSoal],
  )
  const soalKejadian = useMemo(
    () => daftarSoal.filter((s) => s.jenis === 'kejadian'),
    [daftarSoal],
  )

  /** Nama peserta pemegang tiap polis — bahan diskusi sebelum musibah dimunculkan. */
  const pemegangPolis = useMemo(() => {
    const hasil = new Map<string, string[]>()
    for (const k of keputusan) {
      if (!k.ambil) continue
      const nama = petaNama.get(k.peserta_id)
      if (!nama) continue
      hasil.set(k.polis, [...(hasil.get(k.polis) ?? []), nama].sort((a, b) => a.localeCompare(b, 'id')))
    }
    return hasil
  }, [keputusan, petaNama])

  async function aksi(jalankan: () => Promise<void>) {
    setSibuk(true)
    setGalat(null)
    try {
      await jalankan()
      await muat()
    } catch (e) {
      setGalat(e instanceof Error ? e.message : String(e))
    } finally {
      setSibuk(false)
    }
  }

  // ── Kendali putaran ────────────────────────────────────────────────────

  const bukaPutaran = () =>
    aksi(async () => {
      if (!state) return
      // Warna dipilih SEBELUM transaksi diundi — urutan ini yang menjaga
      // undiannya tetap murni untung-untungan (lihat PRD 5.1).
      await ubahGameState({
        berjalan: true,
        fase: 'pilih_warna',
        putaran: state.putaran + 1,
        warna_spin: null,
        soal_id: null,
        reveal: false,
        show_insight: false,
        fase_mulai: waktuISO(),
      })
    })

  const putarRoda = () =>
    aksi(async () => {
      if (!state) return
      const soal = pilihSoalAcak(daftarSoal, state.riwayat_soal ?? [])
      if (!soal) throw new Error('Bank soal masih kosong.')
      const hasilWarna = undiWarna(state.riwayat_warna ?? [])

      await ubahGameState({
        fase: 'menjurnal',
        soal_id: soal.id,
        warna_spin: hasilWarna,
        fase_mulai: waktuISO(),
        riwayat_soal: tambahRiwayat(state.riwayat_soal ?? [], soal.id),
        riwayat_warna: tambahRiwayatWarna(state.riwayat_warna ?? [], hasilWarna),
      })
    })

  /**
   * Menawarkan asuransi ke SELURUH peserta.
   *
   * Tidak ada fase pilih warna dan tidak ada roda: ini keputusan tiap orang
   * untuk usahanya sendiri, bukan transaksi yang menimpa satu orang. Karena itu
   * `warna_spin` sengaja dikosongkan — fungsi penilaian di server memakai itu
   * untuk mengenali bahwa putaran ini tanpa peserta wajib.
   */
  const tawarkanAsuransi = (soal: Soal) =>
    aksi(async () => {
      if (!state) return
      await ubahGameState({
        berjalan: true,
        fase: 'keputusan',
        putaran: state.putaran + 1,
        warna_spin: null,
        soal_id: soal.id,
        reveal: false,
        show_insight: false,
        fase_mulai: waktuISO(),
      })
    })

  /**
   * Memunculkan musibah. Dipanggil saat peserta sudah memilih warna, sehingga
   * roda tetap yang menentukan siapa tertimpa — hanya soalnya saja yang dipilih
   * fasilitator, bukan diundi.
   */
  const munculkanKejadian = (soal: Soal) =>
    aksi(async () => {
      if (!state) return
      const hasilWarna = undiWarna(state.riwayat_warna ?? [])
      await ubahGameState({
        fase: 'menjurnal',
        soal_id: soal.id,
        warna_spin: hasilWarna,
        fase_mulai: waktuISO(),
        riwayat_warna: tambahRiwayatWarna(state.riwayat_warna ?? [], hasilWarna),
      })
    })

  const reveal = () =>
    aksi(async () => {
      if (!state) return
      // Penilaian dan posting terjadi di server dalam satu perintah, barulah
      // penanda reveal dinyalakan.
      await terapkanPutaran(state.putaran)
      await ubahGameState({ reveal: true })
    })

  const tampilkanInsight = () => aksi(() => ubahGameState({ show_insight: true }))

  const jedaPutaran = () => aksi(() => ubahGameState({ fase: 'menunggu' }))

  const selesaikan = () => aksi(() => ubahGameState({ fase: 'selesai', berjalan: false }))

  const reset = () =>
    aksi(async () => {
      if (!confirm('Reset menghapus SELURUH peserta dan jurnal. Bank soal tetap aman. Lanjutkan?'))
        return
      await resetGame()
    })

  if (!state) return <Pusat>Memuat status game…</Pusat>

  const sudahKirim = jurnal.filter(
    (j) => j.putaran === state.putaran && (j.akun_debit || j.tanpa_jurnal),
  ).length
  const keputusanPutaranIni = keputusan.filter((k) => k.putaran === state.putaran)
  const yangMembeli = keputusanPutaranIni.filter((k) => k.ambil).length
  const wajibPutaranIni = warna.filter(
    (w) => w.putaran === state.putaran && w.warna === state.warna_spin,
  ).length

  return (
    <div className="mx-auto max-w-5xl p-3 pb-16">
      {kedaluwarsa && <BannerVersi />}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-slate-100">🎛️ Fasilitator</h1>
          <p className="text-xs text-slate-400">
            Putaran {state.putaran} · {peserta.length} peserta ·{' '}
            <span
              className={
                koneksi === 'terhubung'
                  ? 'text-green-400'
                  : koneksi === 'lambat'
                    ? 'text-yellow-400'
                    : 'text-red-400'
              }
            >
              ● {koneksi}
            </span>
          </p>
        </div>
        <Link to="/" className="text-xs text-slate-400 underline">
          Beranda
        </Link>
      </div>

      <div className="scroll-x mb-3 flex gap-1">
        {TAB.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              tab === t.id
                ? 'bg-amber-500 text-slate-900'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {galat && (
        <p className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {galat}
        </p>
      )}

      {tab === 'kendali' && (
        <div className="space-y-3">
          {/* ⚠️ Layar ini dianggap terlihat peserta. Tidak ada kunci jawaban,
              rekap benar/salah, maupun label kategori sebelum reveal. */}
          <Kartu>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Fase</p>
                <p className="text-lg font-bold text-slate-100">
                  {state.fase === 'pilih_warna'
                    ? 'Peserta memilih warna'
                    : state.fase === 'keputusan'
                      ? state.reveal
                        ? 'Reveal & pembahasan'
                        : 'Peserta memutuskan asuransi'
                      : state.fase === 'menjurnal'
                        ? state.reveal
                          ? 'Reveal & pembahasan'
                          : 'Peserta menyusun jurnal'
                        : state.fase === 'selesai'
                          ? 'Permainan selesai'
                          : 'Menunggu'}
                </p>
              </div>
              {state.fase === 'pilih_warna' && (
                <TimerFase
                  faseMulai={state.fase_mulai}
                  durasi={DURASI_PILIH_WARNA}
                  label="warna"
                />
              )}
              {state.fase === 'menjurnal' && !state.reveal && (
                <TimerFase faseMulai={state.fase_mulai} durasi={DURASI_JURNAL} label="jurnal" />
              )}
              {state.fase === 'keputusan' && !state.reveal && (
                <TimerFase
                  faseMulai={state.fase_mulai}
                  durasi={DURASI_KEPUTUSAN}
                  label="putusan"
                />
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {(state.fase === 'menunggu' || state.fase === 'selesai') && (
                <Tombol onClick={bukaPutaran} sibuk={sibuk} utama>
                  {state.putaran === 0 ? '▶️ Mulai Permainan' : '▶️ Buka Putaran Berikutnya'}
                </Tombol>
              )}
              {state.fase === 'pilih_warna' && (
                <Tombol onClick={putarRoda} sibuk={sibuk} utama>
                  🎡 Putar Roda &amp; Undi Transaksi
                </Tombol>
              )}
              {(state.fase === 'menjurnal' || state.fase === 'keputusan') && !state.reveal && (
                <Tombol onClick={reveal} sibuk={sibuk} utama>
                  🔓 Tutup Waktu &amp; Reveal
                </Tombol>
              )}
              {state.reveal && !state.show_insight && (
                <Tombol onClick={tampilkanInsight} sibuk={sibuk}>
                  💡 Tampilkan Insight
                </Tombol>
              )}
              {state.reveal && (
                <>
                  <Tombol onClick={bukaPutaran} sibuk={sibuk} utama>
                    ⏭️ Putaran Berikutnya
                  </Tombol>
                  <Tombol onClick={jedaPutaran} sibuk={sibuk}>
                    ⏸️ Jeda
                  </Tombol>
                  <Tombol onClick={selesaikan} sibuk={sibuk}>
                    🏁 Selesaikan
                  </Tombol>
                </>
              )}
              <Tombol onClick={reset} sibuk={sibuk} bahaya>
                ♻️ Reset
              </Tombol>
            </div>
          </Kartu>

          {/* Tawaran asuransi — hanya dari fase menunggu, karena ia menggantikan
              satu putaran penuh (tanpa pilih warna dan tanpa roda). */}
          {(state.fase === 'menunggu' || state.fase === 'selesai') &&
            soalKeputusan.length > 0 && (
              <Kartu>
                <p className="text-sm font-semibold text-slate-100">🛡️ Tawarkan asuransi</p>
                <p className="mb-2 mt-0.5 text-[11px] leading-relaxed text-slate-400">
                  Seluruh peserta memutuskan sendiri, tanpa roda. Tidak dihitung dalam akurasi.
                  Tawarkan ini lebih dulu, baru munculkan musibahnya beberapa putaran kemudian.
                </p>
                <div className="flex flex-wrap gap-2">
                  {soalKeputusan.map((s) => (
                    <Tombol key={s.id} onClick={() => tawarkanAsuransi(s)} sibuk={sibuk}>
                      {s.polis === 'kendaraan' ? '🚗' : '🔥'} {rupiah(s.nominal)}
                      {pemegangPolis.has(s.polis ?? '') && ' · sudah pernah ditawarkan'}
                    </Tombol>
                  ))}
                </div>
              </Kartu>
            )}

          {/* Musibah — dimunculkan saat peserta sudah memilih warna, supaya roda
              tetap yang menentukan siapa yang tertimpa. */}
          {state.fase === 'pilih_warna' && soalKejadian.length > 0 && (
            <Kartu>
              <p className="text-sm font-semibold text-slate-100">💥 Atau munculkan musibah</p>
              <p className="mb-2 mt-0.5 text-[11px] leading-relaxed text-slate-400">
                Menggantikan undian acak untuk putaran ini. Roda tetap berputar menentukan
                korbannya. Pemegang polis yang cocok tidak perlu menjurnal apa pun.
              </p>
              <div className="flex flex-wrap gap-2">
                {soalKejadian.map((s) => (
                  <Tombol key={s.id} onClick={() => munculkanKejadian(s)} sibuk={sibuk}>
                    {s.polis === 'kendaraan' ? '🚗' : '🔥'} {rupiah(s.nominal)} ·{' '}
                    {(pemegangPolis.get(s.polis ?? '') ?? []).length} terlindungi
                  </Tombol>
                ))}
              </div>
            </Kartu>
          )}

          {pemegangPolis.size > 0 && (
            <Kartu>
              <p className="mb-2 text-sm font-semibold text-slate-100">🛡️ Pemegang polis aktif</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[...pemegangPolis.entries()].map(([polis, nama]) => (
                  <div key={polis} className="rounded-lg border border-slate-700 p-2">
                    <p className="text-xs font-semibold text-slate-300">
                      {polis === 'kendaraan' ? '🚗 Kendaraan' : '🔥 Kebakaran'} · {nama.length} orang
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                      {nama.join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </Kartu>
          )}

          {state.fase === 'menjurnal' && (
            <div className="grid gap-3 md:grid-cols-2">
              <Kartu>
                <div className="flex flex-col items-center">
                  <SpinWheel hasil={state.warna_spin} pemicu={state.putaran} ukuran={200} />
                  {state.warna_spin && (
                    <p className="mt-2 text-sm font-bold text-slate-100">
                      {WARNA_META[state.warna_spin].emoji} {WARNA_META[state.warna_spin].label} —{' '}
                      {wajibPutaranIni} peserta wajib menjurnal
                    </p>
                  )}
                </div>
              </Kartu>

              <Kartu>
                <p className="text-xs uppercase tracking-wide text-slate-400">Kasus putaran ini</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-100">{soalAktif?.teks}</p>
                <p className="mt-2 text-lg font-bold text-amber-300">
                  {soalAktif ? rupiah(soalAktif.nominal) : '—'}
                </p>

                <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/50 p-2">
                  <p className="text-xs text-slate-300">
                    {sudahKirim} dari {peserta.length} peserta sudah mengirim jurnal
                  </p>
                </div>

                {state.reveal && soalAktif && (
                  <div className="animasi-muncul mt-3 rounded-lg border border-green-500/40 bg-green-500/10 p-3">
                    {soalAktif.jenis === 'kejadian' && (
                      <p className="mb-2 rounded-md border border-sky-500/40 bg-sky-500/10 px-2 py-1.5 text-[11px] leading-relaxed text-sky-200">
                        🛡️ Pemegang polis {soalAktif.polis}: <b>tidak ada jurnal sama sekali</b> —
                        kerugiannya ditanggung penanggung. Jurnal di bawah ini berlaku bagi yang
                        tidak berasuransi.
                      </p>
                    )}
                    <p className="mb-1 text-xs font-bold text-green-300">Jurnal yang benar</p>
                    <div className="space-y-1 font-mono text-xs">
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-100">{namaAkun(soalAktif.debit_benar)}</span>
                        <span className="tabular-nums text-slate-100">
                          {angka(soalAktif.nominal)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 pl-5">
                        <span className="text-slate-400">{namaAkun(soalAktif.kredit_benar)}</span>
                        <span className="tabular-nums text-slate-400">
                          {angka(soalAktif.nominal)}
                        </span>
                      </div>
                    </div>
                    {state.show_insight && soalAktif.insight && (
                      <p className="mt-2 border-t border-green-500/30 pt-2 text-xs leading-relaxed text-slate-200">
                        💡 {soalAktif.insight}
                      </p>
                    )}
                  </div>
                )}
              </Kartu>
            </div>
          )}

          {state.fase === 'keputusan' && (
            <Kartu>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Tawaran asuransi putaran ini
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-100">{soalAktif?.teks}</p>
              <p className="mt-2 text-lg font-bold text-amber-300">
                {soalAktif ? rupiah(soalAktif.nominal) : '—'}
              </p>

              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/50 p-2">
                <p className="text-xs text-slate-300">
                  {keputusanPutaranIni.length} dari {peserta.length} peserta sudah memutuskan
                </p>
                {/* Jumlah yang membeli baru ditampilkan setelah reveal: kalau
                    angkanya terlihat sejak awal, peserta akan ikut-ikutan
                    mayoritas alih-alih menimbang sendiri. */}
                {state.reveal && (
                  <p className="mt-1 text-xs font-semibold text-amber-300">
                    {yangMembeli} membeli polis · {keputusanPutaranIni.length - yangMembeli} memilih
                    menyimpan uangnya
                  </p>
                )}
              </div>

              {state.reveal && soalAktif && (
                <div className="animasi-muncul mt-3 rounded-lg border border-green-500/40 bg-green-500/10 p-3">
                  <p className="mb-1 text-xs font-bold text-green-300">
                    Jurnal yang benar bagi yang membeli
                  </p>
                  <div className="space-y-1 font-mono text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-100">{namaAkun(soalAktif.debit_benar)}</span>
                      <span className="tabular-nums text-slate-100">{angka(soalAktif.nominal)}</span>
                    </div>
                    <div className="flex justify-between gap-3 pl-5">
                      <span className="text-slate-400">{namaAkun(soalAktif.kredit_benar)}</span>
                      <span className="tabular-nums text-slate-400">{angka(soalAktif.nominal)}</span>
                    </div>
                  </div>
                  {state.show_insight && soalAktif.insight && (
                    <p className="mt-2 border-t border-green-500/30 pt-2 text-xs leading-relaxed text-slate-200">
                      💡 {soalAktif.insight}
                    </p>
                  )}
                </div>
              )}
            </Kartu>
          )}

          {state.fase === 'pilih_warna' && (
            <Kartu>
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
                Peserta yang sudah memilih warna
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DAFTAR_WARNA.map((w) => {
                  const pemilih = warna
                    .filter((p) => p.putaran === state.putaran && p.warna === w)
                    .map((p) => petaNama.get(p.peserta_id) ?? '(peserta keluar)')
                    .sort((a, b) => a.localeCompare(b, 'id'))
                  return (
                    <div
                      key={w}
                      className={`rounded-lg border border-slate-700 p-2 ${WARNA_META[w].bgLembut}`}
                    >
                      <div className="text-center">
                        <p className="text-lg">{WARNA_META[w].emoji}</p>
                        <p className="tabular-nums text-sm font-bold text-slate-100">
                          {pemilih.length}
                        </p>
                      </div>
                      {pemilih.length > 0 && (
                        <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto border-t border-slate-700/60 pt-1 text-[11px] leading-tight text-slate-200">
                          {pemilih.map((nama, i) => (
                            <li key={i} className="truncate" title={nama}>
                              {nama}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Transaksi belum diundi. Jangan buka tab lain yang memuat bank soal saat layar ini
                di-share.
              </p>
            </Kartu>
          )}

          <Kartu>
            <p className="mb-2 text-sm font-semibold text-slate-100">Papan skor sementara</p>
            <PapanSkor hasil={peringkat} batas={10} />
          </Kartu>
        </div>
      )}

      {tab === 'pembukuan' && (
        <div className="space-y-3">
          <select
            value={pesertaDipilih ?? ''}
            onChange={(e) => setPesertaDipilih(e.target.value || null)}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
          >
            <option value="">— Pilih peserta —</option>
            {peserta.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama}
              </option>
            ))}
          </select>

          {pesertaDipilih ? (
            <Pembukuan
              jurnal={jurnal.filter((j) => j.peserta_id === pesertaDipilih)}
              petaSoal={petaSoal}
              judul={peserta.find((p) => p.id === pesertaDipilih)?.nama}
            />
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">
              Pilih peserta untuk membedah pembukuannya.
            </p>
          )}
        </div>
      )}

      {tab === 'perbandingan' && (
        <Kartu>
          <p className="mb-1 text-sm font-semibold text-slate-100">Perbandingan antar peserta</p>
          <p className="mb-3 text-[11px] leading-relaxed text-slate-400">
            Semua buku ini seimbang — tanpa kecuali. Yang berbeda komposisinya. Dari transaksi yang
            sama persis, jurnal yang berbeda menghasilkan laporan yang berbeda.
          </p>
          <div className="scroll-x">
            <table className="w-full min-w-[600px] text-xs">
              <thead>
                <tr className="text-slate-400">
                  <th className="px-2 py-1.5 text-left font-medium">Nama</th>
                  <th className="px-2 py-1.5 text-right font-medium">Saldo Kas</th>
                  <th className="px-2 py-1.5 text-right font-medium">Total Aset</th>
                  <th className="px-2 py-1.5 text-right font-medium">Laba Bersih</th>
                  <th className="px-2 py-1.5 text-right font-medium">Akurasi</th>
                  <th className="px-2 py-1.5 text-right font-medium">Giliran</th>
                  <th className="px-2 py-1.5 text-right font-medium">Rata Waktu</th>
                </tr>
              </thead>
              <tbody>
                {peringkat.baris.map((b) => (
                  <tr key={b.peserta.id} className="border-t border-slate-800">
                    <td className="px-2 py-2 font-medium text-slate-100">
                      {b.peserta.nama}
                      {b.sempurna && ' 💎'}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-200">
                      {angka(b.saldoKas)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-200">
                      {angka(b.totalAset)}
                    </td>
                    <td
                      className={`px-2 py-2 text-right tabular-nums ${
                        b.labaBersih < 0 ? 'text-red-400' : 'text-slate-200'
                      }`}
                    >
                      {angka(b.labaBersih)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-300">
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
        </Kartu>
      )}

      {tab === 'skor' && (
        <Kartu>
          <PapanSkor hasil={peringkat} />
        </Kartu>
      )}

      {tab === 'editor' && (
        <Kartu>
          <EditorSoal
            onTutup={() => {
              setTab('kendali')
              seedSoalJikaKosong().then(setDaftarSoal).catch(() => undefined)
            }}
          />
        </Kartu>
      )}
    </div>
  )
}

// ──────────────────────────────── PEMBANTU ────────────────────────────────

function TimerFase({
  faseMulai,
  durasi,
  label,
}: {
  faseMulai: string | null
  durasi: number
  label: string
}) {
  const sisa = useSisaWaktu(faseMulai, durasi)
  return <TimerRing sisa={sisa} total={durasi} ukuran={64} label={label} />
}

function Tombol({
  children,
  onClick,
  sibuk,
  utama,
  bahaya,
}: {
  children: ReactNode
  onClick: () => void
  sibuk: boolean
  utama?: boolean
  bahaya?: boolean
}) {
  const kelas = bahaya
    ? 'bg-red-600 hover:bg-red-500 text-white'
    : utama
      ? 'bg-amber-500 hover:bg-amber-400 text-slate-900'
      : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
  return (
    <button
      onClick={onClick}
      disabled={sibuk}
      className={`rounded-xl px-4 py-2.5 text-sm font-bold transition active:scale-[.98] disabled:opacity-40 ${kelas}`}
    >
      {children}
    </button>
  )
}

function Kartu({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">{children}</div>
}

function Pusat({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
      {children}
    </div>
  )
}

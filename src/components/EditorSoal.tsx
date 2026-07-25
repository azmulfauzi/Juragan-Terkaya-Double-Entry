import { useEffect, useMemo, useState } from 'react'
import { BAGAN_AKUN, namaAkun } from '../lib/akun'
import { KATEGORI_META } from '../lib/config'
import { rupiah } from '../lib/format'
import { ambilSemuaSoal, hapusSoal, simpanSoal } from '../lib/api'
import { validasiSoal } from '../lib/validasi'
import type { JenisSoal, KategoriSoal, Polis, Soal } from '../lib/types'

interface Props {
  onTutup: () => void
}

const KATEGORI: KategoriSoal[] = ['kas_masuk', 'kas_keluar', 'non_kas', 'modal']

const JENIS: { nilai: JenisSoal; label: string; petunjuk: string }[] = [
  {
    nilai: 'biasa',
    label: 'Biasa',
    petunjuk: 'Ikut undian acak. Roda menentukan siapa yang membukukan.',
  },
  {
    nilai: 'keputusan',
    label: 'Keputusan (tawaran asuransi)',
    petunjuk:
      'Tidak ikut undian. Dimunculkan lewat tombol fasilitator, seluruh peserta memutuskan beli atau tidak, dan tidak dihitung dalam akurasi.',
  },
  {
    nilai: 'kejadian',
    label: 'Kejadian (musibah)',
    petunjuk:
      'Tidak ikut undian. Dimunculkan lewat tombol fasilitator, roda menentukan korbannya. Pemegang polis yang cocok tidak menjurnal apa pun.',
  },
]

const POLIS: Polis[] = ['kebakaran', 'kendaraan']

function soalKosong(id: number): Soal {
  return {
    id,
    kategori: 'kas_masuk',
    jenis: 'biasa',
    polis: null,
    teks: '',
    nominal: 1_000_000,
    opsi_debit: ['1-100', '1-200', '1-300', '5-600'],
    opsi_kredit: ['4-100', '1-100', '2-100', '3-100'],
    debit_benar: '1-100',
    kredit_benar: '4-100',
    insight: '',
  }
}

/**
 * Editor bank soal.
 *
 * Perubahan tersimpan langsung ke database, jadi tidak ikut terhapus saat Reset
 * dan tidak butuh deploy ulang.
 */
export default function EditorSoal({ onTutup }: Props) {
  const [daftar, setDaftar] = useState<Soal[]>([])
  const [cari, setCari] = useState('')
  const [filter, setFilter] = useState<KategoriSoal | 'semua'>('semua')
  const [edit, setEdit] = useState<Soal | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  async function muat() {
    try {
      setDaftar(await ambilSemuaSoal())
    } catch (e) {
      setPesan(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    void muat()
  }, [])

  const tersaring = useMemo(() => {
    const kunci = cari.trim().toLowerCase()
    return daftar.filter((s) => {
      if (filter !== 'semua' && s.kategori !== filter) return false
      if (!kunci) return true
      return s.teks.toLowerCase().includes(kunci) || String(s.id) === kunci
    })
  }, [daftar, cari, filter])

  async function simpan(soal: Soal) {
    const salah = validasiSoal(soal)
    if (salah) {
      setPesan(salah)
      return
    }
    setSibuk(true)
    try {
      await simpanSoal(soal)
      await muat()
      setEdit(null)
      setPesan(null)
    } catch (e) {
      setPesan(e instanceof Error ? e.message : String(e))
    } finally {
      setSibuk(false)
    }
  }

  async function hapus(id: number) {
    if (!confirm(`Hapus soal #${id}? Tindakan ini tidak bisa dibatalkan.`)) return
    setSibuk(true)
    try {
      await hapusSoal(id)
      await muat()
    } catch (e) {
      setPesan(e instanceof Error ? e.message : String(e))
    } finally {
      setSibuk(false)
    }
  }

  const idBaru = daftar.reduce((maks, s) => Math.max(maks, s.id), 0) + 1

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-100">✏️ Editor Bank Soal</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setPesan(null)
              setEdit(soalKosong(idBaru))
            }}
            className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-500"
          >
            + Soal Baru
          </button>
          <button
            onClick={onTutup}
            className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-600"
          >
            Tutup
          </button>
        </div>
      </div>

      {pesan && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {pesan}
        </p>
      )}

      {edit ? (
        <FormSoal
          soal={edit}
          sibuk={sibuk}
          onUbah={setEdit}
          onSimpan={() => simpan(edit)}
          onBatal={() => {
            setEdit(null)
            setPesan(null)
          }}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari teks kasus atau nomor soal…"
              className="min-w-[200px] flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as KategoriSoal | 'semua')}
              className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
            >
              <option value="semua">Semua kategori</option>
              {KATEGORI.map((k) => (
                <option key={k} value={k}>
                  {KATEGORI_META[k].label}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-slate-400">
            {tersaring.length} dari {daftar.length} soal
          </p>

          <div className="space-y-2">
            {tersaring.map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-3">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                    #{s.id}
                  </span>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${KATEGORI_META[s.kategori].kelas}`}
                  >
                    {KATEGORI_META[s.kategori].label}
                  </span>
                  {s.jenis !== 'biasa' && (
                    <span className="rounded-md border border-fuchsia-500/40 bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-300">
                      {s.jenis === 'keputusan' ? '🛡️ Tawaran' : '💥 Musibah'} ·{' '}
                      {s.polis === 'kendaraan' ? 'kendaraan' : 'kebakaran'}
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-amber-300">
                    {rupiah(s.nominal)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-200">{s.teks}</p>
                <p className="mt-1 font-mono text-[11px] text-slate-400">
                  D: {namaAkun(s.debit_benar)} · K: {namaAkun(s.kredit_benar)}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      setPesan(null)
                      setEdit(s)
                    }}
                    className="rounded-md bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setPesan(null)
                      setEdit({ ...s, id: idBaru })
                    }}
                    className="rounded-md bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-600"
                  >
                    Duplikat
                  </button>
                  <button
                    onClick={() => hapus(s.id)}
                    className="rounded-md bg-red-600/80 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-500"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ──────────────────────────────── FORM ────────────────────────────────

function FormSoal({
  soal,
  sibuk,
  onUbah,
  onSimpan,
  onBatal,
}: {
  soal: Soal
  sibuk: boolean
  onUbah: (s: Soal) => void
  onSimpan: () => void
  onBatal: () => void
}) {
  const peringatan = validasiSoal(soal)

  function ubahOpsi(sisi: 'debit' | 'kredit', indeks: number, kode: string) {
    const kunciOpsi = sisi === 'debit' ? 'opsi_debit' : 'opsi_kredit'
    const kunciBenar = sisi === 'debit' ? 'debit_benar' : 'kredit_benar'
    const opsi = [...soal[kunciOpsi]]
    const lama = opsi[indeks]
    opsi[indeks] = kode

    // Kalau yang diganti kebetulan opsi yang bertanda benar, penandanya ikut
    // pindah — kalau tidak, jawaban benar mendadak hilang dari daftar opsi.
    const benarBaru = soal[kunciBenar] === lama ? kode : soal[kunciBenar]
    onUbah({ ...soal, [kunciOpsi]: opsi, [kunciBenar]: benarBaru })
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-100">Soal #{soal.id}</h3>
        <span className="text-xs text-slate-400">
          Opsi ditampilkan ke peserta dalam urutan acak
        </span>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-slate-400">Teks kasus (sebutkan nominalnya)</span>
        <textarea
          value={soal.teks}
          onChange={(e) => onUbah({ ...soal, teks: e.target.value })}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-slate-400">Nominal (Rp)</span>
          <input
            type="number"
            value={soal.nominal}
            onChange={(e) => onUbah({ ...soal, nominal: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-400">Kategori (pengelolaan saja)</span>
          <select
            value={soal.kategori}
            onChange={(e) => onUbah({ ...soal, kategori: e.target.value as KategoriSoal })}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
          >
            {KATEGORI.map((k) => (
              <option key={k} value={k}>
                {KATEGORI_META[k].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-slate-400">Jenis soal</span>
          <select
            value={soal.jenis}
            onChange={(e) => {
              const jenis = e.target.value as JenisSoal
              // Soal biasa tidak boleh memegang polis, dan soal asuransi wajib
              // punya — isi otomatis supaya tidak tertinggal separuh jalan.
              onUbah({
                ...soal,
                jenis,
                polis: jenis === 'biasa' ? null : (soal.polis ?? 'kebakaran'),
              })
            }}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
          >
            {JENIS.map((j) => (
              <option key={j.nilai} value={j.nilai}>
                {j.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[10px] leading-relaxed text-slate-500">
            {JENIS.find((j) => j.nilai === soal.jenis)?.petunjuk}
          </span>
        </label>

        {soal.jenis !== 'biasa' && (
          <label className="block">
            <span className="text-xs font-medium text-slate-400">Jenis polis</span>
            <select
              value={soal.polis ?? 'kebakaran'}
              onChange={(e) => onUbah({ ...soal, polis: e.target.value as Polis })}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
            >
              {POLIS.map((p) => (
                <option key={p} value={p}>
                  {p === 'kebakaran' ? '🔥 Kebakaran' : '🚗 Kendaraan'}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[10px] leading-relaxed text-slate-500">
              Inilah yang menghubungkan tawaran asuransi dengan musibahnya. Keduanya harus memakai
              jenis polis yang sama.
            </span>
          </label>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <KolomOpsi
          judul="Opsi Debit"
          opsi={soal.opsi_debit}
          benar={soal.debit_benar}
          onUbahOpsi={(i, kode) => ubahOpsi('debit', i, kode)}
          onPilihBenar={(kode) => onUbah({ ...soal, debit_benar: kode })}
        />
        <KolomOpsi
          judul="Opsi Kredit"
          opsi={soal.opsi_kredit}
          benar={soal.kredit_benar}
          onUbahOpsi={(i, kode) => ubahOpsi('kredit', i, kode)}
          onPilihBenar={(kode) => onUbah({ ...soal, kredit_benar: kode })}
        />
      </div>

      <label className="block">
        <span className="text-xs font-medium text-slate-400">Insight (dibahas setelah reveal)</span>
        <textarea
          value={soal.insight}
          onChange={(e) => onUbah({ ...soal, insight: e.target.value })}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
        />
      </label>

      {peringatan && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          ⚠️ {peringatan}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onSimpan}
          disabled={sibuk || Boolean(peringatan)}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Simpan
        </button>
        <button
          onClick={onBatal}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-600"
        >
          Batal
        </button>
      </div>
    </div>
  )
}

function KolomOpsi({
  judul,
  opsi,
  benar,
  onUbahOpsi,
  onPilihBenar,
}: {
  judul: string
  opsi: string[]
  benar: string
  onUbahOpsi: (indeks: number, kode: string) => void
  onPilihBenar: (kode: string) => void
}) {
  return (
    <div className="rounded-lg border border-slate-700 p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{judul}</p>
      <div className="space-y-2">
        {opsi.map((kode, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              checked={kode === benar}
              onChange={() => onPilihBenar(kode)}
              title="Tandai sebagai jawaban benar"
              className="h-4 w-4 accent-green-500"
            />
            <select
              value={kode}
              onChange={(e) => onUbahOpsi(i, e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-amber-400"
            >
              {BAGAN_AKUN.map((a) => (
                <option key={a.kode} value={a.kode}>
                  {a.kode} · {a.nama}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
        Bulatan hijau menandai jawaban benar. Jawaban benar wajib ada di antara keempat opsi —
        kalau tidak, soalnya mustahil dijawab benar.
      </p>
    </div>
  )
}

/**
 * Titik masuk seluruh uji. Jalankan dengan:
 *
 *     npm run uji
 *
 * Tidak memakai kerangka uji tambahan — cukup Node dan esbuild yang sudah ada,
 * supaya tidak ada dependensi baru yang perlu dirawat.
 */
import { gagal as gagalPembukuan } from './pembukuan'
import { gagal as gagalSoal } from './soal'

// Dideklarasikan seadanya supaya project tidak perlu menambah @types/node hanya
// demi satu pemanggilan.
declare const process: { exit(kode: number): never }

const total = gagalPembukuan + gagalSoal
console.log(total === 0 ? '\n✅ SEMUA UJI LOLOS' : `\n❌ ${total} UJI GAGAL`)
process.exit(total === 0 ? 0 : 1)

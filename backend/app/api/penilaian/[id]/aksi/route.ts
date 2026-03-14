// PATH: backend/app/api/penilaian/[id]/aksi/route.ts

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ROLES } from '@/lib/auth'
import { ok, err, OPTIONS } from '@/lib/response'

export { OPTIONS }

/**
 * POST /api/penilaian/[id]/aksi
 * Body: { aksi: 'setujui' | 'tolak', catatan?: string, tindakanAkhir?: string }
 *
 * Alur approval:
 *   menunggu_kepala_bagian  → pimpinan / super_admin
 *   menunggu_kepala_biro    → pimpinan / super_admin
 *   menunggu_dinas_arsip    → dinas_arsip / super_admin
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { payload, response } = requireAuth(req)
  if (response || !payload) return response!

  const id = parseInt(params.id, 10)
  if (isNaN(id)) return err('ID tidak valid', 400)

  const penilaian = await prisma.penilaianArsip.findUnique({ where: { id } })
  if (!penilaian) return err('Penilaian tidak ditemukan', 404)
  if (penilaian.status === 'selesai' || penilaian.status === 'ditolak')
    return err('Penilaian sudah selesai / ditolak')

  const { aksi, catatan, tindakanAkhir } = await req.json()
  if (!aksi) return err('Field aksi wajib diisi')

  const now  = new Date()
  let update: Record<string, unknown> = {}

  if (penilaian.status === 'menunggu_kepala_bagian') {
    // Hanya pimpinan / super_admin
    if (![ROLES.PIMPINAN, ROLES.SUPER_ADMIN].includes(payload.role as never))
      return err('Forbidden', 403)

    update = aksi === 'setujui'
      ? {
          nilaiKepalaBagian:          'disetujui',
          catatanKepalaBagian:        catatan ?? null,
          disetujuiKepalaBagianId:    payload.userId,
          tanggalKepalaBagian:        now,
          status:                     'menunggu_kepala_biro',
        }
      : { status: 'ditolak', catatanKepalaBagian: catatan ?? null }

  } else if (penilaian.status === 'menunggu_kepala_biro') {
    if (![ROLES.PIMPINAN, ROLES.SUPER_ADMIN].includes(payload.role as never))
      return err('Forbidden', 403)

    update = aksi === 'setujui'
      ? {
          nilaiKepalaBiro:          'disetujui',
          catatanKepalaBiro:        catatan ?? null,
          disetujuiKepalaBiroId:    payload.userId,
          tanggalKepalaBiro:        now,
          status:                   'menunggu_dinas_arsip',
        }
      : { status: 'ditolak', catatanKepalaBiro: catatan ?? null }

  } else if (penilaian.status === 'menunggu_dinas_arsip') {
    if (![ROLES.DINAS_ARSIP, ROLES.SUPER_ADMIN].includes(payload.role as never))
      return err('Forbidden', 403)

    if (aksi === 'setujui') {
      if (!tindakanAkhir) return err('tindakanAkhir wajib saat dinas arsip menyetujui')
      update = {
        keputusanDinas:   'disetujui',
        catatanDinas:     catatan ?? null,
        disetujuiDinasId: payload.userId,
        tanggalDinas:     now,
        tindakanAkhir,
        tanggalSelesai:   now,
        status:           'selesai',
      }
      // Terapkan tindakan ke arsip
      await prisma.archive.update({
        where: { id: penilaian.archiveId },
        data:  { statusArsip: tindakanAkhir === 'hapus' ? 'dimusnahkan' : tindakanAkhir },
      })
    } else {
      update = { status: 'ditolak', catatanDinas: catatan ?? null }
    }
  }

  const updated = await prisma.penilaianArsip.update({
    where: { id },
    data:  update,
    include: {
      archive:          { select: { id: true, judul: true, nomorSurat: true } },
      pembuatPenilaian: { select: { id: true, namaLengkap: true } },
    },
  })
  return ok(updated, `Penilaian berhasil di${aksi}`)
}
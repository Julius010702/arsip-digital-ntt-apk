// PATH: backend/app/api/archives/[id]/route.ts

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, CAN_UPLOAD, CAN_MANAGE } from '@/lib/auth'
import { ok, err, OPTIONS } from '@/lib/response'

export { OPTIONS }

const INCLUDE = {
  category: true,
  unit:     true,
  urusan:   true,
  user:     { select: { id: true, namaLengkap: true } },
  penilaian: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
  },
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = requireAuth(req)
  if (response) return response

  const id = parseInt(params.id, 10)
  if (isNaN(id)) return err('ID tidak valid', 400)

  const archive = await prisma.archive.findUnique({ where: { id }, include: INCLUDE })
  if (!archive) return err('Arsip tidak ditemukan', 404)
  return ok(archive)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { payload, response } = requireAuth(req, CAN_UPLOAD)
  if (response || !payload) return response!

  const id = parseInt(params.id, 10)
  if (isNaN(id)) return err('ID tidak valid', 400)

  try {
    const body = await req.json()

    const updated = await prisma.archive.update({
      where: { id },
      data: {
        ...(body.nomorSurat         && { nomorSurat: body.nomorSurat }),
        ...(body.judul              && { judul: body.judul }),
        ...(body.tanggalSurat       && { tanggalSurat: new Date(body.tanggalSurat) }),
        ...(body.pengirim           && { pengirim: body.pengirim }),
        ...(body.penerima           && { penerima: body.penerima }),
        ...(body.perihal            && { perihal: body.perihal }),
        ...(body.filePath           && { filePath: body.filePath }),
        ...(body.kategoriId         && { kategoriId: parseInt(String(body.kategoriId), 10) }),
        ...(body.unitId             && { unitId: parseInt(String(body.unitId), 10) }),
        ...(body.urusanId !== undefined && { urusanId: body.urusanId ? parseInt(String(body.urusanId), 10) : null }),
        ...(body.masaRetensi        && { masaRetensi: parseInt(String(body.masaRetensi), 10) }),
        ...(body.statusArsip        && { statusArsip: body.statusArsip }),
        ...(body.keteranganInaktif !== undefined && { keteranganInaktif: body.keteranganInaktif }),
        ...(body.nomorPeraturanPengganti !== undefined && { nomorPeraturanPengganti: body.nomorPeraturanPengganti }),
        ...(body.judulPeraturanPengganti !== undefined && { judulPeraturanPengganti: body.judulPeraturanPengganti }),
      },
      include: INCLUDE,
    })
    return ok(updated, 'Arsip diperbarui')
  } catch (e) {
    console.error(e)
    return err('Server error', 500)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = requireAuth(req, CAN_MANAGE)
  if (response) return response

  const id = parseInt(params.id, 10)
  if (isNaN(id)) return err('ID tidak valid', 400)

  await prisma.archive.delete({ where: { id } })
  return ok(null, 'Arsip dihapus')
}
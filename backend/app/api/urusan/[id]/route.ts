// ======================================================
// FILE: backend/app/api/urusan/[id]/route.ts
// ======================================================

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ROLES } from '@/lib/auth'
import { ok, err, OPTIONS } from '@/lib/response'

export { OPTIONS }

// GET /api/urusan/:id
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = requireAuth(req)
  if (response) return response

  const id = parseInt(params.id)
  if (isNaN(id)) return err('ID tidak valid', 400)

  const urusan = await prisma.urusan.findUnique({
    where: { id },
    include: { _count: { select: { archives: true } } },
  })
  if (!urusan) return err('Urusan tidak ditemukan', 404)

  return ok(urusan)
}

// PUT /api/urusan/:id — Update urusan
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = requireAuth(req, [ROLES.SUPER_ADMIN])
  if (response) return response

  const id = parseInt(params.id)
  if (isNaN(id)) return err('ID tidak valid', 400)

  const { kodeUrusan, namaUrusan, deskripsi, keywords } = await req.json()

  if (!kodeUrusan || !namaUrusan) return err('kodeUrusan dan namaUrusan wajib diisi', 400)

  try {
    const urusan = await prisma.urusan.update({
      where: { id },
      data: {
        kodeUrusan,
        namaUrusan,
        deskripsi: deskripsi ?? null,
        keywords:  Array.isArray(keywords) ? keywords : [],
      },
    })
    return ok(urusan, 'Urusan berhasil diperbarui')
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return err('Kode urusan sudah digunakan', 409)
    if ((e as { code?: string }).code === 'P2025') return err('Urusan tidak ditemukan', 404)
    return err('Server error', 500)
  }
}

// DELETE /api/urusan/:id — Hapus urusan
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { response } = requireAuth(req, [ROLES.SUPER_ADMIN])
  if (response) return response

  const id = parseInt(params.id)
  if (isNaN(id)) return err('ID tidak valid', 400)

  try {
    // Cek apakah masih ada arsip yang terkait
    const count = await prisma.archive.count({ where: { urusanId: id } })
    if (count > 0) {
      // Set urusanId arsip terkait ke null sebelum hapus
      await prisma.archive.updateMany({
        where: { urusanId: id },
        data:  { urusanId: null },
      })
    }

    await prisma.urusan.delete({ where: { id } })
    return ok(null, `Urusan berhasil dihapus (${count} arsip dilepas dari urusan ini)`)
  } catch (e) {
    if ((e as { code?: string }).code === 'P2025') return err('Urusan tidak ditemukan', 404)
    return err('Server error', 500)
  }
}
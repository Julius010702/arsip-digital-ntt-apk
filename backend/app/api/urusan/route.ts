// PATH: backend/app/api/urusan/route.ts

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ROLES } from '@/lib/auth'
import { ok, err, OPTIONS } from '@/lib/response'

export { OPTIONS }

export async function GET(req: NextRequest) {
  const { response } = requireAuth(req)
  if (response) return response

  const urusan = await prisma.urusan.findMany({
    include: { _count: { select: { archives: true } } },
    orderBy: { kodeUrusan: 'asc' },
  })
  return ok(urusan)
}

export async function POST(req: NextRequest) {
  const { response } = requireAuth(req, [ROLES.SUPER_ADMIN])
  if (response) return response

  const { kodeUrusan, namaUrusan, deskripsi, keywords } = await req.json()
  if (!kodeUrusan || !namaUrusan) return err('kodeUrusan dan namaUrusan wajib diisi')

  try {
    const urusan = await prisma.urusan.create({
      data: {
        kodeUrusan,
        namaUrusan,
        deskripsi: deskripsi ?? null,
        keywords:  Array.isArray(keywords) ? keywords : [],
      },
    })
    return ok(urusan, 'Urusan dibuat', 201)
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return err('Kode urusan sudah terdaftar')
    return err('Server error', 500)
  }
}
// PATH: backend/app/api/penilaian/route.ts

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ROLES } from '@/lib/auth'
import { ok, err, paginated, getPagination, OPTIONS } from '@/lib/response'

export { OPTIONS }

/** Role yang boleh membuat & melihat usulan penilaian */
const CAN_USUL = [ROLES.SUPER_ADMIN, ROLES.ADMIN_UNIT, ROLES.STAFF]

const INCLUDE = {
  archive:          { select: { id: true, judul: true, nomorSurat: true, statusArsip: true } },
  pembuatPenilaian: { select: { id: true, namaLengkap: true, role: true } },
  penyetujuPenilaian: { select: { id: true, namaLengkap: true, role: true } },
}

export async function GET(req: NextRequest) {
  const { payload, response } = requireAuth(req)
  if (response || !payload) return response!

  const url      = new URL(req.url)
  const status   = url.searchParams.get('status')
  const archiveId = url.searchParams.get('archiveId')
  const { page, limit, skip } = getPagination(req)

  const where: Record<string, unknown> = {}
  if (status)    where.status    = status
  if (archiveId) where.archiveId = parseInt(archiveId, 10)  // ← string → number

  const [data, total] = await Promise.all([
    prisma.penilaianArsip.findMany({
      where, include: INCLUDE, skip, take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.penilaianArsip.count({ where }),
  ])
  return paginated(data, total, page, limit)
}

export async function POST(req: NextRequest) {
  const { payload, response } = requireAuth(req, CAN_USUL)
  if (response || !payload) return response!

  try {
    const { archiveId, usulanTindakan, alasanUsulan } = await req.json()

    if (!archiveId || !usulanTindakan || !alasanUsulan)
      return err('Field wajib tidak lengkap')

    const penilaian = await prisma.penilaianArsip.create({
      data: {
        archiveId:      parseInt(String(archiveId), 10),
        dibuatOleh:     payload.userId,
        usulanTindakan,
        alasanUsulan,
        status:         'menunggu_kepala_bagian',
      },
      include: INCLUDE,
    })
    return ok(penilaian, 'Usulan penilaian dibuat', 201)
  } catch (e) {
    console.error(e)
    return err('Server error', 500)
  }
}
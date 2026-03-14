// PATH: backend/app/api/notifikasi/route.ts

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { ok, err, paginated, getPagination, OPTIONS } from '@/lib/response'

export { OPTIONS }

export async function GET(req: NextRequest) {
  const { payload, response } = requireAuth(req)
  if (response || !payload) return response!

  const { page, limit, skip } = getPagination(req)
  const url    = new URL(req.url)
  const unread = url.searchParams.get('unread')

  const where = {
    userId: payload.userId,
    ...(unread === 'true' ? { sudahDibaca: false } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.notifikasi.findMany({
      where, skip, take: limit,
      include: { archive: { select: { id: true, judul: true, nomorSurat: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notifikasi.count({ where }),
  ])
  return paginated(data, total, page, limit)
}

export async function PATCH(req: NextRequest) {
  // Tandai semua notifikasi sebagai sudah dibaca
  const { payload, response } = requireAuth(req)
  if (response || !payload) return response!

  const url = new URL(req.url)
  const id  = url.searchParams.get('id')

  if (id) {
    // Tandai satu notifikasi
    const notif = await prisma.notifikasi.updateMany({
      where: { id: parseInt(id, 10), userId: payload.userId },
      data:  { sudahDibaca: true },
    })
    if (!notif.count) return err('Notifikasi tidak ditemukan', 404)
  } else {
    // Tandai semua
    await prisma.notifikasi.updateMany({
      where: { userId: payload.userId, sudahDibaca: false },
      data:  { sudahDibaca: true },
    })
  }
  return ok(null, 'Notifikasi ditandai sudah dibaca')
}
// PATH: backend/app/api/retensi/cek/route.ts

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, CAN_MANAGE } from '@/lib/auth'
import { ok, OPTIONS } from '@/lib/response'

export { OPTIONS }

/**
 * GET /api/retensi/cek
 * Cek arsip yang masa retensinya hampir habis atau sudah habis.
 * Query params:
 *   - hariKedepan: number (default 30) — arsip yang kadaluarsa dalam X hari
 */
export async function GET(req: NextRequest) {
  const { response } = requireAuth(req, CAN_MANAGE)
  if (response) return response

  const url          = new URL(req.url)
  const hariKedepan  = parseInt(url.searchParams.get('hariKedepan') ?? '30', 10)
  const now          = new Date()
  const batasWaktu   = new Date(now.getTime() + hariKedepan * 24 * 60 * 60 * 1000)

  const [hampirHabis, sudahHabis] = await Promise.all([
    // Retensi hampir habis: kadaluarsa antara sekarang dan batas waktu
    prisma.archive.findMany({
      where: {
        statusArsip:       { in: ['aktif', 'inaktif'] },
        tanggalKadaluarsa: { gte: now, lte: batasWaktu },
      },
      include: {
        unit:     { select: { id: true, namaUnit: true } },
        category: { select: { id: true, nama: true } },
      },
      orderBy: { tanggalKadaluarsa: 'asc' },
    }),

    // Retensi sudah habis: kadaluarsa sebelum sekarang
    prisma.archive.findMany({
      where: {
        statusArsip:       { in: ['aktif', 'inaktif'] },
        tanggalKadaluarsa: { lt: now },
      },
      include: {
        unit:     { select: { id: true, namaUnit: true } },
        category: { select: { id: true, nama: true } },
      },
      orderBy: { tanggalKadaluarsa: 'asc' },
    }),
  ])

  return ok({
    hampirHabis: { total: hampirHabis.length, data: hampirHabis },
    sudahHabis:  { total: sudahHabis.length,  data: sudahHabis  },
  })
}
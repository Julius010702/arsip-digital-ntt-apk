// PATH: backend/app/api/archives/route.ts

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, CAN_UPLOAD } from '@/lib/auth'
import { ok, err, paginated, getPagination, OPTIONS } from '@/lib/response'

export { OPTIONS }

const INCLUDE = {
  category: true,
  unit:     true,
  urusan:   true,
  user:     { select: { id: true, namaLengkap: true } },
}

export async function GET(req: NextRequest) {
  const { response } = requireAuth(req)
  if (response) return response

  const url        = new URL(req.url)
  const search     = url.searchParams.get('search')     ?? ''
  const kategoriId = url.searchParams.get('kategoriId')
  const unitId     = url.searchParams.get('unitId')
  const status     = url.searchParams.get('status')
  const { page, limit, skip } = getPagination(req)

  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { judul:      { contains: search, mode: 'insensitive' } },
      { nomorSurat: { contains: search, mode: 'insensitive' } },
      { pengirim:   { contains: search, mode: 'insensitive' } },
      { perihal:    { contains: search, mode: 'insensitive' } },
    ]
  }
  if (kategoriId) where.kategoriId = parseInt(kategoriId, 10)  // ← string → number
  if (unitId)     where.unitId     = parseInt(unitId, 10)
  if (status)     where.statusArsip = status

  const [data, total] = await Promise.all([
    prisma.archive.findMany({
      where, include: INCLUDE, skip, take: limit,
      orderBy: { tanggalSurat: 'desc' },
    }),
    prisma.archive.count({ where }),
  ])
  return paginated(data, total, page, limit)
}

export async function POST(req: NextRequest) {
  const { payload, response } = requireAuth(req, CAN_UPLOAD)
  if (response || !payload) return response!

  try {
    const body = await req.json()
    const {
      nomorSurat, judul, tanggalSurat, pengirim, penerima,
      perihal, filePath, kategoriId, unitId, urusanId,
      masaRetensi, statusArsip, keteranganInaktif,
    } = body

    if (!nomorSurat || !judul || !tanggalSurat || !pengirim || !penerima || !perihal || !filePath || !kategoriId || !unitId || !masaRetensi)
      return err('Field wajib tidak lengkap')

    const archive = await prisma.archive.create({
      data: {
        nomorSurat, judul, pengirim, penerima, perihal, filePath,
        tanggalSurat:  new Date(tanggalSurat),
        kategoriId:    parseInt(String(kategoriId), 10),
        unitId:        parseInt(String(unitId), 10),
        urusanId:      urusanId ? parseInt(String(urusanId), 10) : null,
        createdBy:     payload.userId,
        masaRetensi:   parseInt(String(masaRetensi), 10),
        statusArsip:   statusArsip ?? 'aktif',
        keteranganInaktif: keteranganInaktif ?? null,
      },
      include: INCLUDE,
    })
    return ok(archive, 'Arsip berhasil dibuat', 201)
  } catch (e) {
    console.error(e)
    return err('Server error', 500)
  }
}
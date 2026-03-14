// PATH: backend/app/api/reports/route.ts

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { ok, OPTIONS } from '@/lib/response'

export { OPTIONS }

export async function GET(req: NextRequest) {
  const { response } = requireAuth(req)
  if (response) return response

  const url    = new URL(req.url)
  const unitId = url.searchParams.get('unitId')
  const tahun  = url.searchParams.get('tahun')

  const baseWhere: Record<string, unknown> = {}
  if (unitId) baseWhere.unitId = parseInt(unitId, 10)
  if (tahun) {
    const y = parseInt(tahun, 10)
    baseWhere.tanggalSurat = {
      gte: new Date(`${y}-01-01`),
      lte: new Date(`${y}-12-31`),
    }
  }

  const [
    totalArsip,
    perKategori,
    perUnit,
    perStatus,
    totalPenilaian,
    penilaianPerStatus,
  ] = await Promise.all([
    prisma.archive.count({ where: baseWhere }),

    prisma.archive.groupBy({
      by: ['kategoriId'],
      where: baseWhere,
      _count: { id: true },
    }),

    prisma.archive.groupBy({
      by: ['unitId'],
      where: baseWhere,
      _count: { id: true },
    }),

    prisma.archive.groupBy({
      by: ['statusArsip'],
      where: baseWhere,
      _count: { id: true },
    }),

    prisma.penilaianArsip.count(),

    prisma.penilaianArsip.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
  ])

  // Enrich kategori & unit dengan nama
  const [kategoriList, unitList] = await Promise.all([
    prisma.category.findMany({ select: { id: true, nama: true } }),
    prisma.unit.findMany({ select: { id: true, namaUnit: true } }),
  ])

  const perKategoriEnriched = perKategori.map(k => ({
    kategoriId:  k.kategoriId,
    nama:        kategoriList.find(c => c.id === k.kategoriId)?.nama ?? 'Unknown',
    total:       k._count.id,
  }))

  const perUnitEnriched = perUnit.map(u => ({
    unitId:   u.unitId,
    nama:     unitList.find(un => un.id === u.unitId)?.namaUnit ?? 'Unknown',
    total:    u._count.id,
  }))

  return ok({
    arsip: {
      total: totalArsip,
      perKategori: perKategoriEnriched,
      perUnit:     perUnitEnriched,
      perStatus:   perStatus.map(s => ({ status: s.statusArsip, total: s._count.id })),
    },
    penilaian: {
      total: totalPenilaian,
      perStatus: penilaianPerStatus.map(p => ({ status: p.status, total: p._count.id })),
    },
  })
}
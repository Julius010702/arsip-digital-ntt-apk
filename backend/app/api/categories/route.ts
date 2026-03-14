// PATH: backend/app/api/categories/route.ts

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, CAN_MANAGE } from '@/lib/auth'
import { ok, err, OPTIONS } from '@/lib/response'

export { OPTIONS }

export async function GET(req: NextRequest) {
  const { response } = requireAuth(req)
  if (response) return response

  const categories = await prisma.category.findMany({
    include: { _count: { select: { archives: true } } },
    orderBy: { nama: 'asc' },
  })
  return ok(categories)
}

export async function POST(req: NextRequest) {
  const { response } = requireAuth(req, CAN_MANAGE)
  if (response) return response

  const { nama, deskripsi } = await req.json()
  if (!nama) return err('Nama kategori wajib diisi')

  const cat = await prisma.category.create({ data: { nama, deskripsi } })
  return ok(cat, 'Kategori dibuat', 201)
}
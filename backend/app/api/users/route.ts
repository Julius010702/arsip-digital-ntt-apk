// PATH: backend/app/api/users/route.ts

import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireAuth, CAN_MANAGE } from '@/lib/auth'
import { ok, err, paginated, getPagination, OPTIONS } from '@/lib/response'

export { OPTIONS }

const SELECT = {
  id: true, username: true, namaLengkap: true,
  email: true, role: true, unitId: true,
  status: true, createdAt: true, unit: true,
}

export async function GET(req: NextRequest) {
  const { response } = requireAuth(req)
  if (response) return response

  const url    = new URL(req.url)
  const search = url.searchParams.get('search') ?? ''
  const { page, limit, skip } = getPagination(req)

  const where = search
    ? {
        OR: [
          { namaLengkap: { contains: search, mode: 'insensitive' as const } },
          { email:       { contains: search, mode: 'insensitive' as const } },
          { username:    { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [data, total] = await Promise.all([
    prisma.user.findMany({ where, select: SELECT, skip, take: limit, orderBy: { namaLengkap: 'asc' } }),
    prisma.user.count({ where }),
  ])
  return paginated(data, total, page, limit)
}

export async function POST(req: NextRequest) {
  const { response } = requireAuth(req, CAN_MANAGE)
  if (response) return response

  try {
    const { username, namaLengkap, email, password, role, unitId } = await req.json()

    if (!username || !namaLengkap || !email || !password || !role)
      return err('Field wajib tidak lengkap')

    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        username, namaLengkap,
        email: email.toLowerCase(),
        password: hash, role,
        unitId: unitId ?? null,
      },
      select: SELECT,
    })
    return ok(user, 'User berhasil dibuat', 201)
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return err('Email atau username sudah terdaftar')
    return err('Server error', 500)
  }
}
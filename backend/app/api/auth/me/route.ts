// PATH: backend/app/api/auth/me/route.ts

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { ok, err, OPTIONS } from '@/lib/response'

export { OPTIONS }

export async function GET(req: NextRequest) {
  const { payload, response } = requireAuth(req)
  if (response || !payload) return response!

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true, username: true, namaLengkap: true,
      email: true, role: true, unitId: true,
      status: true, createdAt: true, unit: true,
    },
  })
  if (!user) return err('User tidak ditemukan', 404)
  return ok(user)
}
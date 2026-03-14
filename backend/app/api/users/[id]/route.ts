// PATH: backend/app/api/users/[id]/route.ts

import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireAuth, ROLES } from '@/lib/auth'
import { ok, err, OPTIONS } from '@/lib/response'

export { OPTIONS }

const SELECT = {
  id: true, username: true, namaLengkap: true,
  email: true, role: true, unitId: true,
  status: true, createdAt: true, unit: true,
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = requireAuth(req)
  if (response) return response

  const id = parseInt(params.id, 10)
  if (isNaN(id)) return err('ID tidak valid', 400)

  const user = await prisma.user.findUnique({ where: { id }, select: SELECT })
  if (!user) return err('User tidak ditemukan', 404)
  return ok(user)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { payload, response } = requireAuth(req)
  if (response || !payload) return response!

  const id = parseInt(params.id, 10)
  if (isNaN(id)) return err('ID tidak valid', 400)

  const canManage = [ROLES.SUPER_ADMIN, ROLES.ADMIN_UNIT].includes(payload.role as never)
  if (!canManage && payload.userId !== id) return err('Forbidden', 403)

  try {
    const body = await req.json()
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(body.namaLengkap          && { namaLengkap: body.namaLengkap }),
        ...(body.username             && { username: body.username }),
        ...(body.role                 && { role: body.role }),
        ...(body.unitId !== undefined && { unitId: body.unitId ?? null }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.password             && { password: await bcrypt.hash(body.password, 10) }),
      },
      select: SELECT,
    })
    return ok(updated, 'User diperbarui')
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return err('Username/email sudah dipakai')
    return err('Server error', 500)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = requireAuth(req, [ROLES.SUPER_ADMIN])
  if (response) return response

  const id = parseInt(params.id, 10)
  if (isNaN(id)) return err('ID tidak valid', 400)

  await prisma.user.delete({ where: { id } })
  return ok(null, 'User dihapus')
}
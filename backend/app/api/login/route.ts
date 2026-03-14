// PATH: backend/app/api/login/route.ts

import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { ok, err, OPTIONS } from '@/lib/response'

export { OPTIONS }

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password)
      return err('Email dan password wajib diisi')

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { unit: true },
    })

    if (!user || !user.status)
      return err('Email tidak ditemukan atau akun nonaktif', 401)

    const valid = await bcrypt.compare(password, user.password)
    if (!valid)
      return err('Password salah', 401)

    const token = signToken({          // ← sync, tidak perlu await
      userId: user.id,
      role:   user.role,
      unitId: user.unitId ?? null,     // ← null bukan undefined
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...userSafe } = user
    return ok({ token, user: userSafe }, 'Login berhasil')
  } catch (e) {
    console.error(e)
    return err('Server error', 500)
  }
}
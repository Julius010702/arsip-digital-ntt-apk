import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { ok, err, OPTIONS } from '@/lib/response'

export { OPTIONS }

export async function GET(req: NextRequest) {
  const { payload, response } = requireAuth(req)
  if (response) return response

  try {
    const units = await prisma.unit.findMany({ orderBy: { namaUnit: 'asc' } })
    return ok(units)
  } catch (e: any) {
    return err(e.message, 500)
  }
}
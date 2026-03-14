// ======================================================
// FILE: backend/app/api/units/route.ts
// ======================================================

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { ok, err, OPTIONS } from '@/lib/response'

export { OPTIONS }

// GET /api/units → list semua unit
export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if ('status' in auth) return auth

  try {
    const units = await prisma.unit.findMany({ orderBy: { namaUnit: 'asc' } })
    return ok(units)
  } catch (e: any) {
    return err(e.message, 500)
  }
}
// PATH: backend/lib/auth.ts

import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

const SECRET = process.env.JWT_SECRET ?? 'arsip-digital-ntt-secret-key-2024'

// ─── Tipe payload JWT ────────────────────────────────────────
export interface JwtPayload {
  userId: number
  role:   string
  unitId: number | null  // null (bukan undefined) agar konsisten dengan Prisma
}

// ─── Konstanta role & izin ───────────────────────────────────

/** Semua role yang tersedia */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN_UNIT:  'admin_unit',
  PIMPINAN:    'pimpinan',
  STAFF:       'staff',
  DINAS_ARSIP: 'dinas_arsip',
} as const

/** Role yang boleh upload / buat arsip */
export const CAN_UPLOAD: string[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN_UNIT]

/** Role yang boleh ubah / hapus arsip & manajemen data */
export const CAN_MANAGE: string[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN_UNIT]

// ─── Sign token (sync, pakai jsonwebtoken) ───────────────────
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

// ─── Verify token ────────────────────────────────────────────
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as JwtPayload
  } catch {
    return null
  }
}

// ─── Ambil payload dari header Authorization ─────────────────
export function getTokenFromRequest(req: NextRequest): JwtPayload | null {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return null
  return verifyToken(auth.slice(7))
}

// ─── Guard: kembalikan 401/403 jika tidak ada izin ───────────
/**
 * Gunakan di awal setiap handler:
 *   const { payload, response } = requireAuth(req, CAN_UPLOAD)
 *   if (response) return response
 */
export function requireAuth(
  req: NextRequest,
  allowedRoles?: string[],
): { payload: JwtPayload | null; response: NextResponse | null } {
  const payload = getTokenFromRequest(req)

  if (!payload) {
    return {
      payload: null,
      response: NextResponse.json(
        { success: false, message: 'Unauthorized', data: null },
        { status: 401 },
      ),
    }
  }

  if (allowedRoles && !allowedRoles.includes(payload.role)) {
    return {
      payload,
      response: NextResponse.json(
        { success: false, message: 'Forbidden', data: null },
        { status: 403 },
      ),
    }
  }

  return { payload, response: null }
}
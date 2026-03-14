// PATH: backend/lib/response.ts

import { NextRequest, NextResponse } from 'next/server'

// ─── Standar response wrapper ────────────────────────────────

export function ok<T>(data: T, message = 'Success', status = 200) {
  return NextResponse.json({ success: true, message, data }, { status })
}

export function err(message = 'Error', status = 400) {
  return NextResponse.json({ success: false, message, data: null }, { status })
}

// ─── CORS preflight — export dan re-use di setiap route ──────
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// ─── Pagination helper ───────────────────────────────────────

export interface PaginationResult {
  page:  number
  limit: number
  skip:  number
}

export function getPagination(req: NextRequest): PaginationResult {
  const url   = new URL(req.url)
  const page  = Math.max(1, Number(url.searchParams.get('page')  ?? 1))
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 10)))
  const skip  = (page - 1) * limit
  return { page, limit, skip }
}

// ─── Paginated response ──────────────────────────────────────

export function paginated<T>(
  data:    T[],
  total:   number,
  page:    number,
  limit:   number,
  status = 200,
) {
  const totalPages = Math.ceil(total / limit)
  return NextResponse.json(
    {
      success: true,
      message: 'Success',
      data,
      pagination: { total, page, limit, totalPages },
    },
    { status },
  )
}
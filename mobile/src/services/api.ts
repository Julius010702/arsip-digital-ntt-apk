// ======================================================
// FILE: mobile/src/services/api.ts
// ======================================================

import AsyncStorage from '@react-native-async-storage/async-storage'

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api'

async function req<T>(
  method: string,
  path: string,
  body?: any,
  isFormData = false
): Promise<T> {
  const token = await AsyncStorage.getItem('token')
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!isFormData) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body
      ? isFormData ? body : JSON.stringify(body)
      : undefined,
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? 'Terjadi kesalahan')
  return data
}

// ── AUTH ──────────────────────────────────────────────
export const authApi = {
  login:  (email: string, password: string) =>
    req<any>('POST', '/auth/login', { email, password }),
  getMe:  () => req<any>('GET', '/auth/me'),
  update: (data: any) => req<any>('PUT', '/auth/me', data),
}

// ── ARCHIVES ──────────────────────────────────────────
export const archiveApi = {
  list: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '' && v !== null)
        .map(([k, v]) => [k, String(v)])
    ).toString()
    return req<any>('GET', `/archives${q ? `?${q}` : ''}`)
  },
  get:    (id: number) => req<any>('GET', `/archives/${id}`),
  create: (form: FormData) => req<any>('POST', '/archives', form, true),
  update: (id: number, body: any) => req<any>('PUT', `/archives/${id}`, body),
  delete: (id: number) => req<any>('DELETE', `/archives/${id}`),
}

// ── URUSAN ────────────────────────────────────────────
export const urusanApi = {
  list: () => req<any>('GET', '/urusan'),
  detect: (nomorSurat: string, judul: string, perihal: string) =>
    req<any>('POST', '/urusan', { nomorSurat, judul, perihal }),
}

// ── PENILAIAN ─────────────────────────────────────────
export const penilaianApi = {
  list:   (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString()
    return req<any>('GET', `/penilaian${q ? `?${q}` : ''}`)
  },
  create: (body: { archiveId: number; usulanTindakan: string; alasanUsulan: string }) =>
    req<any>('POST', '/penilaian', body),
  aksi: (id: number, body: { aksi: 'setujui' | 'tolak'; catatan: string; tindakanAkhir?: string }) =>
    req<any>('POST', `/penilaian/${id}/aksi`, body),
}

// ── NOTIFIKASI ────────────────────────────────────────
export const notifApi = {
  list:      (belumDibaca = false) =>
    req<any>('GET', `/notifikasi${belumDibaca ? '?belumDibaca=true' : ''}`),
  tandaiDibaca: (ids?: number[]) =>
    req<any>('PUT', '/notifikasi', ids ? { ids } : {}),
}

// ── REPORTS ───────────────────────────────────────────
export const reportApi = {
  dashboard: () => req<any>('GET', '/reports?tipe=dashboard'),
  perUnit:   () => req<any>('GET', '/reports?tipe=perUnit'),
  perUrusan: () => req<any>('GET', '/reports?tipe=perUrusan'),
  retensi:   () => req<any>('GET', '/reports?tipe=retensi'),
}

// ── UNITS ─────────────────────────────────────────────
export const unitApi = {
  list: () => req<any>('GET', '/units'),
}

// ── CATEGORIES ────────────────────────────────────────
export const categoryApi = {
  list: () => req<any>('GET', '/categories'),
}
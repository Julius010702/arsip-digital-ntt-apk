// ======================================================
// FILE: mobile/src/utils/theme.ts
// ======================================================

export const COLORS = {
  primary:       '#1B4F9A',
  primaryDark:   '#0B2447',
  primaryLight:  '#2563EB',
  primarySoft:   '#EFF6FF',
  accent:        '#F59E0B',
  success:       '#059669',
  successSoft:   '#ECFDF5',
  warning:       '#D97706',
  warningSoft:   '#FFFBEB',
  danger:        '#DC2626',
  dangerSoft:    '#FEF2F2',
  info:          '#6366F1',
  infoSoft:      '#EEF2FF',
  white:         '#FFFFFF',
  surface:       '#F0F4FA',
  background:    '#F1F5F9',
  border:        '#E2E8F0',
  text:          '#0F172A',
  textSecondary: '#334155',
  muted:         '#64748B',
  placeholder:   '#94A3B8',
  disabled:      '#CBD5E1',
}

export const STATUS_ARSIP: Record<string, { label: string; color: string; bg: string }> = {
  aktif:       { label: 'Aktif',        color: '#059669', bg: '#ECFDF5' },
  inaktif:     { label: 'Inaktif',      color: '#D97706', bg: '#FFFBEB' },
  dinamis:     { label: 'Dinamis',      color: '#6366F1', bg: '#EEF2FF' },
  dimusnahkan: { label: 'Dimusnahkan',  color: '#DC2626', bg: '#FEF2F2' },
}

export const STATUS_PENILAIAN: Record<string, { label: string; color: string; bg: string }> = {
  menunggu_kepala_bagian: { label: 'Menunggu Kepala Bagian', color: '#D97706', bg: '#FFFBEB' },
  menunggu_kepala_biro:   { label: 'Menunggu Kepala Biro',   color: '#2563EB', bg: '#EFF6FF' },
  menunggu_dinas_arsip:   { label: 'Menunggu Dinas Arsip',   color: '#6366F1', bg: '#EEF2FF' },
  selesai:                { label: 'Selesai',                color: '#059669', bg: '#ECFDF5' },
  ditolak:                { label: 'Ditolak',                color: '#DC2626', bg: '#FEF2F2' },
}

export const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Administrator',
  admin_unit:  'Admin Unit',
  pimpinan:    'Pimpinan',
  staff:       'Staff',
  dinas_arsip: 'Dinas Arsip',
}

export const ROLE_COLOR: Record<string, string> = {
  super_admin: '#7C3AED',
  admin_unit:  '#1B4F9A',
  pimpinan:    '#059669',
  staff:       '#D97706',
  dinas_arsip: '#DC2626',
}

export const CAT_COLORS: Record<string, string> = {
  'Surat Masuk':    '#2563EB',
  'Surat Keluar':   '#059669',
  'SK / Keputusan': '#D97706',
  'Laporan':        '#7C3AED',
  'Notulen':        '#0891B2',
  'Kontrak':        '#DC2626',
  'Peraturan':      '#059669',
}

export const RADIUS  = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 999 }
export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 }

export const SHADOW = {
  sm: { shadowColor: '#0B2447', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,  elevation: 2 },
  md: { shadowColor: '#0B2447', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.09, shadowRadius: 8,  elevation: 4 },
  lg: { shadowColor: '#0B2447', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
}
// ======================================================
// FILE: mobile/src/utils/format.ts
// ======================================================

export function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatDateShort(d: string | Date) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatRelative(d: string) {
  const diff  = Date.now() - new Date(d).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (mins  < 1)  return 'Baru saja'
  if (mins  < 60) return `${mins} menit lalu`
  if (hours < 24) return `${hours} jam lalu`
  if (days  < 7)  return `${days} hari lalu`
  return formatDateShort(d)
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024)    return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function sisaHari(tanggal: string | null): number | null {
  if (!tanggal) return null
  return Math.ceil((new Date(tanggal).getTime() - Date.now()) / 86400000)
}
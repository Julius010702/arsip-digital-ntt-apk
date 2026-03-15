// ======================================================
// FILE: mobile/src/navigation/types.ts
// ======================================================

export type RootStackParams = {
  Login:            undefined
  MainTab:          undefined
  DetailArsip:      { id: number }
  UploadArsip:      undefined
  Penilaian:        undefined
  DetailPenilaian:  { id: number }
  Notifikasi:       undefined
  ManageUser:       undefined
  UrusanManajemen:  undefined  // ✅ BARU
}

export type TabParams = {
  Dashboard:   undefined
  Arsip:       undefined
  UploadArsip: undefined
  Cari:        undefined
  Profil:      undefined
}
// ======================================================
// FILE: mobile/src/navigation/types.ts
// ======================================================

export type RootStackParams = {
  Login:        undefined
  MainTab:      undefined
  DetailArsip:  { id: number }
  UploadArsip:  undefined
  Penilaian:    undefined
  DetailPenilaian: { id: number }
  Notifikasi:   undefined
  ManageUser:   undefined
}

export type TabParams = {
  Dashboard: undefined
  Arsip:     undefined
  Cari:      undefined
  Profil:    undefined
}
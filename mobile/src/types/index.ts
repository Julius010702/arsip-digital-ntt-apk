// ======================================================
// FILE: mobile/src/types/index.ts
// ======================================================

export interface Unit {
  id:       number
  namaUnit: string
  kodeUnit: string
}

export interface Urusan {
  id:         number
  kodeUrusan: string
  namaUrusan: string
  keywords:   string[]
}

export interface Category {
  id:        number
  nama:      string
  deskripsi: string
}

export interface User {
  id:          number
  username:    string
  namaLengkap: string
  email:       string
  role:        string
  unitId:      number | null
  unit:        Unit | null
  status:      boolean
}

export type StatusArsip = 'aktif' | 'inaktif' | 'dinamis' | 'dimusnahkan'

export interface Archive {
  id:                     number
  nomorSurat:             string
  judul:                  string
  tanggalSurat:           string
  pengirim:               string
  penerima:               string
  perihal:                string
  filePath:               string
  kategoriId:             number
  unitId:                 number
  urusanId:               number | null
  createdBy:              number
  createdAt:              string
  statusArsip:            StatusArsip
  masaRetensi:            number
  tanggalMulaiRetensi:    string | null
  tanggalKadaluarsa:      string | null
  keteranganInaktif:      string | null
  nomorPeraturanPengganti: string | null
  category:               Category
  unit:                   Unit
  urusan:                 Urusan | null
  user:                   Pick<User, 'id' | 'namaLengkap' | 'username'>
}

export type StatusPenilaian =
  | 'menunggu_kepala_bagian'
  | 'menunggu_kepala_biro'
  | 'menunggu_dinas_arsip'
  | 'selesai'
  | 'ditolak'

export interface PenilaianArsip {
  id:              number
  archiveId:       number
  dibuatOleh:      number
  usulanTindakan:  string
  alasanUsulan:    string
  status:          StatusPenilaian
  tindakanAkhir:   string | null
  tanggalSelesai:  string | null
  createdAt:       string
  archive:         Archive
  pembuatPenilaian: Pick<User, 'id' | 'namaLengkap' | 'role'>
}

export interface Notifikasi {
  id:          number
  userId:      number
  archiveId:   number | null
  judul:       string
  pesan:       string
  tipe:        string
  sudahDibaca: boolean
  createdAt:   string
  archive:     Pick<Archive, 'id' | 'judul' | 'nomorSurat'> | null
}

export interface Pagination {
  total:      number
  page:       number
  limit:      number
  totalPages: number
}

export interface ApiOk<T> {
  success:    boolean
  data:       T
  pagination?: Pagination
}
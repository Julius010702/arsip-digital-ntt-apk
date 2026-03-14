import { PrismaClient, Role, StatusArsip, TipeNotifikasi } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database Arsip Digital NTT...')

  // ─── UNITS ────────────────────────────────────────────────
  const unitKelembagaan = await prisma.unit.upsert({
    where: { kodeUnit: 'KLB' },
    update: {},
    create: { kodeUnit: 'KLB', namaUnit: 'Bagian Kelembagaan & Anjab', deskripsi: 'Kelembagaan dan Analisis Jabatan' },
  })
  const unitTU = await prisma.unit.upsert({
    where: { kodeUnit: 'TU' },
    update: {},
    create: { kodeUnit: 'TU', namaUnit: 'Bagian Tata Usaha, Yanlik & Tata Laksana', deskripsi: 'Tata Usaha, Pelayanan Publik, dan Tata Laksana Pemerintahan' },
  })
  const unitReformasi = await prisma.unit.upsert({
    where: { kodeUnit: 'RFB' },
    update: {},
    create: { kodeUnit: 'RFB', namaUnit: 'Bagian Reformasi & Akuntabilitas', deskripsi: 'Reformasi Birokrasi dan Akuntabilitas Kinerja' },
  })

  console.log('✅ Units selesai')

  // ─── URUSAN (klasifikasi nomor surat otomatis) ─────────────
  const urusanList = [
    { kodeUrusan: '000', namaUrusan: 'Umum',              deskripsi: 'Urusan umum dan persuratan',            keywords: ['umum', 'surat', 'undangan', 'pengumuman'] },
    { kodeUrusan: '100', namaUrusan: 'Pemerintahan',       deskripsi: 'Urusan pemerintahan umum',              keywords: ['pemerintah', 'gubernur', 'kebijakan', 'peraturan'] },
    { kodeUrusan: '200', namaUrusan: 'Politik',            deskripsi: 'Urusan politik dalam negeri',           keywords: ['politik', 'pemilu', 'partai', 'legislatif'] },
    { kodeUrusan: '300', namaUrusan: 'Pengadaan',          deskripsi: 'Pengadaan barang dan jasa',             keywords: ['pengadaan', 'lelang', 'tender', 'kontrak', 'barang'] },
    { kodeUrusan: '400', namaUrusan: 'Keuangan',           deskripsi: 'Urusan keuangan dan anggaran',          keywords: ['keuangan', 'anggaran', 'dpa', 'rkap', 'laporan keuangan'] },
    { kodeUrusan: '500', namaUrusan: 'Perekonomian',       deskripsi: 'Urusan perekonomian daerah',            keywords: ['ekonomi', 'investasi', 'usaha', 'perdagangan'] },
    { kodeUrusan: '600', namaUrusan: 'Kesejahteraan Rakyat', deskripsi: 'Urusan kesejahteraan sosial',         keywords: ['sosial', 'kesehatan', 'pendidikan', 'kemiskinan'] },
    { kodeUrusan: '700', namaUrusan: 'Hukum',              deskripsi: 'Urusan hukum dan perundangan',          keywords: ['hukum', 'perda', 'pergub', 'regulasi', 'peraturan gubernur'] },
    { kodeUrusan: '800', namaUrusan: 'Kepegawaian',        deskripsi: 'Urusan kepegawaian dan SDM',            keywords: ['mutasi', 'jabatan', 'pegawai', 'asn', 'pns', 'kepegawaian', 'pengangkatan', 'pensiun', 'rotasi'] },
    { kodeUrusan: '900', namaUrusan: 'Pembangunan',        deskripsi: 'Urusan pembangunan dan infrastruktur',  keywords: ['pembangunan', 'infrastruktur', 'proyek', 'konstruksi'] },
  ]

  for (const u of urusanList) {
    await prisma.urusan.upsert({
      where: { kodeUrusan: u.kodeUrusan },
      update: {},
      create: u,
    })
  }
  console.log('✅ Urusan selesai')

  // ─── CATEGORIES ───────────────────────────────────────────
  const categories = [
    { nama: 'Surat Masuk',         deskripsi: 'Surat masuk dari instansi lain' },
    { nama: 'Surat Keluar',        deskripsi: 'Surat keluar kepada instansi lain' },
    { nama: 'SK',                  deskripsi: 'Surat Keputusan' },
    { nama: 'Laporan',             deskripsi: 'Laporan kegiatan dan keuangan' },
    { nama: 'Dokumen Organisasi',  deskripsi: 'Dokumen organisasi dan kelembagaan' },
    { nama: 'Nota Dinas',          deskripsi: 'Nota dinas internal' },
    { nama: 'SPT',                 deskripsi: 'Surat Perintah Tugas' },
    { nama: 'Berita Acara',        deskripsi: 'Berita acara kegiatan' },
  ]

  for (let i = 0; i < categories.length; i++) {
    await prisma.category.upsert({
      where: { nama: categories[i].nama },
      update: {},
      create: categories[i],
    })
  }
  console.log('✅ Categories selesai')

  // ─── USERS ────────────────────────────────────────────────
  const hash = await bcrypt.hash('admin123', 10)

  // Super Admin (Emi & Yuli)
  await prisma.user.upsert({
    where: { email: 'emi@nttprov.go.id' },
    update: {},
    create: {
      username:    'emi',
      namaLengkap: 'Emi (Super Admin)',
      email:       'emi@nttprov.go.id',
      password:    hash,
      role:        Role.super_admin,
      unitId:      unitKelembagaan.id,
    },
  })
  await prisma.user.upsert({
    where: { email: 'yuli@nttprov.go.id' },
    update: {},
    create: {
      username:    'yuli',
      namaLengkap: 'Yuli (Super Admin)',
      email:       'yuli@nttprov.go.id',
      password:    hash,
      role:        Role.super_admin,
      unitId:      unitKelembagaan.id,
    },
  })

  // Admin Unit — Kelembagaan & Anjab (2 orang)
  await prisma.user.upsert({
    where: { email: 'admin1.klb@nttprov.go.id' },
    update: {},
    create: {
      username:    'admin_klb1',
      namaLengkap: 'Admin Kelembagaan 1',
      email:       'admin1.klb@nttprov.go.id',
      password:    hash,
      role:        Role.admin_unit,
      unitId:      unitKelembagaan.id,
    },
  })
  await prisma.user.upsert({
    where: { email: 'admin2.klb@nttprov.go.id' },
    update: {},
    create: {
      username:    'admin_klb2',
      namaLengkap: 'Admin Kelembagaan 2',
      email:       'admin2.klb@nttprov.go.id',
      password:    hash,
      role:        Role.admin_unit,
      unitId:      unitKelembagaan.id,
    },
  })

  // Admin Unit — TU, Yanlik & Tata Laksana (2 orang)
  await prisma.user.upsert({
    where: { email: 'admin1.tu@nttprov.go.id' },
    update: {},
    create: {
      username:    'admin_tu1',
      namaLengkap: 'Admin TU 1',
      email:       'admin1.tu@nttprov.go.id',
      password:    hash,
      role:        Role.admin_unit,
      unitId:      unitTU.id,
    },
  })
  await prisma.user.upsert({
    where: { email: 'admin2.tu@nttprov.go.id' },
    update: {},
    create: {
      username:    'admin_tu2',
      namaLengkap: 'Admin TU 2',
      email:       'admin2.tu@nttprov.go.id',
      password:    hash,
      role:        Role.admin_unit,
      unitId:      unitTU.id,
    },
  })

  // Admin Unit — Reformasi & Akuntabilitas (2 orang)
  await prisma.user.upsert({
    where: { email: 'admin1.rfb@nttprov.go.id' },
    update: {},
    create: {
      username:    'admin_rfb1',
      namaLengkap: 'Admin Reformasi 1',
      email:       'admin1.rfb@nttprov.go.id',
      password:    hash,
      role:        Role.admin_unit,
      unitId:      unitReformasi.id,
    },
  })
  await prisma.user.upsert({
    where: { email: 'admin2.rfb@nttprov.go.id' },
    update: {},
    create: {
      username:    'admin_rfb2',
      namaLengkap: 'Admin Reformasi 2',
      email:       'admin2.rfb@nttprov.go.id',
      password:    hash,
      role:        Role.admin_unit,
      unitId:      unitReformasi.id,
    },
  })

  // Pimpinan
  await prisma.user.upsert({
    where: { email: 'kepala.biro@nttprov.go.id' },
    update: {},
    create: {
      username:    'kepala_biro',
      namaLengkap: 'Kepala Biro Organisasi',
      email:       'kepala.biro@nttprov.go.id',
      password:    hash,
      role:        Role.pimpinan,
      unitId:      unitKelembagaan.id,
    },
  })

  // Dinas Arsip
  await prisma.user.upsert({
    where: { email: 'dinas.arsip@nttprov.go.id' },
    update: {},
    create: {
      username:    'dinas_arsip',
      namaLengkap: 'Dinas Arsip Provinsi NTT',
      email:       'dinas.arsip@nttprov.go.id',
      password:    hash,
      role:        Role.dinas_arsip,
      unitId:      null,
    },
  })

  // Staff
  await prisma.user.upsert({
    where: { email: 'staff@nttprov.go.id' },
    update: {},
    create: {
      username:    'staff01',
      namaLengkap: 'Staff Arsip',
      email:       'staff@nttprov.go.id',
      password:    hash,
      role:        Role.staff,
      unitId:      unitTU.id,
    },
  })

  console.log('✅ Users selesai')
  console.log('')
  console.log('📧 Akun tersedia (password: admin123)')
  console.log('   emi@nttprov.go.id              → super_admin')
  console.log('   yuli@nttprov.go.id             → super_admin')
  console.log('   admin1.klb@nttprov.go.id       → admin_unit (Kelembagaan)')
  console.log('   admin2.klb@nttprov.go.id       → admin_unit (Kelembagaan)')
  console.log('   admin1.tu@nttprov.go.id        → admin_unit (TU)')
  console.log('   admin2.tu@nttprov.go.id        → admin_unit (TU)')
  console.log('   admin1.rfb@nttprov.go.id       → admin_unit (Reformasi)')
  console.log('   admin2.rfb@nttprov.go.id       → admin_unit (Reformasi)')
  console.log('   kepala.biro@nttprov.go.id      → pimpinan')
  console.log('   dinas.arsip@nttprov.go.id      → dinas_arsip')
  console.log('   staff@nttprov.go.id            → staff')
  console.log('')
  console.log('🎉 Seed selesai!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
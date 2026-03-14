/*
  Warnings:

  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[nama]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[kodeUnit]` on the table `Unit` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `masaRetensi` to the `Archive` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Archive` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kodeUnit` to the `Unit` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('super_admin', 'admin_unit', 'pimpinan', 'staff', 'dinas_arsip');

-- CreateEnum
CREATE TYPE "StatusArsip" AS ENUM ('aktif', 'inaktif', 'dinamis', 'dimusnahkan');

-- CreateEnum
CREATE TYPE "StatusPenilaian" AS ENUM ('menunggu_kepala_bagian', 'menunggu_kepala_biro', 'menunggu_dinas_arsip', 'selesai', 'ditolak');

-- CreateEnum
CREATE TYPE "TindakanArsip" AS ENUM ('hapus', 'inaktif', 'dinamis', 'pertahankan');

-- CreateEnum
CREATE TYPE "TipeNotifikasi" AS ENUM ('retensi_hampir_habis', 'retensi_habis', 'penilaian_baru', 'penilaian_perlu_aksi', 'arsip_dimusnahkan');

-- AlterTable
ALTER TABLE "Archive" ADD COLUMN     "judulPeraturanPengganti" TEXT,
ADD COLUMN     "keteranganInaktif" TEXT,
ADD COLUMN     "masaRetensi" INTEGER NOT NULL,
ADD COLUMN     "nomorPeraturanPengganti" TEXT,
ADD COLUMN     "statusArsip" "StatusArsip" NOT NULL DEFAULT 'aktif',
ADD COLUMN     "tanggalKadaluarsa" TIMESTAMP(3),
ADD COLUMN     "tanggalMulaiRetensi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "urusanId" INTEGER;

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "kodeUnit" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'staff';

-- CreateTable
CREATE TABLE "Urusan" (
    "id" SERIAL NOT NULL,
    "kodeUrusan" TEXT NOT NULL,
    "namaUrusan" TEXT NOT NULL,
    "deskripsi" TEXT,
    "keywords" TEXT[],

    CONSTRAINT "Urusan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenilaianArsip" (
    "id" SERIAL NOT NULL,
    "archiveId" INTEGER NOT NULL,
    "dibuatOleh" INTEGER NOT NULL,
    "status" "StatusPenilaian" NOT NULL DEFAULT 'menunggu_kepala_bagian',
    "usulanTindakan" "TindakanArsip" NOT NULL,
    "alasanUsulan" TEXT NOT NULL,
    "nilaiKepalaBagian" TEXT,
    "catatanKepalaBagian" TEXT,
    "disetujuiKepalaBagianId" INTEGER,
    "tanggalKepalaBagian" TIMESTAMP(3),
    "nilaiKepalaBiro" TEXT,
    "catatanKepalaBiro" TEXT,
    "disetujuiKepalaBiroId" INTEGER,
    "tanggalKepalaBiro" TIMESTAMP(3),
    "keputusanDinas" TEXT,
    "catatanDinas" TEXT,
    "disetujuiDinasId" INTEGER,
    "tanggalDinas" TIMESTAMP(3),
    "tindakanAkhir" "TindakanArsip",
    "tanggalSelesai" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PenilaianArsip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notifikasi" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "archiveId" INTEGER,
    "judul" TEXT NOT NULL,
    "pesan" TEXT NOT NULL,
    "tipe" "TipeNotifikasi" NOT NULL,
    "sudahDibaca" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notifikasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "aksi" TEXT NOT NULL,
    "tabel" TEXT NOT NULL,
    "recordId" INTEGER NOT NULL,
    "detailLama" TEXT,
    "detailBaru" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Urusan_kodeUrusan_key" ON "Urusan"("kodeUrusan");

-- CreateIndex
CREATE UNIQUE INDEX "Category_nama_key" ON "Category"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_kodeUnit_key" ON "Unit"("kodeUnit");

-- AddForeignKey
ALTER TABLE "Archive" ADD CONSTRAINT "Archive_urusanId_fkey" FOREIGN KEY ("urusanId") REFERENCES "Urusan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenilaianArsip" ADD CONSTRAINT "PenilaianArsip_archiveId_fkey" FOREIGN KEY ("archiveId") REFERENCES "Archive"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenilaianArsip" ADD CONSTRAINT "PenilaianArsip_dibuatOleh_fkey" FOREIGN KEY ("dibuatOleh") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenilaianArsip" ADD CONSTRAINT "PenilaianArsip_disetujuiDinasId_fkey" FOREIGN KEY ("disetujuiDinasId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifikasi" ADD CONSTRAINT "Notifikasi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifikasi" ADD CONSTRAINT "Notifikasi_archiveId_fkey" FOREIGN KEY ("archiveId") REFERENCES "Archive"("id") ON DELETE SET NULL ON UPDATE CASCADE;

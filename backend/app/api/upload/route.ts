// PATH: backend/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { requireAuth } from '@/lib/auth'
import { err, OPTIONS } from '@/lib/response'

export { OPTIONS }

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: NextRequest) {
  const { response } = requireAuth(req)
  if (response) return response

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return err('File tidak ditemukan')

    const bytes   = await file.arrayBuffer()
    const buffer  = Buffer.from(bytes)
    const base64  = buffer.toString('base64')
    const dataUri = `data:${file.type};base64,${base64}`

    const result = await cloudinary.uploader.upload(dataUri, {
      folder:        'arsip-digital-ntt',
      resource_type: 'raw',
      type:          'upload',
      access_mode:   'public',
      public_id:     `${Date.now()}-${file.name.replace(/\s+/g, '_')}`,
    })

    return NextResponse.json({
      success: true,
      message: 'File berhasil diupload',
      data: {
        url:      result.secure_url,
        publicId: result.public_id,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
    })
  } catch (e: any) {
    console.error('Upload error:', e)
    return err('Gagal upload file: ' + e.message, 500)
  }
}
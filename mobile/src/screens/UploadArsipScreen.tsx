// ======================================================
// FILE: mobile/src/screens/UploadArsipScreen.tsx
// ======================================================

import React, { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { useNavigation } from '@react-navigation/native'
import { archiveApi, categoryApi, urusanApi, unitApi } from '../services/api'
import { Category, Unit, Urusan } from '../types'
import { COLORS, RADIUS, SHADOW, SPACING } from '../utils/theme'
import { useAuth } from '../hooks/useAuth'
import AsyncStorage from '@react-native-async-storage/async-storage'

const BASE = 'https://arsip-digital-ntt-apk.vercel.app/api'

async function uploadFile(file: { name: string; uri: string; mimeType?: string }): Promise<string> {
  const token = await AsyncStorage.getItem('token')
  const fd = new FormData()
  fd.append('file', {
    uri:  file.uri,
    name: file.name,
    type: file.mimeType ?? 'application/pdf',
  } as any)

  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  })
  const data = await res.json()
  if (!res.ok || !data.success) throw new Error(data.message ?? 'Upload file gagal')
  return data.data.url
}

export default function UploadArsipScreen() {
  const { user } = useAuth()
  const nav      = useNavigation()

  const [loading,    setLoading]    = useState(false)
  const [uploadStep, setUploadStep] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [units,      setUnits]      = useState<Unit[]>([])
  const [urusanList, setUrusanList] = useState<Urusan[]>([])
  const [file,       setFile]       = useState<{ name: string; uri: string; mimeType?: string; size?: number } | null>(null)

  const [detectedUrusan,  setDetectedUrusan]  = useState<Urusan | null>(null)
  const [detectingUrusan, setDetectingUrusan] = useState(false)

  const [nomorSurat,   setNomorSurat]   = useState('')
  const [judul,        setJudul]        = useState('')
  const [pengirim,     setPengirim]     = useState('')
  const [penerima,     setPenerima]     = useState('')
  const [perihal,      setPerihal]      = useState('')
  const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().split('T')[0])
  const [kategoriId,   setKategoriId]   = useState<number>(0)
  const [unitId,       setUnitId]       = useState<number>(user?.unitId ?? 0)
  const [masaRetensi,  setMasaRetensi]  = useState('60')

  useEffect(() => {
    Promise.all([categoryApi.list(), unitApi.list(), urusanApi.list()]).then(([c, u, ur]) => {
      const unitData = Array.isArray(u?.data) ? u.data : Array.isArray(u) ? u : []
      setCategories(c.data ?? [])
      setUnits(unitData)
      setUrusanList(ur.data ?? [])
      if (!kategoriId && c.data?.length) setKategoriId(c.data[0].id)
      if (user?.unitId) setUnitId(user.unitId)
      else if (unitData.length) setUnitId(unitData[0].id)
    }).catch((e: any) => console.error('Load data error:', e))
  }, [])

  useEffect(() => {
    if (!nomorSurat && !judul && !perihal) return
    const timer = setTimeout(async () => {
      if (!nomorSurat && !perihal) return
      setDetectingUrusan(true)
      try {
        const res = await urusanApi.detect(nomorSurat, judul, perihal)
        setDetectedUrusan(res.data?.sumber !== 'default' ? (res.data?.urusan ?? null) : null)
      } catch { } finally { setDetectingUrusan(false) }
    }, 600)
    return () => clearTimeout(timer)
  }, [nomorSurat, perihal, judul])

  async function pickFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      })
      if (!res.canceled && res.assets?.length) {
        const a = res.assets[0]
        setFile({ name: a.name, uri: a.uri, mimeType: a.mimeType, size: a.size })
      }
    } catch { Alert.alert('Error', 'Gagal memilih file') }
  }

  async function handleSubmit() {
    if (!nomorSurat.trim()) { Alert.alert('Peringatan', 'Nomor surat wajib diisi'); return }
    if (!judul.trim())      { Alert.alert('Peringatan', 'Judul wajib diisi'); return }
    if (!pengirim.trim())   { Alert.alert('Peringatan', 'Pengirim wajib diisi'); return }
    if (!penerima.trim())   { Alert.alert('Peringatan', 'Penerima wajib diisi'); return }
    if (!perihal.trim())    { Alert.alert('Peringatan', 'Perihal wajib diisi'); return }
    if (!tanggalSurat)      { Alert.alert('Peringatan', 'Tanggal surat wajib diisi'); return }
    if (!kategoriId)        { Alert.alert('Peringatan', 'Pilih kategori'); return }
    if (!unitId)            { Alert.alert('Peringatan', 'Pilih unit kerja'); return }
    if (!file)              { Alert.alert('Peringatan', 'File dokumen wajib diunggah'); return }

    const retensiNum = parseInt(masaRetensi)
    if (isNaN(retensiNum) || retensiNum < 1) {
      Alert.alert('Peringatan', 'Masa retensi harus berupa angka (bulan)')
      return
    }

    setLoading(true)
    try {
      // Step 1: Upload file ke Cloudinary
      setUploadStep('Mengupload file ke cloud...')
      const fileUrl = await uploadFile(file)

      // Step 2: Simpan data arsip ke database
      setUploadStep('Menyimpan data arsip...')
      await archiveApi.create({
        nomorSurat:   nomorSurat.trim(),
        judul:        judul.trim(),
        pengirim:     pengirim.trim(),
        penerima:     penerima.trim(),
        perihal:      perihal.trim(),
        tanggalSurat: new Date(tanggalSurat).toISOString(),
        kategoriId,
        unitId,
        masaRetensi:  retensiNum,
        filePath:     fileUrl,
      })

      Alert.alert('Berhasil ✅', 'Arsip berhasil diunggah ke sistem', [
        { text: 'OK', onPress: () => nav.goBack() },
      ])
    } catch (e: any) {
      Alert.alert('Upload Gagal', e.message)
    } finally {
      setLoading(false)
      setUploadStep('')
    }
  }

  const isAdminUnit = user?.role === 'admin_unit'

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* FILE PICKER */}
        <TouchableOpacity style={[s.dropZone, file && s.dropActive]} onPress={pickFile}>
          {file ? (
            <>
              <Ionicons name="document" size={32} color={COLORS.primaryLight} />
              <View style={{ flex: 1 }}>
                <Text style={s.fileName} numberOfLines={1}>{file.name}</Text>
                {file.size && <Text style={s.fileSize}>{(file.size / 1024).toFixed(1)} KB</Text>}
              </View>
              <TouchableOpacity onPress={() => setFile(null)}>
                <Ionicons name="close-circle" size={22} color={COLORS.placeholder} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={s.dropIcon}>
                <Ionicons name="cloud-upload-outline" size={32} color={COLORS.primaryLight} />
              </View>
              <Text style={s.dropText}>Ketuk untuk pilih file</Text>
              <Text style={s.dropHint}>PDF / DOC / DOCX — Maks. 10MB</Text>
            </>
          )}
        </TouchableOpacity>

        {/* DETEKSI URUSAN */}
        {(detectingUrusan || detectedUrusan) && (
          <View style={s.urusanBox}>
            <Ionicons name="flash" size={16} color={COLORS.accent} />
            {detectingUrusan
              ? <Text style={s.urusanText}>Mendeteksi urusan...</Text>
              : <Text style={s.urusanText}>
                  Urusan terdeteksi: <Text style={s.urusanBold}>{detectedUrusan?.kodeUrusan} — {detectedUrusan?.namaUrusan}</Text>
                </Text>
            }
          </View>
        )}

        {/* INFO SURAT */}
        <View style={s.section}>
          <Text style={s.secTitle}>Informasi Surat</Text>
          <Field label="Nomor Surat *"   placeholder="800/BO-NTT/I/2025"         icon="barcode-outline"       value={nomorSurat}   onChangeText={setNomorSurat} hint="Prefix angka otomatis terklasifikasi" />
          <Field label="Judul Dokumen *" placeholder="Judul surat / dokumen"      icon="document-text-outline" value={judul}        onChangeText={setJudul} />
          <Field label="Tanggal Surat *" placeholder="YYYY-MM-DD"                 icon="calendar-outline"      value={tanggalSurat} onChangeText={setTanggalSurat} keyboardType="numeric" />
          <Field label="Pengirim *"      placeholder="Nama / instansi pengirim"   icon="person-outline"        value={pengirim}     onChangeText={setPengirim} />
          <Field label="Penerima *"      placeholder="Nama / instansi penerima"   icon="people-outline"        value={penerima}     onChangeText={setPenerima} />
          <Field label="Perihal *"       placeholder="Perihal atau topik surat"   icon="chatbubble-outline"    value={perihal}      onChangeText={setPerihal} multiline />
        </View>

        {/* RETENSI */}
        <View style={s.section}>
          <Text style={s.secTitle}>Masa Retensi</Text>
          <Text style={s.retensiHint}>Masa retensi adalah berapa lama (bulan) arsip ini aktif sebelum perlu ditinjau ulang.</Text>
          <View style={s.retensiRow}>
            {[12, 24, 36, 60, 84, 120].map(m => (
              <TouchableOpacity key={m} style={[s.retensiChip, masaRetensi === String(m) && s.retensiChipActive]} onPress={() => setMasaRetensi(String(m))}>
                <Text style={[s.retensiChipText, masaRetensi === String(m) && s.retensiChipTextActive]}>
                  {m / 12} thn
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="Atau isi manual (bulan)" placeholder="Contoh: 60" icon="time-outline" value={masaRetensi} onChangeText={setMasaRetensi} keyboardType="numeric" />
        </View>

        {/* KLASIFIKASI */}
        <View style={s.section}>
          <Text style={s.secTitle}>Klasifikasi</Text>
          <Text style={s.label}>Kategori *</Text>
          <View style={s.pills}>
            {categories.map(c => (
              <TouchableOpacity key={c.id} style={[s.pill, kategoriId === c.id && s.pillActive]} onPress={() => setKategoriId(c.id)}>
                <Text style={[s.pillText, kategoriId === c.id && s.pillTextActive]}>{c.nama}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[s.label, { marginTop: 16 }]}>Unit Kerja *</Text>
          {isAdminUnit ? (
            <View style={s.unitLocked}>
              <Ionicons name="lock-closed-outline" size={16} color={COLORS.muted} />
              <Text style={s.unitLockedText}>{units.find(u => u.id === unitId)?.namaUnit ?? 'Unit Anda'}</Text>
            </View>
          ) : (
            <View style={s.pills}>
              {units.map(u => (
                <TouchableOpacity key={u.id} style={[s.pill, unitId === u.id && s.pillActive]} onPress={() => setUnitId(u.id)}>
                  <Text style={[s.pillText, unitId === u.id && s.pillTextActive]}>{u.namaUnit}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* SUBMIT */}
        <TouchableOpacity style={[s.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color={COLORS.white} />
              <Text style={[s.submitText, { fontSize: 13 }]}>{uploadStep}</Text>
            </View>
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color={COLORS.white} />
              <Text style={s.submitText}>Upload Arsip</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

function Field({ label, placeholder, icon, value, onChangeText, multiline = false, keyboardType = 'default', hint }: {
  label: string; placeholder: string; icon: string
  value: string; onChangeText: (v: string) => void
  multiline?: boolean; keyboardType?: string; hint?: string
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>
      {hint && <Text style={s.fieldHint}>{hint}</Text>}
      <View style={[s.inputWrap, multiline && { alignItems: 'flex-start', paddingTop: 12 }]}>
        <Ionicons name={icon as any} size={17} color={COLORS.placeholder} style={{ marginTop: multiline ? 2 : 0 }} />
        <TextInput
          style={[s.input, multiline && { height: 72, textAlignVertical: 'top' }]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          keyboardType={keyboardType as any}
        />
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg },
  dropZone:   { borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.disabled, borderRadius: RADIUS.lg, padding: 24, alignItems: 'center', backgroundColor: COLORS.surface, marginBottom: SPACING.md, gap: 8 },
  dropActive: { borderStyle: 'solid', borderColor: COLORS.primaryLight, backgroundColor: COLORS.primarySoft, flexDirection: 'row', gap: 12, alignItems: 'center' },
  dropIcon:   { width: 60, height: 60, borderRadius: 16, backgroundColor: COLORS.primarySoft, justifyContent: 'center', alignItems: 'center' },
  dropText:   { fontSize: 14, fontWeight: '700', color: COLORS.muted },
  dropHint:   { fontSize: 12, color: COLORS.placeholder },
  fileName:   { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1 },
  fileSize:   { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  urusanBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.warningSoft, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  urusanText: { flex: 1, fontSize: 13, color: COLORS.text },
  urusanBold: { fontWeight: '700', color: COLORS.primary },
  section:  { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm },
  secTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 16 },
  retensiHint:           { fontSize: 12, color: COLORS.muted, marginBottom: SPACING.md, lineHeight: 18 },
  retensiRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md },
  retensiChip:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  retensiChipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  retensiChipText:       { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  retensiChipTextActive: { color: COLORS.white },
  fieldWrap: { marginBottom: 14 },
  label:     { fontSize: 12, fontWeight: '700', color: COLORS.text, marginBottom: 7 },
  fieldHint: { fontSize: 11, color: COLORS.muted, marginBottom: 5 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, paddingHorizontal: 12, gap: 8 },
  input:     { flex: 1, height: 46, fontSize: 14, color: COLORS.text },
  pills:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:           { borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: COLORS.surface },
  pillActive:     { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primaryLight },
  pillText:       { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  pillTextActive: { color: COLORS.white },
  unitLocked:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  unitLockedText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  submitBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.lg, paddingVertical: 16, gap: 10, elevation: 8 },
  submitText: { fontSize: 16, fontWeight: '800', color: COLORS.white },
})
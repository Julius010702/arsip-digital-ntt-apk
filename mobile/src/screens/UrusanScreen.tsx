// ======================================================
// FILE: mobile/src/screens/UploadArsipScreen.tsx
// ======================================================

import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Animated, Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { archiveApi, categoryApi, urusanApi, unitApi } from '../services/api'
import { Category, Unit, Urusan } from '../types'
import { COLORS, RADIUS, SHADOW, SPACING } from '../utils/theme'
import { useAuth } from '../hooks/useAuth'
import AsyncStorage from '@react-native-async-storage/async-storage'

const BASE  = 'https://arsip-digital-ntt-apk.vercel.app/api'
const { width } = Dimensions.get('window')

async function uploadFile(file: { name: string; uri: string; mimeType?: string }): Promise<string> {
  const token = await AsyncStorage.getItem('token')
  const fd    = new FormData()
  fd.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/pdf' } as any)
  const res  = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  })
  const data = await res.json()
  if (!res.ok || !data.success) throw new Error(data.message ?? 'Upload file gagal')
  return data.data.url
}

function getFileIcon(name: string): { icon: string; color: string; bg: string } {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf')  return { icon: 'document-text', color: '#EF4444', bg: '#FEF2F2' }
  if (ext === 'doc' || ext === 'docx') return { icon: 'document', color: '#2563EB', bg: '#DBEAFE' }
  return { icon: 'attach', color: '#64748B', bg: '#F1F5F9' }
}

const STEPS = ['File', 'Info Surat', 'Klasifikasi']

export default function UploadArsipScreen() {
  const { user } = useAuth()
  const nav      = useNavigation()
  const insets   = useSafeAreaInsets()

  const [step,       setStep]       = useState(0)
  const [loading,    setLoading]    = useState(false)
  const [uploadStep, setUploadStep] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [units,      setUnits]      = useState<Unit[]>([])
  const [urusanList, setUrusanList] = useState<Urusan[]>([])
  const [file,       setFile]       = useState<{ name: string; uri: string; mimeType?: string; size?: number } | null>(null)

  // ── Urusan detection state ──
  const [detectedUrusan,  setDetectedUrusan]  = useState<Urusan | null>(null)
  const [selectedUrusan,  setSelectedUrusan]  = useState<Urusan | null>(null)
  const [detectingUrusan, setDetectingUrusan] = useState(false)
  const [showUrusanPicker, setShowUrusanPicker] = useState(false)
  const [urusanSearch,     setUrusanSearch]     = useState('')

  const [nomorSurat,   setNomorSurat]   = useState('')
  const [judul,        setJudul]        = useState('')
  const [pengirim,     setPengirim]     = useState('')
  const [penerima,     setPenerima]     = useState('')
  const [perihal,      setPerihal]      = useState('')
  const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().split('T')[0])
  const [kategoriId,   setKategoriId]   = useState<number>(0)
  const [unitId,       setUnitId]       = useState<number>(user?.unitId ?? 0)
  const [masaRetensi,  setMasaRetensi]  = useState('60')

  const fadeAnim  = useRef(new Animated.Value(1)).current
  const slideAnim = useRef(new Animated.Value(0)).current

  function animateStep() {
    fadeAnim.setValue(0)
    slideAnim.setValue(20)
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start()
  }

  useEffect(() => {
    Promise.all([categoryApi.list(), unitApi.list(), urusanApi.list()]).then(([c, u, ur]) => {
      const unitData = Array.isArray(u?.data) ? u.data : Array.isArray(u) ? u : []
      setCategories(c.data ?? [])
      setUnits(unitData)
      setUrusanList(ur.data ?? [])
      if (!kategoriId && c.data?.length) setKategoriId(c.data[0].id)
      if (user?.unitId) setUnitId(user.unitId)
      else if (unitData.length) setUnitId(unitData[0].id)
    }).catch((e: any) => console.error(e))
  }, [])

  // ── Auto-detect urusan dari nomor surat, judul, perihal ──
  useEffect(() => {
    if (!nomorSurat && !perihal && !judul) return
    const timer = setTimeout(async () => {
      setDetectingUrusan(true)
      try {
        const res = await urusanApi.detect(nomorSurat, judul, perihal)
        if (res.data?.sumber !== 'default' && res.data?.urusan) {
          const found = res.data.urusan as Urusan
          setDetectedUrusan(found)
          // Auto-select jika belum dipilih manual
          if (!selectedUrusan) setSelectedUrusan(found)
        } else {
          setDetectedUrusan(null)
        }
      } catch { } finally { setDetectingUrusan(false) }
    }, 600)
    return () => clearTimeout(timer)
  }, [nomorSurat, perihal, judul])

  // Filter urusan list untuk picker
  const filteredUrusan = urusanSearch.trim()
    ? urusanList.filter(u =>
        u.kodeUrusan.toLowerCase().includes(urusanSearch.toLowerCase()) ||
        u.namaUrusan.toLowerCase().includes(urusanSearch.toLowerCase()) ||
        u.keywords?.some(k => k.toLowerCase().includes(urusanSearch.toLowerCase()))
      )
    : urusanList

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

  function nextStep() {
    if (step === 0 && !file) { Alert.alert('Peringatan', 'Pilih file dokumen terlebih dahulu'); return }
    if (step === 1) {
      if (!nomorSurat.trim()) { Alert.alert('Peringatan', 'Nomor surat wajib diisi'); return }
      if (!judul.trim())      { Alert.alert('Peringatan', 'Judul wajib diisi'); return }
      if (!pengirim.trim())   { Alert.alert('Peringatan', 'Pengirim wajib diisi'); return }
      if (!penerima.trim())   { Alert.alert('Peringatan', 'Penerima wajib diisi'); return }
      if (!perihal.trim())    { Alert.alert('Peringatan', 'Perihal wajib diisi'); return }
    }
    animateStep()
    setStep(s => s + 1)
  }

  function prevStep() {
    animateStep()
    setStep(s => s - 1)
  }

  async function handleSubmit() {
    if (!kategoriId) { Alert.alert('Peringatan', 'Pilih kategori'); return }
    if (!unitId)     { Alert.alert('Peringatan', 'Pilih unit kerja'); return }
    const retensiNum = parseInt(masaRetensi)
    if (isNaN(retensiNum) || retensiNum < 1) { Alert.alert('Peringatan', 'Masa retensi harus angka'); return }

    setLoading(true)
    try {
      setUploadStep('Mengupload file ke cloud...')
      const fileUrl = await uploadFile(file!)

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
        // ✅ Kirim urusanId jika sudah dipilih/terdeteksi
        urusanId:     selectedUrusan?.id ?? undefined,
      })

      Alert.alert(
        'Berhasil ✅',
        selectedUrusan
          ? `Arsip berhasil diunggah dan diklasifikasikan ke urusan:\n${selectedUrusan.kodeUrusan} — ${selectedUrusan.namaUrusan}`
          : 'Arsip berhasil diunggah ke sistem',
        [{ text: 'OK', onPress: () => nav.goBack() }]
      )
    } catch (e: any) {
      Alert.alert('Upload Gagal', e.message)
    } finally {
      setLoading(false)
      setUploadStep('')
    }
  }

  const isAdminUnit = user?.role === 'admin_unit'
  const fileCfg     = file ? getFileIcon(file.name) : null

  return (
    <View style={s.root}>

      {/* ══ HEADER ══ */}
      <LinearGradient colors={['#0F172A', '#1E3A5F']} style={[s.header, { paddingTop: insets.top + 14 }]}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Upload Arsip</Text>
            <Text style={s.headerSub}>Langkah {step + 1} dari {STEPS.length}</Text>
          </View>
        </View>

        {/* Step indicator */}
        <View style={s.stepRow}>
          {STEPS.map((label, i) => (
            <React.Fragment key={i}>
              <View style={s.stepItem}>
                <View style={[s.stepCircle, i < step && s.stepDone, i === step && s.stepActive]}>
                  {i < step
                    ? <Ionicons name="checkmark" size={12} color="#fff" />
                    : <Text style={[s.stepNum, i === step && { color: '#fff' }]}>{i + 1}</Text>
                  }
                </View>
                <Text style={[s.stepLabel, i === step && { color: '#fff' }, i < step && { color: '#34D399' }]}>
                  {label}
                </Text>
              </View>
              {i < STEPS.length - 1 && (
                <View style={[s.stepLine, i < step && { backgroundColor: '#34D399' }]} />
              )}
            </React.Fragment>
          ))}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ══ STEP 0: FILE ══ */}
          {step === 0 && (
            <View>
              <Text style={s.stepTitle}>Pilih Dokumen</Text>
              <Text style={s.stepDesc}>Upload file arsip dalam format PDF, DOC, atau DOCX</Text>

              {!file ? (
                <TouchableOpacity style={s.dropZone} onPress={pickFile} activeOpacity={0.85}>
                  <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={s.dropIconBox}>
                    <Ionicons name="cloud-upload-outline" size={36} color="#3B82F6" />
                  </LinearGradient>
                  <Text style={s.dropTitle}>Ketuk untuk memilih file</Text>
                  <Text style={s.dropSub}>PDF · DOC · DOCX · Maks. 10MB</Text>
                  <View style={s.dropBtn}>
                    <Ionicons name="folder-open-outline" size={14} color="#3B82F6" />
                    <Text style={s.dropBtnText}>Buka File Manager</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={s.fileCard}>
                  <LinearGradient colors={[fileCfg!.bg, fileCfg!.bg + 'AA']} style={s.fileIconBox}>
                    <Ionicons name={fileCfg!.icon as any} size={28} color={fileCfg!.color} />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fileCardName} numberOfLines={2}>{file.name}</Text>
                    {file.size && <Text style={s.fileCardSize}>{(file.size / 1024).toFixed(1)} KB</Text>}
                    <View style={[s.fileExtBadge, { backgroundColor: fileCfg!.bg }]}>
                      <Text style={[s.fileExtText, { color: fileCfg!.color }]}>
                        {file.name.split('.').pop()?.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity style={s.fileRemoveBtn} onPress={() => setFile(null)}>
                    <Ionicons name="close" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}

              {file && (
                <TouchableOpacity style={s.changeFileBtn} onPress={pickFile}>
                  <Ionicons name="swap-horizontal-outline" size={14} color="#3B82F6" />
                  <Text style={s.changeFileTxt}>Ganti File</Text>
                </TouchableOpacity>
              )}

              <View style={s.tipsCard}>
                <View style={s.tipsHeader}>
                  <Ionicons name="information-circle" size={16} color="#3B82F6" />
                  <Text style={s.tipsTitle}>Tips Upload</Text>
                </View>
                {[
                  'Pastikan file tidak terpassword/terenkripsi',
                  'Ukuran file maksimal 10MB',
                  'Format yang didukung: PDF, DOC, DOCX',
                ].map((t, i) => (
                  <View key={i} style={s.tipRow}>
                    <View style={s.tipDot} />
                    <Text style={s.tipTxt}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ══ STEP 1: INFO SURAT ══ */}
          {step === 1 && (
            <View>
              <Text style={s.stepTitle}>Informasi Surat</Text>
              <Text style={s.stepDesc}>Isi detail informasi dokumen arsip</Text>

              {/* ── DETEKSI URUSAN ── */}
              {(detectingUrusan || detectedUrusan || selectedUrusan) && (
                <View style={s.urusanDetectCard}>
                  <View style={s.urusanDetectHeader}>
                    <View style={s.urusanDetectIcon}>
                      <Ionicons name="flash" size={14} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      {detectingUrusan ? (
                        <Text style={s.urusanDetectLbl}>Mendeteksi urusan...</Text>
                      ) : selectedUrusan ? (
                        <>
                          <Text style={s.urusanDetectLbl}>
                            {detectedUrusan?.id === selectedUrusan.id ? '⚡ Terdeteksi Otomatis' : '✋ Dipilih Manual'}
                          </Text>
                          <Text style={s.urusanDetectVal}>
                            {selectedUrusan.kodeUrusan} — {selectedUrusan.namaUrusan}
                          </Text>
                        </>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={s.urusanChangeBtn}
                      onPress={() => { setUrusanSearch(''); setShowUrusanPicker(true) }}
                    >
                      <Text style={s.urusanChangeTxt}>Ganti</Text>
                    </TouchableOpacity>
                    {selectedUrusan && (
                      <TouchableOpacity
                        style={s.urusanClearBtn}
                        onPress={() => { setSelectedUrusan(null); setDetectedUrusan(null) }}
                      >
                        <Ionicons name="close" size={14} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Keywords preview */}
                  {(selectedUrusan?.keywords?.length ?? 0) > 0 && (
                    <View style={s.urusanKeywords}>
                      {(selectedUrusan?.keywords ?? []).slice(0, 5).map((k, i) => (
                        <View key={i} style={s.urusanKwChip}>
                          <Text style={s.urusanKwText}>{k}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Tombol pilih urusan manual jika belum ada */}
              {!detectingUrusan && !selectedUrusan && (
                <TouchableOpacity
                  style={s.pickUrusanBtn}
                  onPress={() => { setUrusanSearch(''); setShowUrusanPicker(true) }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="pricetag-outline" size={15} color="#8B5CF6" />
                  <Text style={s.pickUrusanTxt}>Pilih Urusan Manual</Text>
                  <Ionicons name="chevron-forward" size={14} color="#8B5CF6" />
                </TouchableOpacity>
              )}

              <View style={s.formCard}>
                <FormField label="Nomor Surat"   placeholder="800/BO-NTT/I/2025"      icon="barcode-outline"       value={nomorSurat}   onChange={setNomorSurat}   required hint="Prefix angka menentukan klasifikasi urusan" />
                <FormField label="Judul Dokumen" placeholder="Judul surat/dokumen"     icon="document-text-outline" value={judul}        onChange={setJudul}        required />
                <FormField label="Tanggal Surat" placeholder="YYYY-MM-DD"              icon="calendar-outline"      value={tanggalSurat} onChange={setTanggalSurat} required keyboardType="numeric" />
              </View>

              <View style={s.formCard}>
                <FormField label="Pengirim" placeholder="Nama / instansi pengirim"     icon="person-outline"     value={pengirim} onChange={setPengirim} required />
                <FormField label="Penerima" placeholder="Nama / instansi penerima"     icon="people-outline"     value={penerima} onChange={setPenerima} required />
                <FormField label="Perihal"  placeholder="Perihal / topik surat"        icon="chatbubble-outline" value={perihal}  onChange={setPerihal}  required multiline last />
              </View>
            </View>
          )}

          {/* ══ STEP 2: KLASIFIKASI ══ */}
          {step === 2 && (
            <View>
              <Text style={s.stepTitle}>Klasifikasi & Retensi</Text>
              <Text style={s.stepDesc}>Tentukan kategori, unit, dan masa retensi arsip</Text>

              {/* Ringkasan urusan yang dipilih */}
              {selectedUrusan && (
                <View style={s.urusanSummary}>
                  <View style={s.urusanSummaryLeft}>
                    <LinearGradient
                      colors={['#8B5CF6', '#7C3AED']}
                      style={s.urusanSummaryBadge}
                    >
                      <Text style={s.urusanSummaryKode}>{selectedUrusan.kodeUrusan}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={s.urusanSummaryName}>{selectedUrusan.namaUrusan}</Text>
                      <Text style={s.urusanSummaryLbl}>Urusan Arsip</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => { setUrusanSearch(''); setShowUrusanPicker(true) }}>
                    <Ionicons name="create-outline" size={16} color="#8B5CF6" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Masa retensi */}
              <View style={s.classCard}>
                <View style={s.classCardHeader}>
                  <View style={[s.classCardIcon, { backgroundColor: '#FFF7ED' }]}>
                    <Ionicons name="time-outline" size={15} color="#F59E0B" />
                  </View>
                  <Text style={s.classCardTitle}>Masa Retensi</Text>
                </View>
                <Text style={s.retensiDesc}>Berapa lama arsip aktif sebelum ditinjau ulang</Text>
                <View style={s.retensiChips}>
                  {[
                    { val: '12', lbl: '1 Thn' }, { val: '24', lbl: '2 Thn' },
                    { val: '36', lbl: '3 Thn' }, { val: '60', lbl: '5 Thn' },
                    { val: '84', lbl: '7 Thn' }, { val: '120', lbl: '10 Thn' },
                  ].map(r => (
                    <TouchableOpacity
                      key={r.val}
                      style={[s.retensiChip, masaRetensi === r.val && s.retensiChipActive]}
                      onPress={() => setMasaRetensi(r.val)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.retensiChipTxt, masaRetensi === r.val && s.retensiChipTxtActive]}>
                        {r.lbl}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={s.manualWrap}>
                  <Ionicons name="pencil-outline" size={14} color="#94A3B8" />
                  <TextInput
                    style={s.manualInput}
                    value={masaRetensi}
                    onChangeText={setMasaRetensi}
                    placeholder="Isi manual (bulan)"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                  <Text style={s.manualUnit}>bulan</Text>
                </View>
              </View>

              {/* Kategori */}
              <View style={s.classCard}>
                <View style={s.classCardHeader}>
                  <View style={[s.classCardIcon, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="pricetag-outline" size={15} color="#3B82F6" />
                  </View>
                  <Text style={s.classCardTitle}>Kategori Arsip</Text>
                  <Text style={s.classRequired}>*</Text>
                </View>
                <View style={s.pillsWrap}>
                  {categories.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[s.pill, kategoriId === c.id && s.pillActive]}
                      onPress={() => setKategoriId(c.id)}
                      activeOpacity={0.8}
                    >
                      {kategoriId === c.id && <Ionicons name="checkmark-circle" size={12} color="#fff" />}
                      <Text style={[s.pillTxt, kategoriId === c.id && s.pillTxtActive]}>{c.nama}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Unit kerja */}
              <View style={s.classCard}>
                <View style={s.classCardHeader}>
                  <View style={[s.classCardIcon, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="business-outline" size={15} color="#10B981" />
                  </View>
                  <Text style={s.classCardTitle}>Unit Kerja</Text>
                  <Text style={s.classRequired}>*</Text>
                </View>
                {isAdminUnit ? (
                  <View style={s.unitLocked}>
                    <Ionicons name="lock-closed" size={14} color="#94A3B8" />
                    <Text style={s.unitLockedTxt}>{units.find(u => u.id === unitId)?.namaUnit ?? 'Unit Anda'}</Text>
                    <View style={s.unitLockedBadge}>
                      <Text style={s.unitLockedBadgeTxt}>Terkunci</Text>
                    </View>
                  </View>
                ) : (
                  <View style={s.pillsWrap}>
                    {units.map(u => (
                      <TouchableOpacity
                        key={u.id}
                        style={[s.pill, unitId === u.id && s.pillActive]}
                        onPress={() => setUnitId(u.id)}
                        activeOpacity={0.8}
                      >
                        {unitId === u.id && <Ionicons name="checkmark-circle" size={12} color="#fff" />}
                        <Text style={[s.pillTxt, unitId === u.id && s.pillTxtActive]}>{u.namaUnit}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Ringkasan sebelum submit */}
              <View style={s.summaryCard}>
                <View style={s.summaryHeader}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={s.summaryTitle}>Ringkasan Upload</Text>
                </View>
                {[
                  { icon: 'document-text-outline', label: 'File',     val: file?.name ?? '—' },
                  { icon: 'barcode-outline',        label: 'No. Surat', val: nomorSurat || '—' },
                  { icon: 'person-outline',         label: 'Pengirim',  val: pengirim || '—' },
                  { icon: 'pricetag-outline',       label: 'Urusan',    val: selectedUrusan ? `${selectedUrusan.kodeUrusan} — ${selectedUrusan.namaUrusan}` : 'Tidak dipilih' },
                  { icon: 'time-outline',           label: 'Retensi',   val: `${masaRetensi} bulan` },
                ].map((item, i) => (
                  <View key={i} style={[s.summaryRow, i === 3 && { borderBottomWidth: 0 }]}>
                    <Ionicons name={item.icon as any} size={13} color={i === 3 && selectedUrusan ? '#8B5CF6' : '#94A3B8'} />
                    <Text style={s.summaryLabel}>{item.label}</Text>
                    <Text style={[s.summaryVal, i === 3 && selectedUrusan && { color: '#8B5CF6' }]} numberOfLines={1}>{item.val}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

        </Animated.View>
      </ScrollView>

      {/* ══ URUSAN PICKER MODAL ══ */}
      {showUrusanPicker && (
        <View style={s.pickerOverlay}>
          <View style={s.pickerSheet}>
            <View style={s.pickerHandle} />
            <View style={s.pickerHeader}>
              <View style={s.pickerHeaderIcon}>
                <Ionicons name="pricetags" size={16} color="#8B5CF6" />
              </View>
              <Text style={s.pickerTitle}>Pilih Urusan</Text>
              <TouchableOpacity style={s.pickerClose} onPress={() => setShowUrusanPicker(false)}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Search urusan */}
            <View style={s.pickerSearch}>
              <Ionicons name="search-outline" size={15} color="#94A3B8" />
              <TextInput
                style={s.pickerSearchInput}
                placeholder="Cari kode, nama, atau keyword..."
                placeholderTextColor="#94A3B8"
                value={urusanSearch}
                onChangeText={setUrusanSearch}
                autoFocus
              />
              {urusanSearch !== '' && (
                <TouchableOpacity onPress={() => setUrusanSearch('')}>
                  <Ionicons name="close-circle" size={15} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {filteredUrusan.length === 0 ? (
                <View style={s.pickerEmpty}>
                  <Text style={s.pickerEmptyTxt}>Tidak ada urusan ditemukan</Text>
                </View>
              ) : (
                filteredUrusan.map((u, i) => {
                  const isSelected = selectedUrusan?.id === u.id
                  const isDetected = detectedUrusan?.id === u.id
                  return (
                    <TouchableOpacity
                      key={u.id}
                      style={[s.pickerItem, isSelected && s.pickerItemActive]}
                      onPress={() => { setSelectedUrusan(u); setShowUrusanPicker(false) }}
                      activeOpacity={0.8}
                    >
                      <View style={[s.pickerKodeBadge, { backgroundColor: isSelected ? '#8B5CF6' : '#F5F3FF' }]}>
                        <Text style={[s.pickerKodeTxt, { color: isSelected ? '#fff' : '#8B5CF6' }]}>
                          {u.kodeUrusan}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[s.pickerItemName, isSelected && { color: '#8B5CF6' }]}>{u.namaUrusan}</Text>
                          {isDetected && (
                            <View style={s.detectedBadge}>
                              <Ionicons name="flash" size={9} color="#D97706" />
                              <Text style={s.detectedBadgeTxt}>Otomatis</Text>
                            </View>
                          )}
                        </View>
                        {u.keywords?.length > 0 && (
                          <Text style={s.pickerItemKw} numberOfLines={1}>
                            {u.keywords.slice(0, 4).join(' · ')}
                          </Text>
                        )}
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" />}
                    </TouchableOpacity>
                  )
                })
              )}
            </ScrollView>

            <TouchableOpacity style={s.pickerClearBtn} onPress={() => { setSelectedUrusan(null); setShowUrusanPicker(false) }}>
              <Text style={s.pickerClearTxt}>Tanpa Urusan</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ══ BOTTOM NAV ══ */}
      <View style={[s.bottomNav, { paddingBottom: insets.bottom + 12 }]}>
        {step > 0 ? (
          <TouchableOpacity style={s.prevBtn} onPress={prevStep} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={18} color="#64748B" />
            <Text style={s.prevTxt}>Kembali</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {step < STEPS.length - 1 ? (
          <TouchableOpacity style={s.nextBtn} onPress={nextStep} activeOpacity={0.85}>
            <LinearGradient colors={['#3B82F6', '#2563EB']} style={s.nextBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={s.nextTxt}>Lanjut</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#10B981', '#059669']} style={s.nextBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={s.nextTxt}>{uploadStep || 'Mengupload...'}</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={18} color="#fff" />
                  <Text style={s.nextTxt}>Upload Arsip</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

// ─── FORM COMPONENTS ─────────────────────────────────
function FormCard({ children }: { children: React.ReactNode }) {
  return <View style={s.formCard}>{children}</View>
}

function FormField({ label, placeholder, icon, value, onChange, required, multiline, keyboardType, hint, last }: {
  label: string; placeholder: string; icon: string
  value: string; onChange: (v: string) => void
  required?: boolean; multiline?: boolean; keyboardType?: string; hint?: string; last?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={[s.formField, last && { marginBottom: 0 }]}>
      <View style={s.formLabelRow}>
        <Text style={s.formLabel}>{label}</Text>
        {required && <Text style={s.formRequired}>*</Text>}
      </View>
      {hint && <Text style={s.formHint}>{hint}</Text>}
      <View style={[s.formInputWrap, focused && s.formInputFocused, multiline && { alignItems: 'flex-start', paddingTop: 12 }]}>
        <Ionicons name={icon as any} size={15} color={focused ? '#3B82F6' : '#94A3B8'} style={multiline ? { marginTop: 2 } : {}} />
        <TextInput
          style={[s.formInput, multiline && { height: 72, textAlignVertical: 'top' }]}
          placeholder={placeholder}
          placeholderTextColor="#CBD5E1"
          value={value}
          onChangeText={onChange}
          multiline={multiline}
          keyboardType={keyboardType as any ?? 'default'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  )
}

// ─── STYLES ──────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F1F5F9' },
  scroll: { padding: 16, paddingBottom: 120 },

  // Header
  header:    { paddingHorizontal: 18, paddingBottom: 20, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  backBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle:{ color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub:  { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 1 },

  stepRow:    { flexDirection: 'row', alignItems: 'center' },
  stepItem:   { alignItems: 'center', gap: 4 },
  stepCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  stepActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  stepDone:   { backgroundColor: '#10B981', borderColor: '#10B981' },
  stepNum:    { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.5)' },
  stepLabel:  { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.3 },
  stepLine:   { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 14, marginHorizontal: 4 },

  stepTitle:  { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4, marginTop: 4 },
  stepDesc:   { fontSize: 13, color: '#64748B', marginBottom: 16, lineHeight: 18 },

  // Drop zone
  dropZone:   { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', gap: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: '#BFDBFE', marginBottom: 12 },
  dropIconBox:{ width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  dropTitle:  { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  dropSub:    { fontSize: 12, color: '#94A3B8' },
  dropBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 6 },
  dropBtnText:{ fontSize: 12, color: '#3B82F6', fontWeight: '700' },

  fileCard:     { backgroundColor: '#fff', borderRadius: 18, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderWidth: 1.5, borderColor: '#E2E8F0', marginBottom: 8 },
  fileIconBox:  { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  fileCardName: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 3 },
  fileCardSize: { fontSize: 11, color: '#94A3B8', marginBottom: 5 },
  fileExtBadge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  fileExtText:  { fontSize: 10, fontWeight: '800' },
  fileRemoveBtn:{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  changeFileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#EFF6FF', marginBottom: 14 },
  changeFileTxt: { fontSize: 12, color: '#3B82F6', fontWeight: '700' },

  tipsCard:   { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  tipsTitle:  { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  tipRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  tipDot:     { width: 5, height: 5, borderRadius: 3, backgroundColor: '#3B82F6' },
  tipTxt:     { fontSize: 12, color: '#64748B', flex: 1, lineHeight: 17 },

  // Urusan detect card
  urusanDetectCard:   { backgroundColor: '#FFFBEB', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#FEF3C7', marginBottom: 12 },
  urusanDetectHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  urusanDetectIcon:   { width: 28, height: 28, borderRadius: 8, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  urusanDetectLbl:    { fontSize: 10, color: '#D97706', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  urusanDetectVal:    { fontSize: 13, color: '#92400E', fontWeight: '700', marginTop: 1 },
  urusanChangeBtn:    { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  urusanChangeTxt:    { fontSize: 11, color: '#D97706', fontWeight: '700' },
  urusanClearBtn:     { width: 26, height: 26, borderRadius: 8, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  urusanKeywords:     { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  urusanKwChip:       { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  urusanKwText:       { fontSize: 10, color: '#D97706', fontWeight: '600' },

  pickUrusanBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F5F3FF', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#EDE9FE' },
  pickUrusanTxt: { flex: 1, fontSize: 13, color: '#8B5CF6', fontWeight: '700' },

  // Urusan summary (step 2)
  urusanSummary:     { backgroundColor: '#F5F3FF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#EDE9FE', marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  urusanSummaryLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  urusanSummaryBadge:{ width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  urusanSummaryKode: { color: '#fff', fontSize: 11, fontWeight: '900', textAlign: 'center' },
  urusanSummaryName: { fontSize: 13, fontWeight: '700', color: '#4C1D95' },
  urusanSummaryLbl:  { fontSize: 10, color: '#8B5CF6', fontWeight: '600', marginTop: 1 },

  // Form
  formCard:    { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  formField:   { marginBottom: 14 },
  formLabelRow:{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  formLabel:   { fontSize: 12, fontWeight: '700', color: '#475569' },
  formRequired:{ fontSize: 12, color: '#EF4444', fontWeight: '800' },
  formHint:    { fontSize: 10, color: '#94A3B8', marginBottom: 5 },
  formInputWrap:{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#F8FAFC', gap: 8 },
  formInputFocused:{ borderColor: '#3B82F6', backgroundColor: '#fff' },
  formInput:   { flex: 1, height: 44, fontSize: 14, color: '#1E293B' },

  // Class card
  classCard:       { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  classCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  classCardIcon:   { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  classCardTitle:  { flex: 1, fontSize: 13, fontWeight: '800', color: '#0F172A' },
  classRequired:   { fontSize: 13, color: '#EF4444', fontWeight: '800' },

  retensiDesc:         { fontSize: 11, color: '#94A3B8', marginBottom: 12, lineHeight: 16 },
  retensiChips:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  retensiChip:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  retensiChipActive:   { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  retensiChipTxt:      { fontSize: 12, fontWeight: '700', color: '#64748B' },
  retensiChipTxtActive:{ color: '#fff' },
  manualWrap:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#F8FAFC', gap: 8 },
  manualInput: { flex: 1, height: 42, fontSize: 14, color: '#1E293B' },
  manualUnit:  { fontSize: 12, color: '#94A3B8', fontWeight: '600' },

  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  pillActive:{ backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  pillTxt:   { fontSize: 12, fontWeight: '700', color: '#64748B' },
  pillTxtActive:{ color: '#fff' },

  unitLocked:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  unitLockedTxt:     { flex: 1, fontSize: 13, color: '#475569', fontWeight: '600' },
  unitLockedBadge:   { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  unitLockedBadgeTxt:{ fontSize: 10, color: '#94A3B8', fontWeight: '700' },

  summaryCard:   { backgroundColor: '#F0FDF4', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#DCFCE7', marginTop: 4 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  summaryTitle:  { fontSize: 13, fontWeight: '700', color: '#15803D' },
  summaryRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#DCFCE7' },
  summaryLabel:  { fontSize: 11, color: '#64748B', fontWeight: '600', width: 70 },
  summaryVal:    { flex: 1, fontSize: 12, color: '#1E293B', fontWeight: '700', textAlign: 'right' },

  // Urusan Picker Modal
  pickerOverlay:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  pickerSheet:    { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, maxHeight: '80%' },
  pickerHandle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16 },
  pickerHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  pickerHeaderIcon:{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center' },
  pickerTitle:    { flex: 1, fontSize: 16, fontWeight: '800', color: '#1E293B' },
  pickerClose:    { width: 30, height: 30, borderRadius: 9, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  pickerSearch:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderWidth: 1.5, borderColor: '#E2E8F0', marginBottom: 12 },
  pickerSearchInput:{ flex: 1, fontSize: 14, color: '#1E293B' },
  pickerItem:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  pickerItemActive:{ backgroundColor: '#F5F3FF', borderRadius: 12, paddingHorizontal: 10 },
  pickerKodeBadge:{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, minWidth: 48, alignItems: 'center' },
  pickerKodeTxt:  { fontSize: 12, fontWeight: '900' },
  pickerItemName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  pickerItemKw:   { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  detectedBadge:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  detectedBadgeTxt:{ fontSize: 9, color: '#D97706', fontWeight: '700' },
  pickerEmpty:    { alignItems: 'center', padding: 24 },
  pickerEmptyTxt: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  pickerClearBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  pickerClearTxt: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },

  // Bottom nav
  bottomNav: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  prevBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 14, backgroundColor: '#F1F5F9' },
  prevTxt:   { fontSize: 14, fontWeight: '700', color: '#64748B' },
  nextBtn:   { flex: 1, borderRadius: 14, overflow: 'hidden' },
  nextBtnGrad:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  nextTxt:   { fontSize: 14, fontWeight: '700', color: '#fff' },
  submitBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
})
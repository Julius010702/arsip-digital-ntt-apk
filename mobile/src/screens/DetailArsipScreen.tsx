// ======================================================
// FILE: mobile/src/screens/DetailArsipScreen.tsx
// ======================================================

import React, { useEffect, useState, useRef } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, Animated,
  Dimensions, StatusBar,
} from 'react-native'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system/legacy'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { WebView } from 'react-native-webview'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { archiveApi } from '../services/api'
import { Archive } from '../types'
import { COLORS, CAT_COLORS, RADIUS, SHADOW, SPACING } from '../utils/theme'
import { formatDate } from '../utils/format'
import { CategoryChip } from '../components/UI'
import { useAuth } from '../hooks/useAuth'
import { RootStackParams } from '../navigation/types'

type Route = RouteProp<RootStackParams, 'DetailArsip'>

const { width } = Dimensions.get('window')

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string; gradColors: [string,string] }> = {
  aktif:    { bg: '#DCFCE7', text: '#15803D', dot: '#22C55E', label: 'AKTIF',    gradColors: ['#22C55E','#16A34A'] },
  inaktif:  { bg: '#FEF3C7', text: '#B45309', dot: '#F59E0B', label: 'INAKTIF',  gradColors: ['#F59E0B','#D97706'] },
  musnah:   { bg: '#FEE2E2', text: '#B91C1C', dot: '#EF4444', label: 'MUSNAH',   gradColors: ['#EF4444','#DC2626'] },
  permanen: { bg: '#EDE9FE', text: '#6D28D9', dot: '#8B5CF6', label: 'PERMANEN', gradColors: ['#8B5CF6','#7C3AED'] },
}

function getExtConfig(ext: string) {
  switch (ext.toLowerCase()) {
    case 'pdf':  return { color: '#EF4444', bg: '#FEE2E2', grad: ['#FEE2E2','#FEF2F2'] as [string,string], icon: 'document-text' as const }
    case 'doc':
    case 'docx': return { color: '#2563EB', bg: '#DBEAFE', grad: ['#DBEAFE','#EFF6FF'] as [string,string], icon: 'document' as const }
    case 'xls':
    case 'xlsx': return { color: '#16A34A', bg: '#DCFCE7', grad: ['#DCFCE7','#F0FDF4'] as [string,string], icon: 'grid' as const }
    case 'jpg':
    case 'jpeg':
    case 'png':  return { color: '#7C3AED', bg: '#EDE9FE', grad: ['#EDE9FE','#F5F3FF'] as [string,string], icon: 'image' as const }
    default:     return { color: '#475569', bg: '#F1F5F9', grad: ['#F1F5F9','#F8FAFC'] as [string,string], icon: 'attach' as const }
  }
}

export default function DetailArsipScreen() {
  const { user } = useAuth()
  const nav      = useNavigation()
  const route    = useRoute<Route>()
  const insets   = useSafeAreaInsets()

  const [archive,     setArchive]     = useState<Archive | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [showEdit,    setShowEdit]    = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [saving,      setSaving]      = useState(false)

  const fadeAnim  = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(24)).current

  const [editJudul,    setEditJudul]    = useState('')
  const [editPengirim, setEditPengirim] = useState('')
  const [editPenerima, setEditPenerima] = useState('')
  const [editPerihal,  setEditPerihal]  = useState('')
  const [editNomor,    setEditNomor]    = useState('')
  const [editRetensi,  setEditRetensi]  = useState('')

  const canEdit = ['super_admin', 'admin_unit'].includes(user?.role ?? '')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await archiveApi.get(route.params.id)
      setArchive(res.data)
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start()
    } catch (e: any) {
      Alert.alert('Error', e.message); nav.goBack()
    } finally { setLoading(false) }
  }

  function openEdit() {
    if (!archive) return
    setEditJudul(archive.judul)
    setEditPengirim(archive.pengirim)
    setEditPenerima(archive.penerima)
    setEditPerihal(archive.perihal)
    setEditNomor(archive.nomorSurat)
    setEditRetensi(String(archive.masaRetensi))
    setShowEdit(true)
  }

  async function handleSaveEdit() {
    if (!editJudul.trim() || !editPengirim.trim() || !editPenerima.trim() || !editPerihal.trim()) {
      Alert.alert('Peringatan', 'Semua field wajib diisi'); return
    }
    setSaving(true)
    try {
      await archiveApi.update(archive!.id, {
        judul:       editJudul.trim(),
        pengirim:    editPengirim.trim(),
        penerima:    editPenerima.trim(),
        perihal:     editPerihal.trim(),
        nomorSurat:  editNomor.trim(),
        masaRetensi: parseInt(editRetensi) || archive!.masaRetensi,
      })
      setShowEdit(false)
      Alert.alert('Berhasil ✅', 'Arsip berhasil diperbarui')
      load()
    } catch (e: any) { Alert.alert('Gagal', e.message) }
    finally { setSaving(false) }
  }

  async function handleDownload() {
    if (!fileUrl) return
    try {
      Alert.alert('Mengunduh...', 'File sedang diunduh, harap tunggu...')
      const fileName2 = fileUrl.split('/').pop()?.split('?')[0] ?? 'dokumen.pdf'
      const localUri  = (FileSystem.cacheDirectory ?? '') + fileName2
      const result    = await FileSystem.downloadAsync(fileUrl, localUri)
      const canShare  = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: 'Buka atau Simpan File', UTI: 'com.adobe.pdf' })
      } else {
        Alert.alert('Berhasil', 'File tersimpan di: ' + result.uri)
      }
    } catch (e: any) { Alert.alert('Gagal mengunduh', e.message) }
  }

  async function handleDelete() {
    Alert.alert('Hapus Arsip', 'Yakin ingin menghapus arsip ini? Tindakan tidak dapat dibatalkan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          try {
            await archiveApi.delete(archive!.id)
            Alert.alert('Berhasil', 'Arsip dihapus', [{ text: 'OK', onPress: () => nav.goBack() }])
          } catch (e: any) { Alert.alert('Error', e.message) }
        },
      },
    ])
  }

  if (loading) return (
    <View style={s.loadingRoot}>
      <StatusBar barStyle="dark-content" />
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text style={s.loadingText}>Memuat detail arsip...</Text>
    </View>
  )
  if (!archive) return null

  const catColor  = CAT_COLORS[archive.category?.nama ?? ''] ?? '#3B82F6'
  const fileUrl   = archive.filePath ?? ''
  const ext       = fileUrl.split('?')[0].split('.').pop()?.toUpperCase() ?? 'FILE'
  const fileName  = fileUrl.split('/').pop()?.split('?')[0] ?? archive.judul
  const extCfg    = getExtConfig(ext)
  const statusCfg = STATUS_CONFIG[archive.statusArsip ?? 'aktif'] ?? STATUS_CONFIG.aktif

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={catColor} />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >

        {/* ══ HERO ══ */}
        <LinearGradient
          colors={[catColor, catColor + 'BB', '#F1F5F9']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1.2 }}
          style={[s.hero, { paddingTop: insets.top + 16 }]}
        >
          {/* Decorative rings */}
          <View style={[s.heroRing, { width: 200, height: 200, top: -80, right: -60 }]} />
          <View style={[s.heroRing, { width: 120, height: 120, top: 20,  right: 40  }]} />

          {/* Doc icon */}
          <View style={s.heroIconWrap}>
            <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.15)']} style={s.heroIconBox}>
              <Ionicons name={extCfg.icon} size={38} color="#fff" />
            </LinearGradient>
          </View>

          {/* Badges */}
          <View style={s.heroBadges}>
            <LinearGradient colors={statusCfg.gradColors} style={s.statusBadge}>
              <View style={s.statusLed} />
              <Text style={s.statusBadgeText}>{statusCfg.label}</Text>
            </LinearGradient>
            <View style={[s.extBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <Text style={s.extBadgeText}>{ext}</Text>
            </View>
            <View style={[s.catBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={s.catBadgeText}>{archive.category?.nama ?? '—'}</Text>
            </View>
          </View>

          <Text style={s.heroTitle}>{archive.judul}</Text>
          <View style={s.heroNomorRow}>
            <Ionicons name="barcode-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={s.heroNomor}>{archive.nomorSurat || 'Tanpa Nomor'}</Text>
          </View>
        </LinearGradient>

        {/* ══ QUICK STATS — overlap hero ══ */}
        <View style={s.statsCard}>
          {[
            { icon: 'calendar-outline',  label: 'Tgl. Surat', value: formatDate(archive.tanggalSurat), color: '#3B82F6' },
            { icon: 'time-outline',       label: 'Retensi',    value: `${archive.masaRetensi} bln`,     color: '#F59E0B' },
            { icon: 'business-outline',   label: 'Unit',       value: archive.unit?.namaUnit ?? '—',    color: '#10B981' },
          ].map((item, i) => (
            <React.Fragment key={i}>
              <View style={s.statItem}>
                <View style={[s.statIconBox, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon as any} size={14} color={item.color} />
                </View>
                <Text style={s.statLbl}>{item.label}</Text>
                <Text style={s.statVal} numberOfLines={1}>{item.value}</Text>
              </View>
              {i < 2 && <View style={s.statDiv} />}
            </React.Fragment>
          ))}
        </View>

        {/* ══ INFORMASI DOKUMEN ══ */}
        <Block title="Informasi Dokumen" icon="document-text-outline" iconColor="#3B82F6" iconBg="#EFF6FF">
          <InfoRow icon="barcode-outline"    color="#3B82F6" label="Nomor Surat"   value={archive.nomorSurat} />
          <InfoRow icon="calendar-outline"   color="#8B5CF6" label="Tgl. Surat"   value={formatDate(archive.tanggalSurat)} />
          <InfoRow icon="person-outline"     color="#F59E0B" label="Pengirim"      value={archive.pengirim} />
          <InfoRow icon="people-outline"     color="#10B981" label="Penerima"      value={archive.penerima} />
          <InfoRow icon="chatbubble-outline" color="#EF4444" label="Perihal"       value={archive.perihal} />
          <InfoRow icon="business-outline"   color="#06B6D4" label="Unit Kerja"    value={archive.unit?.namaUnit} />
          <InfoRow icon="hourglass-outline"  color="#F97316" label="Masa Retensi"  value={`${archive.masaRetensi} bulan`} last />
        </Block>

        {/* ══ RIWAYAT UPLOAD ══ */}
        <Block title="Riwayat Upload" icon="cloud-upload-outline" iconColor="#8B5CF6" iconBg="#EDE9FE">
          <InfoRow icon="person-circle-outline" color="#8B5CF6" label="Diunggah oleh"  value={archive.user?.namaLengkap} />
          <InfoRow icon="calendar-outline"      color="#3B82F6" label="Tanggal Upload" value={formatDate(archive.createdAt)} last />
        </Block>

        {/* ══ FILE DOKUMEN ══ */}
        <Block title="File Dokumen" icon="attach-outline" iconColor="#EF4444" iconBg="#FEE2E2">
          {fileUrl ? (
            <TouchableOpacity style={s.fileCard} onPress={() => setShowPreview(true)} activeOpacity={0.85}>
              <LinearGradient colors={extCfg.grad} style={s.fileIconBox}>
                <Ionicons name={extCfg.icon} size={28} color={extCfg.color} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={s.fileCardName} numberOfLines={2}>{fileName}</Text>
                <View style={s.fileHint}>
                  <Ionicons name="eye-outline" size={11} color="#94A3B8" />
                  <Text style={s.fileHintText}>Ketuk untuk pratinjau dokumen</Text>
                </View>
              </View>
              <View style={[s.fileExtChip, { backgroundColor: extCfg.bg }]}>
                <Text style={[s.fileExtChipText, { color: extCfg.color }]}>{ext}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={s.noFile}>
              <View style={s.noFileIconBox}>
                <Ionicons name="document-outline" size={28} color="#CBD5E1" />
              </View>
              <Text style={s.noFileText}>Tidak ada file terlampir</Text>
            </View>
          )}
        </Block>

        {/* ══ URUSAN (jika ada) ══ */}
        {(archive as any).urusan && (
          <Block title="Klasifikasi Urusan" icon="pricetag-outline" iconColor="#8B5CF6" iconBg="#F5F3FF">
            <View style={s.urusanRow}>
              <LinearGradient colors={['#8B5CF6','#7C3AED']} style={s.urusanBadge}>
                <Text style={s.urusanKode}>{(archive as any).urusan.kodeUrusan}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={s.urusanNama}>{(archive as any).urusan.namaUrusan}</Text>
                {(archive as any).urusan.deskripsi && (
                  <Text style={s.urusanDesc} numberOfLines={2}>{(archive as any).urusan.deskripsi}</Text>
                )}
              </View>
            </View>
          </Block>
        )}

      </Animated.ScrollView>

      {/* ══ BOTTOM BAR ══ */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity
          style={[s.btnDownload, !fileUrl && { opacity: 0.4 }]}
          onPress={handleDownload}
          disabled={!fileUrl}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#3B82F6','#2563EB']} style={s.btnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="download-outline" size={17} color="#fff" />
            <Text style={s.btnDownloadText}>Unduh File</Text>
          </LinearGradient>
        </TouchableOpacity>

        {canEdit && (
          <View style={s.btnActions}>
            <TouchableOpacity style={s.btnEdit} onPress={openEdit} activeOpacity={0.8}>
              <Ionicons name="create-outline" size={19} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity style={s.btnDelete} onPress={handleDelete} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={19} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ══ PREVIEW MODAL ══ */}
      <Modal visible={showPreview} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
          <LinearGradient colors={['#1E293B','#0F172A']} style={[s.previewHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity style={s.previewBtn} onPress={() => setShowPreview(false)}>
              <Ionicons name="arrow-back" size={19} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={s.previewTitle} numberOfLines={1}>{fileName}</Text>
              <Text style={s.previewSub}>{ext} Document</Text>
            </View>
            <TouchableOpacity style={[s.previewBtn, { backgroundColor: '#3B82F6' }]} onPress={handleDownload}>
              <Ionicons name="download-outline" size={19} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
          <WebView
            source={{ uri: `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true` }}
            style={{ flex: 1 }}
            startInLoadingState
            renderLoading={() => (
              <View style={s.previewLoading}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 12 }}>Memuat dokumen...</Text>
              </View>
            )}
          />
        </View>
      </Modal>

      {/* ══ EDIT MODAL ══ */}
      <Modal visible={showEdit} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeaderRow}>
              <LinearGradient colors={['#EFF6FF','#DBEAFE']} style={s.modalIconBox}>
                <Ionicons name="create-outline" size={18} color="#3B82F6" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>Edit Arsip</Text>
                <Text style={s.modalSub}>Perbarui informasi dokumen</Text>
              </View>
              <TouchableOpacity style={s.modalCloseBtn} onPress={() => setShowEdit(false)}>
                <Ionicons name="close" size={17} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <EditField icon="barcode-outline"       label="Nomor Surat"         value={editNomor}    onChangeText={setEditNomor} />
              <EditField icon="document-text-outline" label="Judul Arsip"          value={editJudul}    onChangeText={setEditJudul}    required />
              <EditField icon="person-outline"        label="Pengirim"             value={editPengirim} onChangeText={setEditPengirim} required />
              <EditField icon="people-outline"        label="Penerima"             value={editPenerima} onChangeText={setEditPenerima} required />
              <EditField icon="chatbubble-outline"    label="Perihal"              value={editPerihal}  onChangeText={setEditPerihal}  required multiline />
              <EditField icon="hourglass-outline"     label="Masa Retensi (bulan)" value={editRetensi}  onChangeText={setEditRetensi}  keyboardType="numeric" />
            </ScrollView>

            <View style={s.modalFooter}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowEdit(false)}>
                <Text style={s.cancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSaveEdit}
                disabled={saving}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#3B82F6','#2563EB']} style={s.saveBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <>
                        <Ionicons name="checkmark-circle" size={15} color="#fff" />
                        <Text style={s.saveText}>Simpan Perubahan</Text>
                      </>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// ─── SUB COMPONENTS ──────────────────────────────────

function Block({ title, icon, iconColor, iconBg, children }: {
  title: string; icon: any; iconColor: string; iconBg: string; children: React.ReactNode
}) {
  return (
    <View style={s.block}>
      <View style={s.blockHeader}>
        <View style={[s.blockIconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={14} color={iconColor} />
        </View>
        <Text style={s.blockTitle}>{title}</Text>
      </View>
      {children}
    </View>
  )
}

function InfoRow({ icon, color, label, value, last }: {
  icon: any; color: string; label: string; value?: string; last?: boolean
}) {
  return (
    <View style={[s.infoRow, last && { borderBottomWidth: 0 }]}>
      <View style={[s.infoIconBox, { backgroundColor: color + '12' }]}>
        <Ionicons name={icon} size={13} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLbl}>{label}</Text>
        <Text style={s.infoVal} numberOfLines={3}>{value || '—'}</Text>
      </View>
    </View>
  )
}

function EditField({ label, value, onChangeText, multiline, keyboardType, icon, required }: {
  label: string; value: string; onChangeText: (v: string) => void
  multiline?: boolean; keyboardType?: any; icon?: any; required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={s.editWrap}>
      <View style={s.editLabelRow}>
        {icon && (
          <View style={s.editLabelIcon}>
            <Ionicons name={icon} size={11} color="#94A3B8" />
          </View>
        )}
        <Text style={s.editLabel}>{label}</Text>
        {required && <Text style={s.editRequired}>*</Text>}
      </View>
      <TextInput
        style={[s.editInput, multiline && s.editMultiline, focused && s.editInputFocused]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        placeholderTextColor="#CBD5E1"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        textAlignVertical={multiline ? 'top' : 'auto'}
      />
    </View>
  )
}

// ─── STYLES ──────────────────────────────────────────
const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#F1F5F9' },
  loadingRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9', gap: 14 },
  loadingText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },

  // Hero
  hero:        { paddingHorizontal: 20, paddingBottom: 36, alignItems: 'center', gap: 10, overflow: 'hidden' },
  heroRing:    { position: 'absolute', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  heroIconWrap:{ marginBottom: 4 },
  heroIconBox: { width: 76, height: 76, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  heroBadges:  { flexDirection: 'row', gap: 7, flexWrap: 'wrap', justifyContent: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusLed:   { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.8)' },
  statusBadgeText:{ fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  extBadge:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  extBadgeText:{ fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  catBadge:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  catBadgeText:{ fontSize: 10, fontWeight: '700', color: '#fff' },
  heroTitle:   { fontSize: 17, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 25, textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  heroNomorRow:{ flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroNomor:   { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: 0.3 },

  // Stats card — overlaps hero
  statsCard:  { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: -20, borderRadius: 18, padding: 14, shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  statItem:   { flex: 1, alignItems: 'center', gap: 4 },
  statDiv:    { width: 1, backgroundColor: '#F1F5F9', marginVertical: 4 },
  statIconBox:{ width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  statLbl:    { fontSize: 9, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  statVal:    { fontSize: 11, color: '#0F172A', fontWeight: '700', textAlign: 'center' },

  // Block
  block:       { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginHorizontal: 14, marginTop: 12, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  blockIconBox:{ width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  blockTitle:  { fontSize: 13, fontWeight: '800', color: '#0F172A' },

  // Info rows
  infoRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  infoIconBox:{ width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 1, flexShrink: 0 },
  infoLbl:    { fontSize: 10, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
  infoVal:    { fontSize: 13, color: '#1E293B', fontWeight: '600', lineHeight: 18 },

  // File card
  fileCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 13, gap: 12, borderWidth: 1.5, borderColor: '#E2E8F0' },
  fileIconBox:  { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  fileCardName: { fontSize: 13, fontWeight: '700', color: '#1E293B', lineHeight: 18, marginBottom: 4 },
  fileHint:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fileHintText: { fontSize: 10, color: '#94A3B8' },
  fileExtChip:  { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  fileExtChipText:{ fontSize: 10, fontWeight: '800' },
  noFile:       { alignItems: 'center', paddingVertical: 20, gap: 8 },
  noFileIconBox:{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  noFileText:   { color: '#CBD5E1', fontSize: 13, fontWeight: '600' },

  // Urusan row
  urusanRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  urusanBadge: { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  urusanKode:  { color: '#fff', fontSize: 11, fontWeight: '900', textAlign: 'center' },
  urusanNama:  { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  urusanDesc:  { fontSize: 11, color: '#64748B', marginTop: 2, lineHeight: 16 },

  // Bottom bar
  bottomBar:      { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, paddingHorizontal: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  btnDownload:    { flex: 1, borderRadius: 14, overflow: 'hidden' },
  btnGrad:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14 },
  btnDownloadText:{ color: '#fff', fontSize: 14, fontWeight: '700' },
  btnActions:     { flexDirection: 'row', gap: 8 },
  btnEdit:        { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  btnDelete:      { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },

  // Preview modal
  previewHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  previewBtn:    { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  previewTitle:  { color: '#fff', fontSize: 13, fontWeight: '700' },
  previewSub:    { color: '#64748B', fontSize: 11, marginTop: 1 },
  previewLoading:{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },

  // Edit modal
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalSheet:     { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 36 },
  modalHandle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 18 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  modalIconBox:   { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalTitle:     { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  modalSub:       { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  modalCloseBtn:  { width: 30, height: 30, borderRadius: 9, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  modalFooter:    { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn:      { flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelText:     { color: '#64748B', fontWeight: '700', fontSize: 13 },
  saveBtn:        { flex: 2, borderRadius: 14, overflow: 'hidden' },
  saveBtnGrad:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13 },
  saveText:       { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Edit fields
  editWrap:        { marginBottom: 13 },
  editLabelRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  editLabelIcon:   { width: 18, height: 18, borderRadius: 5, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  editLabel:       { fontSize: 11, fontWeight: '700', color: '#475569', flex: 1 },
  editRequired:    { fontSize: 11, color: '#EF4444', fontWeight: '800' },
  editInput:       { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, fontSize: 13, color: '#1E293B', backgroundColor: '#F8FAFC' },
  editInputFocused:{ borderColor: '#3B82F6', backgroundColor: '#fff' },
  editMultiline:   { height: 80, textAlignVertical: 'top' },
})
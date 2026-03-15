import React, { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, Animated, Dimensions,
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

// ─── STATUS CONFIG ────────────────────────────────────
const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  aktif:    { bg: '#DCFCE7', text: '#15803D', dot: '#22C55E', label: 'AKTIF' },
  inaktif:  { bg: '#FEF3C7', text: '#B45309', dot: '#F59E0B', label: 'INAKTIF' },
  musnah:   { bg: '#FEE2E2', text: '#B91C1C', dot: '#EF4444', label: 'MUSNAH' },
  permanen: { bg: '#EDE9FE', text: '#6D28D9', dot: '#8B5CF6', label: 'PERMANEN' },
}

// ─── EXT ICON CONFIG ──────────────────────────────────
function getExtConfig(ext: string) {
  switch (ext.toLowerCase()) {
    case 'pdf':  return { color: '#EF4444', bg: '#FEE2E2', icon: 'document-text' as const }
    case 'doc':
    case 'docx': return { color: '#2563EB', bg: '#DBEAFE', icon: 'document' as const }
    case 'xls':
    case 'xlsx': return { color: '#16A34A', bg: '#DCFCE7', icon: 'grid' as const }
    case 'jpg':
    case 'jpeg':
    case 'png':  return { color: '#7C3AED', bg: '#EDE9FE', icon: 'image' as const }
    default:     return { color: '#475569', bg: '#F1F5F9', icon: 'attach' as const }
  }
}

export default function DetailArsipScreen() {
  const { user } = useAuth()
  const nav    = useNavigation()
  const route  = useRoute<Route>()
  const insets = useSafeAreaInsets()

  const [archive,     setArchive]     = useState<Archive | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [showEdit,    setShowEdit]    = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [saving,      setSaving]      = useState(false)
  const fadeAnim = useState(new Animated.Value(0))[0]
  const slideAnim = useState(new Animated.Value(30))[0]

  // Edit fields
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
    } catch (e: any) {
      Alert.alert('Gagal', e.message)
    } finally { setSaving(false) }
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
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Buka atau Simpan File',
          UTI: 'com.adobe.pdf',
        })
      } else {
        Alert.alert('Berhasil', 'File tersimpan di: ' + result.uri)
      }
    } catch (e: any) {
      Alert.alert('Gagal mengunduh', e.message)
    }
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

  // ── LOADING ──
  if (loading) return (
    <View style={s.loadingRoot}>
      <View style={s.loadingCard}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={s.loadingText}>Memuat detail arsip...</Text>
      </View>
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

      {/* ── SCROLLABLE CONTENT ── */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >

        {/* ══ HERO GRADIENT HEADER ══ */}
        <LinearGradient
          colors={[catColor, catColor + 'CC', '#F1F5F9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          {/* Back button area placeholder (nav header handles back) */}
          <View style={[s.heroDocIcon, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Ionicons name={extCfg.icon} size={40} color="#fff" />
          </View>

          <View style={s.heroBadgeRow}>
            {/* Status badge */}
            <View style={[s.statusPill, { backgroundColor: statusCfg.bg }]}>
              <View style={[s.statusDot, { backgroundColor: statusCfg.dot }]} />
              <Text style={[s.statusPillText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
            </View>
            {/* EXT badge */}
            <View style={[s.extPill, { backgroundColor: extCfg.bg }]}>
              <Text style={[s.extPillText, { color: extCfg.color }]}>{ext}</Text>
            </View>
            {/* Category */}
            <CategoryChip name={archive.category?.nama ?? ''} />
          </View>

          <Text style={s.heroTitle}>{archive.judul}</Text>
          <Text style={s.heroSub}>No. {archive.nomorSurat || '—'}</Text>
        </LinearGradient>

        {/* ══ QUICK STATS STRIP ══ */}
        <View style={s.statsStrip}>
          <StatItem icon="calendar-outline" label="Tgl. Surat" value={formatDate(archive.tanggalSurat)} color="#3B82F6" />
          <View style={s.statsDivider} />
          <StatItem icon="time-outline" label="Retensi" value={`${archive.masaRetensi} bln`} color="#F59E0B" />
          <View style={s.statsDivider} />
          <StatItem icon="business-outline" label="Unit" value={archive.unit?.namaUnit ?? '—'} color="#10B981" />
        </View>

        {/* ══ INFORMASI DOKUMEN ══ */}
        <SectionCard title="Informasi Dokumen" icon="document-text-outline" iconColor="#3B82F6" iconBg="#EFF6FF">
          <InfoItem label="Nomor Surat"   value={archive.nomorSurat}             icon="barcode-outline"    color="#3B82F6" />
          <InfoItem label="Tanggal Surat" value={formatDate(archive.tanggalSurat)} icon="calendar-outline"  color="#8B5CF6" />
          <InfoItem label="Pengirim"      value={archive.pengirim}               icon="person-outline"     color="#F59E0B" />
          <InfoItem label="Penerima"      value={archive.penerima}               icon="people-outline"     color="#10B981" />
          <InfoItem label="Perihal"       value={archive.perihal}                icon="chatbubble-outline"  color="#EF4444" />
          <InfoItem label="Unit Kerja"    value={archive.unit?.namaUnit}         icon="business-outline"   color="#06B6D4" />
          <InfoItem label="Masa Retensi"  value={`${archive.masaRetensi} bulan`} icon="hourglass-outline"  color="#F97316" last />
        </SectionCard>

        {/* ══ RIWAYAT UPLOAD ══ */}
        <SectionCard title="Riwayat Upload" icon="cloud-upload-outline" iconColor="#8B5CF6" iconBg="#EDE9FE">
          <InfoItem label="Diunggah oleh"  value={archive.user?.namaLengkap}     icon="person-circle-outline" color="#8B5CF6" />
          <InfoItem label="Tanggal Upload" value={formatDate(archive.createdAt)} icon="calendar-outline"      color="#3B82F6" last />
        </SectionCard>

        {/* ══ FILE DOKUMEN ══ */}
        <SectionCard title="File Dokumen" icon="attach-outline" iconColor="#EF4444" iconBg="#FEE2E2">
          {fileUrl ? (
            <TouchableOpacity style={s.fileCard} onPress={() => setShowPreview(true)} activeOpacity={0.85}>
              <LinearGradient
                colors={[extCfg.bg, extCfg.bg + '88']}
                style={s.fileIconWrap}
              >
                <Ionicons name={extCfg.icon} size={30} color={extCfg.color} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={s.fileCardName} numberOfLines={2}>{fileName}</Text>
                <View style={s.filePreviewHint}>
                  <Ionicons name="eye-outline" size={12} color="#94A3B8" />
                  <Text style={s.filePreviewText}>Ketuk untuk pratinjau</Text>
                </View>
              </View>
              <View style={[s.fileExtBadge, { backgroundColor: extCfg.bg }]}>
                <Text style={[s.fileExtText, { color: extCfg.color }]}>{ext}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={s.noFile}>
              <Ionicons name="document-outline" size={32} color="#CBD5E1" />
              <Text style={s.noFileText}>Tidak ada file terlampir</Text>
            </View>
          )}
        </SectionCard>

      </Animated.ScrollView>

      {/* ══ FLOATING BOTTOM BAR ══ */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[s.btnDownload, !fileUrl && { opacity: 0.4 }]}
          onPress={handleDownload}
          disabled={!fileUrl}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#3B82F6', '#2563EB']} style={s.btnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="download-outline" size={18} color="#fff" />
            <Text style={s.btnDownloadText}>Unduh File</Text>
          </LinearGradient>
        </TouchableOpacity>

        {canEdit && (
          <View style={s.btnGroup}>
            <TouchableOpacity style={s.btnIcon} onPress={openEdit} activeOpacity={0.8}>
              <Ionicons name="create-outline" size={20} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnIcon, { backgroundColor: '#FEF2F2' }]} onPress={handleDelete} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ══════════════════════════════════════
          MODAL: PREVIEW PDF
      ══════════════════════════════════════ */}
      <Modal visible={showPreview} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
          <LinearGradient
            colors={['#1E293B', '#0F172A']}
            style={[s.previewHeader, { paddingTop: insets.top + 10 }]}
          >
            <TouchableOpacity style={s.previewBtn} onPress={() => setShowPreview(false)}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={s.previewTitle} numberOfLines={1}>{fileName}</Text>
              <Text style={s.previewSubtitle}>{ext} Document</Text>
            </View>
            <TouchableOpacity style={[s.previewBtn, { backgroundColor: '#3B82F6' }]} onPress={handleDownload}>
              <Ionicons name="download-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
          <WebView
            source={{ uri: `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true` }}
            style={{ flex: 1 }}
            startInLoadingState
            renderLoading={() => (
              <View style={s.previewLoading}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={s.previewLoadingText}>Memuat dokumen...</Text>
              </View>
            )}
          />
        </View>
      </Modal>

      {/* ══════════════════════════════════════
          MODAL: EDIT ARSIP
      ══════════════════════════════════════ */}
      <Modal visible={showEdit} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            {/* Handle */}
            <View style={s.modalHandle} />

            <View style={s.modalHeaderRow}>
              <View style={s.modalIconBox}>
                <Ionicons name="create-outline" size={18} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>Edit Arsip</Text>
                <Text style={s.modalSub}>Perbarui informasi dokumen</Text>
              </View>
              <TouchableOpacity style={s.modalCloseBtn} onPress={() => setShowEdit(false)}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <EditField label="Nomor Surat"         value={editNomor}    onChangeText={setEditNomor}    icon="barcode-outline" />
              <EditField label="Judul Arsip"          value={editJudul}    onChangeText={setEditJudul}    icon="document-text-outline" required />
              <EditField label="Pengirim"             value={editPengirim} onChangeText={setEditPengirim} icon="person-outline" required />
              <EditField label="Penerima"             value={editPenerima} onChangeText={setEditPenerima} icon="people-outline" required />
              <EditField label="Perihal"              value={editPerihal}  onChangeText={setEditPerihal}  icon="chatbubble-outline" required multiline />
              <EditField label="Masa Retensi (bulan)" value={editRetensi}  onChangeText={setEditRetensi}  icon="hourglass-outline" keyboardType="numeric" />
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
                <LinearGradient colors={['#3B82F6', '#2563EB']} style={s.saveBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <>
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
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

function StatItem({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <View style={s.statItem}>
      <View style={[s.statIconBox, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue} numberOfLines={1}>{value}</Text>
    </View>
  )
}

function SectionCard({ title, icon, iconColor, iconBg, children }: {
  title: string; icon: any; iconColor: string; iconBg: string; children: React.ReactNode
}) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={[s.cardIconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={15} color={iconColor} />
        </View>
        <Text style={s.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  )
}

function InfoItem({ label, value, icon, color, last }: {
  label: string; value?: string; icon: any; color: string; last?: boolean
}) {
  return (
    <View style={[s.infoItem, last && { borderBottomWidth: 0 }]}>
      <View style={[s.infoIconBox, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={13} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue} numberOfLines={2}>{value || '—'}</Text>
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
        {icon && <Ionicons name={icon} size={12} color="#94A3B8" />}
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
      />
    </View>
  )
}

// ─── STYLES ──────────────────────────────────────────
const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#F1F5F9' },

  // Loading
  loadingRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
  loadingCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 32, gap: 12, ...SHADOW.sm },
  loadingText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },

  // Hero
  hero:         { paddingTop: 28, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center', gap: 12 },
  heroDocIcon:  { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  heroBadgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  heroTitle:    { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 26, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  heroSub:      { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600', letterSpacing: 0.5 },

  // Status / Ext pills
  statusPill:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot:      { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  extPill:        { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  extPillText:    { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  // Stats strip
  statsStrip:   { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: -16, borderRadius: 16, padding: 16, ...SHADOW.sm },
  statItem:     { flex: 1, alignItems: 'center', gap: 4 },
  statsDivider: { width: 1, backgroundColor: '#E2E8F0' },
  statIconBox:  { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statLabel:    { fontSize: 10, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  statValue:    { fontSize: 12, color: '#1E293B', fontWeight: '700', textAlign: 'center' },

  // Card
  card:       { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginHorizontal: 16, marginTop: 12, ...SHADOW.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cardIconBox:{ width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle:  { fontSize: 14, fontWeight: '800', color: '#1E293B', letterSpacing: 0.2 },

  // Info items
  infoItem:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  infoIconBox: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  infoLabel:   { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  infoValue:   { fontSize: 13, color: '#1E293B', fontWeight: '600', lineHeight: 18 },

  // File card
  fileCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, gap: 12, borderWidth: 1.5, borderColor: '#E2E8F0' },
  fileIconWrap:  { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  fileCardName:  { fontSize: 13, fontWeight: '700', color: '#1E293B', lineHeight: 18 },
  filePreviewHint:{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  filePreviewText:{ fontSize: 11, color: '#94A3B8' },
  fileExtBadge:  { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  fileExtText:   { fontSize: 10, fontWeight: '800' },
  noFile:        { alignItems: 'center', gap: 8, paddingVertical: 20 },
  noFileText:    { color: '#CBD5E1', fontSize: 13, fontWeight: '600' },

  // Bottom bar
  bottomBar:    { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 14, paddingHorizontal: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  btnDownload:  { flex: 1, borderRadius: 14, overflow: 'hidden' },
  btnGradient:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  btnDownloadText:{ color: '#fff', fontSize: 15, fontWeight: '700' },
  btnGroup:     { flexDirection: 'row', gap: 8 },
  btnIcon:      { width: 50, height: 50, borderRadius: 14, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },

  // Preview modal
  previewHeader:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  previewBtn:         { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  previewTitle:       { color: '#fff', fontSize: 14, fontWeight: '700' },
  previewSubtitle:    { color: '#94A3B8', fontSize: 11, marginTop: 1 },
  previewLoading:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9', gap: 12 },
  previewLoadingText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },

  // Edit modal
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalSheet:     { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  modalHandle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 20 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  modalIconBox:   { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  modalTitle:     { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  modalSub:       { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  modalCloseBtn:  { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  modalFooter:    { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn:      { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelText:     { color: '#64748B', fontWeight: '700', fontSize: 14 },
  saveBtn:        { flex: 2, borderRadius: 14, overflow: 'hidden' },
  saveBtnGradient:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  saveText:       { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Edit fields
  editWrap:        { marginBottom: 14 },
  editLabelRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 7 },
  editLabel:       { fontSize: 12, fontWeight: '700', color: '#64748B' },
  editRequired:    { fontSize: 12, color: '#EF4444', fontWeight: '800' },
  editInput:       { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#1E293B', backgroundColor: '#F8FAFC' },
  editInputFocused:{ borderColor: '#3B82F6', backgroundColor: '#fff' },
  editMultiline:   { height: 80, textAlignVertical: 'top' },
})
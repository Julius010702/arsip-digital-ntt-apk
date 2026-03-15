import React, { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native'
import { downloadAsync, documentDirectory } from "expo-file-system"
import * as Sharing from "expo-sharing"
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { archiveApi } from '../services/api'
import { Archive } from '../types'
import { COLORS, CAT_COLORS, RADIUS, SHADOW, SPACING } from '../utils/theme'
import { formatDate } from '../utils/format'
import { InfoRow, CategoryChip } from '../components/UI'
import { useAuth } from '../hooks/useAuth'
import { RootStackParams } from '../navigation/types'

type Route = RouteProp<RootStackParams, 'DetailArsip'>

export default function DetailArsipScreen() {
  const { user } = useAuth()
  const nav    = useNavigation()
  const route  = useRoute<Route>()
  const insets = useSafeAreaInsets()

  const [archive,   setArchive]   = useState<Archive | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [showEdit,  setShowEdit]  = useState(false)
  const [saving,    setSaving]    = useState(false)

  // Edit fields
  const [editJudul,      setEditJudul]      = useState('')
  const [editPengirim,   setEditPengirim]   = useState('')
  const [editPenerima,   setEditPenerima]   = useState('')
  const [editPerihal,    setEditPerihal]    = useState('')
  const [editNomor,      setEditNomor]      = useState('')
  const [editRetensi,    setEditRetensi]    = useState('')

  const canEdit = ['super_admin', 'admin_unit'].includes(user?.role ?? '')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await archiveApi.get(route.params.id)
      setArchive(res.data)
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
        judul:      editJudul.trim(),
        pengirim:   editPengirim.trim(),
        penerima:   editPenerima.trim(),
        perihal:    editPerihal.trim(),
        nomorSurat: editNomor.trim(),
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
      const destUri = (documentDirectory ?? '') + fileName2
      const downloadRes = await downloadAsync(fileUrl, destUri)
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Simpan atau Buka File',
          UTI: 'com.adobe.pdf',
        })
      } else {
        Alert.alert('Berhasil', 'File tersimpan di: ' + downloadRes.uri)
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

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' }}>
      <ActivityIndicator size="large" color={COLORS.primaryLight} />
      <Text style={{ color: COLORS.muted, marginTop: 12, fontSize: 13 }}>Memuat detail arsip...</Text>
    </View>
  )
  if (!archive) return null

  const catColor = CAT_COLORS[archive.category?.nama ?? ''] ?? COLORS.info
  const fileUrl  = archive.filePath ?? ''
  const ext      = fileUrl.split('?')[0].split('.').pop()?.toUpperCase() ?? 'FILE'
  const fileName = fileUrl.split('/').pop()?.split('?')[0] ?? archive.judul

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>

        {/* ── HERO ── */}
        <View style={s.hero}>
          <View style={[s.heroIconBox, { backgroundColor: catColor + '22' }]}>
            <Ionicons name="document-text" size={36} color={catColor} />
          </View>
          <Text style={s.heroTitle}>{archive.judul}</Text>
          <View style={s.heroChips}>
            <CategoryChip name={archive.category?.nama ?? ''} />
            <View style={s.extBadge}>
              <Text style={s.extText}>{ext}</Text>
            </View>
            <View style={[s.statusBadge, {
              backgroundColor: archive.statusArsip === 'aktif' ? '#DCFCE7' : '#FEF3C7'
            }]}>
              <Text style={[s.statusText, {
                color: archive.statusArsip === 'aktif' ? '#16A34A' : '#D97706'
              }]}>{archive.statusArsip?.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* ── INFORMASI DOKUMEN ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="information-circle-outline" size={16} color="#3B82F6" />
            </View>
            <Text style={s.cardTitle}>Informasi Dokumen</Text>
          </View>
          <InfoRow icon="🔢" label="Nomor Surat"    value={archive.nomorSurat} />
          <InfoRow icon="📅" label="Tanggal Surat"  value={formatDate(archive.tanggalSurat)} />
          <InfoRow icon="👤" label="Pengirim"       value={archive.pengirim} />
          <InfoRow icon="👥" label="Penerima"       value={archive.penerima} />
          <InfoRow icon="💬" label="Perihal"        value={archive.perihal} />
          <InfoRow icon="🏢" label="Unit Kerja"     value={archive.unit?.namaUnit} />
          <InfoRow icon="⏱️" label="Masa Retensi"   value={`${archive.masaRetensi} bulan`} />
          <InfoRow icon="✍️" label="Diunggah oleh"  value={archive.user?.namaLengkap} />
          <InfoRow icon="📅" label="Tanggal Upload" value={formatDate(archive.createdAt)} />
        </View>

        {/* ── FILE DOKUMEN (tanpa duplikat tombol) ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIconBox, { backgroundColor: '#FFF5F5' }]}>
              <Ionicons name="attach-outline" size={16} color="#EF4444" />
            </View>
            <Text style={s.cardTitle}>File Dokumen</Text>
          </View>
          {fileUrl ? (
            <View style={s.fileBox}>
              <View style={s.fileIconBox}>
                <Ionicons name="document" size={28} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fileName} numberOfLines={2}>{fileName}</Text>
                <Text style={s.fileMeta}>Gunakan tombol "Unduh File" di bawah</Text>
              </View>
              <View style={[s.extMini, { backgroundColor: '#FEF2F2' }]}>
                <Text style={[s.extMiniText, { color: '#EF4444' }]}>{ext}</Text>
              </View>
            </View>
          ) : (
            <View style={s.noFileBox}>
              <Ionicons name="document-outline" size={28} color={COLORS.disabled} />
              <Text style={s.noFileText}>File tidak tersedia</Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* ── BOTTOM BAR ── */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + SPACING.md }]}>
        <TouchableOpacity
          style={[s.btnUnduh, !fileUrl && { opacity: 0.4 }]}
          onPress={handleDownload}
          disabled={!fileUrl}
        >
          <Ionicons name="download-outline" size={18} color={COLORS.primaryLight} />
          <Text style={s.btnUnduhText}>Unduh File</Text>
        </TouchableOpacity>

        {canEdit && (
          <>
            <TouchableOpacity style={s.btnEdit} onPress={openEdit}>
              <Ionicons name="create-outline" size={18} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity style={s.btnHapus} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ══════════════════════════════════════
          MODAL EDIT ARSIP
      ══════════════════════════════════════ */}
      <Modal visible={showEdit} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <View style={[s.modalHeaderIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="create-outline" size={20} color="#3B82F6" />
              </View>
              <Text style={s.modalTitle}>Edit Arsip</Text>
              <TouchableOpacity onPress={() => setShowEdit(false)}>
                <Ionicons name="close" size={22} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <EditField label="Nomor Surat"   value={editNomor}    onChangeText={setEditNomor} />
              <EditField label="Judul *"        value={editJudul}    onChangeText={setEditJudul} />
              <EditField label="Pengirim *"     value={editPengirim} onChangeText={setEditPengirim} />
              <EditField label="Penerima *"     value={editPenerima} onChangeText={setEditPenerima} />
              <EditField label="Perihal *"      value={editPerihal}  onChangeText={setEditPerihal} multiline />
              <EditField label="Masa Retensi (bulan)" value={editRetensi} onChangeText={setEditRetensi} keyboardType="numeric" />
            </ScrollView>

            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowEdit(false)}>
                <Text style={s.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalSaveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color={COLORS.white} size="small" />
                  : <>
                      <Ionicons name="checkmark" size={16} color={COLORS.white} />
                      <Text style={s.modalSaveText}>Simpan</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function EditField({ label, value, onChangeText, multiline, keyboardType }: {
  label: string; value: string; onChangeText: (v: string) => void
  multiline?: boolean; keyboardType?: any
}) {
  return (
    <View style={s.editField}>
      <Text style={s.editLabel}>{label}</Text>
      <TextInput
        style={[s.editInput, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        placeholderTextColor={COLORS.placeholder}
      />
    </View>
  )
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#F1F5F9' },

  // Hero
  hero:         { backgroundColor: COLORS.white, padding: SPACING.xl, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  heroIconBox:  { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  heroTitle:    { fontSize: 16, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 12, lineHeight: 24 },
  heroChips:    { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  extBadge:     { backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.border },
  extText:      { fontSize: 11, fontWeight: '800', color: COLORS.muted },
  statusBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:   { fontSize: 11, fontWeight: '800' },

  // Card
  card:         { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, marginHorizontal: SPACING.lg, marginTop: SPACING.md, ...SHADOW.sm },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  cardIconBox:  { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardTitle:    { fontSize: 14, fontWeight: '800', color: COLORS.text },

  // File box
  fileBox:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5F5', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FEE2E2', gap: 10 },
  fileIconBox:  { width: 46, height: 46, backgroundColor: COLORS.white, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  fileName:     { fontSize: 13, fontWeight: '700', color: COLORS.text },
  fileMeta:     { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  extMini:      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  extMiniText:  { fontSize: 10, fontWeight: '800' },
  noFileBox:    { flexDirection: 'row', alignItems: 'center', gap: 8, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.md },
  noFileText:   { fontSize: 13, color: COLORS.muted },

  // Bottom bar
  bottomBar:    { flexDirection: 'row', gap: 10, paddingTop: SPACING.md, paddingHorizontal: SPACING.lg, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  btnUnduh:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primarySoft, borderRadius: 14, paddingVertical: 15, gap: 8 },
  btnUnduhText: { fontSize: 15, fontWeight: '700', color: COLORS.primaryLight },
  btnEdit:      { width: 50, backgroundColor: '#EFF6FF', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  btnHapus:     { width: 50, backgroundColor: COLORS.dangerSoft, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  // Modal
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:       { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, paddingBottom: 40, maxHeight: '90%' },
  modalHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.lg },
  modalHeaderIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  modalTitle:      { flex: 1, fontSize: 17, fontWeight: '800', color: COLORS.text },
  modalActions:    { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  modalCancelBtn:  { flex: 1, paddingVertical: 14, borderRadius: RADIUS.lg, backgroundColor: '#F1F5F9', alignItems: 'center' },
  modalCancelText: { color: COLORS.muted, fontWeight: '700' },
  modalSaveBtn:    { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: RADIUS.lg, backgroundColor: '#3B82F6' },
  modalSaveText:   { color: COLORS.white, fontWeight: '700', fontSize: 14 },

  // Edit fields
  editField:    { marginBottom: SPACING.md },
  editLabel:    { fontSize: 12, fontWeight: '700', color: COLORS.muted, marginBottom: 6 },
  editInput:    { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text, backgroundColor: '#F8FAFC' },
})
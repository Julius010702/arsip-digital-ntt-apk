// ======================================================
// FILE: mobile/src/screens/DetailPenilaianScreen.tsx
// ======================================================

import React, { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native'
import { RouteProp, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../hooks/useAuth'
import { penilaianApi } from '../services/api'
import { COLORS, SHADOW, RADIUS, SPACING, STATUS_PENILAIAN, ROLE_LABEL } from '../utils/theme'
import { RootStackParams } from '../navigation/types'
import { PenilaianArsip } from '../types'
import { formatDate } from '../utils/format'

type Route = RouteProp<RootStackParams, 'DetailPenilaian'>

const TINDAKAN_OPTIONS = [
  { value: 'inaktif',     label: 'Jadikan Inaktif',  icon: 'pause-circle-outline',  color: COLORS.warning },
  { value: 'dinamis',     label: 'Jadikan Dinamis',  icon: 'refresh-circle-outline', color: COLORS.info },
  { value: 'hapus',       label: 'Musnahkan',        icon: 'trash-outline',          color: COLORS.danger },
  { value: 'pertahankan', label: 'Pertahankan',      icon: 'shield-checkmark-outline', color: COLORS.success },
]

export default function DetailPenilaianScreen() {
  const route    = useRoute<Route>()
  const { user } = useAuth()
  const [penilaian, setPenilaian] = useState<PenilaianArsip | null>(null)
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showModal, setShowModal]   = useState(false)
  const [aksi, setAksi]             = useState<'setujui' | 'tolak'>('setujui')
  const [catatan, setCatatan]       = useState('')
  const [tindakanAkhir, setTindakanAkhir] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const res = await penilaianApi.list({ limit: 1 })
      // Fetch individual - untuk sekarang ambil dari list dan filter
      const detail = (res.data ?? []).find((p: PenilaianArsip) => p.id === route.params.id)
      // Jika tidak ketemu, fetch ulang semua
      if (detail) setPenilaian(detail)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function bukaModal(a: 'setujui' | 'tolak') {
    setAksi(a)
    setCatatan('')
    setTindakanAkhir('')
    setShowModal(true)
  }

  async function kirimAksi() {
    if (!catatan.trim()) {
      Alert.alert('Perhatian', 'Catatan wajib diisi')
      return
    }
    if (aksi === 'setujui' && penilaian?.status === 'menunggu_dinas_arsip' && !tindakanAkhir) {
      Alert.alert('Perhatian', 'Pilih tindakan akhir terlebih dahulu')
      return
    }

    setSubmitting(true)
    try {
      await penilaianApi.aksi(route.params.id, {
        aksi,
        catatan,
        tindakanAkhir: tindakanAkhir || undefined,
      })
      setShowModal(false)
      Alert.alert('Berhasil', `Penilaian berhasil ${aksi === 'setujui' ? 'disetujui' : 'ditolak'}`)
      loadData()
    } catch (e: any) {
      Alert.alert('Gagal', e.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Cek apakah user bisa aksi di tahap ini
  const bisaAksi = () => {
    if (!penilaian) return false
    if (['selesai', 'ditolak'].includes(penilaian.status)) return false
    if ((user?.role === 'pimpinan' || user?.role === 'super_admin') &&
        ['menunggu_kepala_bagian', 'menunggu_kepala_biro'].includes(penilaian.status)) return true
    if ((user?.role === 'dinas_arsip' || user?.role === 'super_admin') &&
        penilaian.status === 'menunggu_dinas_arsip') return true
    return false
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
  }

  if (!penilaian) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Data penilaian tidak ditemukan</Text>
      </View>
    )
  }

  const s = STATUS_PENILAIAN[penilaian.status]

  return (
    <ScrollView style={styles.container}>
      {/* Status */}
      <View style={[styles.statusCard, { backgroundColor: s?.bg ?? COLORS.surface }]}>
        <Text style={[styles.statusLabel, { color: s?.color }]}>{s?.label}</Text>
        <Text style={styles.statusSub}>
          Dibuat: {formatDate(penilaian.createdAt)} oleh {penilaian.pembuatPenilaian?.namaLengkap}
          ({ROLE_LABEL[penilaian.pembuatPenilaian?.role ?? '']})
        </Text>
      </View>

      {/* Info Arsip */}
      <View style={[styles.section, SHADOW.sm]}>
        <Text style={styles.sectionTitle}>Arsip yang Dinilai</Text>
        <Text style={styles.fieldLabel}>Nomor Surat</Text>
        <Text style={styles.fieldValue}>{penilaian.archive?.nomorSurat}</Text>
        <Text style={styles.fieldLabel}>Judul</Text>
        <Text style={styles.fieldValue}>{penilaian.archive?.judul}</Text>
        <Text style={styles.fieldLabel}>Unit</Text>
        <Text style={styles.fieldValue}>{penilaian.archive?.unit?.namaUnit}</Text>
        <Text style={styles.fieldLabel}>Kategori</Text>
        <Text style={styles.fieldValue}>{penilaian.archive?.category?.nama}</Text>
      </View>

      {/* Usulan */}
      <View style={[styles.section, SHADOW.sm]}>
        <Text style={styles.sectionTitle}>Usulan Penilaian</Text>
        <Text style={styles.fieldLabel}>Usulan Tindakan</Text>
        <Text style={[styles.fieldValue, { textTransform: 'capitalize', color: COLORS.primary, fontWeight: '700' }]}>
          {penilaian.usulanTindakan}
        </Text>
        <Text style={styles.fieldLabel}>Alasan</Text>
        <Text style={styles.fieldValue}>{penilaian.alasanUsulan}</Text>
      </View>

      {/* Alur Tahap */}
      <View style={[styles.section, SHADOW.sm]}>
        <Text style={styles.sectionTitle}>Alur Penilaian</Text>
        {[
          { key: 'menunggu_kepala_bagian', label: 'Kepala Bagian' },
          { key: 'menunggu_kepala_biro',   label: 'Kepala Biro' },
          { key: 'menunggu_dinas_arsip',   label: 'Dinas Arsip' },
          { key: 'selesai',                label: 'Selesai' },
        ].map((step, i) => {
          const stepOrder = ['menunggu_kepala_bagian', 'menunggu_kepala_biro', 'menunggu_dinas_arsip', 'selesai']
          const currentIdx = stepOrder.indexOf(penilaian.status)
          const isDone    = i < currentIdx || penilaian.status === 'selesai'
          const isCurrent = i === currentIdx && penilaian.status !== 'selesai'
          return (
            <View key={step.key} style={styles.tahapRow}>
              <View style={[styles.tahapDot, isDone && styles.tahapDotDone, isCurrent && styles.tahapDotCurrent]}>
                {isDone && <Ionicons name="checkmark" size={12} color={COLORS.white} />}
                {isCurrent && <View style={styles.tahapDotInner} />}
              </View>
              <View style={styles.tahapInfo}>
                <Text style={[styles.tahapLabel, isCurrent && { color: COLORS.primary, fontWeight: '700' }]}>
                  {step.label}
                </Text>
                {isCurrent && <Text style={styles.tahapCurrent}>Menunggu persetujuan</Text>}
              </View>
              {i < 3 && <View style={[styles.tahapLine, isDone && styles.tahapLineDone]} />}
            </View>
          )
        })}
      </View>

      {/* Tombol Aksi */}
      {bisaAksi() && (
        <View style={styles.aksiRow}>
          <TouchableOpacity
            style={[styles.aksiBtn, styles.tolakBtn]}
            onPress={() => bukaModal('tolak')}
          >
            <Ionicons name="close-circle-outline" size={20} color={COLORS.danger} />
            <Text style={[styles.aksiBtnText, { color: COLORS.danger }]}>Tolak</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.aksiBtn, styles.setujuiBtn]}
            onPress={() => bukaModal('setujui')}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
            <Text style={[styles.aksiBtnText, { color: COLORS.white }]}>Setujui</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 32 }} />

      {/* Modal Aksi */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {aksi === 'setujui' ? '✅ Setujui Penilaian' : '❌ Tolak Penilaian'}
            </Text>

            {/* Pilih tindakan akhir (khusus Dinas Arsip tahap akhir) */}
            {aksi === 'setujui' && penilaian.status === 'menunggu_dinas_arsip' && (
              <View style={styles.tindakanWrap}>
                <Text style={styles.modalLabel}>Tindakan Akhir *</Text>
                {TINDAKAN_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.tindakanChip, tindakanAkhir === opt.value && { borderColor: opt.color, backgroundColor: opt.color + '18' }]}
                    onPress={() => setTindakanAkhir(opt.value)}
                  >
                    <Ionicons name={opt.icon as any} size={18} color={opt.color} />
                    <Text style={[styles.tindakanText, tindakanAkhir === opt.value && { color: opt.color, fontWeight: '700' }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.modalLabel}>Catatan *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Tulis catatan..."
              value={catatan}
              onChangeText={setCatatan}
              multiline
              numberOfLines={3}
              placeholderTextColor={COLORS.placeholder}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalBtnBatal} onPress={() => setShowModal(false)}>
                <Text style={styles.modalBtnBatalText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnKirim, aksi === 'tolak' && { backgroundColor: COLORS.danger }]}
                onPress={kirimAksi}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color={COLORS.white} size="small" />
                  : <Text style={styles.modalBtnKirimText}>{aksi === 'setujui' ? 'Setujui' : 'Tolak'}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: COLORS.background },
  center:            { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText:         { color: COLORS.muted, fontSize: 15 },
  statusCard:        { padding: SPACING.lg, alignItems: 'center' },
  statusLabel:       { fontSize: 18, fontWeight: '800' },
  statusSub:         { fontSize: 12, color: COLORS.muted, marginTop: 4, textAlign: 'center' },
  section:           { backgroundColor: COLORS.white, margin: SPACING.lg, marginBottom: 0, borderRadius: RADIUS.lg, padding: SPACING.lg },
  sectionTitle:      { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  fieldLabel:        { fontSize: 12, color: COLORS.muted, marginTop: SPACING.sm },
  fieldValue:        { fontSize: 14, color: COLORS.text, marginTop: 2 },
  tahapRow:          { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  tahapDot:          { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.disabled, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md, marginTop: 2 },
  tahapDotDone:      { backgroundColor: COLORS.success },
  tahapDotCurrent:   { backgroundColor: COLORS.white, borderWidth: 3, borderColor: COLORS.primary },
  tahapDotInner:     { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  tahapInfo:         { flex: 1 },
  tahapLabel:        { fontSize: 14, color: COLORS.textSecondary },
  tahapCurrent:      { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  tahapLine:         { display: 'none' },
  tahapLineDone:     { display: 'none' },
  aksiRow:           { flexDirection: 'row', margin: SPACING.lg, gap: SPACING.md },
  aksiBtn:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: SPACING.md, borderRadius: RADIUS.lg },
  tolakBtn:          { backgroundColor: COLORS.dangerSoft, borderWidth: 1, borderColor: COLORS.danger },
  setujuiBtn:        { backgroundColor: COLORS.primary },
  aksiBtnText:       { fontSize: 15, fontWeight: '700' },
  modalOverlay:      { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
  modalBox:          { backgroundColor: COLORS.white, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl },
  modalTitle:        { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.lg },
  modalLabel:        { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.sm },
  modalInput:        { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, textAlignVertical: 'top', marginBottom: SPACING.lg },
  tindakanWrap:      { marginBottom: SPACING.lg },
  tindakanChip:      { flexDirection: 'row', alignItems: 'center', gap: 10, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: SPACING.sm },
  tindakanText:      { fontSize: 14, color: COLORS.text },
  modalBtns:         { flexDirection: 'row', gap: SPACING.md },
  modalBtnBatal:     { flex: 1, padding: SPACING.md, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface, alignItems: 'center' },
  modalBtnBatalText: { color: COLORS.muted, fontWeight: '700' },
  modalBtnKirim:     { flex: 1, padding: SPACING.md, borderRadius: RADIUS.lg, backgroundColor: COLORS.primary, alignItems: 'center' },
  modalBtnKirimText: { color: COLORS.white, fontWeight: '700' },
})
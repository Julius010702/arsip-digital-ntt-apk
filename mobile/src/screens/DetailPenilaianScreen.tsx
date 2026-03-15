// ======================================================
// FILE: mobile/src/screens/DetailPenilaianScreen.tsx
// ======================================================

import React, { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../hooks/useAuth'
import { penilaianApi } from '../services/api'
import { COLORS, SHADOW, RADIUS, SPACING, STATUS_PENILAIAN, ROLE_LABEL } from '../utils/theme'
import { RootStackParams } from '../navigation/types'
import { PenilaianArsip } from '../types'
import { formatDate } from '../utils/format'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type Route = RouteProp<RootStackParams, 'DetailPenilaian'>

const TINDAKAN_OPTIONS = [
  { value: 'inaktif',     label: 'Jadikan Inaktif',  icon: 'pause-circle-outline',     color: '#F59E0B', bg: '#FFFBEB' },
  { value: 'dinamis',     label: 'Jadikan Dinamis',  icon: 'refresh-circle-outline',   color: '#3B82F6', bg: '#EFF6FF' },
  { value: 'hapus',       label: 'Musnahkan',        icon: 'trash-outline',             color: '#EF4444', bg: '#FEF2F2' },
  { value: 'pertahankan', label: 'Pertahankan',      icon: 'shield-checkmark-outline', color: '#10B981', bg: '#F0FDF4' },
]

const STEP_KEYS   = ['menunggu_kepala_bagian', 'menunggu_kepala_biro', 'menunggu_dinas_arsip', 'selesai']
const STEP_LABELS = ['Kepala Bagian', 'Kepala Biro', 'Dinas Arsip', 'Selesai']
const STEP_ICONS  = ['person-outline', 'people-outline', 'business-outline', 'checkmark-circle-outline']

export default function DetailPenilaianScreen() {
  const route    = useRoute<Route>()
  const nav      = useNavigation()
  const { user } = useAuth()
  const insets   = useSafeAreaInsets()

  const [penilaian,    setPenilaian]    = useState<PenilaianArsip | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [submitting,   setSubmitting]   = useState(false)
  const [showModal,    setShowModal]    = useState(false)
  const [aksi,         setAksi]         = useState<'setujui' | 'tolak'>('setujui')
  const [catatan,      setCatatan]      = useState('')
  const [tindakanAkhir,setTindakanAkhir]= useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const res = await penilaianApi.list({ limit: 100 })
      const detail = (res.data ?? []).find((p: PenilaianArsip) => p.id === route.params.id)
      if (detail) setPenilaian(detail)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function bukaModal(a: 'setujui' | 'tolak') {
    setAksi(a); setCatatan(''); setTindakanAkhir(''); setShowModal(true)
  }

  async function kirimAksi() {
    if (!catatan.trim()) { Alert.alert('Perhatian', 'Catatan wajib diisi'); return }
    if (aksi === 'setujui' && penilaian?.status === 'menunggu_dinas_arsip' && !tindakanAkhir) {
      Alert.alert('Perhatian', 'Pilih tindakan akhir terlebih dahulu'); return
    }
    setSubmitting(true)
    try {
      await penilaianApi.aksi(route.params.id, {
        aksi, catatan, tindakanAkhir: tindakanAkhir || undefined,
      })
      setShowModal(false)
      Alert.alert(
        aksi === 'setujui' ? '✅ Berhasil Disetujui' : '❌ Berhasil Ditolak',
        `Penilaian telah ${aksi === 'setujui' ? 'disetujui' : 'ditolak'}`,
        [{ text: 'OK', onPress: () => { loadData() } }]
      )
    } catch (e: any) { Alert.alert('Gagal', e.message) }
    finally { setSubmitting(false) }
  }

  const bisaAksi = () => {
    if (!penilaian) return false
    if (['selesai', 'ditolak'].includes(penilaian.status)) return false
    if (['pimpinan', 'super_admin'].includes(user?.role ?? '') &&
        ['menunggu_kepala_bagian', 'menunggu_kepala_biro'].includes(penilaian.status)) return true
    if (['dinas_arsip', 'super_admin'].includes(user?.role ?? '') &&
        penilaian.status === 'menunggu_dinas_arsip') return true
    return false
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
        <Text style={s.loadingText}>Memuat detail penilaian...</Text>
      </View>
    )
  }

  if (!penilaian) {
    return (
      <View style={s.center}>
        <View style={s.notFoundBox}>
          <Ionicons name="search-outline" size={40} color={COLORS.disabled} />
          <Text style={s.notFoundText}>Data tidak ditemukan</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()}>
            <Text style={s.backBtnText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const st          = STATUS_PENILAIAN[penilaian.status]
  const currentIdx  = STEP_KEYS.indexOf(penilaian.status)
  const isRejected  = penilaian.status === 'ditolak'
  const isDone      = penilaian.status === 'selesai'
  const tindakanInfo = TINDAKAN_OPTIONS.find(t => t.value === penilaian.usulanTindakan)

  return (
    <View style={s.root}>
      <ScrollView style={s.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── STATUS HERO ── */}
        <View style={[s.hero, { backgroundColor: st?.bg ?? COLORS.surface }]}>
          <View style={[s.heroIconBox, { backgroundColor: st?.color + '22' ?? '#EEE' }]}>
            <Ionicons
              name={isRejected ? 'close-circle' : isDone ? 'checkmark-circle' : 'time'}
              size={32}
              color={st?.color || COLORS.muted}
            />
          </View>
          <Text style={[s.heroStatus, { color: st?.color }]}>{st?.label ?? penilaian.status}</Text>
          <Text style={s.heroSub}>
            ID #{penilaian.id} · {formatDate(penilaian.createdAt)}
          </Text>
          {isDone && penilaian.tindakanAkhir && (
            <View style={[s.tindakanBadge, { backgroundColor: TINDAKAN_OPTIONS.find(t => t.value === penilaian.tindakanAkhir)?.bg ?? '#EEE' }]}>
              <Text style={[s.tindakanBadgeText, { color: TINDAKAN_OPTIONS.find(t => t.value === penilaian.tindakanAkhir)?.color ?? COLORS.text }]}>
                Tindakan: {penilaian.tindakanAkhir?.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* ── PROGRESS TAHAP ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="git-branch-outline" size={16} color={COLORS.primaryLight} />
            <Text style={s.cardTitle}>Alur Penilaian</Text>
          </View>
          <View style={s.stepsRow}>
            {STEP_KEYS.map((key, i) => {
              const done    = !isRejected && (i < currentIdx || isDone)
              const current = !isRejected && !isDone && i === currentIdx
              const color   = isRejected ? COLORS.danger
                : done    ? '#10B981'
                : current ? COLORS.primaryLight
                : COLORS.disabled

              return (
                <View key={key} style={s.stepWrap}>
                  <View style={[s.stepDot, { backgroundColor: color, borderColor: current ? color + '44' : 'transparent', borderWidth: current ? 4 : 0 }]}>
                    {done && <Ionicons name="checkmark" size={10} color="#fff" />}
                  </View>
                  <Text style={[s.stepLabel, { color: done || current ? COLORS.text : COLORS.disabled }]} numberOfLines={2}>
                    {STEP_LABELS[i]}
                  </Text>
                  {i < STEP_KEYS.length - 1 && (
                    <View style={[s.stepLine, { backgroundColor: done ? '#10B981' : COLORS.disabled }]} />
                  )}
                </View>
              )
            })}
          </View>
          {isRejected && (
            <View style={s.rejectedBanner}>
              <Ionicons name="close-circle" size={16} color={COLORS.danger} />
              <Text style={s.rejectedText}>Penilaian ini telah ditolak</Text>
            </View>
          )}
        </View>

        {/* ── INFO ARSIP ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="document-text-outline" size={16} color={COLORS.primaryLight} />
            <Text style={s.cardTitle}>Arsip yang Dinilai</Text>
          </View>
          <InfoRow label="Nomor Surat" value={penilaian.archive?.nomorSurat} />
          <InfoRow label="Judul"       value={penilaian.archive?.judul} />
          <InfoRow label="Unit Kerja"  value={penilaian.archive?.unit?.namaUnit} />
          <InfoRow label="Kategori"    value={penilaian.archive?.category?.nama} />
        </View>

        {/* ── USULAN ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="clipboard-outline" size={16} color={COLORS.primaryLight} />
            <Text style={s.cardTitle}>Usulan Penilaian</Text>
          </View>
          <View style={s.usulanBox}>
            <View style={s.usulanLeft}>
              <Text style={s.usulanLabel}>Tindakan Diusulkan</Text>
              {tindakanInfo && (
                <View style={[s.tindakanPill, { backgroundColor: tindakanInfo.bg }]}>
                  <Ionicons name={tindakanInfo.icon as any} size={14} color={tindakanInfo.color} />
                  <Text style={[s.tindakanPillText, { color: tindakanInfo.color }]}>{tindakanInfo.label}</Text>
                </View>
              )}
            </View>
            <View style={s.usulanRight}>
              <Text style={s.usulanLabel}>Diusulkan Oleh</Text>
              <Text style={s.usulanValue}>{penilaian.pembuatPenilaian?.namaLengkap}</Text>
              <Text style={s.usulanMeta}>{ROLE_LABEL[penilaian.pembuatPenilaian?.role ?? ''] ?? penilaian.pembuatPenilaian?.role}</Text>
            </View>
          </View>
          <InfoRow label="Alasan Usulan" value={penilaian.alasanUsulan} multiline />
        </View>

        {/* ── RIWAYAT PENILAIAN ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="list-outline" size={16} color={COLORS.primaryLight} />
            <Text style={s.cardTitle}>Riwayat Keputusan</Text>
          </View>

          {penilaian.catatanKepalaBagian ? (
            <RiwayatItem
              tahap="Kepala Bagian"
              nilai={penilaian.nilaiKepalaBagian}
              catatan={penilaian.catatanKepalaBagian}
              tanggal={penilaian.tanggalKepalaBagian}
              icon="person-outline"
            />
          ) : (
            <EmptyRiwayat label="Kepala Bagian" />
          )}

          {penilaian.catatanKepalaBiro ? (
            <RiwayatItem
              tahap="Kepala Biro"
              nilai={penilaian.nilaiKepalaBiro}
              catatan={penilaian.catatanKepalaBiro}
              tanggal={penilaian.tanggalKepalaBiro}
              icon="people-outline"
            />
          ) : (
            <EmptyRiwayat label="Kepala Biro" />
          )}

          {penilaian.catatanDinas ? (
            <RiwayatItem
              tahap="Dinas Arsip"
              nilai={penilaian.keputusanDinas}
              catatan={penilaian.catatanDinas}
              tanggal={penilaian.tanggalDinas}
              icon="business-outline"
              isLast
            />
          ) : (
            <EmptyRiwayat label="Dinas Arsip" isLast />
          )}
        </View>

      </ScrollView>

      {/* ── BOTTOM ACTION BAR ── */}
      {bisaAksi() && (
        <View style={[s.bottomBar, { paddingBottom: insets.bottom + SPACING.md }]}>
          <TouchableOpacity style={s.tolakBtn} onPress={() => bukaModal('tolak')}>
            <Ionicons name="close-circle-outline" size={20} color={COLORS.danger} />
            <Text style={s.tolakText}>Tolak</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.setujuiBtn} onPress={() => bukaModal('setujui')}>
            <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
            <Text style={s.setujuiText}>Setujui</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ══════════════════════════════════════
          MODAL AKSI
      ══════════════════════════════════════ */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <View style={[s.modalHeaderIcon, { backgroundColor: aksi === 'setujui' ? '#F0FDF4' : '#FEF2F2' }]}>
                <Ionicons
                  name={aksi === 'setujui' ? 'checkmark-circle' : 'close-circle'}
                  size={24}
                  color={aksi === 'setujui' ? '#10B981' : COLORS.danger}
                />
              </View>
              <Text style={s.modalTitle}>
                {aksi === 'setujui' ? 'Setujui Penilaian' : 'Tolak Penilaian'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            {/* Pilih tindakan akhir (Dinas Arsip) */}
            {aksi === 'setujui' && penilaian.status === 'menunggu_dinas_arsip' && (
              <View style={s.tindakanSection}>
                <Text style={s.modalLabel}>Tindakan Akhir *</Text>
                <View style={s.tindakanGrid}>
                  {TINDAKAN_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[s.tindakanOption, tindakanAkhir === opt.value && { borderColor: opt.color, backgroundColor: opt.bg }]}
                      onPress={() => setTindakanAkhir(opt.value)}
                    >
                      <Ionicons name={opt.icon as any} size={20} color={tindakanAkhir === opt.value ? opt.color : COLORS.muted} />
                      <Text style={[s.tindakanOptionText, tindakanAkhir === opt.value && { color: opt.color, fontWeight: '700' }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <Text style={s.modalLabel}>Catatan *</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Tulis catatan keputusan..."
              value={catatan}
              onChangeText={setCatatan}
              multiline
              numberOfLines={4}
              placeholderTextColor={COLORS.placeholder}
              textAlignVertical="top"
            />

            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowModal(false)}>
                <Text style={s.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalSubmitBtn, { backgroundColor: aksi === 'setujui' ? '#10B981' : COLORS.danger }, submitting && { opacity: 0.7 }]}
                onPress={kirimAksi}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color={COLORS.white} size="small" />
                  : <>
                      <Ionicons name={aksi === 'setujui' ? 'checkmark' : 'close'} size={16} color={COLORS.white} />
                      <Text style={s.modalSubmitText}>{aksi === 'setujui' ? 'Setujui' : 'Tolak'}</Text>
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

// ─── HELPER COMPONENTS ───────────────────────────────

function InfoRow({ label, value, multiline }: { label: string; value?: string | null; multiline?: boolean }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, multiline && { lineHeight: 20 }]}>{value ?? '-'}</Text>
    </View>
  )
}

function RiwayatItem({ tahap, nilai, catatan, tanggal, icon, isLast }: {
  tahap: string; nilai?: string | null; catatan?: string | null
  tanggal?: string | null; icon: string; isLast?: boolean
}) {
  const isApproved = nilai?.toLowerCase().includes('setuju') || nilai === 'approved'
  return (
    <View style={[s.riwayatItem, !isLast && s.riwayatItemBorder]}>
      <View style={[s.riwayatDot, { backgroundColor: isApproved ? '#10B981' : COLORS.danger }]}>
        <Ionicons name={icon as any} size={12} color="#fff" />
      </View>
      <View style={s.riwayatContent}>
        <View style={s.riwayatTop}>
          <Text style={s.riwayatTahap}>{tahap}</Text>
          {tanggal && <Text style={s.riwayatTanggal}>{formatDate(tanggal)}</Text>}
        </View>
        {nilai && (
          <View style={[s.riwayatNilaiBadge, { backgroundColor: isApproved ? '#F0FDF4' : '#FEF2F2' }]}>
            <Text style={[s.riwayatNilaiText, { color: isApproved ? '#10B981' : COLORS.danger }]}>
              {nilai}
            </Text>
          </View>
        )}
        {catatan && <Text style={s.riwayatCatatan}>"{catatan}"</Text>}
      </View>
    </View>
  )
}

function EmptyRiwayat({ label, isLast }: { label: string; isLast?: boolean }) {
  return (
    <View style={[s.riwayatItem, !isLast && s.riwayatItemBorder]}>
      <View style={[s.riwayatDot, { backgroundColor: COLORS.disabled }]}>
        <Ionicons name="time-outline" size={12} color="#fff" />
      </View>
      <View style={s.riwayatContent}>
        <Text style={s.riwayatTahap}>{label}</Text>
        <Text style={s.riwayatPending}>Menunggu keputusan</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: '#F1F5F9' },
  container:        { flex: 1 },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:      { color: COLORS.muted, fontSize: 13 },
  notFoundBox:      { alignItems: 'center', gap: 12 },
  notFoundText:     { fontSize: 15, color: COLORS.muted, fontWeight: '600' },
  backBtn:          { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: RADIUS.md },
  backBtnText:      { color: COLORS.white, fontWeight: '700' },

  // Hero
  hero:             { alignItems: 'center', paddingVertical: SPACING.xl, paddingHorizontal: SPACING.lg, gap: 8 },
  heroIconBox:      { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  heroStatus:       { fontSize: 20, fontWeight: '800' },
  heroSub:          { fontSize: 12, color: COLORS.muted },
  tindakanBadge:    { paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.full, marginTop: 4 },
  tindakanBadgeText:{ fontSize: 12, fontWeight: '800' },

  // Card
  card:             { backgroundColor: COLORS.white, marginHorizontal: SPACING.lg, marginBottom: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOW.sm },
  cardHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  cardTitle:        { fontSize: 14, fontWeight: '800', color: COLORS.text },

  // Steps
  stepsRow:         { flexDirection: 'row', alignItems: 'flex-start' },
  stepWrap:         { flex: 1, alignItems: 'center', gap: 6, position: 'relative' },
  stepDot:          { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  stepLabel:        { fontSize: 9, fontWeight: '600', textAlign: 'center', lineHeight: 12 },
  stepLine:         { position: 'absolute', top: 10, left: '50%', right: '-50%', height: 2, zIndex: 0 },
  rejectedBanner:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', padding: SPACING.md, borderRadius: RADIUS.md, marginTop: SPACING.md },
  rejectedText:     { fontSize: 13, color: COLORS.danger, fontWeight: '600' },

  // Info rows
  infoRow:          { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoLabel:        { fontSize: 11, color: COLORS.muted, fontWeight: '600', marginBottom: 2 },
  infoValue:        { fontSize: 14, color: COLORS.text, fontWeight: '500' },

  // Usulan
  usulanBox:        { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  usulanLeft:       { flex: 1 },
  usulanRight:      { flex: 1 },
  usulanLabel:      { fontSize: 11, color: COLORS.muted, fontWeight: '600', marginBottom: 6 },
  usulanValue:      { fontSize: 13, color: COLORS.text, fontWeight: '700' },
  usulanMeta:       { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  tindakanPill:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, alignSelf: 'flex-start' },
  tindakanPillText: { fontSize: 12, fontWeight: '700' },

  // Riwayat
  riwayatItem:      { flexDirection: 'row', gap: SPACING.md, paddingVertical: SPACING.md },
  riwayatItemBorder:{ borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  riwayatDot:       { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  riwayatContent:   { flex: 1, gap: 4 },
  riwayatTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  riwayatTahap:     { fontSize: 13, fontWeight: '700', color: COLORS.text },
  riwayatTanggal:   { fontSize: 11, color: COLORS.muted },
  riwayatNilaiBadge:{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  riwayatNilaiText: { fontSize: 11, fontWeight: '700' },
  riwayatCatatan:   { fontSize: 12, color: COLORS.muted, fontStyle: 'italic', lineHeight: 18 },
  riwayatPending:   { fontSize: 12, color: COLORS.disabled, fontStyle: 'italic' },

  // Bottom bar
  bottomBar:        { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: SPACING.md, paddingTop: SPACING.md, paddingHorizontal: SPACING.lg, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  tolakBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: RADIUS.lg, backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: COLORS.danger + '40' },
  tolakText:        { fontSize: 15, fontWeight: '700', color: COLORS.danger },
  setujuiBtn:       { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: RADIUS.lg, backgroundColor: '#10B981' },
  setujuiText:      { fontSize: 15, fontWeight: '700', color: COLORS.white },

  // Modal
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:        { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, paddingBottom: 40 },
  modalHeader:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.lg },
  modalHeaderIcon:  { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  modalTitle:       { flex: 1, fontSize: 17, fontWeight: '800', color: COLORS.text },
  modalLabel:       { fontSize: 12, fontWeight: '700', color: COLORS.muted, marginBottom: SPACING.sm },
  modalInput:       { backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.md, fontSize: 14, color: COLORS.text, borderWidth: 1.5, borderColor: COLORS.border, minHeight: 90, marginBottom: SPACING.lg },
  modalActions:     { flexDirection: 'row', gap: SPACING.md },
  modalCancelBtn:   { flex: 1, paddingVertical: 14, borderRadius: RADIUS.lg, backgroundColor: '#F1F5F9', alignItems: 'center' },
  modalCancelText:  { color: COLORS.muted, fontWeight: '700', fontSize: 14 },
  modalSubmitBtn:   { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: RADIUS.lg },
  modalSubmitText:  { color: COLORS.white, fontWeight: '700', fontSize: 14 },

  // Tindakan section
  tindakanSection:  { marginBottom: SPACING.lg },
  tindakanGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  tindakanOption:   { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 8, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#F8FAFC' },
  tindakanOptionText:{ fontSize: 12, color: COLORS.muted, fontWeight: '600', flex: 1 },
})
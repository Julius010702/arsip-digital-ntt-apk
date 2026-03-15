// ======================================================
// FILE: mobile/src/screens/PenilaianScreen.tsx
// ======================================================

import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { penilaianApi } from '../services/api'
import { COLORS, SHADOW, RADIUS, SPACING, STATUS_PENILAIAN } from '../utils/theme'
import { RootStackParams } from '../navigation/types'
import { PenilaianArsip } from '../types'
import { formatDateShort } from '../utils/format'

type Nav = NativeStackNavigationProp<RootStackParams>

const STATUS_FILTERS = [
  { label: 'Semua',       value: '',                        icon: 'list-outline' },
  { label: 'Kep. Bagian', value: 'menunggu_kepala_bagian',  icon: 'person-outline' },
  { label: 'Kep. Biro',   value: 'menunggu_kepala_biro',    icon: 'people-outline' },
  { label: 'Dinas Arsip', value: 'menunggu_dinas_arsip',    icon: 'business-outline' },
  { label: 'Selesai',     value: 'selesai',                 icon: 'checkmark-circle-outline' },
  { label: 'Ditolak',     value: 'ditolak',                 icon: 'close-circle-outline' },
]

const STEP_LABELS = ['Kep. Bagian', 'Kep. Biro', 'Dinas Arsip', 'Selesai']
const STEP_KEYS   = ['menunggu_kepala_bagian', 'menunggu_kepala_biro', 'menunggu_dinas_arsip', 'selesai']

const TINDAKAN_COLOR: Record<string, { bg: string; color: string; icon: string }> = {
  hapus:       { bg: '#FEE2E2', color: '#DC2626', icon: 'trash-outline' },
  inaktif:     { bg: '#FEF3C7', color: '#D97706', icon: 'pause-circle-outline' },
  dinamis:     { bg: '#DBEAFE', color: '#2563EB', icon: 'refresh-circle-outline' },
  pertahankan: { bg: '#DCFCE7', color: '#16A34A', icon: 'shield-checkmark-outline' },
}

export default function PenilaianScreen() {
  const navigation = useNavigation<Nav>()
  const [data, setData]             = useState<PenilaianArsip[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [status, setStatus]         = useState('')

  const load = useCallback(async () => {
    try {
      const res = await penilaianApi.list({ status })
      setData(res.data ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [status])

  useEffect(() => { setLoading(true); load() }, [load])

  const renderItem = ({ item }: { item: PenilaianArsip }) => {
    const s        = STATUS_PENILAIAN[item.status]
    const tindakan = TINDAKAN_COLOR[item.usulanTindakan] ?? TINDAKAN_COLOR.pertahankan
    const currentIdx = STEP_KEYS.indexOf(item.status)
    const isRejected = item.status === 'ditolak'
    const isDone     = item.status === 'selesai'

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DetailPenilaian', { id: item.id })}
        activeOpacity={0.7}
      >
        {/* Header card */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.nomorSurat}>{item.archive?.nomorSurat}</Text>
            <Text style={styles.judul} numberOfLines={2}>{item.archive?.judul}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: s?.bg ?? '#F3F4F6' }]}>
            <Text style={[styles.statusText, { color: s?.color ?? COLORS.muted }]}>{s?.label ?? item.status}</Text>
          </View>
        </View>

        {/* Usulan tindakan */}
        <View style={[styles.tindakanRow, { backgroundColor: tindakan.bg }]}>
          <Ionicons name={tindakan.icon as any} size={14} color={tindakan.color} />
          <Text style={[styles.tindakanText, { color: tindakan.color }]}>
            Usulan: <Text style={{ fontWeight: '800', textTransform: 'capitalize' }}>{item.usulanTindakan}</Text>
          </Text>
        </View>

        {/* Meta info */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={11} color={COLORS.muted} />
            <Text style={styles.metaText} numberOfLines={1}>{item.pembuatPenilaian?.namaLengkap}</Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={11} color={COLORS.muted} />
            <Text style={styles.metaText}>{formatDateShort(item.createdAt)}</Text>
          </View>
        </View>

        {/* Progress steps */}
        <View style={styles.progressContainer}>
          {STEP_KEYS.map((step, i) => {
            const stepDone    = !isRejected && (i < currentIdx || isDone)
            const stepCurrent = !isRejected && !isDone && i === currentIdx
            const stepColor   = isRejected ? COLORS.danger
              : stepDone    ? COLORS.success
              : stepCurrent ? COLORS.warning
              : COLORS.disabled

            return (
              <View key={step} style={styles.progressStep}>
                <View style={styles.progressLabelBox}>
                  <View style={[styles.progressDot, { backgroundColor: stepColor, borderColor: stepCurrent ? COLORS.warning + '44' : 'transparent', borderWidth: stepCurrent ? 3 : 0 }]} />
                  <Text style={[styles.progressLabel, { color: stepDone || stepCurrent ? COLORS.text : COLORS.disabled }]} numberOfLines={1}>
                    {STEP_LABELS[i]}
                  </Text>
                </View>
                {i < STEP_KEYS.length - 1 && (
                  <View style={[styles.progressLine, { backgroundColor: stepDone ? COLORS.success : COLORS.disabled }]} />
                )}
              </View>
            )
          })}
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>Lihat Detail</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.primaryLight} />
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Penilaian Arsip</Text>
        <Text style={styles.headerSub}>{data.length} penilaian ditemukan</Text>
      </View>

      {/* Filter */}
      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={i => i.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, status === item.value && styles.filterChipActive]}
            onPress={() => setStatus(item.value)}
          >
            <Ionicons
              name={item.icon as any}
              size={13}
              color={status === item.value ? COLORS.white : COLORS.muted}
            />
            <Text style={[styles.filterText, status === item.value && styles.filterTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ color: COLORS.muted, marginTop: 12, fontSize: 13 }}>Memuat data...</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="clipboard-outline" size={40} color={COLORS.disabled} />
              </View>
              <Text style={styles.emptyTitle}>Belum Ada Penilaian</Text>
              <Text style={styles.emptySubtitle}>Penilaian arsip akan muncul di sini</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.background },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:        { backgroundColor: COLORS.primaryDark, paddingHorizontal: SPACING.lg, paddingTop: 56, paddingBottom: SPACING.lg },
  headerTitle:   { color: COLORS.white, fontSize: 20, fontWeight: '700' },
  headerSub:     { color: COLORS.placeholder, fontSize: 13, marginTop: 2 },
  filterRow:     { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.sm },
  filterChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText:    { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  filterTextActive: { color: COLORS.white },
  list:          { padding: SPACING.lg, paddingTop: 0, gap: SPACING.md },

  card:          { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.sm },
  cardHeader:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: SPACING.md, paddingBottom: SPACING.sm },
  cardHeaderLeft:{ flex: 1, marginRight: SPACING.sm },
  nomorSurat:    { fontSize: 12, color: COLORS.primaryLight, fontWeight: '700', marginBottom: 2 },
  judul:         { fontSize: 14, fontWeight: '600', color: COLORS.text, lineHeight: 20 },
  statusBadge:   { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  statusText:    { fontSize: 11, fontWeight: '700' },

  tindakanRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.md },
  tindakanText:  { fontSize: 12 },

  metaRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, marginBottom: SPACING.md, gap: 8 },
  metaItem:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaDot:       { width: 3, height: 3, borderRadius: 2, backgroundColor: COLORS.disabled },
  metaText:      { fontSize: 11, color: COLORS.muted, maxWidth: 140 },

  progressContainer: { flexDirection: 'row', paddingHorizontal: SPACING.md, marginBottom: SPACING.md, alignItems: 'flex-start' },
  progressStep:      { flex: 1, flexDirection: 'row', alignItems: 'center' },
  progressLabelBox:  { alignItems: 'center', gap: 4 },
  progressDot:       { width: 10, height: 10, borderRadius: 5 },
  progressLabel:     { fontSize: 9, fontWeight: '600', textAlign: 'center', width: 52 },
  progressLine:      { flex: 1, height: 2, marginBottom: 14 },

  cardFooter:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: SPACING.md, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 4 },
  footerText:    { fontSize: 12, color: COLORS.primaryLight, fontWeight: '700' },

  empty:         { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIconBox:  { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptySubtitle: { fontSize: 13, color: COLORS.muted },
})
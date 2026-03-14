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
  { label: 'Semua',              value: '' },
  { label: 'Kep. Bagian',        value: 'menunggu_kepala_bagian' },
  { label: 'Kep. Biro',          value: 'menunggu_kepala_biro' },
  { label: 'Dinas Arsip',        value: 'menunggu_dinas_arsip' },
  { label: 'Selesai',            value: 'selesai' },
  { label: 'Ditolak',            value: 'ditolak' },
]

export default function PenilaianScreen() {
  const navigation = useNavigation<Nav>()
  const [data, setData]         = useState<PenilaianArsip[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [status, setStatus]     = useState('')

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

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const renderItem = ({ item }: { item: PenilaianArsip }) => {
    const s = STATUS_PENILAIAN[item.status]
    return (
      <TouchableOpacity
        style={[styles.card, SHADOW.sm]}
        onPress={() => navigation.navigate('DetailPenilaian', { id: item.id })}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.nomorSurat}>{item.archive?.nomorSurat}</Text>
            <Text style={styles.judul} numberOfLines={2}>{item.archive?.judul}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: s?.bg }]}>
            <Text style={[styles.statusText, { color: s?.color }]}>{s?.label}</Text>
          </View>
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={12} color={COLORS.muted} />
            <Text style={styles.metaText}>Diusulkan: {item.pembuatPenilaian?.namaLengkap}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.muted} />
            <Text style={styles.metaText}>{formatDateShort(item.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.usulanRow}>
          <Text style={styles.usulanLabel}>Usulan: </Text>
          <Text style={styles.usulanText}>{item.usulanTindakan}</Text>
        </View>
        {/* Progress bar tahap */}
        <View style={styles.progressRow}>
          {['menunggu_kepala_bagian', 'menunggu_kepala_biro', 'menunggu_dinas_arsip', 'selesai'].map((step, i) => {
            const stepOrder = ['menunggu_kepala_bagian', 'menunggu_kepala_biro', 'menunggu_dinas_arsip', 'selesai']
            const currentIdx = stepOrder.indexOf(item.status)
            const isDone     = i < currentIdx || item.status === 'selesai'
            const isCurrent  = i === currentIdx && item.status !== 'selesai' && item.status !== 'ditolak'
            return (
              <View key={step} style={styles.progressStep}>
                <View style={[
                  styles.progressDot,
                  isDone     && styles.progressDotDone,
                  isCurrent  && styles.progressDotCurrent,
                  item.status === 'ditolak' && styles.progressDotRejected,
                ]} />
                {i < 3 && <View style={[styles.progressLine, isDone && styles.progressLineDone]} />}
              </View>
            )
          })}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
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
            <Text style={[styles.filterText, status === item.value && styles.filterTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="clipboard-outline" size={48} color={COLORS.disabled} />
              <Text style={styles.emptyText}>Tidak ada penilaian</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: COLORS.background },
  center:              { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterRow:           { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.sm },
  filterChip:          { paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText:          { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  filterTextActive:    { color: COLORS.white },
  list:                { padding: SPACING.lg, paddingTop: 0, gap: SPACING.sm },
  card:                { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md },
  cardTop:             { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: SPACING.sm },
  cardLeft:            { flex: 1, marginRight: SPACING.sm },
  nomorSurat:          { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  judul:               { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  statusBadge:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText:          { fontSize: 11, fontWeight: '700' },
  cardMeta:            { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.sm },
  metaItem:            { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:            { fontSize: 11, color: COLORS.muted },
  usulanRow:           { flexDirection: 'row', marginBottom: SPACING.sm },
  usulanLabel:         { fontSize: 12, color: COLORS.muted },
  usulanText:          { fontSize: 12, color: COLORS.text, fontWeight: '600', textTransform: 'capitalize' },
  progressRow:         { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm },
  progressStep:        { flexDirection: 'row', alignItems: 'center', flex: 1 },
  progressDot:         { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.disabled },
  progressDotDone:     { backgroundColor: COLORS.success },
  progressDotCurrent:  { backgroundColor: COLORS.warning, borderWidth: 2, borderColor: COLORS.warningSoft },
  progressDotRejected: { backgroundColor: COLORS.danger },
  progressLine:        { flex: 1, height: 2, backgroundColor: COLORS.disabled },
  progressLineDone:    { backgroundColor: COLORS.success },
  empty:               { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText:           { fontSize: 15, color: COLORS.muted },
})
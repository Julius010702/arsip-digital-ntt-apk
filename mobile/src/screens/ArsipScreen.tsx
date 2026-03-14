// ======================================================
// FILE: mobile/src/screens/ArsipScreen.tsx
// ======================================================

import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, TextInput,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../hooks/useAuth'
import { archiveApi } from '../services/api'
import { COLORS, SHADOW, RADIUS, SPACING, STATUS_ARSIP } from '../utils/theme'
import { RootStackParams } from '../navigation/types'
import { formatDateShort } from '../utils/format'
import { Archive } from '../types'

type Nav = NativeStackNavigationProp<RootStackParams>

const STATUS_FILTERS = [
  { label: 'Semua',       value: '' },
  { label: 'Aktif',       value: 'aktif' },
  { label: 'Inaktif',     value: 'inaktif' },
  { label: 'Dinamis',     value: 'dinamis' },
  { label: 'Dimusnahkan', value: 'dimusnahkan' },
]

export default function ArsipScreen() {
  const { user }    = useAuth()
  const navigation  = useNavigation<Nav>()
  const [arsip, setArsip]       = useState<Archive[]>([])
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('')

  const canUpload = user?.role === 'super_admin' || user?.role === 'admin_unit'

  const load = useCallback(async (pg = 1, reset = false) => {
    try {
      const res = await archiveApi.list({ search, status, page: pg, limit: 15 })
      const newData = res.data ?? []
      setArsip(prev => reset || pg === 1 ? newData : [...prev, ...newData])
      setTotal(res.pagination?.total ?? 0)
      setPage(pg)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
    }
  }, [search, status])

  useEffect(() => {
    setLoading(true)
    load(1, true)
  }, [load])

  function loadMore() {
    if (loadingMore || arsip.length >= total) return
    setLoadingMore(true)
    load(page + 1)
  }

  const renderItem = ({ item }: { item: Archive }) => {
    const s = STATUS_ARSIP[item.statusArsip] ?? STATUS_ARSIP.aktif
    return (
      <TouchableOpacity
        style={[styles.card, SHADOW.sm]}
        onPress={() => navigation.navigate('DetailArsip', { id: item.id })}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.nomor}>{item.nomorSurat}</Text>
            <Text style={styles.judul} numberOfLines={2}>{item.judul}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
          </View>
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="folder-outline" size={12} color={COLORS.muted} />
            <Text style={styles.metaText}>{item.category?.nama}</Text>
          </View>
          {item.urusan && (
            <View style={styles.metaItem}>
              <Ionicons name="pricetag-outline" size={12} color={COLORS.muted} />
              <Text style={styles.metaText}>{item.urusan.namaUrusan}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Ionicons name="business-outline" size={12} color={COLORS.muted} />
            <Text style={styles.metaText}>{item.unit?.namaUnit}</Text>
          </View>
        </View>
        {item.tanggalKadaluarsa && (
          <View style={styles.retensiRow}>
            <Ionicons name="time-outline" size={12} color={COLORS.muted} />
            <Text style={styles.retensiText}>
              Kadaluarsa: {formatDateShort(item.tanggalKadaluarsa)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daftar Arsip</Text>
        <Text style={styles.headerSub}>{total} arsip ditemukan</Text>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={COLORS.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nomor, judul, pengirim..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={COLORS.placeholder}
        />
        {search !== '' && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Status */}
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

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={arsip}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1, true) }} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="folder-open-outline" size={48} color={COLORS.disabled} />
              <Text style={styles.emptyText}>Tidak ada arsip</Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.primary} style={{ padding: 16 }} /> : null}
        />
      )}

      {/* FAB Upload */}
      {canUpload && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('UploadArsip')}>
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.background },
  header:           { backgroundColor: COLORS.primaryDark, paddingHorizontal: SPACING.lg, paddingTop: 56, paddingBottom: SPACING.lg },
  headerTitle:      { color: COLORS.white, fontSize: 20, fontWeight: '700' },
  headerSub:        { color: COLORS.placeholder, fontSize: 13, marginTop: 2 },
  searchBox:        { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, margin: SPACING.lg, marginBottom: SPACING.sm, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, ...SHADOW.sm },
  searchInput:      { flex: 1, fontSize: 14, color: COLORS.text },
  filterRow:        { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm, gap: SPACING.sm },
  filterChip:       { paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText:       { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  filterTextActive: { color: COLORS.white },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:             { padding: SPACING.lg, paddingTop: SPACING.sm, gap: SPACING.sm },
  card:             { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md },
  cardTop:          { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: SPACING.sm },
  cardLeft:         { flex: 1, marginRight: SPACING.sm },
  nomor:            { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  judul:            { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  statusBadge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText:       { fontSize: 11, fontWeight: '700' },
  cardMeta:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaItem:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:         { fontSize: 11, color: COLORS.muted },
  retensiRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  retensiText:      { fontSize: 11, color: COLORS.muted },
  empty:            { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText:        { fontSize: 15, color: COLORS.muted },
  fab:              { position: 'absolute', right: SPACING.xl, bottom: SPACING.xl, backgroundColor: COLORS.primary, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', ...SHADOW.lg },
})
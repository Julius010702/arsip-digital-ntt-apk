// ======================================================
// FILE: mobile/src/screens/ArsipScreen.tsx
// ======================================================

import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput, Animated,
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
  { label: 'Semua',       value: '', color: COLORS.primary },
  { label: 'Aktif',       value: 'aktif',       color: '#10B981' },
  { label: 'Inaktif',     value: 'inaktif',     color: '#F59E0B' },
  { label: 'Dinamis',     value: 'dinamis',     color: '#8B5CF6' },
  { label: 'Dimusnahkan', value: 'dimusnahkan', color: '#EF4444' },
]

const STATUS_META: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  aktif:       { icon: 'checkmark-circle', color: '#10B981', bg: '#F0FDF4', label: 'Aktif' },
  inaktif:     { icon: 'pause-circle',     color: '#F59E0B', bg: '#FFFBEB', label: 'Inaktif' },
  dinamis:     { icon: 'refresh-circle',   color: '#8B5CF6', bg: '#F5F3FF', label: 'Dinamis' },
  dimusnahkan: { icon: 'trash',            color: '#EF4444', bg: '#FEF2F2', label: 'Dimusnahkan' },
}

export default function ArsipScreen() {
  const { user }   = useAuth()
  const navigation = useNavigation<Nav>()

  const [arsip,       setArsip]       = useState<Archive[]>([])
  const [page,        setPage]        = useState(1)
  const [total,       setTotal]       = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search,      setSearch]      = useState('')
  const [status,      setStatus]      = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const canUpload = user?.role === 'super_admin' || user?.role === 'admin_unit'

  const load = useCallback(async (pg = 1, reset = false) => {
    try {
      const res = await archiveApi.list({ search, status, page: pg, limit: 15 })
      const newData = res.data?.data ?? res.data ?? []
      setArsip(prev => reset || pg === 1 ? newData : [...prev, ...newData])
      setTotal(res.data?.pagination?.total ?? res.pagination?.total ?? 0)
      setPage(pg)
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false); setLoadingMore(false) }
  }, [search, status])

  useEffect(() => { setLoading(true); load(1, true) }, [load])

  function loadMore() {
    if (loadingMore || arsip.length >= total) return
    setLoadingMore(true)
    load(page + 1)
  }

  const renderItem = ({ item, index }: { item: Archive; index: number }) => {
    const st = STATUS_META[item.statusArsip] ?? STATUS_META.aktif
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => navigation.navigate('DetailArsip', { id: item.id })}
        activeOpacity={0.7}
      >
        {/* Left accent bar */}
        <View style={[s.cardAccent, { backgroundColor: st.color }]} />

        <View style={s.cardContent}>
          {/* Top row */}
          <View style={s.cardTop}>
            <View style={s.cardTopLeft}>
              <View style={[s.nomorBadge, { backgroundColor: COLORS.primarySoft }]}>
                <Text style={s.nomorText}>{item.nomorSurat}</Text>
              </View>
            </View>
            <View style={[s.statusPill, { backgroundColor: st.bg }]}>
              <Ionicons name={st.icon as any} size={11} color={st.color} />
              <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={s.judul} numberOfLines={2}>{item.judul}</Text>

          {/* Meta row */}
          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <Ionicons name="folder-outline" size={11} color={COLORS.muted} />
              <Text style={s.metaText} numberOfLines={1}>{item.category?.nama}</Text>
            </View>
            <View style={s.metaDot} />
            <View style={s.metaItem}>
              <Ionicons name="business-outline" size={11} color={COLORS.muted} />
              <Text style={s.metaText} numberOfLines={1}>{item.unit?.namaUnit}</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={s.cardFooter}>
            {item.tanggalKadaluarsa ? (
              <View style={s.retensiChip}>
                <Ionicons name="time-outline" size={11} color="#F59E0B" />
                <Text style={s.retensiText}>Exp: {formatDateShort(item.tanggalKadaluarsa)}</Text>
              </View>
            ) : <View />}
            <View style={s.chevron}>
              <Ionicons name="chevron-forward" size={14} color={COLORS.muted} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const activeFilter = STATUS_FILTERS.find(f => f.value === status)

  return (
    <View style={s.container}>

      {/* ── HEADER ── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.headerTitle}>Daftar Arsip</Text>
            <Text style={s.headerSub}>{total} arsip ditemukan</Text>
          </View>
          {canUpload && (
            <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('UploadArsip')}>
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={s.addBtnText}>Tambah</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search */}
        <View style={[s.searchBox, searchFocused && s.searchBoxFocused]}>
          <Ionicons name="search-outline" size={18} color={searchFocused ? COLORS.primaryLight : COLORS.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Cari nomor, judul, pengirim..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="rgba(255,255,255,0.5)"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── FILTER CHIPS ── */}
      <View style={s.filterWrap}>
        <FlatList
          horizontal
          data={STATUS_FILTERS}
          keyExtractor={i => i.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
          renderItem={({ item }) => {
            const active = status === item.value
            return (
              <TouchableOpacity
                style={[s.filterChip, active && { backgroundColor: item.color, borderColor: item.color }]}
                onPress={() => setStatus(item.value)}
              >
                {active && <View style={[s.filterDot, { backgroundColor: '#fff' }]} />}
                <Text style={[s.filterText, active && s.filterTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            )
          }}
        />
      </View>

      {/* ── LIST ── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={COLORS.primaryLight} />
          <Text style={s.loadingText}>Memuat arsip...</Text>
        </View>
      ) : (
        <FlatList
          data={arsip}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(1, true) }}
              tintColor={COLORS.primaryLight}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconBox}>
                <Ionicons name="folder-open-outline" size={40} color={COLORS.disabled} />
              </View>
              <Text style={s.emptyTitle}>Tidak Ada Arsip</Text>
              <Text style={s.emptySub}>
                {search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada arsip tersimpan'}
              </Text>
              {search && (
                <TouchableOpacity style={s.clearSearch} onPress={() => setSearch('')}>
                  <Text style={s.clearSearchText}>Hapus pencarian</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={COLORS.primary} style={{ padding: 16 }} />
              : arsip.length > 0
              ? <Text style={s.footerText}>{arsip.length} dari {total} arsip</Text>
              : null
          }
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F1F5F9' },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:     { color: COLORS.muted, fontSize: 13 },

  // Header
  header:          { backgroundColor: COLORS.primaryDark, paddingTop: 52, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  headerTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  headerTitle:     { color: COLORS.white, fontSize: 22, fontWeight: '800' },
  headerSub:       { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  addBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full },
  addBtnText:      { color: COLORS.white, fontSize: 13, fontWeight: '700' },

  // Search
  searchBox:       { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 10, borderWidth: 1, borderColor: 'transparent' },
  searchBoxFocused:{ backgroundColor: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.4)' },
  searchInput:     { flex: 1, fontSize: 14, color: COLORS.white },

  // Filter
  filterWrap:      { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  filterRow:       { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.sm },
  filterChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0' },
  filterDot:       { width: 5, height: 5, borderRadius: 3 },
  filterText:      { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  filterTextActive:{ color: COLORS.white, fontWeight: '700' },

  // Card
  card:            { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: RADIUS.lg, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, overflow: 'hidden', ...SHADOW.sm },
  cardAccent:      { width: 4 },
  cardContent:     { flex: 1, padding: SPACING.md },
  cardTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTopLeft:     { flex: 1, marginRight: 8 },
  nomorBadge:      { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  nomorText:       { fontSize: 11, color: COLORS.primaryLight, fontWeight: '800' },
  statusPill:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText:      { fontSize: 10, fontWeight: '700' },
  judul:           { fontSize: 14, fontWeight: '700', color: COLORS.text, lineHeight: 20, marginBottom: 6 },
  metaRow:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  metaItem:        { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaDot:         { width: 3, height: 3, borderRadius: 2, backgroundColor: COLORS.disabled },
  metaText:        { fontSize: 11, color: COLORS.muted, maxWidth: 120 },
  cardFooter:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  retensiChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEB', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  retensiText:     { fontSize: 10, color: '#F59E0B', fontWeight: '600' },
  chevron:         { width: 22, height: 22, borderRadius: 11, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },

  // List
  list:            { paddingTop: SPACING.md, paddingBottom: 80 },
  footerText:      { textAlign: 'center', color: COLORS.muted, fontSize: 12, padding: SPACING.lg },

  // Empty
  empty:           { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIconBox:    { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', ...SHADOW.sm },
  emptyTitle:      { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptySub:        { fontSize: 13, color: COLORS.muted, textAlign: 'center', paddingHorizontal: 40 },
  clearSearch:     { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.full, marginTop: 4 },
  clearSearchText: { fontSize: 13, color: COLORS.primaryLight, fontWeight: '700' },
})
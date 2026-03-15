// ======================================================
// FILE: mobile/src/screens/NotifikasiScreen.tsx
// ======================================================

import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
  Animated, Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { notifApi } from '../services/api'
import { COLORS, SHADOW } from '../utils/theme'
import { RootStackParams } from '../navigation/types'
import { Notifikasi } from '../types'
import { formatRelative } from '../utils/format'

type Nav = NativeStackNavigationProp<RootStackParams>

// ─── TIPE CONFIG ─────────────────────────────────────
const TIPE_CONFIG: Record<string, {
  icon: string; color: string; bg: string; grad: [string, string]; label: string
}> = {
  retensi_hampir_habis: { icon: 'time',              color: '#F59E0B', bg: '#FFFBEB', grad: ['#FEF3C7','#FFFBEB'], label: 'Retensi Hampir Habis' },
  retensi_habis:        { icon: 'alert-circle',       color: '#EF4444', bg: '#FEF2F2', grad: ['#FEE2E2','#FEF2F2'], label: 'Retensi Habis' },
  penilaian_baru:       { icon: 'clipboard',          color: '#3B82F6', bg: '#EFF6FF', grad: ['#DBEAFE','#EFF6FF'], label: 'Penilaian Baru' },
  penilaian_perlu_aksi: { icon: 'hand-left',          color: '#8B5CF6', bg: '#F5F3FF', grad: ['#EDE9FE','#F5F3FF'], label: 'Perlu Tindakan' },
  arsip_dimusnahkan:    { icon: 'trash',              color: '#EF4444', bg: '#FEF2F2', grad: ['#FEE2E2','#FEF2F2'], label: 'Arsip Dimusnahkan' },
  default:              { icon: 'notifications',      color: '#3B82F6', bg: '#EFF6FF', grad: ['#DBEAFE','#EFF6FF'], label: 'Notifikasi' },
}

const FILTER_TABS = [
  { key: 'semua',   label: 'Semua',   icon: 'apps-outline' },
  { key: 'belum',   label: 'Belum Dibaca', icon: 'radio-button-on-outline' },
  { key: 'sudah',   label: 'Sudah Dibaca', icon: 'checkmark-circle-outline' },
]

export default function NotifikasiScreen() {
  const navigation = useNavigation<Nav>()
  const insets     = useSafeAreaInsets()

  const [notif,      setNotif]      = useState<Notifikasi[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter,     setFilter]     = useState('semua')

  const fadeAnim = useRef(new Animated.Value(0)).current

  const load = useCallback(async () => {
    try {
      const res = await notifApi.list()
      setNotif(res.data?.notifikasi ?? [])
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = notif.filter(n => {
    if (filter === 'belum') return !n.sudahDibaca
    if (filter === 'sudah') return n.sudahDibaca
    return true
  })

  const belumDibaca = notif.filter(n => !n.sudahDibaca).length

  async function tandaiSemua() {
    try {
      await notifApi.tandaiDibaca()
      setNotif(prev => prev.map(n => ({ ...n, sudahDibaca: true })))
    } catch (e) {
      Alert.alert('Gagal', 'Tidak dapat menandai semua notifikasi')
    }
  }

  async function tandaiSatu(id: number) {
    try {
      await notifApi.tandaiDibaca([id])
      setNotif(prev => prev.map(n => n.id === id ? { ...n, sudahDibaca: true } : n))
    } catch (e) { console.error(e) }
  }

  function handlePress(item: Notifikasi) {
    if (!item.sudahDibaca) tandaiSatu(item.id)
    if (item.archive?.id) {
      navigation.navigate('DetailArsip', { id: item.archive.id })
    }
  }

  const renderItem = ({ item, index }: { item: Notifikasi; index: number }) => {
    const cfg      = TIPE_CONFIG[item.tipe] ?? TIPE_CONFIG.default
    const isUnread = !item.sudahDibaca

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          style={[s.card, isUnread && s.cardUnread]}
          onPress={() => handlePress(item)}
          activeOpacity={0.82}
        >
          {/* Unread left accent */}
          {isUnread && <View style={[s.unreadAccent, { backgroundColor: cfg.color }]} />}

          {/* Icon */}
          <LinearGradient colors={cfg.grad} style={s.iconBox}>
            <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
          </LinearGradient>

          {/* Content */}
          <View style={s.cardContent}>
            {/* Type badge + time */}
            <View style={s.cardMeta}>
              <View style={[s.typeBadge, { backgroundColor: cfg.color + '15' }]}>
                <Text style={[s.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
              <Text style={s.waktu}>{formatRelative(item.createdAt)}</Text>
            </View>

            <Text style={[s.judul, isUnread && s.judulUnread]} numberOfLines={2}>
              {item.judul}
            </Text>
            <Text style={s.pesan} numberOfLines={3}>{item.pesan}</Text>

            {/* Arsip reference */}
            {item.archive && (
              <View style={s.arsipRef}>
                <Ionicons name="document-text-outline" size={11} color="#3B82F6" />
                <Text style={s.arsipRefText} numberOfLines={1}>
                  {item.archive.nomorSurat || 'Lihat Arsip'}
                </Text>
                <Ionicons name="chevron-forward" size={11} color="#3B82F6" />
              </View>
            )}
          </View>

          {/* Unread dot */}
          {isUnread && <View style={[s.unreadDot, { backgroundColor: cfg.color }]} />}
        </TouchableOpacity>
      </Animated.View>
    )
  }

  // ── LOADING ──
  if (loading) return (
    <View style={s.loadingRoot}>
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text style={s.loadingText}>Memuat notifikasi...</Text>
    </View>
  )

  return (
    <View style={s.root}>

      {/* ══ HEADER ══ */}
      <LinearGradient colors={['#1E293B', '#0F172A']} style={[s.header, { paddingTop: insets.top + 14 }]}>
        <View style={s.headerDec1} />
        <View style={s.headerDec2} />

        <View style={s.headerTop}>
          <View>
            <Text style={s.headerTitle}>Notifikasi</Text>
            <Text style={s.headerSub}>
              {belumDibaca > 0 ? `${belumDibaca} belum dibaca` : 'Semua sudah dibaca'}
            </Text>
          </View>

          {belumDibaca > 0 && (
            <TouchableOpacity style={s.tandaiBtn} onPress={tandaiSemua} activeOpacity={0.8}>
              <Ionicons name="checkmark-done" size={14} color="#3B82F6" />
              <Text style={s.tandaiBtnText}>Baca Semua</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats strip */}
        <View style={s.statsStrip}>
          {[
            { label: 'Total',        value: notif.length,                      color: '#60A5FA', icon: 'notifications' },
            { label: 'Belum Dibaca', value: belumDibaca,                        color: '#FCD34D', icon: 'radio-button-on' },
            { label: 'Sudah Dibaca', value: notif.length - belumDibaca,        color: '#34D399', icon: 'checkmark-circle' },
          ].map((st, i) => (
            <View key={i} style={[s.statItem, i !== 2 && s.statBorder]}>
              <Ionicons name={st.icon as any} size={14} color={st.color} />
              <Text style={[s.statVal, { color: st.color }]}>{st.value}</Text>
              <Text style={s.statLbl}>{st.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ══ FILTER TABS ══ */}
      <View style={s.filterBar}>
        {FILTER_TABS.map(tab => {
          const active = filter === tab.key
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.filterTab, active && s.filterTabActive]}
              onPress={() => setFilter(tab.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={tab.icon as any} size={13} color={active ? '#3B82F6' : '#94A3B8'} />
              <Text style={[s.filterTabText, active && s.filterTabTextActive]}>{tab.label}</Text>
              {tab.key === 'belum' && belumDibaca > 0 && (
                <View style={s.filterBadge}>
                  <Text style={s.filterBadgeText}>{belumDibaca}</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* ══ LIST ══ */}
      <FlatList
        data={filtered}
        keyExtractor={i => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load() }}
            tintColor="#3B82F6"
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={s.emptyIconBox}>
              <Ionicons name="notifications-off-outline" size={40} color="#93C5FD" />
            </LinearGradient>
            <Text style={s.emptyTitle}>
              {filter === 'belum' ? 'Semua Sudah Dibaca' : 'Belum Ada Notifikasi'}
            </Text>
            <Text style={s.emptySub}>
              {filter === 'belum'
                ? 'Tidak ada notifikasi yang belum dibaca'
                : 'Notifikasi akan muncul di sini'
              }
            </Text>
            {filter !== 'semua' && (
              <TouchableOpacity style={s.emptyResetBtn} onPress={() => setFilter('semua')}>
                <Text style={s.emptyResetTxt}>Lihat Semua</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  )
}

// ─── STYLES ──────────────────────────────────────────
const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#F1F5F9' },
  loadingRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#F1F5F9' },
  loadingText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },

  // Header
  header:     { paddingHorizontal: 20, paddingBottom: 20, overflow: 'hidden' },
  headerDec1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)', top: -60, right: -40 },
  headerDec2: { position: 'absolute', width: 110, height: 110, borderRadius: 55,  backgroundColor: 'rgba(255,255,255,0.04)', bottom: -10, left: 30 },
  headerTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerTitle:{ color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  headerSub:  { color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 3 },

  tandaiBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(59,130,246,0.2)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(59,130,246,0.4)' },
  tandaiBtnText: { fontSize: 12, color: '#60A5FA', fontWeight: '700' },

  statsStrip: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statItem:   { flex: 1, alignItems: 'center', gap: 4 },
  statBorder: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)' },
  statVal:    { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  statLbl:    { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },

  // Filter bar
  filterBar:         { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 6 },
  filterTab:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F8FAFC' },
  filterTabActive:   { backgroundColor: '#EFF6FF' },
  filterTabText:     { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  filterTabTextActive:{ color: '#3B82F6', fontWeight: '700' },
  filterBadge:       { backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  filterBadgeText:   { color: '#fff', fontSize: 9, fontWeight: '800' },

  // List
  list: { padding: 14, paddingBottom: 32 },

  // Card
  card:         { backgroundColor: '#fff', borderRadius: 18, flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardUnread:   { backgroundColor: '#FAFBFF', borderWidth: 1, borderColor: '#E0E7FF' },
  unreadAccent: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2 },

  iconBox:     { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },

  cardContent: { flex: 1 },
  cardMeta:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  typeBadge:   { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  typeBadgeText:{ fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  waktu:       { fontSize: 10, color: '#94A3B8', fontWeight: '500' },

  judul:       { fontSize: 13, fontWeight: '600', color: '#475569', lineHeight: 18, marginBottom: 4 },
  judulUnread: { fontWeight: '800', color: '#0F172A' },
  pesan:       { fontSize: 12, color: '#64748B', lineHeight: 17, marginBottom: 6 },

  arsipRef:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  arsipRefText: { fontSize: 11, color: '#3B82F6', fontWeight: '700', maxWidth: 180 },

  unreadDot:   { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },

  // Empty
  empty:        { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIconBox: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
  emptyTitle:   { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  emptySub:     { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 32 },
  emptyResetBtn:{ backgroundColor: '#EFF6FF', paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20, marginTop: 4 },
  emptyResetTxt:{ fontSize: 13, color: '#3B82F6', fontWeight: '700' },
})
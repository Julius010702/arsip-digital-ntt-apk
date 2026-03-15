// ======================================================
// FILE: mobile/src/screens/PenilaianScreen.tsx
// ======================================================

import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
  Animated, Dimensions,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { penilaianApi } from '../services/api'
import { COLORS, SHADOW, RADIUS, SPACING, STATUS_PENILAIAN } from '../utils/theme'
import { RootStackParams } from '../navigation/types'
import { PenilaianArsip } from '../types'
import { formatDateShort } from '../utils/format'

type Nav = NativeStackNavigationProp<RootStackParams>

const { width } = Dimensions.get('window')

const STATUS_FILTERS = [
  { label: 'Semua',       value: '',                       icon: 'apps-outline',            color: '#3B82F6' },
  { label: 'Kep. Bagian', value: 'menunggu_kepala_bagian', icon: 'person-outline',           color: '#8B5CF6' },
  { label: 'Kep. Biro',   value: 'menunggu_kepala_biro',   icon: 'people-outline',           color: '#06B6D4' },
  { label: 'Dinas Arsip', value: 'menunggu_dinas_arsip',   icon: 'business-outline',         color: '#F59E0B' },
  { label: 'Selesai',     value: 'selesai',                icon: 'checkmark-circle-outline', color: '#10B981' },
  { label: 'Ditolak',     value: 'ditolak',                icon: 'close-circle-outline',     color: '#EF4444' },
]

const STEP_LABELS = ['Kep. Bagian', 'Kep. Biro', 'Dinas Arsip', 'Selesai']
const STEP_KEYS   = ['menunggu_kepala_bagian', 'menunggu_kepala_biro', 'menunggu_dinas_arsip', 'selesai']

const TINDAKAN_CONFIG: Record<string, { bg: string; color: string; icon: string; grad: [string, string] }> = {
  hapus:        { bg: '#FEE2E2', color: '#DC2626', icon: 'trash-outline',           grad: ['#FEE2E2', '#FEF2F2'] },
  inaktif:      { bg: '#FEF3C7', color: '#D97706', icon: 'pause-circle-outline',    grad: ['#FEF3C7', '#FFFBEB'] },
  dinamis:      { bg: '#DBEAFE', color: '#2563EB', icon: 'refresh-circle-outline',  grad: ['#DBEAFE', '#EFF6FF'] },
  pertahankan:  { bg: '#DCFCE7', color: '#16A34A', icon: 'shield-checkmark-outline', grad: ['#DCFCE7', '#F0FDF4'] },
}

export default function PenilaianScreen() {
  const navigation              = useNavigation<Nav>()
  const [data, setData]         = useState<PenilaianArsip[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [status, setStatus]     = useState('')
  const fadeAnim  = useState(new Animated.Value(0))[0]

  const load = useCallback(async () => {
    try {
      const res = await penilaianApi.list({ status })
      setData(res.data ?? [])
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [status])

  useEffect(() => { setLoading(true); load() }, [load])

  // ── STAT COUNTS ──
  const totalSelesai  = data.filter(d => d.status === 'selesai').length
  const totalMenunggu = data.filter(d => d.status.startsWith('menunggu')).length
  const totalDitolak  = data.filter(d => d.status === 'ditolak').length

  const renderItem = ({ item, index }: { item: PenilaianArsip; index: number }) => {
    const st         = STATUS_PENILAIAN[item.status]
    const tindakan   = TINDAKAN_CONFIG[item.usulanTindakan] ?? TINDAKAN_CONFIG.pertahankan
    const currentIdx = STEP_KEYS.indexOf(item.status)
    const isRejected = item.status === 'ditolak'
    const isDone     = item.status === 'selesai'

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('DetailPenilaian', { id: item.id })}
          activeOpacity={0.82}
        >
          {/* ── LEFT ACCENT BAR ── */}
          <View style={[styles.accentBar, {
            backgroundColor: isRejected ? '#EF4444' : isDone ? '#10B981' : '#F59E0B'
          }]} />

          <View style={styles.cardInner}>

            {/* ── CARD HEADER ── */}
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.nomorRow}>
                  <Ionicons name="barcode-outline" size={11} color="#3B82F6" />
                  <Text style={styles.nomorSurat}>{item.archive?.nomorSurat || 'Tanpa Nomor'}</Text>
                </View>
                <Text style={styles.judul} numberOfLines={2}>{item.archive?.judul}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: (st?.bg ?? '#F3F4F6') }]}>
                <View style={[styles.statusDot, { backgroundColor: st?.color ?? COLORS.muted }]} />
                <Text style={[styles.statusText, { color: st?.color ?? COLORS.muted }]}>
                  {st?.label ?? item.status}
                </Text>
              </View>
            </View>

            {/* ── TINDAKAN BANNER ── */}
            <LinearGradient colors={tindakan.grad} style={styles.tindakanBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <View style={[styles.tindakanIconBox, { backgroundColor: tindakan.color + '20' }]}>
                <Ionicons name={tindakan.icon as any} size={14} color={tindakan.color} />
              </View>
              <Text style={[styles.tindakanLabel, { color: tindakan.color + '99' }]}>Usulan Tindakan</Text>
              <Text style={[styles.tindakanValue, { color: tindakan.color }]}>
                {item.usulanTindakan?.charAt(0).toUpperCase() + item.usulanTindakan?.slice(1)}
              </Text>
            </LinearGradient>

            {/* ── META ROW ── */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <View style={styles.metaIconBox}>
                  <Ionicons name="person-outline" size={10} color="#3B82F6" />
                </View>
                <Text style={styles.metaText} numberOfLines={1}>{item.pembuatPenilaian?.namaLengkap}</Text>
              </View>
              <View style={styles.metaSep} />
              <View style={styles.metaItem}>
                <View style={styles.metaIconBox}>
                  <Ionicons name="calendar-outline" size={10} color="#8B5CF6" />
                </View>
                <Text style={styles.metaText}>{formatDateShort(item.createdAt)}</Text>
              </View>
            </View>

            {/* ── PROGRESS STEPPER ── */}
            <View style={styles.stepperWrap}>
              {STEP_KEYS.map((step, i) => {
                const done    = !isRejected && (i < currentIdx || isDone)
                const current = !isRejected && !isDone && i === currentIdx
                const color   = isRejected ? '#EF4444'
                              : done       ? '#10B981'
                              : current    ? '#F59E0B'
                              : '#CBD5E1'
                const labelColor = done || current ? '#1E293B' : '#94A3B8'

                return (
                  <React.Fragment key={step}>
                    <View style={styles.stepItem}>
                      {/* dot */}
                      <View style={[
                        styles.stepDotOuter,
                        current && { borderColor: color + '40', borderWidth: 3 },
                        { borderColor: current ? color + '40' : 'transparent' }
                      ]}>
                        <View style={[styles.stepDot, { backgroundColor: color }]}>
                          {done && <Ionicons name="checkmark" size={6} color="#fff" />}
                          {current && <View style={styles.stepDotPulse} />}
                        </View>
                      </View>
                      {/* label */}
                      <Text style={[styles.stepLabel, { color: labelColor }]} numberOfLines={1}>
                        {STEP_LABELS[i]}
                      </Text>
                    </View>
                    {/* connector line */}
                    {i < STEP_KEYS.length - 1 && (
                      <View style={[styles.stepLine, { backgroundColor: done ? '#10B981' : '#E2E8F0' }]} />
                    )}
                  </React.Fragment>
                )
              })}
            </View>

            {/* ── FOOTER ── */}
            <View style={styles.cardFooter}>
              <Text style={styles.footerHint}>
                {isRejected ? '⛔ Penilaian ditolak' : isDone ? '✅ Proses selesai' : `⏳ Menunggu persetujuan`}
              </Text>
              <View style={styles.footerBtn}>
                <Text style={styles.footerBtnText}>Detail</Text>
                <Ionicons name="arrow-forward" size={13} color="#3B82F6" />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  return (
    <View style={styles.container}>

      {/* ══ HEADER ══ */}
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.header}>
        {/* Decorative */}
        <View style={styles.headerDec1} />
        <View style={styles.headerDec2} />

        <Text style={styles.headerTitle}>Penilaian Arsip</Text>
        <Text style={styles.headerSub}>Kelola dan pantau usulan penilaian</Text>

        {/* Summary strip */}
        <View style={styles.summaryStrip}>
          {[
            { label: 'Total',    value: data.length,    color: '#60A5FA', icon: 'clipboard' },
            { label: 'Proses',   value: totalMenunggu,  color: '#FCD34D', icon: 'time' },
            { label: 'Selesai',  value: totalSelesai,   color: '#34D399', icon: 'checkmark-circle' },
            { label: 'Ditolak',  value: totalDitolak,   color: '#F87171', icon: 'close-circle' },
          ].map((s, i) => (
            <View key={i} style={styles.summaryItem}>
              <Ionicons name={s.icon as any} size={16} color={s.color} />
              <Text style={[styles.summaryValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.summaryLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ══ FILTER CHIPS ══ */}
      <View style={styles.filterWrap}>
        <FlatList
          horizontal
          data={STATUS_FILTERS}
          keyExtractor={i => i.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => {
            const active = status === item.value
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  active && { backgroundColor: item.color, borderColor: item.color },
                ]}
                onPress={() => setStatus(item.value)}
                activeOpacity={0.8}
              >
                <Ionicons name={item.icon as any} size={12} color={active ? '#fff' : '#64748B'} />
                <Text style={[styles.filterText, active && { color: '#fff' }]}>{item.label}</Text>
              </TouchableOpacity>
            )
          }}
        />
      </View>

      {/* ══ CONTENT ══ */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Memuat data penilaian...</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load() }}
              tintColor="#3B82F6"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={styles.emptyIconBox}>
                <Ionicons name="clipboard-outline" size={40} color="#93C5FD" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>Belum Ada Penilaian</Text>
              <Text style={styles.emptySubtitle}>
                {status ? 'Tidak ada penilaian dengan filter ini' : 'Penilaian arsip akan muncul di sini'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  )
}

// ─── STYLES ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  // Header
  header:     { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, overflow: 'hidden' },
  headerDec1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.04)', top: -50, right: -30 },
  headerDec2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.04)', bottom: 10, left: -20 },
  headerTitle:{ color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  headerSub:  { color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 3, marginBottom: 18 },

  summaryStrip:{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 14, gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryValue:{ fontSize: 20, fontWeight: '800' },
  summaryLabel:{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Filter
  filterWrap:  { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  filterRow:   { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0' },
  filterText:  { fontSize: 12, color: '#64748B', fontWeight: '600' },

  // List
  list:        { padding: 16, gap: 12, paddingBottom: 32 },

  // Card
  card:        { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', flexDirection: 'row', ...SHADOW.sm },
  accentBar:   { width: 4 },
  cardInner:   { flex: 1, padding: 14 },

  cardHeader:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  cardHeaderLeft:{ flex: 1, marginRight: 10 },
  nomorRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  nomorSurat:    { fontSize: 11, color: '#3B82F6', fontWeight: '700', letterSpacing: 0.3 },
  judul:         { fontSize: 14, fontWeight: '700', color: '#1E293B', lineHeight: 20 },

  statusBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusDot:     { width: 5, height: 5, borderRadius: 3 },
  statusText:    { fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },

  // Tindakan
  tindakanBanner:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 },
  tindakanIconBox: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  tindakanLabel:   { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  tindakanValue:   { fontSize: 13, fontWeight: '800', marginLeft: 'auto' },

  // Meta
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  metaItem:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaIconBox:{ width: 18, height: 18, borderRadius: 5, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  metaSep:    { width: 3, height: 3, borderRadius: 2, backgroundColor: '#CBD5E1' },
  metaText:   { fontSize: 11, color: '#64748B', fontWeight: '500', maxWidth: 130 },

  // Stepper
  stepperWrap:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepItem:      { alignItems: 'center', gap: 5 },
  stepDotOuter:  { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 0 },
  stepDot:       { width: 12, height: 12, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  stepDotPulse:  { width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff' },
  stepLabel:     { fontSize: 9, fontWeight: '600', textAlign: 'center', width: 54, letterSpacing: 0.1 },
  stepLine:      { flex: 1, height: 2, borderRadius: 1, marginBottom: 14 },

  // Footer
  cardFooter:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  footerHint:    { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  footerBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  footerBtnText: { fontSize: 12, color: '#3B82F6', fontWeight: '700' },

  // Loading
  loadingBox:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },

  // Empty
  empty:       { alignItems: 'center', paddingTop: 64, gap: 12 },
  emptyIconBox:{ width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
  emptyTitle:  { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  emptySubtitle:{ fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 32 },
})
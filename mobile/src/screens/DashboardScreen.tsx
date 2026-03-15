// ======================================================
// FILE: mobile/src/screens/DashboardScreen.tsx
// ======================================================

import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../hooks/useAuth'
import { reportApi, notifApi, archiveApi } from '../services/api'
import { COLORS, SHADOW, RADIUS, SPACING, STATUS_ARSIP, ROLE_LABEL, ROLE_COLOR } from '../utils/theme'
import { RootStackParams } from '../navigation/types'
import { formatDate } from '../utils/format'

type Nav = NativeStackNavigationProp<RootStackParams>

export default function DashboardScreen() {
  const { user }   = useAuth()
  const navigation = useNavigation<Nav>()

  const [data,         setData]         = useState<any>(null)
  const [arsipTerbaru, setArsipTerbaru] = useState<any[]>([])
  const [notifCount,   setNotifCount]   = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)

  const load = useCallback(async () => {
    try {
      const [report, arsip, n] = await Promise.all([
        reportApi.dashboard(),
        archiveApi.list({ limit: 5 }),
        notifApi.list(true),
      ])

      const arsipData = report?.data?.arsip ?? {}
      const perStatus = arsipData?.perStatus ?? []
      const getStatus = (s: string) =>
        perStatus.find((x: any) => x.status === s)?.total ?? 0

      setData({
        totalArsip:       arsipData?.total ?? 0,
        arsipAktif:       getStatus('aktif'),
        arsipInaktif:     getStatus('inaktif'),
        arsipDinamis:     getStatus('dinamis'),
        arsipDimusnahkan: getStatus('dimusnahkan'),
        arsipBulanIni:    0,
        hampirKadaluarsa: 0,
        kritis:           0,
        peringatan:       0,
        aman:             arsipData?.total ?? 0,
      })

      setArsipTerbaru(arsip?.data?.data ?? arsip?.data ?? [])
      setNotifCount(n.data?.totalBelumDibaca ?? 0)
    } catch (e) {
      console.error('Dashboard load error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
        <Text style={s.loadingText}>Memuat dashboard...</Text>
      </View>
    )
  }

  const roleColor = ROLE_COLOR[user?.role ?? ''] ?? COLORS.primary

  const stats = [
    { label: 'Total',     value: data?.totalArsip ?? 0,       icon: 'folder',           color: '#3B82F6' },
    { label: 'Aktif',     value: data?.arsipAktif ?? 0,       icon: 'checkmark-circle', color: '#10B981' },
    { label: 'Inaktif',   value: data?.arsipInaktif ?? 0,     icon: 'pause-circle',     color: '#F59E0B' },
    { label: 'Dinamis',   value: data?.arsipDinamis ?? 0,     icon: 'refresh-circle',   color: '#8B5CF6' },
    { label: 'Kritis',    value: data?.kritis ?? 0,           icon: 'alert-circle',     color: '#EF4444' },
    { label: 'Bulan Ini', value: data?.arsipBulanIni ?? 0,    icon: 'calendar',         color: '#06B6D4' },
  ]

  return (
    <ScrollView
      style={s.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load() }}
          tintColor={COLORS.primaryLight}
        />
      }
    >
      {/* ── HERO HEADER ── */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <View style={s.heroLeft}>
            <Text style={s.heroGreeting}>Selamat Datang 👋</Text>
            <Text style={s.heroName} numberOfLines={1}>{user?.namaLengkap}</Text>
            <View style={[s.rolePill, { backgroundColor: roleColor + '30' }]}>
              <View style={[s.roleDot, { backgroundColor: roleColor }]} />
              <Text style={[s.roleText, { color: roleColor }]}>
                {ROLE_LABEL[user?.role ?? ''] ?? user?.role}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={s.notifBtn} onPress={() => navigation.navigate('Notifikasi')}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
            {notifCount > 0 && (
              <View style={s.notifBadge}>
                <Text style={s.notifBadgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Summary strip */}
        <View style={s.heroSummary}>
          <View style={s.summaryCard}>
            <Text style={s.summaryValue}>{data?.totalArsip ?? 0}</Text>
            <Text style={s.summaryLabel}>Total Arsip</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryCard}>
            <Text style={[s.summaryValue, { color: '#10B981' }]}>{data?.arsipAktif ?? 0}</Text>
            <Text style={s.summaryLabel}>Aktif</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryCard}>
            <Text style={[s.summaryValue, { color: '#EF4444' }]}>{data?.kritis ?? 0}</Text>
            <Text style={s.summaryLabel}>Kritis</Text>
          </View>
        </View>
      </View>

      {/* ── STATISTIK GRID ── */}
      <View style={s.sectionWrap}>
        <View style={s.sectionHeader}>
          <View style={[s.sectionIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="bar-chart-outline" size={16} color="#3B82F6" />
          </View>
          <Text style={s.sectionTitle}>Statistik Arsip</Text>
        </View>
        <View style={s.statsGrid}>
          {stats.map((st, i) => (
            <View key={i} style={s.statCard}>
              <View style={[s.statIconBox, { backgroundColor: st.color + '15' }]}>
                <Ionicons name={st.icon as any} size={20} color={st.color} />
              </View>
              <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── STATUS RETENSI ── */}
      <View style={s.sectionWrap}>
        <View style={s.sectionHeader}>
          <View style={[s.sectionIcon, { backgroundColor: '#FFF7ED' }]}>
            <Ionicons name="time-outline" size={16} color="#F59E0B" />
          </View>
          <Text style={s.sectionTitle}>Status Retensi</Text>
        </View>
        <View style={s.retensiRow}>
          {[
            { label: 'Kritis',     value: data?.kritis ?? 0,     color: '#EF4444', bg: '#FEF2F2', icon: 'alert-circle' },
            { label: 'Peringatan', value: data?.peringatan ?? 0, color: '#F59E0B', bg: '#FFFBEB', icon: 'warning' },
            { label: 'Aman',       value: data?.aman ?? 0,       color: '#10B981', bg: '#F0FDF4', icon: 'shield-checkmark' },
          ].map((r, i) => (
            <View key={i} style={[s.retensiCard, { backgroundColor: r.bg, borderColor: r.color + '30' }]}>
              <Ionicons name={r.icon as any} size={22} color={r.color} />
              <Text style={[s.retensiValue, { color: r.color }]}>{r.value}</Text>
              <Text style={s.retensiLabel}>{r.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── ARSIP TERBARU ── */}
      <View style={s.sectionWrap}>
        <View style={s.sectionHeader}>
          <View style={[s.sectionIcon, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="document-text-outline" size={16} color="#10B981" />
          </View>
          <Text style={s.sectionTitle}>Arsip Terbaru</Text>
          <TouchableOpacity style={s.seeAllBtn} onPress={() => navigation.navigate('MainTab' as any)}>
            <Text style={s.seeAllText}>Lihat Semua</Text>
            <Ionicons name="chevron-forward" size={13} color={COLORS.primaryLight} />
          </TouchableOpacity>
        </View>

        {arsipTerbaru.length === 0 ? (
          <View style={s.emptyBox}>
            <View style={s.emptyIconBox}>
              <Ionicons name="folder-open-outline" size={36} color={COLORS.disabled} />
            </View>
            <Text style={s.emptyTitle}>Belum Ada Arsip</Text>
            <Text style={s.emptySubtitle}>Arsip yang diupload akan muncul di sini</Text>
          </View>
        ) : (
          arsipTerbaru.map((a: any, idx: number) => {
            const st = STATUS_ARSIP[a.statusArsip] ?? STATUS_ARSIP.aktif
            return (
              <TouchableOpacity
                key={a.id}
                style={[s.arsipCard, idx === arsipTerbaru.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => navigation.navigate('DetailArsip', { id: a.id })}
                activeOpacity={0.7}
              >
                <View style={s.arsipIconBox}>
                  <Ionicons name="document-text" size={20} color={COLORS.primaryLight} />
                </View>
                <View style={s.arsipInfo}>
                  <Text style={s.arsipNomor}>{a.nomorSurat}</Text>
                  <Text style={s.arsipJudul} numberOfLines={1}>{a.judul}</Text>
                  <Text style={s.arsipMeta}>{a.unit?.namaUnit} · {formatDate(a.createdAt)}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                  <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
                </View>
              </TouchableOpacity>
            )
          })
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#F1F5F9' },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:    { color: COLORS.muted, fontSize: 13 },

  // Hero
  hero:           { backgroundColor: COLORS.primaryDark, paddingTop: 52, paddingHorizontal: SPACING.lg, paddingBottom: 0 },
  heroTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.lg },
  heroLeft:       { flex: 1, marginRight: SPACING.md },
  heroGreeting:   { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 2 },
  heroName:       { color: COLORS.white, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  rolePill:       { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  roleDot:        { width: 6, height: 6, borderRadius: 3 },
  roleText:       { fontSize: 11, fontWeight: '700' },
  notifBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  notifBadge:     { position: 'absolute', top: -2, right: -2, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primaryDark },
  notifBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '800' },

  heroSummary:    { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.lg, marginBottom: -1, padding: SPACING.md },
  summaryCard:    { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue:   { color: COLORS.white, fontSize: 22, fontWeight: '800' },
  summaryLabel:   { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },

  // Section
  sectionWrap:    { backgroundColor: COLORS.white, marginHorizontal: SPACING.lg, marginTop: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOW.sm },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  sectionIcon:    { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionTitle:   { fontSize: 14, fontWeight: '800', color: COLORS.text, flex: 1 },
  seeAllBtn:      { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText:     { fontSize: 12, color: COLORS.primaryLight, fontWeight: '700' },

  // Stats
  statsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  statCard:       { width: '30.5%', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.md, gap: 4 },
  statIconBox:    { width: 38, height: 38, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  statValue:      { fontSize: 20, fontWeight: '800' },
  statLabel:      { fontSize: 10, color: COLORS.muted, fontWeight: '600', textAlign: 'center' },

  // Retensi
  retensiRow:     { flexDirection: 'row', gap: SPACING.sm },
  retensiCard:    { flex: 1, alignItems: 'center', gap: 4, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1 },
  retensiValue:   { fontSize: 22, fontWeight: '800' },
  retensiLabel:   { fontSize: 11, color: COLORS.muted, fontWeight: '600' },

  // Arsip
  arsipCard:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  arsipIconBox:   { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.primarySoft, justifyContent: 'center', alignItems: 'center' },
  arsipInfo:      { flex: 1 },
  arsipNomor:     { fontSize: 11, color: COLORS.primaryLight, fontWeight: '700' },
  arsipJudul:     { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 1 },
  arsipMeta:      { fontSize: 11, color: COLORS.muted, marginTop: 1 },
  statusBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText:     { fontSize: 10, fontWeight: '700' },

  // Empty
  emptyBox:       { alignItems: 'center', paddingVertical: SPACING.xl, gap: 8 },
  emptyIconBox:   { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  emptyTitle:     { fontSize: 15, fontWeight: '700', color: COLORS.text },
  emptySubtitle:  { fontSize: 12, color: COLORS.muted, textAlign: 'center' },
})
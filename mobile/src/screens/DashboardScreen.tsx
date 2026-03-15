// ======================================================
// FILE: mobile/src/screens/DashboardScreen.tsx
// ======================================================

import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
  Animated, Dimensions,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../hooks/useAuth'
import { reportApi, notifApi, archiveApi } from '../services/api'
import { COLORS, SHADOW, RADIUS, SPACING, STATUS_ARSIP, ROLE_LABEL, ROLE_COLOR } from '../utils/theme'
import { RootStackParams } from '../navigation/types'
import { formatDate } from '../utils/format'

type Nav = NativeStackNavigationProp<RootStackParams>

const { width } = Dimensions.get('window')

// ─── ROLE GRADIENT MAP ────────────────────────────────
const ROLE_GRADIENT: Record<string, [string, string]> = {
  super_admin: ['#1E3A5F', '#0F2744'],
  admin_unit:  ['#1A3A2A', '#0D2218'],
  pimpinan:    ['#2D1B4E', '#1A0F2E'],
  dinas_arsip: ['#1E2D4E', '#0F1A2E'],
  default:     ['#1E293B', '#0F172A'],
}

export default function DashboardScreen() {
  const { user }   = useAuth()
  const navigation = useNavigation<Nav>()

  const [data,         setData]         = useState<any>(null)
  const [arsipTerbaru, setArsipTerbaru] = useState<any[]>([])
  const [notifCount,   setNotifCount]   = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)

  const fadeAnim  = useState(new Animated.Value(0))[0]
  const slideAnim = useState(new Animated.Value(40))[0]

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

      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start()
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
      <View style={s.loadingRoot}>
        <LinearGradient colors={['#1E293B', '#0F172A']} style={s.loadingGrad}>
          <ActivityIndicator size="large" color="#60A5FA" />
          <Text style={s.loadingText}>Memuat dashboard...</Text>
        </LinearGradient>
      </View>
    )
  }

  const roleColor    = ROLE_COLOR[user?.role ?? ''] ?? COLORS.primary
  const heroGradient = ROLE_GRADIENT[user?.role ?? ''] ?? ROLE_GRADIENT.default

  const stats = [
    { label: 'Total Arsip', value: data?.totalArsip ?? 0,    icon: 'folder',           color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Aktif',       value: data?.arsipAktif ?? 0,    icon: 'checkmark-circle', color: '#10B981', bg: '#F0FDF4' },
    { label: 'Inaktif',     value: data?.arsipInaktif ?? 0,  icon: 'pause-circle',     color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Dinamis',     value: data?.arsipDinamis ?? 0,  icon: 'refresh-circle',   color: '#8B5CF6', bg: '#F5F3FF' },
    { label: 'Kritis',      value: data?.kritis ?? 0,        icon: 'alert-circle',     color: '#EF4444', bg: '#FEF2F2' },
    { label: 'Bulan Ini',   value: data?.arsipBulanIni ?? 0, icon: 'calendar',         color: '#06B6D4', bg: '#ECFEFF' },
  ]

  const retensiItems = [
    { label: 'Kritis',     value: data?.kritis ?? 0,     color: '#EF4444', bg: '#FEF2F2', icon: 'alert-circle',    grad: ['#FEE2E2', '#FEF2F2'] as [string,string] },
    { label: 'Peringatan', value: data?.peringatan ?? 0, color: '#F59E0B', bg: '#FFFBEB', icon: 'warning',         grad: ['#FEF3C7', '#FFFBEB'] as [string,string] },
    { label: 'Aman',       value: data?.aman ?? 0,       color: '#10B981', bg: '#F0FDF4', icon: 'shield-checkmark', grad: ['#DCFCE7', '#F0FDF4'] as [string,string] },
  ]

  return (
    <ScrollView
      style={s.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load() }}
          tintColor="#60A5FA"
        />
      }
    >
      {/* ══ HERO ══ */}
      <LinearGradient colors={heroGradient} style={s.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>

        {/* Decorative circles */}
        <View style={s.decCircle1} />
        <View style={s.decCircle2} />

        {/* Top row */}
        <View style={s.heroTop}>
          <View style={s.heroLeft}>
            <View style={s.greetingRow}>
              <View style={[s.greetingDot, { backgroundColor: roleColor }]} />
              <Text style={s.heroGreeting}>Selamat Datang</Text>
            </View>
            <Text style={s.heroName} numberOfLines={1}>{user?.namaLengkap}</Text>
            <View style={[s.rolePill, { backgroundColor: roleColor + '25', borderColor: roleColor + '50' }]}>
              <View style={[s.roleDot, { backgroundColor: roleColor }]} />
              <Text style={[s.roleText, { color: roleColor }]}>
                {ROLE_LABEL[user?.role ?? ''] ?? user?.role}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={s.notifBtn} onPress={() => navigation.navigate('Notifikasi')} activeOpacity={0.8}>
            <Ionicons name="notifications-outline" size={21} color="#fff" />
            {notifCount > 0 && (
              <View style={s.notifBadge}>
                <Text style={s.notifBadgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── SUMMARY CARDS ── */}
        <View style={s.summaryRow}>
          {[
            { label: 'Total Arsip', value: data?.totalArsip ?? 0, color: '#60A5FA', icon: 'folder' },
            { label: 'Aktif',       value: data?.arsipAktif ?? 0, color: '#34D399', icon: 'checkmark-circle' },
            { label: 'Kritis',      value: data?.kritis ?? 0,     color: '#F87171', icon: 'alert-circle' },
          ].map((item, i) => (
            <View key={i} style={s.summaryCard}>
              <View style={[s.summaryIconBox, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={16} color={item.color} />
              </View>
              <Text style={[s.summaryValue, { color: item.color }]}>{item.value}</Text>
              <Text style={s.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* ══ STATISTIK GRID ══ */}
        <View style={s.section}>
          <SectionHeader icon="bar-chart-outline" iconColor="#3B82F6" iconBg="#EFF6FF" title="Statistik Arsip" />
          <View style={s.statsGrid}>
            {stats.map((st, i) => (
              <View key={i} style={[s.statCard, { backgroundColor: st.bg }]}>
                <View style={[s.statIconCircle, { backgroundColor: st.color + '20' }]}>
                  <Ionicons name={st.icon as any} size={22} color={st.color} />
                </View>
                <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ══ STATUS RETENSI ══ */}
        <View style={s.section}>
          <SectionHeader icon="time-outline" iconColor="#F59E0B" iconBg="#FFF7ED" title="Status Retensi" />
          <View style={s.retensiRow}>
            {retensiItems.map((r, i) => (
              <LinearGradient key={i} colors={r.grad} style={[s.retensiCard, { borderColor: r.color + '30' }]}>
                <View style={[s.retensiIconBox, { backgroundColor: r.color + '20' }]}>
                  <Ionicons name={r.icon as any} size={20} color={r.color} />
                </View>
                <Text style={[s.retensiValue, { color: r.color }]}>{r.value}</Text>
                <Text style={[s.retensiLabel, { color: r.color + 'CC' }]}>{r.label}</Text>
              </LinearGradient>
            ))}
          </View>
        </View>

        {/* ══ AKSES CEPAT ══ */}
        <View style={s.section}>
          <SectionHeader icon="flash-outline" iconColor="#8B5CF6" iconBg="#F5F3FF" title="Akses Cepat" />
          <View style={s.quickRow}>
            {[
              { label: 'Upload',     icon: 'cloud-upload-outline', color: '#3B82F6', bg: '#EFF6FF', screen: 'UploadArsip' },
              { label: 'Penilaian',  icon: 'clipboard-outline',    color: '#10B981', bg: '#F0FDF4', screen: 'Penilaian' },
              { label: 'Notifikasi', icon: 'notifications-outline', color: '#F59E0B', bg: '#FFFBEB', screen: 'Notifikasi' },
              { label: 'Profil',     icon: 'person-outline',        color: '#8B5CF6', bg: '#F5F3FF', screen: 'Profil' },
            ].map((q, i) => (
              <TouchableOpacity
                key={i}
                style={[s.quickCard, { backgroundColor: q.bg }]}
                onPress={() => navigation.navigate(q.screen as any)}
                activeOpacity={0.75}
              >
                <View style={[s.quickIconBox, { backgroundColor: q.color + '20' }]}>
                  <Ionicons name={q.icon as any} size={22} color={q.color} />
                </View>
                <Text style={[s.quickLabel, { color: q.color }]}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ══ ARSIP TERBARU ══ */}
        <View style={s.section}>
          <SectionHeader
            icon="document-text-outline" iconColor="#10B981" iconBg="#F0FDF4" title="Arsip Terbaru"
            right={
              <TouchableOpacity style={s.seeAllBtn} onPress={() => navigation.navigate('MainTab' as any)} activeOpacity={0.7}>
                <Text style={s.seeAllText}>Lihat Semua</Text>
                <Ionicons name="chevron-forward" size={13} color="#3B82F6" />
              </TouchableOpacity>
            }
          />

          {arsipTerbaru.length === 0 ? (
            <View style={s.emptyBox}>
              <View style={s.emptyIconBox}>
                <Ionicons name="folder-open-outline" size={36} color="#CBD5E1" />
              </View>
              <Text style={s.emptyTitle}>Belum Ada Arsip</Text>
              <Text style={s.emptySubtitle}>Arsip yang diupload akan muncul di sini</Text>
            </View>
          ) : (
            arsipTerbaru.map((a: any, idx: number) => {
              const st = STATUS_ARSIP[a.statusArsip] ?? STATUS_ARSIP.aktif
              const isLast = idx === arsipTerbaru.length - 1
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[s.arsipCard, isLast && { borderBottomWidth: 0, marginBottom: 0 }]}
                  onPress={() => navigation.navigate('DetailArsip', { id: a.id })}
                  activeOpacity={0.75}
                >
                  <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={s.arsipIconBox}>
                    <Ionicons name="document-text" size={18} color="#3B82F6" />
                  </LinearGradient>
                  <View style={s.arsipInfo}>
                    <Text style={s.arsipNomor} numberOfLines={1}>{a.nomorSurat || 'Tanpa Nomor'}</Text>
                    <Text style={s.arsipJudul} numberOfLines={1}>{a.judul}</Text>
                    <View style={s.arsipMetaRow}>
                      <Ionicons name="business-outline" size={10} color="#94A3B8" />
                      <Text style={s.arsipMeta}>{a.unit?.namaUnit}</Text>
                      <Text style={s.arsipMetaDot}>·</Text>
                      <Ionicons name="calendar-outline" size={10} color="#94A3B8" />
                      <Text style={s.arsipMeta}>{formatDate(a.createdAt)}</Text>
                    </View>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                    <View style={[s.statusDot, { backgroundColor: st.color }]} />
                    <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </TouchableOpacity>
              )
            })
          )}
        </View>

        <View style={{ height: 36 }} />
      </Animated.View>
    </ScrollView>
  )
}

// ─── SECTION HEADER COMPONENT ─────────────────────────
function SectionHeader({ icon, iconColor, iconBg, title, right }: {
  icon: any; iconColor: string; iconBg: string; title: string; right?: React.ReactNode
}) {
  return (
    <View style={s.sectionHeader}>
      <View style={[s.sectionIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={15} color={iconColor} />
      </View>
      <Text style={s.sectionTitle}>{title}</Text>
      {right}
    </View>
  )
}

// ─── STYLES ──────────────────────────────────────────
const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F1F5F9' },

  // Loading
  loadingRoot: { flex: 1 },
  loadingGrad: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  loadingText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },

  // Hero
  hero:        { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 24, overflow: 'hidden' },
  decCircle1:  { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)', top: -60, right: -40 },
  decCircle2:  { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.04)', top: 20, right: 60 },

  heroTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  heroLeft:    { flex: 1, marginRight: 12 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  greetingDot: { width: 6, height: 6, borderRadius: 3 },
  heroGreeting:{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '600' },
  heroName:    { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8, letterSpacing: -0.3 },
  rolePill:    { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  roleDot:     { width: 6, height: 6, borderRadius: 3 },
  roleText:    { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  notifBtn:       { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  notifBadge:     { position: 'absolute', top: -2, right: -2, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 17, height: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#1E293B' },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  // Summary cards inside hero
  summaryRow:      { flexDirection: 'row', gap: 10 },
  summaryCard:     { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  summaryIconBox:  { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  summaryValue:    { fontSize: 22, fontWeight: '800' },
  summaryLabel:    { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Section wrapper
  section:      { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 14, borderRadius: 20, padding: 18, ...SHADOW.sm },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionIconBox:{ width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: '#1E293B', letterSpacing: 0.2 },
  seeAllBtn:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText:   { fontSize: 12, color: '#3B82F6', fontWeight: '700' },

  // Stats grid
  statsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard:       { width: (width - 32 - 36 - 20) / 3, alignItems: 'center', borderRadius: 14, padding: 14, gap: 6 },
  statIconCircle: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statValue:      { fontSize: 22, fontWeight: '800' },
  statLabel:      { fontSize: 10, color: '#64748B', fontWeight: '600', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.2 },

  // Retensi
  retensiRow:    { flexDirection: 'row', gap: 10 },
  retensiCard:   { flex: 1, alignItems: 'center', gap: 6, padding: 14, borderRadius: 16, borderWidth: 1.5 },
  retensiIconBox:{ width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  retensiValue:  { fontSize: 24, fontWeight: '800' },
  retensiLabel:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Quick access
  quickRow:     { flexDirection: 'row', gap: 10 },
  quickCard:    { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  quickIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  quickLabel:   { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Arsip list
  arsipCard:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', marginBottom: 2 },
  arsipIconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  arsipInfo:    { flex: 1 },
  arsipNomor:   { fontSize: 11, color: '#3B82F6', fontWeight: '700', letterSpacing: 0.2 },
  arsipJudul:   { fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 2 },
  arsipMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  arsipMeta:    { fontSize: 10, color: '#94A3B8', fontWeight: '500' },
  arsipMetaDot: { fontSize: 10, color: '#CBD5E1' },

  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusDot:    { width: 5, height: 5, borderRadius: 3 },
  statusText:   { fontSize: 10, fontWeight: '700' },

  // Empty
  emptyBox:      { alignItems: 'center', paddingVertical: 28, gap: 10 },
  emptyIconBox:  { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  emptyTitle:    { fontSize: 15, fontWeight: '700', color: '#334155' },
  emptySubtitle: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },
})
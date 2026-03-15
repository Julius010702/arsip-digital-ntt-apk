// ======================================================
// FILE: mobile/src/screens/DashboardScreen.tsx
// ======================================================

import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
  Animated, Dimensions, StatusBar,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../hooks/useAuth'
import { reportApi, notifApi, archiveApi } from '../services/api'
import { COLORS, STATUS_ARSIP, ROLE_LABEL, ROLE_COLOR } from '../utils/theme'
import { RootStackParams } from '../navigation/types'
import { formatDate } from '../utils/format'

type Nav = NativeStackNavigationProp<RootStackParams>

const { width } = Dimensions.get('window')

// 3 kolom: total width - padding kiri kanan - 2 gap antar kolom
const STAT_W = (width - 28 - 28 - 16) / 3

const ROLE_THEME: Record<string, { grad: [string, string]; accent: string }> = {
  super_admin: { grad: ['#0F172A', '#1E3A5F'], accent: '#3B82F6' },
  admin_unit:  { grad: ['#0A1A10', '#1A3A2A'], accent: '#10B981' },
  pimpinan:    { grad: ['#1A0F2E', '#3D2875'], accent: '#8B5CF6' },
  dinas_arsip: { grad: ['#0F1A2E', '#1E3D6E'], accent: '#06B6D4' },
  default:     { grad: ['#0F172A', '#1E293B'], accent: '#3B82F6' },
}

export default function DashboardScreen() {
  const { user }   = useAuth()
  const navigation = useNavigation<Nav>()
  const insets     = useSafeAreaInsets()

  const [data,         setData]         = useState<any>(null)
  const [arsipTerbaru, setArsipTerbaru] = useState<any[]>([])
  const [notifCount,   setNotifCount]   = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)

  const fadeAnim  = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(20)).current

  const load = useCallback(async () => {
    try {
      const [report, arsip, n] = await Promise.all([
        reportApi.dashboard(),
        archiveApi.list({ limit: 5 }),
        notifApi.list(true),
      ])
      const arsipData = report?.data?.arsip ?? {}
      const perStatus = arsipData?.perStatus ?? []
      const getS = (s: string) => perStatus.find((x: any) => x.status === s)?.total ?? 0

      setData({
        totalArsip:   arsipData?.total ?? 0,
        arsipAktif:   getS('aktif'),
        arsipInaktif: getS('inaktif'),
        arsipDinamis: getS('dinamis'),
        kritis:       0,
        peringatan:   0,
        aman:         arsipData?.total ?? 0,
        bulanIni:     0,
      })
      setArsipTerbaru(arsip?.data?.data ?? arsip?.data ?? [])
      setNotifCount(n.data?.totalBelumDibaca ?? 0)

      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '600' }}>Memuat dashboard...</Text>
    </View>
  )

  const theme     = ROLE_THEME[user?.role ?? ''] ?? ROLE_THEME.default
  const roleColor = ROLE_COLOR[user?.role ?? ''] ?? '#3B82F6'

  const STATS = [
    { lbl: 'Total',    val: data?.totalArsip ?? 0,   clr: '#3B82F6', icon: 'folder',           bg: '#EFF6FF' },
    { lbl: 'Aktif',    val: data?.arsipAktif ?? 0,   clr: '#10B981', icon: 'checkmark-circle', bg: '#F0FDF4' },
    { lbl: 'Inaktif',  val: data?.arsipInaktif ?? 0, clr: '#F59E0B', icon: 'pause-circle',     bg: '#FFFBEB' },
    { lbl: 'Dinamis',  val: data?.arsipDinamis ?? 0, clr: '#8B5CF6', icon: 'refresh-circle',   bg: '#F5F3FF' },
    { lbl: 'Kritis',   val: data?.kritis ?? 0,       clr: '#EF4444', icon: 'alert-circle',     bg: '#FEF2F2' },
    { lbl: 'Bln. Ini', val: data?.bulanIni ?? 0,     clr: '#06B6D4', icon: 'calendar',         bg: '#ECFEFF' },
  ]

  const RETENSI = [
    { lbl: 'Kritis',     val: data?.kritis ?? 0,     clr: '#EF4444', icon: 'alert-circle',    bg: '#FEF2F2' },
    { lbl: 'Warning', val: data?.peringatan ?? 0, clr: '#F59E0B', icon: 'warning',         bg: '#FFFBEB' },
    { lbl: 'Aman',       val: data?.aman ?? 0,       clr: '#10B981', icon: 'shield-checkmark', bg: '#F0FDF4' },
  ]

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.grad[0]} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load() }}
            tintColor="#3B82F6"
          />
        }
      >
        {/* ══ HERO ══ */}
        <LinearGradient
          colors={theme.grad}
          style={[s.hero, { paddingTop: insets.top + 14 }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={[s.ring, { width: 200, height: 200, top: -70, right: -50 }]} />
          <View style={[s.ring, { width: 110, height: 110, bottom: -20, left: -20 }]} />

          {/* Top bar */}
          <View style={s.topBar}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={s.greetTxt}>Selamat datang 👋</Text>
              <Text style={s.nameTxt} numberOfLines={1}>{user?.namaLengkap}</Text>
              <View style={[s.rolePill, { backgroundColor: roleColor + '22', borderColor: roleColor + '50' }]}>
                <View style={[s.roleLed, { backgroundColor: roleColor }]} />
                <Text style={[s.roleTxt, { color: roleColor }]}>
                  {ROLE_LABEL[user?.role ?? ''] ?? user?.role}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={s.notifBtn}
              onPress={() => navigation.navigate('Notifikasi')}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={19} color="#fff" />
              {notifCount > 0 && (
                <View style={s.notifDot}>
                  <Text style={s.notifDotTxt}>{notifCount > 9 ? '9+' : notifCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Hero stats strip */}
          <View style={s.heroStrip}>
            {[
              { label: 'Total',  value: data?.totalArsip ?? 0, color: '#93C5FD', icon: 'server-outline' },
              { label: 'Aktif',  value: data?.arsipAktif ?? 0, color: '#6EE7B7', icon: 'checkmark-circle-outline' },
              { label: 'Kritis', value: data?.kritis ?? 0,     color: '#FCA5A5', icon: 'warning-outline' },
            ].map((item, i) => (
              <View key={i} style={[s.heroStripItem, i !== 2 && s.heroStripBorder]}>
                <View style={s.heroStripTop}>
                  <Ionicons name={item.icon as any} size={12} color={item.color} />
                  <Text style={[s.heroStripVal, { color: item.color }]}>{item.value}</Text>
                </View>
                <Text style={s.heroStripLbl}>{item.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ══ BODY ══ */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── STATISTIK ARSIP — 3 kolom 2 baris ── */}
          <View style={s.card}>
            <CardHeader icon="bar-chart" color="#3B82F6" title="Statistik Arsip" />

            {/* Baris 1: Total, Aktif, Inaktif */}
            <View style={s.statsRow}>
              {STATS.slice(0, 3).map((sc, i) => (
                <View key={i} style={[s.statCell, { backgroundColor: sc.bg, width: STAT_W }]}>
                  <View style={[s.statIconBox, { backgroundColor: sc.clr + '22' }]}>
                    <Ionicons name={sc.icon as any} size={16} color={sc.clr} />
                  </View>
                  <Text style={[s.statNum, { color: sc.clr }]}>{sc.val}</Text>
                  <Text style={s.statLbl}>{sc.lbl}</Text>
                </View>
              ))}
            </View>

            {/* Baris 2: Dinamis, Kritis, Bln. Ini */}
            <View style={[s.statsRow, { marginTop: 8 }]}>
              {STATS.slice(3, 6).map((sc, i) => (
                <View key={i} style={[s.statCell, { backgroundColor: sc.bg, width: STAT_W }]}>
                  <View style={[s.statIconBox, { backgroundColor: sc.clr + '22' }]}>
                    <Ionicons name={sc.icon as any} size={16} color={sc.clr} />
                  </View>
                  <Text style={[s.statNum, { color: sc.clr }]}>{sc.val}</Text>
                  <Text style={s.statLbl}>{sc.lbl}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── STATUS RETENSI — compact horizontal ── */}
          <View style={s.card}>
            <CardHeader icon="time" color="#F59E0B" title="Status Retensi" />
            <View style={s.retensiRow}>
              {RETENSI.map((r, i) => (
                <View key={i} style={[s.retensiCell, { backgroundColor: r.bg, borderColor: r.clr + '30' }]}>
                  <View style={[s.retensiIconBox, { backgroundColor: r.clr + '18' }]}>
                    <Ionicons name={r.icon as any} size={16} color={r.clr} />
                  </View>
                  <Text style={[s.retensiNum, { color: r.clr }]}>{r.val}</Text>
                  <Text style={[s.retensiLbl, { color: r.clr + 'CC' }]}>{r.lbl}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── AKSES CEPAT ── */}
          <View style={s.card}>
            <CardHeader icon="flash" color="#8B5CF6" title="Akses Cepat" />
            <View style={s.quickRow}>
              {[
                { lbl: 'Upload',     icon: 'cloud-upload',  clr: '#3B82F6', bg: '#EFF6FF', screen: 'UploadArsip' },
                { lbl: 'Penilaian',  icon: 'clipboard',     clr: '#10B981', bg: '#F0FDF4', screen: 'Penilaian' },
                { lbl: 'Notifikasi', icon: 'notifications', clr: '#F59E0B', bg: '#FFFBEB', screen: 'Notifikasi' },
                { lbl: 'Profil',     icon: 'person-circle', clr: '#8B5CF6', bg: '#F5F3FF', screen: 'Profil' },
              ].map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.quickCell, { backgroundColor: q.bg }]}
                  onPress={() => navigation.navigate(q.screen as any)}
                  activeOpacity={0.8}
                >
                  <View style={[s.quickIconBox, { backgroundColor: q.clr + '20' }]}>
                    <Ionicons name={q.icon as any} size={20} color={q.clr} />
                  </View>
                  <Text style={[s.quickLbl, { color: q.clr }]}>{q.lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── ARSIP TERBARU ── */}
          <View style={s.card}>
            <CardHeader
              icon="document-text" color="#10B981" title="Arsip Terbaru"
              right={
                <TouchableOpacity
                  style={s.seeAllBtn}
                  onPress={() => navigation.navigate('MainTab' as any)}
                  activeOpacity={0.7}
                >
                  <Text style={s.seeAllTxt}>Lihat Semua</Text>
                  <Ionicons name="chevron-forward" size={11} color="#3B82F6" />
                </TouchableOpacity>
              }
            />

            {arsipTerbaru.length === 0 ? (
              <View style={s.empty}>
                <View style={s.emptyIcon}>
                  <Ionicons name="folder-open-outline" size={28} color="#CBD5E1" />
                </View>
                <Text style={s.emptyTitle}>Belum Ada Arsip</Text>
                <Text style={s.emptySub}>Arsip yang diunggah akan tampil di sini</Text>
              </View>
            ) : (
              arsipTerbaru.map((a: any, idx: number) => {
                const st2  = STATUS_ARSIP[a.statusArsip] ?? STATUS_ARSIP.aktif
                const last = idx === arsipTerbaru.length - 1
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[s.arsipRow, last && { borderBottomWidth: 0 }]}
                    onPress={() => navigation.navigate('DetailArsip', { id: a.id })}
                    activeOpacity={0.75}
                  >
                    <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={s.arsipDocIcon}>
                      <Ionicons name="document-text" size={16} color="#3B82F6" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <View style={s.arsipTopRow}>
                        <Text style={s.arsipNomor} numberOfLines={1}>{a.nomorSurat || '—'}</Text>
                        <View style={[s.statusChip, { backgroundColor: st2.bg }]}>
                          <View style={[s.statusDot, { backgroundColor: st2.color }]} />
                          <Text style={[s.statusTxt, { color: st2.color }]}>{st2.label}</Text>
                        </View>
                      </View>
                      <Text style={s.arsipJudul} numberOfLines={1}>{a.judul}</Text>
                      <View style={s.arsipMeta}>
                        <Ionicons name="business-outline" size={9} color="#94A3B8" />
                        <Text style={s.arsipMetaTxt} numberOfLines={1}>{a.unit?.namaUnit}</Text>
                        <View style={s.metaDot} />
                        <Ionicons name="calendar-outline" size={9} color="#94A3B8" />
                        <Text style={s.arsipMetaTxt}>{formatDate(a.createdAt)}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={13} color="#CBD5E1" />
                  </TouchableOpacity>
                )
              })
            )}
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  )
}

// ─── CARD HEADER ──────────────────────────────────────
function CardHeader({ icon, color, title, right }: {
  icon: any; color: string; title: string; right?: React.ReactNode
}) {
  return (
    <View style={s.cardHeader}>
      <View style={[s.cardHeaderIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <Text style={s.cardHeaderTitle}>{title}</Text>
      {right}
    </View>
  )
}

// ─── STYLES ───────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },

  // Hero
  hero:   { paddingHorizontal: 18, paddingBottom: 18, overflow: 'hidden' },
  ring:   { position: 'absolute', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },

  topBar:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  greetTxt:{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '600', letterSpacing: 0.4, marginBottom: 3 },
  nameTxt: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: 8 },
  rolePill:{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  roleLed: { width: 6, height: 6, borderRadius: 3 },
  roleTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  notifBtn:    { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  notifDot:    { position: 'absolute', top: -3, right: -3, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0F172A' },
  notifDotTxt: { color: '#fff', fontSize: 8, fontWeight: '800' },

  // Hero strip — compact single row
  heroStrip:       { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  heroStripItem:   { flex: 1, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', gap: 2 },
  heroStripBorder: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)' },
  heroStripTop:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroStripVal:    { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  heroStripLbl:    { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Card
  card:           { backgroundColor: '#fff', marginHorizontal: 14, marginTop: 12, borderRadius: 16, padding: 14, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cardHeaderIcon: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardHeaderTitle:{ flex: 1, fontSize: 13, fontWeight: '800', color: '#0F172A' },

  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14 },
  seeAllTxt: { fontSize: 10, color: '#3B82F6', fontWeight: '700' },

  // ── STATS: 3 kolom 2 baris ──
  statsRow:   { flexDirection: 'row', gap: 8 },
  statCell:   { alignItems: 'center', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 4, gap: 4 },
  statIconBox:{ width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  statNum:    { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  statLbl:    { fontSize: 9, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },

  // ── RETENSI: compact horizontal ──
  retensiRow:    { flexDirection: 'row', gap: 8 },
  retensiCell:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1 },
  retensiIconBox:{ width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  retensiNum:    { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  retensiLbl:    { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

  // ── QUICK ACCESS ──
  quickRow:    { flexDirection: 'row', gap: 8 },
  quickCell:   { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, gap: 5 },
  quickIconBox:{ width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  quickLbl:    { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },

  // ── ARSIP LIST ──
  arsipRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  arsipDocIcon:{ width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  arsipTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  arsipNomor:  { fontSize: 10, color: '#3B82F6', fontWeight: '700', flex: 1, marginRight: 6 },
  arsipJudul:  { fontSize: 12, fontWeight: '700', color: '#0F172A', marginBottom: 3 },
  arsipMeta:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  arsipMetaTxt:{ fontSize: 10, color: '#94A3B8', fontWeight: '500' },
  metaDot:     { width: 2, height: 2, borderRadius: 1, backgroundColor: '#CBD5E1' },

  statusChip:  { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 14 },
  statusDot:   { width: 4, height: 4, borderRadius: 2 },
  statusTxt:   { fontSize: 9, fontWeight: '800' },

  // Empty
  empty:      { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyIcon:  { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 13, fontWeight: '700', color: '#334155' },
  emptySub:   { fontSize: 11, color: '#94A3B8', textAlign: 'center' },
})
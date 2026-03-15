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
  const { user }       = useAuth()
  const navigation     = useNavigation<Nav>()
  const [data, setData]           = useState<any>(null)
  const [arsipTerbaru, setArsipTerbaru] = useState<any[]>([])
  const [notifCount, setNotifCount]     = useState(0)
  const [loading, setLoading]           = useState(true)
  const [refreshing, setRefreshing]     = useState(false)

  const load = useCallback(async () => {
    try {
      const [report, arsip, n] = await Promise.all([
        reportApi.dashboard(),
        archiveApi.list({ limit: 5 }),
        notifApi.list(true),
      ])

      // Struktur dari backend: report.data.arsip.total, report.data.arsip.perStatus
      const arsipData   = report?.data?.arsip ?? {}
      const perStatus   = arsipData?.perStatus ?? []

      const getStatus = (s: string) => perStatus.find((x: any) => x.status === s)?._count?.id
        ?? perStatus.find((x: any) => x.status === s)?.total ?? 0

      setData({
        totalArsip:        arsipData?.total ?? 0,
        arsipAktif:        getStatus('aktif'),
        arsipInaktif:      getStatus('inaktif'),
        arsipDinamis:      getStatus('dinamis'),
        arsipDimusnahkan:  getStatus('dimusnahkan'),
        arsipBulanIni:     0,
        hampirKadaluarsa:  0,
        kritis:            0,
        peringatan:        0,
        aman:              arsipData?.total ?? 0,
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  const canUpload = user?.role === 'super_admin' || user?.role === 'admin_unit'

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Selamat Datang,</Text>
          <Text style={styles.name}>{user?.namaLengkap}</Text>
          <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLOR[user?.role ?? ''] ?? COLORS.primary) + '22' }]}>
            <Text style={[styles.roleText, { color: ROLE_COLOR[user?.role ?? ''] ?? COLORS.primary }]}>
              {ROLE_LABEL[user?.role ?? ''] ?? user?.role}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifikasi')}>
          <Ionicons name="notifications-outline" size={24} color={COLORS.white} />
          {notifCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Statistik */}
      <Text style={styles.sectionTitle}>Statistik Arsip</Text>
      <View style={styles.statsGrid}>
        {[
          { label: 'Total Arsip',  value: data?.totalArsip ?? 0,       icon: 'folder',           color: COLORS.primary },
          { label: 'Bulan Ini',    value: data?.arsipBulanIni ?? 0,    icon: 'calendar',         color: COLORS.success },
          { label: 'Aktif',        value: data?.arsipAktif ?? 0,       icon: 'checkmark-circle', color: COLORS.success },
          { label: 'Inaktif',      value: data?.arsipInaktif ?? 0,     icon: 'pause-circle',     color: COLORS.warning },
          { label: 'Dinamis',      value: data?.arsipDinamis ?? 0,     icon: 'refresh-circle',   color: COLORS.info },
          { label: 'Segera Habis', value: data?.hampirKadaluarsa ?? 0, icon: 'alert-circle',     color: COLORS.danger },
        ].map((s, i) => (
          <View key={i} style={[styles.statCard, SHADOW.sm]}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '18' }]}>
              <Ionicons name={s.icon as any} size={22} color={s.color} />
            </View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Status Retensi */}
      <Text style={styles.sectionTitle}>Status Retensi</Text>
      <View style={styles.retensiRow}>
        {[
          { label: 'Kritis',     value: data?.kritis ?? 0,     color: COLORS.danger },
          { label: 'Peringatan', value: data?.peringatan ?? 0, color: COLORS.warning },
          { label: 'Aman',       value: data?.aman ?? 0,       color: COLORS.success },
        ].map((r, i) => (
          <View key={i} style={[styles.retensiCard, { borderLeftColor: r.color }, SHADOW.sm]}>
            <Text style={[styles.retensiValue, { color: r.color }]}>{r.value}</Text>
            <Text style={styles.retensiLabel}>{r.label}</Text>
          </View>
        ))}
      </View>

      {/* Arsip Terbaru */}
      <Text style={styles.sectionTitle}>Arsip Terbaru</Text>
      {arsipTerbaru.length === 0 && (
        <View style={styles.emptyBox}>
          <Ionicons name="folder-open-outline" size={32} color={COLORS.muted} />
          <Text style={styles.emptyText}>Belum ada arsip</Text>
        </View>
      )}
      {arsipTerbaru.map((a: any) => {
        const s = STATUS_ARSIP[a.statusArsip] ?? STATUS_ARSIP.aktif
        return (
          <TouchableOpacity
            key={a.id}
            style={[styles.arsipCard, SHADOW.sm]}
            onPress={() => navigation.navigate('DetailArsip', { id: a.id })}
          >
            <View style={styles.arsipInfo}>
              <Text style={styles.arsipNomor}>{a.nomorSurat}</Text>
              <Text style={styles.arsipJudul} numberOfLines={1}>{a.judul}</Text>
              <Text style={styles.arsipMeta}>{a.unit?.namaUnit} · {formatDate(a.createdAt)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
              <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
            </View>
          </TouchableOpacity>
        )
      })}

      {/* Tombol Upload */}
      {canUpload && (
        <TouchableOpacity style={styles.fabUpload} onPress={() => navigation.navigate('UploadArsip')}>
          <Ionicons name="cloud-upload-outline" size={20} color={COLORS.white} />
          <Text style={styles.fabText}>Upload Arsip Baru</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:       { backgroundColor: COLORS.primaryDark, padding: SPACING.xl, paddingTop: 56, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting:     { color: COLORS.placeholder, fontSize: 13 },
  name:         { color: COLORS.white, fontSize: 20, fontWeight: '700', marginTop: 2 },
  roleBadge:    { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.full, marginTop: 6 },
  roleText:     { fontSize: 11, fontWeight: '700' },
  notifBtn:     { position: 'relative', padding: 6 },
  badge:        { position: 'absolute', top: 0, right: 0, backgroundColor: COLORS.danger, borderRadius: RADIUS.full, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText:    { color: COLORS.white, fontSize: 10, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, margin: SPACING.lg, marginBottom: SPACING.sm },
  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.md, gap: SPACING.sm },
  statCard:     { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', width: '30.5%' },
  statIcon:     { width: 42, height: 42, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  statValue:    { fontSize: 20, fontWeight: '800', color: COLORS.text },
  statLabel:    { fontSize: 11, color: COLORS.muted, textAlign: 'center', marginTop: 2 },
  retensiRow:   { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  retensiCard:  { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, borderLeftWidth: 4 },
  retensiValue: { fontSize: 22, fontWeight: '800' },
  retensiLabel: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  arsipCard:    { backgroundColor: COLORS.white, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, borderRadius: RADIUS.md, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arsipInfo:    { flex: 1, marginRight: SPACING.sm },
  arsipNomor:   { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  arsipJudul:   { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  arsipMeta:    { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  statusBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText:   { fontSize: 11, fontWeight: '700' },
  fabUpload:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, margin: SPACING.lg, borderRadius: RADIUS.lg, padding: SPACING.md, gap: 8, ...SHADOW.md },
  fabText:      { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  emptyBox:     { alignItems: 'center', padding: SPACING.xl, gap: 8 },
  emptyText:    { color: COLORS.muted, fontSize: 14 },
})
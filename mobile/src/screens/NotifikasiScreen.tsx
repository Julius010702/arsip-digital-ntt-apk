// ======================================================
// FILE: mobile/src/screens/NotifikasiScreen.tsx
// ======================================================

import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { notifApi } from '../services/api'
import { COLORS, SHADOW, RADIUS, SPACING } from '../utils/theme'
import { RootStackParams } from '../navigation/types'
import { Notifikasi } from '../types'
import { formatRelative } from '../utils/format'

type Nav = NativeStackNavigationProp<RootStackParams>

const TIPE_ICON: Record<string, { icon: string; color: string }> = {
  retensi_hampir_habis: { icon: 'time-outline',        color: COLORS.warning },
  retensi_habis:        { icon: 'alert-circle-outline', color: COLORS.danger },
  penilaian_baru:       { icon: 'clipboard-outline',    color: COLORS.info },
  penilaian_perlu_aksi: { icon: 'hand-left-outline',    color: COLORS.primary },
  arsip_dimusnahkan:    { icon: 'trash-outline',         color: COLORS.danger },
}

export default function NotifikasiScreen() {
  const navigation  = useNavigation<Nav>()
  const [notif, setNotif]       = useState<Notifikasi[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await notifApi.list()
      setNotif(res.data?.notifikasi ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function tandaiSemua() {
    await notifApi.tandaiDibaca()
    setNotif(prev => prev.map(n => ({ ...n, sudahDibaca: true })))
  }

  async function tandaiSatu(id: number) {
    await notifApi.tandaiDibaca([id])
    setNotif(prev => prev.map(n => n.id === id ? { ...n, sudahDibaca: true } : n))
  }

  const renderItem = ({ item }: { item: Notifikasi }) => {
    const cfg = TIPE_ICON[item.tipe] ?? { icon: 'notifications-outline', color: COLORS.primary }
    return (
      <TouchableOpacity
        style={[styles.card, !item.sudahDibaca && styles.cardUnread, SHADOW.sm]}
        onPress={() => {
          tandaiSatu(item.id)
          if (item.archive?.id) {
            navigation.navigate('DetailArsip', { id: item.archive.id })
          }
        }}
      >
        <View style={[styles.iconWrap, { backgroundColor: cfg.color + '18' }]}>
          <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
        </View>
        <View style={styles.content}>
          <Text style={styles.judul}>{item.judul}</Text>
          <Text style={styles.pesan}>{item.pesan}</Text>
          {item.archive && (
            <Text style={styles.arsipRef}>📄 {item.archive.nomorSurat}</Text>
          )}
          <Text style={styles.waktu}>{formatRelative(item.createdAt)}</Text>
        </View>
        {!item.sudahDibaca && <View style={styles.dot} />}
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  const belumDibaca = notif.filter(n => !n.sudahDibaca).length

  return (
    <View style={styles.container}>
      {/* Tandai Semua */}
      {belumDibaca > 0 && (
        <TouchableOpacity style={styles.tandaiBar} onPress={tandaiSemua}>
          <Text style={styles.tandaiText}>Tandai semua sudah dibaca ({belumDibaca})</Text>
          <Ionicons name="checkmark-done-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      )}

      <FlatList
        data={notif}
        keyExtractor={i => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={COLORS.disabled} />
            <Text style={styles.emptyText}>Tidak ada notifikasi</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tandaiBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.primarySoft, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  tandaiText:  { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  list:        { padding: SPACING.lg, gap: SPACING.sm },
  card:        { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md },
  cardUnread:  { borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  iconWrap:    { width: 44, height: 44, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  content:     { flex: 1 },
  judul:       { fontSize: 14, fontWeight: '700', color: COLORS.text },
  pesan:       { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
  arsipRef:    { fontSize: 12, color: COLORS.primary, marginTop: 4, fontWeight: '600' },
  waktu:       { fontSize: 11, color: COLORS.muted, marginTop: 4 },
  dot:         { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, marginTop: 4 },
  empty:       { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText:   { fontSize: 15, color: COLORS.muted },
})
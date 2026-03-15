import React, { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Linking, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { archiveApi } from '../services/api'
import { Archive } from '../types'
import { COLORS, CAT_COLORS, RADIUS, SHADOW, SPACING } from '../utils/theme'
import { formatDate } from '../utils/format'
import { InfoRow, CategoryChip } from '../components/UI'
import { useAuth } from '../hooks/useAuth'
import { RootStackParams } from '../navigation/types'

type Route = RouteProp<RootStackParams, 'DetailArsip'>

const BASE = 'https://arsip-digital-ntt-apk.vercel.app'

export default function DetailArsipScreen() {
  const { user } = useAuth()
  const nav    = useNavigation()
  const route  = useRoute<Route>()
  const insets = useSafeAreaInsets()

  const [archive, setArchive] = useState<Archive | null>(null)
  const [loading, setLoading] = useState(true)

  const canEdit = ['super_admin', 'admin_unit'].includes(user?.role ?? '')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await archiveApi.get(route.params.id)
      setArchive(res.data)
    } catch (e: any) {
      Alert.alert('Error', e.message); nav.goBack()
    } finally { setLoading(false) }
  }

  async function handleDelete() {
    Alert.alert('Hapus Arsip', 'Yakin ingin menghapus arsip ini? Tindakan tidak dapat dibatalkan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          try {
            await archiveApi.delete(archive!.id)
            Alert.alert('Berhasil', 'Arsip dihapus', [{ text: 'OK', onPress: () => nav.goBack() }])
          } catch (e: any) { Alert.alert('Error', e.message) }
        },
      },
    ])
  }

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={COLORS.primaryLight} />
    </View>
  )
  if (!archive) return null

  const catColor = CAT_COLORS[archive.category?.nama ?? ''] ?? COLORS.info
  const fileUrl  = `${BASE}${archive.filePath}`
  const ext      = archive.filePath?.split('.').pop()?.toUpperCase()

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* HERO */}
        <View style={s.hero}>
          <View style={[s.heroIcon, { backgroundColor: catColor + '22' }]}>
            <Ionicons name="document-text" size={36} color={catColor} />
          </View>
          <Text style={s.heroTitle}>{archive.judul}</Text>
          <View style={s.heroChips}>
            <CategoryChip name={archive.category?.nama ?? ''} />
            <View style={s.extBadge}>
              <Text style={s.extText}>{ext}</Text>
            </View>
          </View>
        </View>

        {/* INFORMASI DOKUMEN */}
        <View style={s.card}>
          <Text style={s.cardTitle}>📋 Informasi Dokumen</Text>
          <InfoRow icon="🔢" label="Nomor Surat"    value={archive.nomorSurat} />
          <InfoRow icon="📅" label="Tanggal Surat"  value={formatDate(archive.tanggalSurat)} />
          <InfoRow icon="👤" label="Pengirim"       value={archive.pengirim} />
          <InfoRow icon="👥" label="Penerima"       value={archive.penerima} />
          <InfoRow icon="💬" label="Perihal"        value={archive.perihal} />
          <InfoRow icon="🏢" label="Unit Kerja"     value={archive.unit?.namaUnit} />
          <InfoRow icon="✍️" label="Diunggah oleh"  value={archive.user?.namaLengkap} />
          <InfoRow icon="📅" label="Tanggal Upload" value={formatDate(archive.createdAt)} />
        </View>

        {/* FILE */}
        <View style={s.card}>
          <Text style={s.cardTitle}>📎 File Dokumen</Text>
          <TouchableOpacity style={s.fileRow} onPress={() => Linking.openURL(fileUrl)}>
            <View style={s.fileIcon}>
              <Ionicons name="document" size={28} color={COLORS.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fileName} numberOfLines={1}>{archive.filePath?.split('/').pop()}</Text>
              <Text style={s.fileMeta}>Ketuk untuk membuka / unduh</Text>
            </View>
            <View style={s.dlBtn}>
              <Ionicons name="download-outline" size={20} color={COLORS.primaryLight} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* BOTTOM BAR — dengan safe area padding */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + SPACING.md }]}>
        <TouchableOpacity style={s.btnUnduh} onPress={() => Linking.openURL(fileUrl)}>
          <Ionicons name="download-outline" size={18} color={COLORS.primaryLight} />
          <Text style={s.btnUnduhText}>Unduh File</Text>
        </TouchableOpacity>
        {canEdit && (
          <TouchableOpacity style={s.btnHapus} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            <Text style={s.btnHapusText}>Hapus</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  hero: {
    backgroundColor: COLORS.white, padding: SPACING.xl,
    alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  heroIcon:  { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  heroTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 12, lineHeight: 24 },
  heroChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  extBadge:  { backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.border },
  extText:   { fontSize: 11, fontWeight: '800', color: COLORS.muted },

  card: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.lg, margin: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 16 },

  fileRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF5F5', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#FEE2E2', gap: 10,
  },
  fileIcon: { width: 46, height: 46, backgroundColor: COLORS.white, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  fileName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  fileMeta: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  dlBtn:    { width: 36, height: 36, backgroundColor: COLORS.primarySoft, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  bottomBar: {
    flexDirection: 'row', gap: 10,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  btnUnduh: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primarySoft, borderRadius: 14, paddingVertical: 15, gap: 8,
  },
  btnUnduhText: { fontSize: 15, fontWeight: '700', color: COLORS.primaryLight },
  btnHapus: {
    width: 52, backgroundColor: COLORS.dangerSoft,
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },
  btnHapusText: { fontSize: 13, fontWeight: '700', color: COLORS.danger },
})
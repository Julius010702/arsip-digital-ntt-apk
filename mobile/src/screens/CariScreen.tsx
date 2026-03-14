// ======================================================
// FILE: mobile/src/screens/CariScreen.tsx
// ======================================================

import React, { useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { archiveApi, urusanApi } from '../services/api'
import { COLORS, SHADOW, RADIUS, SPACING, STATUS_ARSIP } from '../utils/theme'
import { RootStackParams } from '../navigation/types'
import { Archive } from '../types'

type Nav = NativeStackNavigationProp<RootStackParams>

export default function CariScreen() {
  const navigation  = useNavigation<Nav>()
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState<Archive[]>([])
  const [detected, setDetected]     = useState<any>(null)
  const [loading, setLoading]       = useState(false)
  const [searched, setSearched]     = useState(false)

  const cari = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setDetected(null)
    try {
      // Deteksi urusan otomatis dari input
      const det = await urusanApi.detect(query, query, query)
      if (det.data?.sumber !== 'default') {
        setDetected(det.data)
      }

      // Cari arsip dengan keyword
      const res = await archiveApi.list({ search: query, limit: 20 })
      setResults(res.data ?? [])
      setSearched(true)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [query])

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
            <Text style={styles.meta}>{item.pengirim} → {item.penerima}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
          </View>
        </View>
        {item.urusan && (
          <View style={styles.urusanRow}>
            <Ionicons name="pricetag-outline" size={12} color={COLORS.info} />
            <Text style={styles.urusanText}>{item.urusan.kodeUrusan} · {item.urusan.namaUrusan}</Text>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cari Arsip</Text>
        <Text style={styles.headerSub}>Cari berdasarkan nomor, judul, pengirim, atau urusan</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, SHADOW.sm]}>
          <Ionicons name="search" size={20} color={COLORS.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Ketik kata kunci, nomor surat, atau urusan..."
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={cari}
            returnKeyType="search"
            placeholderTextColor={COLORS.placeholder}
          />
          {query !== '' && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); setDetected(null) }}>
              <Ionicons name="close-circle" size={18} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.cariBtn} onPress={cari}>
          <Text style={styles.cariBtnText}>Cari</Text>
        </TouchableOpacity>
      </View>

      {/* Deteksi Urusan */}
      {detected && (
        <View style={styles.deteksi}>
          <Ionicons name="flash" size={16} color={COLORS.accent} />
          <Text style={styles.deteksiText}>
            Terdeteksi urusan: <Text style={{ fontWeight: '700', color: COLORS.primary }}>{detected.urusan?.namaUrusan}</Text>
            {detected.keyword ? ` (kata kunci: "${detected.keyword}")` : ''}
          </Text>
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Mencari arsip...</Text>
        </View>
      )}

      {/* Hasil */}
      {!loading && searched && (
        <FlatList
          data={results}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.resultCount}>{results.length} arsip ditemukan</Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={COLORS.disabled} />
              <Text style={styles.emptyText}>Tidak ada arsip yang cocok</Text>
              <Text style={styles.emptyHint}>Coba kata kunci lain</Text>
            </View>
          }
        />
      )}

      {/* Panduan */}
      {!searched && !loading && (
        <View style={styles.panduan}>
          <Text style={styles.panduanTitle}>💡 Tips Pencarian</Text>
          {[
            'Ketik "800" untuk arsip kepegawaian',
            'Ketik "pengadaan" untuk arsip pengadaan barang',
            'Ketik "300" untuk arsip pengadaan',
            'Ketik nama pengirim atau penerima',
            'Ketik sebagian judul surat',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.background },
  header:        { backgroundColor: COLORS.primaryDark, paddingHorizontal: SPACING.lg, paddingTop: 56, paddingBottom: SPACING.lg },
  headerTitle:   { color: COLORS.white, fontSize: 20, fontWeight: '700' },
  headerSub:     { color: COLORS.placeholder, fontSize: 13, marginTop: 2 },
  searchWrap:    { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.sm },
  searchBox:     { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm },
  searchInput:   { flex: 1, fontSize: 14, color: COLORS.text },
  cariBtn:       { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  cariBtnText:   { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  deteksi:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, backgroundColor: COLORS.warningSoft, padding: SPACING.sm, borderRadius: RADIUS.md },
  deteksiText:   { flex: 1, fontSize: 13, color: COLORS.text },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  loadingText:   { color: COLORS.muted, marginTop: 8 },
  list:          { padding: SPACING.lg, gap: SPACING.sm },
  resultCount:   { fontSize: 13, color: COLORS.muted, marginBottom: SPACING.sm },
  card:          { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md },
  cardTop:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardLeft:      { flex: 1, marginRight: SPACING.sm },
  nomor:         { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  judul:         { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  meta:          { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  statusBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText:    { fontSize: 11, fontWeight: '700' },
  urusanRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  urusanText:    { fontSize: 11, color: COLORS.info, fontWeight: '600' },
  empty:         { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyText:     { fontSize: 15, color: COLORS.muted, fontWeight: '600' },
  emptyHint:     { fontSize: 13, color: COLORS.placeholder },
  panduan:       { margin: SPACING.lg, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOW.sm },
  panduanTitle:  { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  tipRow:        { flexDirection: 'row', gap: 8, marginBottom: 6 },
  tipBullet:     { color: COLORS.primary, fontWeight: '700' },
  tipText:       { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
})
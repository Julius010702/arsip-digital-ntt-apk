// ======================================================
// FILE: mobile/src/screens/CariScreen.tsx
// ======================================================

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator,
  Animated, Dimensions,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { archiveApi, urusanApi } from '../services/api'
import { COLORS, SHADOW, STATUS_ARSIP } from '../utils/theme'
import { RootStackParams } from '../navigation/types'
import { Archive } from '../types'

type Nav = NativeStackNavigationProp<RootStackParams>

const { width } = Dimensions.get('window')

const QUICK_SEARCHES = [
  { label: 'Kepegawaian', keyword: '800',         icon: 'people-outline',    color: '#3B82F6', bg: '#EFF6FF' },
  { label: 'Pengadaan',   keyword: 'pengadaan',   icon: 'cart-outline',      color: '#10B981', bg: '#F0FDF4' },
  { label: 'Keuangan',    keyword: 'keuangan',    icon: 'cash-outline',      color: '#F59E0B', bg: '#FFFBEB' },
  { label: 'Surat Masuk', keyword: 'surat masuk', icon: 'mail-outline',      color: '#8B5CF6', bg: '#F5F3FF' },
  { label: 'Laporan',     keyword: 'laporan',     icon: 'bar-chart-outline', color: '#EF4444', bg: '#FEF2F2' },
  { label: 'SK / SPK',    keyword: 'SK',          icon: 'document-outline',  color: '#06B6D4', bg: '#ECFEFF' },
]

const TIPS = [
  { icon: 'keypad-outline',   color: '#3B82F6', text: 'Ketik "800" untuk arsip kepegawaian' },
  { icon: 'search-outline',   color: '#10B981', text: 'Ketik "pengadaan" untuk arsip pengadaan barang' },
  { icon: 'person-outline',   color: '#8B5CF6', text: 'Ketik nama pengirim atau penerima' },
  { icon: 'document-outline', color: '#F59E0B', text: 'Ketik sebagian judul surat' },
  { icon: 'pricetag-outline', color: '#EF4444', text: 'Ketik kode urusan (mis. 300, 400)' },
]

export default function CariScreen() {
  const navigation = useNavigation<Nav>()
  const inputRef   = useRef<TextInput>(null)

  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<Archive[]>([])
  const [detected, setDetected] = useState<any>(null)
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)

  const fadeAnim  = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current

  // ✅ Auto-search dengan debounce 500ms — ketik langsung cari
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setSearched(false)
      setDetected(null)
      return
    }
    const timer = setTimeout(() => {
      cari(query)
    }, 500)
    return () => clearTimeout(timer)
  }, [query])

  const cari = useCallback(async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim()
    if (!q) return
    setLoading(true)
    setDetected(null)
    fadeAnim.setValue(0)
    scaleAnim.setValue(0.95)
    try {
      // Deteksi urusan — error diabaikan agar tidak menghentikan pencarian
      try {
        const det = await urusanApi.detect(q, q, q)
        if (det.data?.sumber !== 'default') setDetected(det.data)
      } catch (_) { /* abaikan */ }

      // Cari arsip
      const res = await archiveApi.list({ search: q, limit: 20 })
      setResults(res.data?.data ?? res.data ?? [])
      setSearched(true)
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
      ]).start()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [query])

  function handleClear() {
    setQuery('')
    setResults([])
    setSearched(false)
    setDetected(null)
    inputRef.current?.focus()
  }

  function handleQuickSearch(keyword: string) {
    setQuery(keyword)
    // useEffect akan trigger otomatis karena query berubah
  }

  const renderItem = ({ item }: { item: Archive }) => {
    const st = STATUS_ARSIP[item.statusArsip] ?? STATUS_ARSIP.aktif
    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('DetailArsip', { id: item.id })}
          activeOpacity={0.82}
        >
          <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={styles.cardDocIcon}>
            <Ionicons name="document-text" size={20} color="#3B82F6" />
          </LinearGradient>

          <View style={styles.cardBody}>
            <View style={styles.cardTopRow}>
              <View style={styles.nomorRow}>
                <Ionicons name="barcode-outline" size={10} color="#3B82F6" />
                <Text style={styles.nomor}>{item.nomorSurat || 'Tanpa Nomor'}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
              </View>
            </View>

            <Text style={styles.judul} numberOfLines={2}>{item.judul}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={10} color="#94A3B8" />
                <Text style={styles.metaText} numberOfLines={1}>{item.pengirim}</Text>
              </View>
              <Ionicons name="arrow-forward-outline" size={10} color="#CBD5E1" />
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={10} color="#94A3B8" />
                <Text style={styles.metaText} numberOfLines={1}>{item.penerima}</Text>
              </View>
            </View>

            {(item as any).urusan && (
              <View style={styles.urusanBadge}>
                <Ionicons name="pricetag-outline" size={10} color="#8B5CF6" />
                <Text style={styles.urusanText}>
                  {(item as any).urusan.kodeUrusan} · {(item as any).urusan.namaUrusan}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  return (
    <View style={styles.container}>

      {/* ══ HEADER ══ */}
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.header}>
        <View style={styles.headerDec1} />
        <View style={styles.headerDec2} />
        <Text style={styles.headerTitle}>Cari Arsip</Text>
        <Text style={styles.headerSub}>Ketik untuk mencari arsip secara otomatis</Text>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            {/* Icon loading atau search */}
            {loading
              ? <ActivityIndicator size="small" color="#3B82F6" />
              : <Ionicons name="search-outline" size={18} color="#64748B" />
            }
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Nomor, judul, pengirim, urusan..."
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => cari()}
              returnKeyType="search"
              placeholderTextColor="#64748B"
              autoCorrect={false}
            />
            {query !== '' && (
              <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={17} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
          {/* Tombol search tetap ada untuk trigger manual */}
          <TouchableOpacity style={styles.cariBtn} onPress={() => cari()} activeOpacity={0.85}>
            <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.cariBtnGrad}>
              <Ionicons name="search" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ══ DETEKSI URUSAN ══ */}
      {detected && (
        <View style={styles.deteksiBox}>
          <LinearGradient colors={['#FFFBEB', '#FEF3C7']} style={styles.deteksiInner}>
            <View style={styles.deteksiIconBox}>
              <Ionicons name="flash" size={14} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deteksiLabel}>Urusan Terdeteksi</Text>
              <Text style={styles.deteksiValue}>{detected.urusan?.namaUrusan}</Text>
            </View>
            {detected.keyword && (
              <View style={styles.deteksiKeyword}>
                <Text style={styles.deteksiKeywordText}>"{detected.keyword}"</Text>
              </View>
            )}
          </LinearGradient>
        </View>
      )}

      {/* ══ HASIL PENCARIAN ══ */}
      {!loading && searched && (
        <FlatList
          data={results}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.resultHeader}>
              <View style={styles.resultCountBox}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.resultCount}>{results.length} arsip ditemukan</Text>
              </View>
              <Text style={styles.resultQuery}>untuk "{query}"</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <LinearGradient colors={['#F1F5F9', '#E2E8F0']} style={styles.emptyIconBox}>
                <Ionicons name="search-outline" size={40} color="#94A3B8" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>Arsip Tidak Ditemukan</Text>
              <Text style={styles.emptySubtitle}>Coba kata kunci lain atau periksa ejaan</Text>
              <TouchableOpacity style={styles.emptyResetBtn} onPress={handleClear}>
                <Text style={styles.emptyResetText}>Reset Pencarian</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ══ LOADING STATE ══ */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Mencari arsip...</Text>
        </View>
      )}

      {/* ══ PANDUAN (belum search) ══ */}
      {!searched && !loading && (
        <FlatList
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          data={[]}
          keyExtractor={() => ''}
          renderItem={null}
          ListHeaderComponent={
            <View>
              {/* Quick search chips */}
              <View style={styles.quickSection}>
                <View style={styles.quickHeader}>
                  <Ionicons name="flash-outline" size={15} color="#F59E0B" />
                  <Text style={styles.quickTitle}>Pencarian Cepat</Text>
                </View>
                <View style={styles.quickGrid}>
                  {QUICK_SEARCHES.map((q, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.quickChip, { backgroundColor: q.bg }]}
                      onPress={() => handleQuickSearch(q.keyword)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.quickChipIcon, { backgroundColor: q.color + '20' }]}>
                        <Ionicons name={q.icon as any} size={14} color={q.color} />
                      </View>
                      <Text style={[styles.quickChipText, { color: q.color }]}>{q.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Tips */}
              <View style={styles.tipsSection}>
                <View style={styles.tipsHeader}>
                  <Ionicons name="bulb-outline" size={15} color="#8B5CF6" />
                  <Text style={styles.tipsTitle}>Tips Pencarian</Text>
                </View>
                {TIPS.map((tip, i) => (
                  <View key={i} style={[styles.tipRow, i === TIPS.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={[styles.tipIconBox, { backgroundColor: tip.color + '15' }]}>
                      <Ionicons name={tip.icon as any} size={13} color={tip.color} />
                    </View>
                    <Text style={styles.tipText}>{tip.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 32 }}
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
  headerDec1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)', top: -70, right: -40 },
  headerDec2: { position: 'absolute', width: 120, height: 120, borderRadius: 60,  backgroundColor: 'rgba(255,255,255,0.04)', bottom: -20, left: 40 },
  headerTitle:{ color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  headerSub:  { color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 3, marginBottom: 16 },

  // Search
  searchRow:   { flexDirection: 'row', gap: 10, alignItems: 'center' },
  searchBox:   { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '500' },
  cariBtn:     { width: 46, height: 46, borderRadius: 14, overflow: 'hidden' },
  cariBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Deteksi urusan
  deteksiBox:        { paddingHorizontal: 16, paddingTop: 12 },
  deteksiInner:      { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#FEF3C7' },
  deteksiIconBox:    { width: 28, height: 28, borderRadius: 8, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  deteksiLabel:      { fontSize: 10, color: '#D97706', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  deteksiValue:      { fontSize: 13, color: '#92400E', fontWeight: '700', marginTop: 1 },
  deteksiKeyword:    { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  deteksiKeywordText:{ fontSize: 11, color: '#D97706', fontWeight: '700' },

  // Loading
  loadingBox:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },

  // Result list
  list:          { padding: 16, gap: 10, paddingBottom: 32 },
  resultHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  resultCountBox:{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  resultCount:   { fontSize: 12, color: '#15803D', fontWeight: '700' },
  resultQuery:   { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },

  // Card
  card:        { backgroundColor: '#fff', borderRadius: 18, flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12, ...SHADOW.sm },
  cardDocIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardBody:    { flex: 1 },
  cardTopRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  nomorRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nomor:       { fontSize: 11, color: '#3B82F6', fontWeight: '700', letterSpacing: 0.2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  statusDot:   { width: 5, height: 5, borderRadius: 3 },
  statusText:  { fontSize: 10, fontWeight: '800' },
  judul:       { fontSize: 13, fontWeight: '700', color: '#1E293B', lineHeight: 18, marginBottom: 6 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 },
  metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: 110 },
  metaText:    { fontSize: 10, color: '#94A3B8', fontWeight: '500' },
  urusanBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F5F3FF', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  urusanText:  { fontSize: 10, color: '#8B5CF6', fontWeight: '700' },

  // Empty
  empty:          { alignItems: 'center', paddingTop: 50, gap: 12 },
  emptyIconBox:   { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
  emptyTitle:     { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  emptySubtitle:  { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
  emptyResetBtn:  { backgroundColor: '#EFF6FF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 4 },
  emptyResetText: { color: '#3B82F6', fontWeight: '700', fontSize: 13 },

  // Quick searches
  quickSection: { backgroundColor: '#fff', margin: 16, marginBottom: 0, borderRadius: 20, padding: 18, ...SHADOW.sm },
  quickHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  quickTitle:   { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  quickGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickChip:    { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14 },
  quickChipIcon:{ width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  quickChipText:{ fontSize: 12, fontWeight: '700' },

  // Tips
  tipsSection: { backgroundColor: '#fff', margin: 16, marginTop: 12, borderRadius: 20, padding: 18, ...SHADOW.sm },
  tipsHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  tipsTitle:   { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  tipRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  tipIconBox:  { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  tipText:     { fontSize: 13, color: '#475569', flex: 1, fontWeight: '500', lineHeight: 18 },
})
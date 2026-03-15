// ======================================================
// FILE: mobile/src/screens/UrusanScreen.tsx
// ======================================================

import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput, Modal,
  Alert, Animated, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../hooks/useAuth'
import { COLORS, SHADOW, RADIUS, SPACING } from '../utils/theme'

const BASE = 'https://arsip-digital-ntt-apk.vercel.app/api'

async function apiReq(path: string, method = 'GET', body?: any, token?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

type Urusan = {
  id: number
  kodeUrusan: string
  namaUrusan: string
  deskripsi?: string
  keywords: string[]
  _count?: { archives: number }
}

const WARNA_KODE: Record<string, [string, string]> = {
  '1': ['#3B82F6', '#1D4ED8'],
  '2': ['#10B981', '#059669'],
  '3': ['#F59E0B', '#D97706'],
  '4': ['#8B5CF6', '#7C3AED'],
  '5': ['#EF4444', '#DC2626'],
  '6': ['#06B6D4', '#0891B2'],
  '7': ['#F97316', '#EA580C'],
  '8': ['#EC4899', '#DB2777'],
  '9': ['#84CC16', '#65A30D'],
}

function getGradient(kode: string): [string, string] {
  const prefix = kode.charAt(0)
  return WARNA_KODE[prefix] ?? ['#64748B', '#475569']
}

export default function UrusanScreen() {
  const { token, user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'

  const [data,       setData]       = useState<Urusan[]>([])
  const [filtered,   setFiltered]   = useState<Urusan[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search,     setSearch]     = useState('')

  // Modal states
  const [showModal,  setShowModal]  = useState(false)
  const [editItem,   setEditItem]   = useState<Urusan | null>(null)
  const [saving,     setSaving]     = useState(false)

  // Form fields
  const [fKode,      setFKode]      = useState('')
  const [fNama,      setFNama]      = useState('')
  const [fDeskripsi, setFDeskripsi] = useState('')
  const [fKeywords,  setFKeywords]  = useState('')

  const fadeAnim = useState(new Animated.Value(0))[0]

  const load = useCallback(async () => {
    try {
      const res = await apiReq('/urusan', 'GET', undefined, token ?? undefined)
      const list: Urusan[] = res.data ?? res ?? []
      setData(list)
      setFiltered(list)
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!search.trim()) { setFiltered(data); return }
    const q = search.toLowerCase()
    setFiltered(data.filter(u =>
      u.kodeUrusan.toLowerCase().includes(q) ||
      u.namaUrusan.toLowerCase().includes(q) ||
      u.keywords?.some(k => k.toLowerCase().includes(q))
    ))
  }, [search, data])

  function openAdd() {
    setEditItem(null)
    setFKode(''); setFNama(''); setFDeskripsi(''); setFKeywords('')
    setShowModal(true)
  }

  function openEdit(item: Urusan) {
    setEditItem(item)
    setFKode(item.kodeUrusan)
    setFNama(item.namaUrusan)
    setFDeskripsi(item.deskripsi ?? '')
    setFKeywords(item.keywords?.join(', ') ?? '')
    setShowModal(true)
  }

  async function handleSave() {
    if (!fKode.trim() || !fNama.trim()) {
      Alert.alert('Peringatan', 'Kode urusan dan nama wajib diisi'); return
    }
    setSaving(true)
    try {
      const payload = {
        kodeUrusan: fKode.trim(),
        namaUrusan: fNama.trim(),
        deskripsi:  fDeskripsi.trim() || null,
        keywords:   fKeywords.split(',').map(k => k.trim()).filter(Boolean),
      }
      let res
      if (editItem) {
        res = await apiReq(`/urusan/${editItem.id}`, 'PUT', payload, token ?? undefined)
      } else {
        res = await apiReq('/urusan', 'POST', payload, token ?? undefined)
      }
      if (res.success || res.data) {
        Alert.alert('Berhasil ✅', editItem ? 'Urusan berhasil diperbarui' : 'Urusan berhasil ditambahkan')
        setShowModal(false)
        load()
      } else {
        Alert.alert('Gagal', res.message ?? 'Terjadi kesalahan')
      }
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item: Urusan) {
    Alert.alert(
      'Hapus Urusan',
      `Yakin hapus "${item.namaUrusan}"?\n\nArsip terkait (${item._count?.archives ?? 0}) tidak akan terhapus.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus', style: 'destructive',
          onPress: async () => {
            try {
              await apiReq(`/urusan/${item.id}`, 'DELETE', undefined, token ?? undefined)
              setData(prev => prev.filter(u => u.id !== item.id))
            } catch (e: any) { Alert.alert('Error', e.message) }
          },
        },
      ]
    )
  }

  const renderItem = ({ item, index }: { item: Urusan; index: number }) => {
    const grad = getGradient(item.kodeUrusan)
    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={s.card}>
          {/* Kode badge */}
          <LinearGradient colors={grad} style={s.kodeBadge}>
            <Text style={s.kodeText}>{item.kodeUrusan}</Text>
          </LinearGradient>

          <View style={s.cardBody}>
            <Text style={s.namaText}>{item.namaUrusan}</Text>

            {item.deskripsi ? (
              <Text style={s.deskripsiText} numberOfLines={2}>{item.deskripsi}</Text>
            ) : null}

            {/* Keywords */}
            {item.keywords?.length > 0 && (
              <View style={s.keywordsRow}>
                <Ionicons name="pricetag-outline" size={10} color="#94A3B8" />
                <Text style={s.keywordsText} numberOfLines={1}>
                  {item.keywords.slice(0, 4).join(' · ')}
                  {item.keywords.length > 4 ? ` +${item.keywords.length - 4}` : ''}
                </Text>
              </View>
            )}

            {/* Archive count */}
            <View style={s.countRow}>
              <View style={s.countBadge}>
                <Ionicons name="folder-outline" size={10} color="#3B82F6" />
                <Text style={s.countText}>{item._count?.archives ?? 0} arsip</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          {isSuperAdmin && (
            <View style={s.actions}>
              <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)} activeOpacity={0.8}>
                <Ionicons name="create-outline" size={16} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item)} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
    )
  }

  return (
    <View style={s.root}>

      {/* ══ HEADER ══ */}
      <LinearGradient colors={['#1E293B', '#0F172A']} style={s.header}>
        <View style={s.headerDec1} />
        <View style={s.headerDec2} />
        <View style={s.headerTop}>
          <View>
            <Text style={s.headerTitle}>Manajemen Urusan</Text>
            <Text style={s.headerSub}>{data.length} urusan terdaftar</Text>
          </View>
          {isSuperAdmin && (
            <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.85}>
              <LinearGradient colors={['#3B82F6', '#2563EB']} style={s.addBtnGrad}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={s.addBtnText}>Tambah</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Search */}
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color="#64748B" />
          <TextInput
            style={s.searchInput}
            placeholder="Cari kode, nama, atau keyword..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ══ STATS STRIP ══ */}
      <View style={s.statsStrip}>
        {[
          { label: 'Total Urusan', value: data.length,                                     color: '#3B82F6', icon: 'list-outline' },
          { label: 'Total Arsip',  value: data.reduce((a, u) => a + (u._count?.archives ?? 0), 0), color: '#10B981', icon: 'folder-outline' },
          { label: 'Hasil Filter', value: filtered.length,                                  color: '#F59E0B', icon: 'filter-outline' },
        ].map((st, i) => (
          <View key={i} style={s.statItem}>
            <View style={[s.statIcon, { backgroundColor: st.color + '15' }]}>
              <Ionicons name={st.icon as any} size={14} color={st.color} />
            </View>
            <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        ))}
      </View>

      {/* ══ LIST ══ */}
      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={s.loadingText}>Memuat data urusan...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#3B82F6" />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={s.emptyIcon}>
                <Ionicons name="list-outline" size={40} color="#93C5FD" />
              </LinearGradient>
              <Text style={s.emptyTitle}>
                {search ? 'Urusan Tidak Ditemukan' : 'Belum Ada Urusan'}
              </Text>
              <Text style={s.emptySubtitle}>
                {search ? `Tidak ada hasil untuk "${search}"` : 'Tambah urusan baru dengan tombol di atas'}
              </Text>
            </View>
          }
        />
      )}

      {/* ══════════════════════════════════════
          MODAL: TAMBAH / EDIT URUSAN
      ══════════════════════════════════════ */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              {/* Handle */}
              <View style={s.modalHandle} />

              {/* Header */}
              <View style={s.modalHeader}>
                <LinearGradient
                  colors={editItem ? ['#FFF7ED', '#FEF3C7'] : ['#EFF6FF', '#DBEAFE']}
                  style={s.modalIconBox}
                >
                  <Ionicons
                    name={editItem ? 'create-outline' : 'add-circle-outline'}
                    size={20}
                    color={editItem ? '#D97706' : '#3B82F6'}
                  />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={s.modalTitle}>{editItem ? 'Edit Urusan' : 'Tambah Urusan'}</Text>
                  <Text style={s.modalSub}>{editItem ? `Memperbarui: ${editItem.kodeUrusan}` : 'Isi data urusan baru'}</Text>
                </View>
                <TouchableOpacity style={s.modalClose} onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                {/* Kode Urusan */}
                <FormField
                  label="Kode Urusan"
                  value={fKode}
                  onChangeText={setFKode}
                  placeholder="Contoh: 800, 300, 400"
                  icon="barcode-outline"
                  iconColor="#3B82F6"
                  keyboardType="default"
                  required
                />

                {/* Nama Urusan */}
                <FormField
                  label="Nama Urusan"
                  value={fNama}
                  onChangeText={setFNama}
                  placeholder="Contoh: Kepegawaian, Keuangan"
                  icon="bookmark-outline"
                  iconColor="#10B981"
                  required
                />

                {/* Deskripsi */}
                <FormField
                  label="Deskripsi"
                  value={fDeskripsi}
                  onChangeText={setFDeskripsi}
                  placeholder="Keterangan singkat urusan ini..."
                  icon="document-text-outline"
                  iconColor="#8B5CF6"
                  multiline
                />

                {/* Keywords */}
                <FormField
                  label="Keywords (pisah dengan koma)"
                  value={fKeywords}
                  onChangeText={setFKeywords}
                  placeholder="Contoh: pegawai, sdm, rekrutmen, gaji"
                  icon="pricetag-outline"
                  iconColor="#F59E0B"
                  multiline
                />

                {/* Preview keywords */}
                {fKeywords.trim() !== '' && (
                  <View style={s.keywordPreview}>
                    <Text style={s.keywordPreviewLabel}>Preview Keywords:</Text>
                    <View style={s.keywordChips}>
                      {fKeywords.split(',').map(k => k.trim()).filter(Boolean).map((k, i) => (
                        <View key={i} style={s.keywordChip}>
                          <Text style={s.keywordChipText}>{k}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Footer buttons */}
              <View style={s.modalFooter}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setShowModal(false)}>
                  <Text style={s.cancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveBtn, saving && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={editItem ? ['#F59E0B', '#D97706'] : ['#3B82F6', '#2563EB']}
                    style={s.saveBtnGrad}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    {saving
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <>
                          <Ionicons name={editItem ? 'checkmark-circle' : 'add-circle'} size={16} color="#fff" />
                          <Text style={s.saveText}>{editItem ? 'Simpan Perubahan' : 'Tambah Urusan'}</Text>
                        </>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

// ─── FORM FIELD COMPONENT ────────────────────────────
function FormField({ label, value, onChangeText, placeholder, icon, iconColor, multiline, keyboardType, required }: {
  label: string; value: string; onChangeText: (v: string) => void
  placeholder?: string; icon: any; iconColor: string
  multiline?: boolean; keyboardType?: any; required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={s.formField}>
      <View style={s.formLabelRow}>
        <View style={[s.formLabelIcon, { backgroundColor: iconColor + '15' }]}>
          <Ionicons name={icon} size={11} color={iconColor} />
        </View>
        <Text style={s.formLabel}>{label}</Text>
        {required && <Text style={s.formRequired}>*</Text>}
      </View>
      <TextInput
        style={[s.formInput, multiline && s.formInputMulti, focused && s.formInputFocused]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#CBD5E1"
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        textAlignVertical={multiline ? 'top' : 'auto'}
      />
    </View>
  )
}

// ─── STYLES ──────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },

  // Header
  header:     { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, overflow: 'hidden' },
  headerDec1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)', top: -60, right: -40 },
  headerDec2: { position: 'absolute', width: 120, height: 120, borderRadius: 60,  backgroundColor: 'rgba(255,255,255,0.04)', bottom: -10, left: 30 },
  headerTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerTitle:{ color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  headerSub:  { color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 3 },

  addBtn:     { borderRadius: 12, overflow: 'hidden' },
  addBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '500' },

  // Stats
  statsStrip: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: -1, borderRadius: 16, padding: 14, ...SHADOW.sm },
  statItem:   { flex: 1, alignItems: 'center', gap: 4 },
  statIcon:   { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statValue:  { fontSize: 20, fontWeight: '800' },
  statLabel:  { fontSize: 10, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },

  // List
  list:       { padding: 16, gap: 10, paddingBottom: 32 },

  // Card
  card:       { backgroundColor: '#fff', borderRadius: 18, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, ...SHADOW.sm },
  kodeBadge:  { width: 54, height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  kodeText:   { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  cardBody:   { flex: 1 },
  namaText:   { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  deskripsiText:{ fontSize: 11, color: '#64748B', lineHeight: 16, marginBottom: 4 },
  keywordsRow:{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  keywordsText:{ fontSize: 10, color: '#94A3B8', flex: 1 },
  countRow:   { flexDirection: 'row' },
  countBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  countText:  { fontSize: 10, color: '#3B82F6', fontWeight: '700' },

  actions:    { flexDirection: 'column', gap: 6 },
  editBtn:    { width: 34, height: 34, borderRadius: 10, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  deleteBtn:  { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },

  // Loading / Empty
  loadingBox:   { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:  { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  empty:        { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon:    { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
  emptyTitle:   { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  emptySubtitle:{ fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 32 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  modalHandle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 20 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  modalIconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalTitle:   { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  modalSub:     { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  modalClose:   { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  modalFooter:  { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn:    { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelText:   { color: '#64748B', fontWeight: '700', fontSize: 14 },
  saveBtn:      { flex: 2, borderRadius: 14, overflow: 'hidden' },
  saveBtnGrad:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  saveText:     { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Form fields
  formField:       { marginBottom: 14 },
  formLabelRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  formLabelIcon:   { width: 20, height: 20, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  formLabel:       { fontSize: 12, fontWeight: '700', color: '#475569', flex: 1 },
  formRequired:    { fontSize: 12, color: '#EF4444', fontWeight: '800' },
  formInput:       { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#1E293B', backgroundColor: '#F8FAFC' },
  formInputFocused:{ borderColor: '#3B82F6', backgroundColor: '#fff' },
  formInputMulti:  { height: 80, textAlignVertical: 'top' },

  // Keyword preview
  keywordPreview:     { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 14 },
  keywordPreviewLabel:{ fontSize: 11, color: '#94A3B8', fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  keywordChips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  keywordChip:        { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  keywordChipText:    { fontSize: 12, color: '#3B82F6', fontWeight: '600' },
})
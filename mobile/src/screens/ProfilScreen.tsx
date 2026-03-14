// ======================================================
// FILE: mobile/src/screens/ProfilScreen.tsx
// ======================================================

import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../hooks/useAuth'
import { COLORS, SHADOW, RADIUS, SPACING, ROLE_LABEL, ROLE_COLOR } from '../utils/theme'
import { RootStackParams } from '../navigation/types'

type Nav = NativeStackNavigationProp<RootStackParams>

export default function ProfilScreen() {
  const { user, logout } = useAuth()
  const navigation       = useNavigation<Nav>()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    Alert.alert('Logout', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true)
          await logout()
        },
      },
    ])
  }

  const canUpload   = user?.role === 'super_admin' || user?.role === 'admin_unit'
  const canAssess   = ['super_admin', 'pimpinan', 'dinas_arsip'].includes(user?.role ?? '')
  const isSuperAdmin = user?.role === 'super_admin'

  const menus = [
    canUpload   && { icon: 'cloud-upload-outline', label: 'Upload Arsip Baru', onPress: () => navigation.navigate('UploadArsip'), color: COLORS.primary },
    canAssess   && { icon: 'clipboard-outline',    label: 'Penilaian Arsip',   onPress: () => navigation.navigate('Penilaian'),   color: COLORS.info },
                   { icon: 'notifications-outline', label: 'Notifikasi',        onPress: () => navigation.navigate('Notifikasi'),  color: COLORS.accent },
  ].filter(Boolean) as any[]

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {user?.namaLengkap?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.nama}>{user?.namaLengkap}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: ROLE_COLOR[user?.role ?? ''] + '33' }]}>
          <Text style={[styles.roleText, { color: ROLE_COLOR[user?.role ?? ''] }]}>
            {ROLE_LABEL[user?.role ?? '']}
          </Text>
        </View>
        {user?.unit && (
          <Text style={styles.unit}>{user.unit.namaUnit}</Text>
        )}
      </View>

      {/* Info */}
      <View style={[styles.section, SHADOW.sm]}>
        <Text style={styles.sectionTitle}>Informasi Akun</Text>
        {[
          { label: 'Username',   value: user?.username },
          { label: 'Email',      value: user?.email },
          { label: 'Role',       value: ROLE_LABEL[user?.role ?? ''] },
          { label: 'Unit',       value: user?.unit?.namaUnit ?? '-' },
        ].map(({ label, value }) => (
          <View key={label} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Menu */}
      <View style={[styles.section, SHADOW.sm]}>
        <Text style={styles.sectionTitle}>Menu</Text>
        {menus.map((m, i) => (
          <TouchableOpacity key={i} style={styles.menuRow} onPress={m.onPress}>
            <View style={[styles.menuIcon, { backgroundColor: m.color + '18' }]}>
              <Ionicons name={m.icon} size={20} color={m.color} />
            </View>
            <Text style={styles.menuLabel}>{m.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Akses berdasarkan role */}
      <View style={[styles.section, SHADOW.sm]}>
        <Text style={styles.sectionTitle}>Hak Akses Anda</Text>
        {[
          { label: 'Lihat Arsip',      ok: true },
          { label: 'Lihat Laporan',    ok: true },
          { label: 'Upload Arsip',     ok: canUpload },
          { label: 'Edit / Hapus Arsip', ok: isSuperAdmin },
          { label: 'Penilaian Arsip',  ok: canAssess },
          { label: 'Kelola User',      ok: isSuperAdmin },
          { label: 'Semua Fitur',      ok: isSuperAdmin },
        ].map(({ label, ok }) => (
          <View key={label} style={styles.hakRow}>
            <Ionicons
              name={ok ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={ok ? COLORS.success : COLORS.disabled}
            />
            <Text style={[styles.hakText, !ok && { color: COLORS.disabled }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={loggingOut}>
        {loggingOut
          ? <ActivityIndicator color={COLORS.danger} />
          : <>
              <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
              <Text style={styles.logoutText}>Keluar</Text>
            </>
        }
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  header:       { backgroundColor: COLORS.primaryDark, alignItems: 'center', padding: SPACING.xl, paddingTop: 56 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  avatarText:   { color: COLORS.white, fontSize: 28, fontWeight: '700' },
  nama:         { color: COLORS.white, fontSize: 20, fontWeight: '700' },
  email:        { color: COLORS.placeholder, fontSize: 13, marginTop: 2 },
  roleBadge:    { paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.full, marginTop: SPACING.sm },
  roleText:     { fontSize: 13, fontWeight: '700' },
  unit:         { color: COLORS.placeholder, fontSize: 12, marginTop: 4 },
  section:      { backgroundColor: COLORS.white, margin: SPACING.lg, marginBottom: 0, borderRadius: RADIUS.lg, padding: SPACING.lg },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel:    { fontSize: 13, color: COLORS.muted },
  infoValue:    { fontSize: 13, color: COLORS.text, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  menuRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, gap: SPACING.md },
  menuIcon:     { width: 40, height: 40, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  menuLabel:    { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '600' },
  hakRow:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 6 },
  hakText:      { fontSize: 13, color: COLORS.text },
  logoutBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, margin: SPACING.lg, marginTop: SPACING.xl, padding: SPACING.md, backgroundColor: COLORS.dangerSoft, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.danger },
  logoutText:   { color: COLORS.danger, fontSize: 15, fontWeight: '700' },
})
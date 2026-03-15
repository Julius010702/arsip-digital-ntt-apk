// ======================================================
// FILE: mobile/src/screens/ProfilScreen.tsx
// ======================================================

import React, { useState, useEffect } from 'react'
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, Modal, FlatList, Switch,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../hooks/useAuth'
import { COLORS, SHADOW, RADIUS, SPACING, ROLE_LABEL, ROLE_COLOR } from '../utils/theme'
import { RootStackParams } from '../navigation/types'

const BASE = 'https://arsip-digital-ntt-apk.vercel.app/api'

type Nav = NativeStackNavigationProp<RootStackParams>

async function apiRequest(path: string, method = 'GET', body?: any, token?: string) {
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

export default function ProfilScreen() {
  const { user, logout, token } = useAuth()
  const navigation = useNavigation<Nav>()
  const [loggingOut, setLoggingOut] = useState(false)
  const isSuperAdmin = user?.role === 'super_admin'
  const [avatarUri, setAvatarUri] = useState<string | null>(null)

  // Modals
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [showEditUser, setShowEditUser]             = useState(false)

  // Change password
  const [oldPassword,  setOldPassword]  = useState('')
  const [newPassword,  setNewPassword]  = useState('')
  const [confirmPass,  setConfirmPass]  = useState('')
  const [savingPass,   setSavingPass]   = useState(false)
  const [showOld,      setShowOld]      = useState(false)
  const [showNew,      setShowNew]      = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)

  // User management
  const [users,        setUsers]        = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [editPassword, setEditPassword] = useState('')
  const [savingUser,   setSavingUser]   = useState(false)

  async function loadUsers() {
    setLoadingUsers(true)
    try {
      const res = await apiRequest('/users', 'GET', undefined, token ?? undefined)
      setUsers(res.data ?? [])
    } catch (e) { console.error(e) }
    finally { setLoadingUsers(false) }
  }

  async function handleChangePassword() {
    if (!oldPassword || !newPassword || !confirmPass) {
      Alert.alert('Peringatan', 'Semua field wajib diisi'); return
    }
    if (newPassword !== confirmPass) {
      Alert.alert('Peringatan', 'Konfirmasi password tidak cocok'); return
    }
    if (newPassword.length < 6) {
      Alert.alert('Peringatan', 'Password minimal 6 karakter'); return
    }
    setSavingPass(true)
    try {
      const res = await apiRequest('/auth/me', 'PUT', { oldPassword, newPassword }, token ?? undefined)
      if (res.success) {
        Alert.alert('Berhasil ✅', 'Password berhasil diubah')
        setShowChangePassword(false)
        setOldPassword(''); setNewPassword(''); setConfirmPass('')
      } else {
        Alert.alert('Gagal', res.message ?? 'Terjadi kesalahan')
      }
    } catch (e) { Alert.alert('Error', 'Terjadi kesalahan') }
    finally { setSavingPass(false) }
  }

  async function handleToggleUserStatus(userId: number, currentStatus: boolean) {
    try {
      await apiRequest(`/users/${userId}`, 'PUT', { status: !currentStatus }, token ?? undefined)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: !currentStatus } : u))
    } catch (e) { Alert.alert('Error', 'Gagal mengubah status') }
  }

  async function handleResetPassword() {
    if (!editPassword || editPassword.length < 6) {
      Alert.alert('Peringatan', 'Password minimal 6 karakter'); return
    }
    setSavingUser(true)
    try {
      const res = await apiRequest(`/users/${selectedUser.id}`, 'PUT', { password: editPassword }, token ?? undefined)
      if (res.success) {
        Alert.alert('Berhasil ✅', `Password ${selectedUser.namaLengkap} berhasil direset`)
        setShowEditUser(false)
        setEditPassword('')
      } else {
        Alert.alert('Gagal', res.message ?? 'Terjadi kesalahan')
      }
    } catch (e) { Alert.alert('Error', 'Terjadi kesalahan') }
    finally { setSavingUser(false) }
  }

  async function handleDeleteUser(userId: number, nama: string) {
    Alert.alert('Hapus User', `Yakin ingin menghapus ${nama}?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/users/${userId}`, 'DELETE', undefined, token ?? undefined)
            setUsers(prev => prev.filter(u => u.id !== userId))
          } catch (e) { Alert.alert('Error', 'Gagal menghapus user') }
        },
      },
    ])
  }

  function handleLogout() {
    Alert.alert('Logout', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: async () => { setLoggingOut(true); await logout() } },
    ])
  }

  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Izin Diperlukan', 'Izinkan akses galeri untuk mengubah foto profil'); return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri)
      Alert.alert('Berhasil ✅', 'Foto profil berhasil diperbarui')
    }
  }

  const canUpload  = user?.role === 'super_admin' || user?.role === 'admin_unit'
  const canAssess  = ['super_admin', 'pimpinan', 'dinas_arsip'].includes(user?.role ?? '')
  const roleColor  = ROLE_COLOR[user?.role ?? ''] ?? COLORS.primary

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── HEADER PROFIL ── */}
      <View style={styles.header}>
        <TouchableOpacity style={[styles.avatarRing, { borderColor: roleColor }]} onPress={handlePickAvatar} activeOpacity={0.8}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarCircle, { backgroundColor: roleColor }]}>
              <Text style={styles.avatarText}>{user?.namaLengkap?.charAt(0)?.toUpperCase() ?? '?'}</Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <Ionicons name="camera" size={12} color={COLORS.white} />
          </View>
        </TouchableOpacity>
        <Text style={styles.nama}>{user?.namaLengkap}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: roleColor + '33' }]}>
          <Ionicons name="shield-checkmark" size={12} color={roleColor} />
          <Text style={[styles.roleText, { color: roleColor }]}>{ROLE_LABEL[user?.role ?? ''] ?? user?.role}</Text>
        </View>
        {user?.unit && (
          <View style={styles.unitBadge}>
            <Ionicons name="business-outline" size={12} color={COLORS.placeholder} />
            <Text style={styles.unitText}>{user.unit.namaUnit}</Text>
          </View>
        )}
      </View>

      {/* ── INFO AKUN ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person-circle-outline" size={18} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Informasi Akun</Text>
        </View>
        {[
          { label: 'Username', value: user?.username,                      icon: 'at-outline' },
          { label: 'Email',    value: user?.email,                         icon: 'mail-outline' },
          { label: 'Role',     value: ROLE_LABEL[user?.role ?? ''],        icon: 'ribbon-outline' },
          { label: 'Unit',     value: user?.unit?.namaUnit ?? 'Semua Unit', icon: 'business-outline' },
          { label: 'Status',   value: user?.status ? 'Aktif' : 'Nonaktif', icon: 'pulse-outline' },
        ].map(({ label, value, icon }) => (
          <View key={label} style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name={icon as any} size={15} color={COLORS.muted} />
              <Text style={styles.infoLabel}>{label}</Text>
            </View>
            <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
          </View>
        ))}
      </View>

      {/* ── MENU AKSI ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="apps-outline" size={18} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Menu</Text>
        </View>

        <TouchableOpacity style={styles.menuRow} onPress={() => setShowChangePassword(true)}>
          <View style={[styles.menuIcon, { backgroundColor: COLORS.primarySoft }]}>
            <Ionicons name="key-outline" size={18} color={COLORS.primaryLight} />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Ubah Password</Text>
            <Text style={styles.menuSub}>Perbarui password akun Anda</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
        </TouchableOpacity>

        {canUpload && (
          <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate('UploadArsip')}>
            <View style={[styles.menuIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="cloud-upload-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Upload Arsip</Text>
              <Text style={styles.menuSub}>Tambah arsip baru ke sistem</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
          </TouchableOpacity>
        )}

        {canAssess && (
          <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate('Penilaian')}>
            <View style={[styles.menuIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="clipboard-outline" size={18} color={COLORS.success} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Penilaian Arsip</Text>
              <Text style={styles.menuSub}>Kelola usulan penilaian arsip</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate('Notifikasi')}>
          <View style={[styles.menuIcon, { backgroundColor: '#FFF7ED' }]}>
            <Ionicons name="notifications-outline" size={18} color={COLORS.warning} />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Notifikasi</Text>
            <Text style={styles.menuSub}>Lihat semua notifikasi sistem</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      {/* ── SUPER ADMIN: MANAJEMEN USER ── */}
      {isSuperAdmin && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={18} color={COLORS.danger} />
            <Text style={[styles.sectionTitle, { color: COLORS.danger }]}>Admin Panel</Text>
          </View>

          <TouchableOpacity
            style={[styles.menuRow, { borderColor: COLORS.danger + '30', borderWidth: 1, borderRadius: RADIUS.md }]}
            onPress={() => { loadUsers(); setShowUserManagement(true) }}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="people" size={18} color={COLORS.danger} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuLabel, { color: COLORS.danger }]}>Manajemen Pengguna</Text>
              <Text style={styles.menuSub}>Kelola akun, reset password, aktif/nonaktif</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── HAK AKSES ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="lock-closed-outline" size={18} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Hak Akses</Text>
        </View>
        {[
          { label: 'Lihat Arsip',        ok: true },
          { label: 'Lihat Laporan',      ok: true },
          { label: 'Upload Arsip',       ok: canUpload },
          { label: 'Edit / Hapus Arsip', ok: isSuperAdmin },
          { label: 'Penilaian Arsip',    ok: canAssess },
          { label: 'Kelola User',        ok: isSuperAdmin },
        ].map(({ label, ok }) => (
          <View key={label} style={styles.hakRow}>
            <View style={[styles.hakDot, { backgroundColor: ok ? COLORS.success : COLORS.disabled }]}>
              <Ionicons name={ok ? 'checkmark' : 'close'} size={10} color={COLORS.white} />
            </View>
            <Text style={[styles.hakText, !ok && styles.hakTextDisabled]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* ── LOGOUT ── */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={loggingOut}>
        {loggingOut
          ? <ActivityIndicator color={COLORS.danger} />
          : <>
              <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
              <Text style={styles.logoutText}>Keluar dari Akun</Text>
            </>
        }
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* ══════════════════════════════════════
          MODAL: UBAH PASSWORD
      ══════════════════════════════════════ */}
      <Modal visible={showChangePassword} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ubah Password</Text>
              <TouchableOpacity onPress={() => setShowChangePassword(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <PasswordField label="Password Lama" value={oldPassword} onChangeText={setOldPassword} show={showOld} onToggle={() => setShowOld(!showOld)} />
            <PasswordField label="Password Baru" value={newPassword} onChangeText={setNewPassword} show={showNew} onToggle={() => setShowNew(!showNew)} />
            <PasswordField label="Konfirmasi Password" value={confirmPass} onChangeText={setConfirmPass} show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />

            {newPassword.length > 0 && newPassword !== confirmPass && (
              <View style={styles.errorBox}>
                <Ionicons name="warning-outline" size={14} color={COLORS.danger} />
                <Text style={styles.errorText}>Password tidak cocok</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.modalBtn, savingPass && { opacity: 0.7 }]}
              onPress={handleChangePassword}
              disabled={savingPass}
            >
              {savingPass
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.modalBtnText}>Simpan Password</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════
          MODAL: MANAJEMEN USER
      ══════════════════════════════════════ */}
      <Modal visible={showUserManagement} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manajemen Pengguna</Text>
              <TouchableOpacity onPress={() => setShowUserManagement(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {loadingUsers ? (
              <ActivityIndicator color={COLORS.primary} style={{ padding: 32 }} />
            ) : (
              <FlatList
                data={users}
                keyExtractor={u => String(u.id)}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.userRow}>
                    <View style={[styles.userAvatar, { backgroundColor: (ROLE_COLOR[item.role] ?? COLORS.primary) + '22' }]}>
                      <Text style={[styles.userAvatarText, { color: ROLE_COLOR[item.role] ?? COLORS.primary }]}>
                        {item.namaLengkap?.charAt(0)?.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName} numberOfLines={1}>{item.namaLengkap}</Text>
                      <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
                      <View style={[styles.userRoleBadge, { backgroundColor: (ROLE_COLOR[item.role] ?? COLORS.primary) + '22' }]}>
                        <Text style={[styles.userRoleText, { color: ROLE_COLOR[item.role] ?? COLORS.primary }]}>
                          {ROLE_LABEL[item.role] ?? item.role}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.userActions}>
                      <Switch
                        value={item.status}
                        onValueChange={() => handleToggleUserStatus(item.id, item.status)}
                        trackColor={{ false: COLORS.disabled, true: COLORS.success + '88' }}
                        thumbColor={item.status ? COLORS.success : COLORS.muted}
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                      />
                      <TouchableOpacity
                        style={styles.userEditBtn}
                        onPress={() => { setSelectedUser(item); setShowEditUser(true) }}
                      >
                        <Ionicons name="key-outline" size={16} color={COLORS.primaryLight} />
                      </TouchableOpacity>
                      {item.id !== user?.id && (
                        <TouchableOpacity
                          style={styles.userDeleteBtn}
                          onPress={() => handleDeleteUser(item.id, item.namaLengkap)}
                        >
                          <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: COLORS.border }} />}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════
          MODAL: RESET PASSWORD USER
      ══════════════════════════════════════ */}
      <Modal visible={showEditUser} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity onPress={() => { setShowEditUser(false); setEditPassword('') }}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.selectedUserBox}>
              <Ionicons name="person-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.selectedUserName}>{selectedUser?.namaLengkap}</Text>
            </View>

            <PasswordField label="Password Baru" value={editPassword} onChangeText={setEditPassword} show={showNew} onToggle={() => setShowNew(!showNew)} />

            <TouchableOpacity
              style={[styles.modalBtn, savingUser && { opacity: 0.7 }]}
              onPress={handleResetPassword}
              disabled={savingUser}
            >
              {savingUser
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.modalBtnText}>Reset Password</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  )
}

// ─── HELPER COMPONENT ────────────────────────────────
function PasswordField({ label, value, onChangeText, show, onToggle }: {
  label: string; value: string; onChangeText: (v: string) => void
  show: boolean; onToggle: () => void
}) {
  return (
    <View style={styles.passFieldWrap}>
      <Text style={styles.passLabel}>{label}</Text>
      <View style={styles.passInputRow}>
        <TextInput
          style={styles.passInput}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          placeholder="••••••••"
          placeholderTextColor={COLORS.placeholder}
        />
        <TouchableOpacity onPress={onToggle}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.muted} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background },

  // Header
  header:         { backgroundColor: COLORS.primaryDark, alignItems: 'center', paddingTop: 56, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.xl },
  avatarRing:     { width: 84, height: 84, borderRadius: 42, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  avatarImage:    { width: 72, height: 72, borderRadius: 36 },
  avatarCircle:   { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  avatarEditBadge:{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primaryDark },
  avatarText:     { color: COLORS.white, fontSize: 28, fontWeight: '800' },
  nama:           { color: COLORS.white, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  email:          { color: COLORS.placeholder, fontSize: 13, marginTop: 2 },
  roleBadge:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.full, marginTop: SPACING.sm },
  roleText:       { fontSize: 12, fontWeight: '700' },
  unitBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  unitText:       { color: COLORS.placeholder, fontSize: 12 },

  // Section
  section:        { backgroundColor: COLORS.white, margin: SPACING.lg, marginBottom: 0, borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOW.sm },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  sectionTitle:   { fontSize: 15, fontWeight: '700', color: COLORS.text },

  // Info rows
  infoRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLeft:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel:      { fontSize: 13, color: COLORS.muted },
  infoValue:      { fontSize: 13, color: COLORS.text, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },

  // Menu rows
  menuRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, gap: SPACING.md, marginBottom: 4 },
  menuIcon:       { width: 42, height: 42, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  menuContent:    { flex: 1 },
  menuLabel:      { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  menuSub:        { fontSize: 11, color: COLORS.muted, marginTop: 1 },

  // Hak akses
  hakRow:         { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 6 },
  hakDot:         { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  hakText:        { fontSize: 13, color: COLORS.text },
  hakTextDisabled:{ color: COLORS.disabled },

  // Logout
  logoutBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: SPACING.lg, marginTop: SPACING.xl, padding: SPACING.md, backgroundColor: '#FEF2F2', borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.danger + '40' },
  logoutText:     { color: COLORS.danger, fontSize: 15, fontWeight: '700' },

  // Modal
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:      { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, paddingBottom: 40 },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle:     { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalBtn:       { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 15, alignItems: 'center', marginTop: SPACING.md },
  modalBtnText:   { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  // Password field
  passFieldWrap:  { marginBottom: SPACING.md },
  passLabel:      { fontSize: 12, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  passInputRow:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 12, backgroundColor: COLORS.surface },
  passInput:      { flex: 1, height: 46, fontSize: 14, color: COLORS.text },

  // Error
  errorBox:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF2F2', padding: 10, borderRadius: RADIUS.md, marginBottom: SPACING.sm },
  errorText:      { fontSize: 12, color: COLORS.danger },

  // User management
  userRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, gap: SPACING.sm },
  userAvatar:     { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  userAvatarText: { fontSize: 16, fontWeight: '700' },
  userInfo:       { flex: 1 },
  userName:       { fontSize: 13, fontWeight: '700', color: COLORS.text },
  userEmail:      { fontSize: 11, color: COLORS.muted, marginTop: 1 },
  userRoleBadge:  { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  userRoleText:   { fontSize: 10, fontWeight: '700' },
  userActions:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  userEditBtn:    { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.primarySoft, justifyContent: 'center', alignItems: 'center' },
  userDeleteBtn:  { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },

  // Selected user
  selectedUserBox:{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.md },
  selectedUserName:{ fontSize: 14, fontWeight: '700', color: COLORS.text },
})
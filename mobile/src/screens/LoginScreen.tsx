import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert, StatusBar,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../hooks/useAuth'
import { COLORS, RADIUS, SHADOW, SPACING } from '../utils/theme'

export default function LoginScreen() {
  const { login } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Peringatan', 'Email dan password wajib diisi'); return
    }
    setLoading(true)
    try {
      await login(email.trim().toLowerCase(), password)
    } catch (e: any) {
      Alert.alert('Login Gagal', e.message || 'Periksa email dan password Anda')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* HERO */}
          <View style={s.hero}>
            <View style={s.circle1} />
            <View style={s.circle2} />
            <View style={s.seal}>
              <Ionicons name="archive" size={44} color={COLORS.accent} />
            </View>
            <Text style={s.appName}>ARSIP DIGITAL</Text>
            <Text style={s.appSub}>Biro Organisasi{'\n'}Pemerintah Provinsi NTT</Text>
            <View style={s.govBadge}>
              <Ionicons name="shield-checkmark" size={12} color={COLORS.accent} />
              <Text style={s.govText}>  Sistem Resmi Pemerintah</Text>
            </View>
          </View>

          {/* FORM */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Masuk ke Sistem</Text>
            <Text style={s.cardSub}>Gunakan akun instansi Anda</Text>

            {/* Email */}
            <View style={s.field}>
              <Text style={s.label}>Email Instansi</Text>
              <View style={[s.inputWrap, !!email && s.inputActive]}>
                <Ionicons name="mail-outline" size={18} color={email ? COLORS.primaryLight : COLORS.placeholder} />
                <TextInput
                  style={s.input}
                  placeholder="nama@nttprov.go.id"
                  placeholderTextColor={COLORS.placeholder}
                  value={email} onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none" autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={s.field}>
              <Text style={s.label}>Password</Text>
              <View style={[s.inputWrap, !!password && s.inputActive]}>
                <Ionicons name="lock-closed-outline" size={18} color={password ? COLORS.primaryLight : COLORS.placeholder} />
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  placeholder="Masukkan password"
                  placeholderTextColor={COLORS.placeholder}
                  value={password} onChangeText={setPassword}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.placeholder} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity style={[s.loginBtn, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
              {loading
                ? <ActivityIndicator color={COLORS.white} />
                : (<>
                    <Ionicons name="log-in-outline" size={20} color={COLORS.white} />
                    <Text style={s.loginText}>Masuk ke Sistem</Text>
                  </>)
              }
            </TouchableOpacity>

            <View style={s.hint}>
              <Ionicons name="information-circle-outline" size={14} color={COLORS.placeholder} />
              <Text style={s.hintText}>  Hubungi Administrator jika lupa password</Text>
            </View>
          </View>

          <Text style={s.footer}>© 2025 Biro Organisasi Provinsi NTT</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primaryDark },
  scroll: { flexGrow: 1 },
  hero: {
    backgroundColor: COLORS.primaryDark,
    paddingTop: 64, paddingBottom: 48, paddingHorizontal: SPACING.xxl,
    alignItems: 'center', overflow: 'hidden', position: 'relative',
  },
  circle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', top: -50, right: -50 },
  circle2: { position: 'absolute', width: 150, height: 150, borderRadius: 75,  borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', bottom: 20, left: -40 },
  seal: {
    width: 96, height: 96, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 18, ...SHADOW.lg,
  },
  appName: { fontSize: 26, fontWeight: '800', color: COLORS.white, letterSpacing: 2, marginBottom: 6 },
  appSub:  { fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  govBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 5,
  },
  govText: { fontSize: 11, color: COLORS.accent, fontWeight: '700' },
  card: {
    backgroundColor: COLORS.white, borderRadius: 28,
    marginHorizontal: SPACING.lg, padding: SPACING.xxl, ...SHADOW.lg,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  cardSub:   { fontSize: 13, color: COLORS.muted, marginBottom: 24 },
  field:     { marginBottom: 18 },
  label:     { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, backgroundColor: COLORS.surface,
    paddingHorizontal: 14, gap: 10,
  },
  inputActive: { borderColor: COLORS.primaryLight, backgroundColor: '#F0F7FF' },
  input:  { flex: 1, height: 50, fontSize: 14, color: COLORS.text },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.lg, height: 56, gap: 8, marginTop: 4,
    shadowColor: COLORS.primaryLight, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  loginText: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  hint:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  hintText: { fontSize: 12, color: COLORS.placeholder },
  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 11, paddingVertical: 24 },
})
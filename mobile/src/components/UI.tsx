import React from 'react'
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, CAT_COLORS, RADIUS, SHADOW, SPACING } from '../utils/theme'

// ─── BUTTON ──────────────────────────────────────────────────────
interface BtnProps {
  label:    string
  onPress:  () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  loading?: boolean
  disabled?: boolean
  icon?:    keyof typeof Ionicons.glyphMap
  style?:   ViewStyle
  full?:    boolean
}
export function Button({ label, onPress, variant = 'primary', loading, disabled, icon, style, full = true }: BtnProps) {
  const bg    = { primary: COLORS.primaryLight, secondary: COLORS.primarySoft, danger: COLORS.dangerSoft, ghost: 'transparent' }[variant]
  const color = { primary: COLORS.white, secondary: COLORS.primaryLight, danger: COLORS.danger, ghost: COLORS.primaryLight }[variant]
  return (
    <TouchableOpacity
      style={[s.btn, { backgroundColor: bg }, variant === 'primary' && SHADOW.md, full && { width: '100%' }, (disabled || loading) && { opacity: 0.6 }, style]}
      onPress={onPress} disabled={disabled || loading} activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={color} size="small" />
        : (<>
            {icon && <Ionicons name={icon} size={18} color={color} />}
            <Text style={[s.btnText, { color }]}>{label}</Text>
          </>)
      }
    </TouchableOpacity>
  )
}

// ─── CATEGORY CHIP ───────────────────────────────────────────────
export function CategoryChip({ name }: { name: string }) {
  const color = CAT_COLORS[name] ?? COLORS.info
  return (
    <View style={[s.catChip, { backgroundColor: color + '18' }]}>
      <Text style={[s.catChipText, { color }]}>{name}</Text>
    </View>
  )
}

// ─── EMPTY STATE ─────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyIcon}>{icon}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      {subtitle && <Text style={s.emptySub}>{subtitle}</Text>}
    </View>
  )
}

// ─── INFO ROW ────────────────────────────────────────────────────
export function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}><Text style={{ fontSize: 14 }}>{icon}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  )
}

// ─── SECTION HEADER ──────────────────────────────────────────────
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={s.secHdr}>
      <Text style={s.secTitle}>{title}</Text>
      {action && <TouchableOpacity onPress={onAction}><Text style={s.secAction}>{action}</Text></TouchableOpacity>}
    </View>
  )
}

const s = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.lg, paddingVertical: 15, paddingHorizontal: 20, gap: 8 },
  btnText: { fontSize: 15, fontWeight: '700' },
  catChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  catChipText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.muted },
  emptySub: { fontSize: 13, color: COLORS.placeholder, marginTop: 6, textAlign: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, marginBottom: SPACING.md },
  infoIcon: { width: 32, height: 32, borderRadius: RADIUS.sm, backgroundColor: COLORS.primarySoft, justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  infoValue: { fontSize: 14, color: COLORS.text, fontWeight: '700', marginTop: 1 },
  secHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  secTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  secAction: { fontSize: 13, fontWeight: '700', color: COLORS.primaryLight },
})
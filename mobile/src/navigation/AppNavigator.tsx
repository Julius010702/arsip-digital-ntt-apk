// ======================================================
// FILE: mobile/src/navigation/AppNavigator.tsx
// ======================================================

import React from 'react'
import { View, ActivityIndicator } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../hooks/useAuth'
import { COLORS } from '../utils/theme'
import { RootStackParams, TabParams } from './types'

import LoginScreen           from '../screens/LoginScreen'
import DashboardScreen       from '../screens/DashboardScreen'
import ArsipScreen           from '../screens/ArsipScreen'
import DetailArsipScreen     from '../screens/DetailArsipScreen'
import UploadArsipScreen     from '../screens/UploadArsipScreen'
import CariScreen            from '../screens/CariScreen'
import ProfilScreen          from '../screens/ProfilScreen'
import NotifikasiScreen      from '../screens/NotifikasiScreen'
import PenilaianScreen       from '../screens/PenilaianScreen'
import DetailPenilaianScreen from '../screens/DetailPenilaianScreen'

const Stack = createNativeStackNavigator<RootStackParams>()
const Tab   = createBottomTabNavigator<TabParams>()

const HEADER_OPT = {
  headerStyle:            { backgroundColor: COLORS.primaryDark },
  headerTintColor:        COLORS.white,
  headerTitleStyle:       { fontWeight: '700' as const, fontSize: 16 },
  headerBackTitleVisible: false,
}

type IoniconName = keyof typeof Ionicons.glyphMap

const TAB_CFG: Record<keyof TabParams, { active: IoniconName; inactive: IoniconName; label: string }> = {
  Dashboard:   { active: 'home',            inactive: 'home-outline',           label: 'Beranda' },
  Arsip:       { active: 'folder',          inactive: 'folder-outline',         label: 'Arsip'   },
  UploadArsip: { active: 'cloud-upload',    inactive: 'cloud-upload-outline',   label: 'Upload'  },
  Cari:        { active: 'search',          inactive: 'search-outline',         label: 'Cari'    },
  Profil:      { active: 'person',          inactive: 'person-outline',         label: 'Profil'  },
}

function TabNav() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const canUpload = user?.role === 'super_admin' || user?.role === 'admin_unit'

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const cfg = TAB_CFG[route.name as keyof TabParams]
        const isUpload = route.name === 'UploadArsip'
        return {
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => (
            isUpload ? (
              <View style={{
                width: 52, height: 52, borderRadius: 26,
                backgroundColor: COLORS.primaryLight,
                justifyContent: 'center', alignItems: 'center',
                marginBottom: 8,
                shadowColor: COLORS.primaryLight,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 8,
              }}>
                <Ionicons name="cloud-upload" size={24} color={COLORS.white} />
              </View>
            ) : (
              <Ionicons name={focused ? cfg.active : cfg.inactive} size={size} color={color} />
            )
          ),
          tabBarLabel: isUpload ? '' : cfg.label,
          tabBarActiveTintColor:   COLORS.primaryLight,
          tabBarInactiveTintColor: COLORS.placeholder,
          tabBarStyle: {
            backgroundColor: COLORS.white,
            borderTopColor:  COLORS.border,
            paddingTop:    6,
            paddingBottom: insets.bottom || 8,
            height:        62 + (insets.bottom || 0),
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '700' as const },
        }
      }}
    >
      <Tab.Screen name="Dashboard"   component={DashboardScreen} />
      <Tab.Screen name="Arsip"       component={ArsipScreen} />
      {canUpload && (
        <Tab.Screen
          name="UploadArsip"
          component={UploadArsipScreen}
          options={{ tabBarLabel: '' }}
        />
      )}
      <Tab.Screen name="Cari"   component={CariScreen} />
      <Tab.Screen name="Profil" component={ProfilScreen} />
    </Tab.Navigator>
  )
}

export default function AppNavigator() {
  const { token, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primaryDark }}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTab"   component={TabNav} />
            <Stack.Screen
              name="DetailArsip"
              component={DetailArsipScreen}
              options={{ ...HEADER_OPT, headerShown: true, title: 'Detail Arsip' }}
            />
            <Stack.Screen
              name="UploadArsip"
              component={UploadArsipScreen}
              options={{ ...HEADER_OPT, headerShown: true, title: 'Upload Arsip' }}
            />
            <Stack.Screen
              name="Penilaian"
              component={PenilaianScreen}
              options={{ ...HEADER_OPT, headerShown: true, title: 'Penilaian Arsip' }}
            />
            <Stack.Screen
              name="DetailPenilaian"
              component={DetailPenilaianScreen}
              options={{ ...HEADER_OPT, headerShown: true, title: 'Detail Penilaian' }}
            />
            <Stack.Screen
              name="Notifikasi"
              component={NotifikasiScreen}
              options={{ ...HEADER_OPT, headerShown: true, title: 'Notifikasi' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
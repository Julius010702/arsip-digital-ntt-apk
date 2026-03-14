import React, {
  createContext, useContext, useState,
  useEffect, useCallback, ReactNode,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authApi } from '../services/api'
import { User } from '../types'

interface AuthCtx {
  user:    User | null
  token:   string | null
  loading: boolean
  login:   (email: string, password: string) => Promise<void>
  logout:  () => Promise<void>
  refresh: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({} as AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [token,   setToken]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { boot() }, [])

  async function boot() {
    try {
      const t = await AsyncStorage.getItem('token')
      if (t) {
        setToken(t)
        const res = await authApi.getMe()
        setUser(res.data)
      }
    } catch {
      await AsyncStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  async function login(email: string, password: string) {
    const res = await authApi.login(email, password)
    await AsyncStorage.setItem('token', res.data.token)
    setToken(res.data.token)
    setUser(res.data.user)
  }

  async function logout() {
    await AsyncStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const refresh = useCallback(async () => {
    const res = await authApi.getMe()
    setUser(res.data)
  }, [])

  return (
    <Ctx.Provider value={{ user, token, loading, login, logout, refresh }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
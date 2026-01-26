import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import api from '@/services/api'
import { cookieStorage } from '@/lib/cookieStorage'

interface User {
  id: number
  username: string
  email: string
  display_name: string
  role_id: number | null
  role_name?: string
  customer_id: number | null
  contact_id: number | null
  profile_picture: string | null
  department: string | null
  analyst_type_id: number | null
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  _hasHydrated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>
  logout: () => Promise<void>
  setAuth: (user: User | null, token: string | null) => void
  setHasHydrated: (state: boolean) => void
  refreshUserProfile: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      _hasHydrated: false,

      login: async (email: string, password: string) => {
        try {
          const response = await api.post('/auth/login', { email, password })
          const { user, token } = response.data.data

          set({
            user,
            token,
            isAuthenticated: true,
          })

          // Set token in axios default headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`

          return { success: true }
        } catch (error: any) {
          return {
            success: false,
            message: error.response?.data?.message || 'Login failed',
          }
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          })
          delete api.defaults.headers.common['Authorization']
        }
      },

      setAuth: (user: User | null, token: string | null) => {
        set({
          user,
          token,
          isAuthenticated: !!token,
        })
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        }
      },

      setHasHydrated: (hydrated: boolean) => {
        set({ _hasHydrated: hydrated, isLoading: !hydrated })
      },

      refreshUserProfile: async () => {
        try {
          const response = await api.get('/auth/profile')
          const userData = response.data.data?.user

          if (!userData) {
            console.error('No user data in response:', response.data)
            return false
          }

          set({
            user: userData,
            isAuthenticated: true,
          })

          return true
        } catch (error) {
          console.error('Failed to refresh user profile:', error)
          return false
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => cookieStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
        }
        state?.setHasHydrated(true)
      },
    }
  )
)








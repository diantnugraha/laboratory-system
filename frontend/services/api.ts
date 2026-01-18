import axios from 'axios'
import { getCookie, deleteCookie } from '@/lib/cookieStorage'
import { parseApiError } from '@/lib/utils/errorHandler'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
})

// Request interceptor to add token from cookies
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      // Try to get token from auth-storage cookie (Zustand store)
      let token: string | null = null
      const authStorageCookie = getCookie('auth-storage')

      if (authStorageCookie) {
        try {
          const parsed = JSON.parse(authStorageCookie)
          if (parsed.state?.token) {
            token = parsed.state.token
          }
        } catch (e) {
          // Ignore parse errors, try direct auth-token cookie
        }
      }

      // Fallback to direct auth-token cookie (AuthContext)
      if (!token) {
        token = getCookie('auth-token')
      }

      // Set Authorization header if token exists
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor with centralized error logging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error using centralized handler (maintains tracking)
    const parsed = parseApiError(error)

    // Handle 401 - redirect to login
    if (parsed.isAuthError && typeof window !== 'undefined') {
      // Don't redirect if we're already on the login page
      // (401 is expected when login fails)
      const isLoginPage = window.location.pathname === '/login'

      if (!isLoginPage) {
        // Clear auth from cookies
        deleteCookie('auth-storage')
        deleteCookie('auth-token')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api

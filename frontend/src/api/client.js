import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthCheck = error.config?.url?.includes('/auth/me')
      localStorage.removeItem('token')
      localStorage.removeItem('user')

      if (
        !isAuthCheck &&
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register')
      ) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

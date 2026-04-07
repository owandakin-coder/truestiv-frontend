import axios from 'axios'

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

let guestPromise = null

function getStoredToken() {
  return localStorage.getItem('token') || localStorage.getItem('access_token')
}

function storeToken(token) {
  localStorage.setItem('token', token)
  localStorage.setItem('access_token', token)
}

function clearToken() {
  localStorage.removeItem('token')
  localStorage.removeItem('access_token')
}

function buildHeaders(extraHeaders = {}) {
  const token = getStoredToken()
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  }
}

export async function ensureGuestSession(force = false) {
  const existing = getStoredToken()
  if (existing && !force) return existing

  if (guestPromise && !force) return guestPromise

  guestPromise = axios
    .post(`${API_BASE_URL}/api/auth/guest`)
    .then((response) => {
      const token = response.data?.access_token
      if (!token) throw new Error('Guest session token was not returned')
      storeToken(token)
      return token
    })
    .finally(() => {
      guestPromise = null
    })

  return guestPromise
}

export async function resetGuestSession() {
  clearToken()
  return ensureGuestSession(true)
}

export function api(extraConfig = {}) {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: buildHeaders(extraConfig.headers || {}),
    ...extraConfig,
  })

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config || {}
      if (error.response?.status === 401 && !originalRequest._guestRetried) {
        originalRequest._guestRetried = true
        const token = await ensureGuestSession(true)
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${token}`,
        }
        return axios.request(originalRequest)
      }
      throw error
    }
  )

  return client
}

export async function apiRequest(path, options = {}) {
  await ensureGuestSession()

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options.headers),
  })

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`
    try {
      const payload = await response.json()
      detail = payload.detail || payload.message || detail
    } catch {
      const text = await response.text()
      if (text) detail = text
    }
    throw new Error(detail)
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  return response.text()
}

export { API_BASE_URL, clearToken, getStoredToken, storeToken }

import axios from 'axios'

const CACHE_KEY = 'threat_intel_snapshot_v1'
const CACHE_TTL_MS = 10 * 60 * 1000
let memoryCache = null
let inflightRequest = null

const api = () => axios.create({
  baseURL: 'https://trustiveai.onrender.com',
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  timeout: 12000
})

const normalize = (item) => ({
  id: item.id,
  title: item.title || 'Untitled threat',
  summary: item.description || '',
  source: item.source || 'Community',
  threatType: item.threat_type || 'unknown',
  severity: item.severity || 'medium',
  verified: Boolean(item.is_verified),
  publishedAt: item.published_at || item.created_at || item.timestamp || null,
  url: item.url || item.link || null
})

const isFresh = (entry) => entry && (Date.now() - entry.fetchedAt) < CACHE_TTL_MS

const loadLocalCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed
  } catch {
    return null
  }
}

const saveLocalCache = (entry) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // Ignore storage write failures
  }
}

const fetchSnapshot = async () => {
  const [feedRes, statsRes] = await Promise.allSettled([
    api().get('/api/community/feed'),
    api().get('/api/community/stats')
  ])

  if (feedRes.status !== 'fulfilled') {
    throw new Error('Failed to fetch threat feed.')
  }

  const entry = {
    feed: (feedRes.value.data || []).map(normalize),
    stats: statsRes.status === 'fulfilled' ? statsRes.value.data : null,
    fetchedAt: Date.now()
  }

  memoryCache = entry
  saveLocalCache(entry)
  return entry
}

export async function getThreatIntelSnapshot({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    if (isFresh(memoryCache)) return { ...memoryCache, fromCache: true }

    const localCache = loadLocalCache()
    if (isFresh(localCache)) {
      memoryCache = localCache
      return { ...localCache, fromCache: true }
    }
  }

  if (!inflightRequest) {
    inflightRequest = fetchSnapshot().finally(() => {
      inflightRequest = null
    })
  }

  const snapshot = await inflightRequest
  return { ...snapshot, fromCache: false }
}

export function getCacheMetadata() {
  const freshest = isFresh(memoryCache) ? memoryCache : loadLocalCache()
  if (!freshest) return null
  return { fetchedAt: freshest.fetchedAt, ttlMs: CACHE_TTL_MS }
}

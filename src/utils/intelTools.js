export function titleCase(value = '') {
  return String(value)
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function normalizeThreatLevel(value = '') {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return 'Unknown'
  if (normalized === 'dangerous') return 'Threat'
  return titleCase(normalized)
}

export function extractIocsFromText(...sources) {
  const content = sources.filter(Boolean).join('\n')

  const ipPattern = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g
  const urlPattern = /\bhttps?:\/\/[^\s<>"')]+/gi
  const domainPattern = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}\b/gi
  const hashPattern = /\b(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})\b/gi

  const urls = Array.from(new Set(content.match(urlPattern) || []))
  const ips = Array.from(new Set(content.match(ipPattern) || []))
  const hashes = Array.from(new Set(content.match(hashPattern) || []))
  const domains = Array.from(
    new Set(
      (content.match(domainPattern) || []).filter(
        (domain) =>
          !ips.includes(domain) &&
          !urls.some((url) => url.includes(domain)) &&
          !['localhost'].includes(domain.toLowerCase())
      )
    )
  )

  return { ips, urls, domains, hashes }
}

export function flattenIocs(iocs = {}) {
  return [
    ...(iocs.urls || []).map((value) => ({ type: 'url', value })),
    ...(iocs.ips || []).map((value) => ({ type: 'ip', value })),
    ...(iocs.domains || []).map((value) => ({ type: 'domain', value })),
    ...(iocs.hashes || []).map((value) => ({ type: 'hash', value })),
  ]
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function makeStorageList(key, nextEntry, limit = 8) {
  const current = JSON.parse(localStorage.getItem(key) || '[]')
  const next = [nextEntry, ...current].slice(0, limit)
  localStorage.setItem(key, JSON.stringify(next))
  return next
}

export function readStorageList(key) {
  return JSON.parse(localStorage.getItem(key) || '[]')
}

export function buildCommunityPayload({
  indicator,
  threatType,
  result,
  analysisId = null,
}) {
  return {
    indicator,
    threat_type: threatType,
    risk_score: Number(result?.risk_score || result?.aggregated_score || 0),
    threat_level: String(result?.threat_level || result?.threatLevel || 'suspicious').toLowerCase(),
    analysis_id: analysisId,
  }
}

export function getPrimaryIndicator(type, result, fallback = '') {
  if (type === 'url') return result?.url || fallback
  if (type === 'ip') return result?.ip || fallback
  if (type === 'hash') return result?.hash || fallback
  if (type === 'file') return result?.filename || result?.file_hash || fallback
  if (type === 'media') return result?.filename || fallback
  return fallback
}

export function buildIocPath(type, indicator) {
  if (!type || !indicator) return ''
  return `/ioc/${encodeURIComponent(type)}/${encodeURIComponent(indicator)}`
}

export function formatRelativeDate(value) {
  if (!value) return 'Unknown time'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

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

export function buildIpLookupPath(indicator) {
  if (!indicator) return '/lookup-center/ip'
  return `/lookup-center/ip/${encodeURIComponent(indicator)}`
}

export function buildDomainLookupPath(indicator) {
  if (!indicator) return '/lookup-center/domain'
  return `/lookup-center/domain/${encodeURIComponent(indicator)}`
}

export function buildHeaderAnalyzerPath() {
  return '/lookup-center/email-header'
}

export function formatRelativeDate(value) {
  if (!value) return 'Unknown time'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

const BRAND_CATALOG = [
  { brand: 'Microsoft', tokens: ['microsoft', 'office', 'outlook', 'live'] },
  { brand: 'Google', tokens: ['google', 'gmail', 'googledrive'] },
  { brand: 'Apple', tokens: ['apple', 'icloud', 'itunes'] },
  { brand: 'Amazon', tokens: ['amazon', 'aws'] },
  { brand: 'PayPal', tokens: ['paypal'] },
  { brand: 'Meta', tokens: ['facebook', 'instagram', 'whatsapp', 'meta'] },
  { brand: 'Bank of America', tokens: ['bankofamerica', 'bofa'] },
  { brand: 'Chase', tokens: ['chase', 'jpmorgan'] },
  { brand: 'Netflix', tokens: ['netflix'] },
  { brand: 'DHL', tokens: ['dhl'] },
]

const DOMAIN_LURE_TERMS = new Set([
  'login', 'secure', 'verify', 'verification', 'support', 'billing',
  'update', 'account', 'payment', 'wallet', 'reset', 'auth', 'signin',
])

const SUSPICIOUS_TLDS = new Set(['xyz', 'top', 'click', 'shop', 'gq', 'cf', 'ml', 'ga', 'tk'])

function compactLabel(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeLookalikes(value) {
  return compactLabel(value)
    .replace(/rn/g, 'm')
    .replace(/vv/g, 'w')
    .replace(/0/g, 'o')
    .replace(/1/g, 'l')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/9/g, 'g')
}

function extractDomain(value) {
  const candidate = String(value || '').trim().toLowerCase()
  if (!candidate) return ''
  try {
    const withProtocol = candidate.includes('://') ? candidate : `https://${candidate}`
    const parsed = new URL(withProtocol)
    return parsed.hostname.replace(/\.$/, '')
  } catch {
    return candidate.split('/')[0].split(':')[0].replace(/\.$/, '')
  }
}

function editDistance(left, right) {
  if (left === right) return 0
  if (!left) return right.length
  if (!right) return left.length
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitution = previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      current.push(
        Math.min(
          previous[rightIndex] + 1,
          current[rightIndex - 1] + 1,
          substitution
        )
      )
    }
    for (let i = 0; i < current.length; i += 1) previous[i] = current[i]
  }
  return previous[previous.length - 1]
}

export function detectBrandImpersonation(value, ageDays = null) {
  const domain = extractDomain(value)
  if (!domain || !domain.includes('.')) {
    return { active: false, score: 0, threat_level: 'safe', reasons: [], domain: '' }
  }

  const labels = domain.split('.')
  const rootLabel = labels.length >= 2 ? labels[labels.length - 2] : ''
  const tld = labels[labels.length - 1] || ''
  const compact = compactLabel(rootLabel)
  const normalized = normalizeLookalikes(rootLabel)
  const suspiciousTerms = Array.from(DOMAIN_LURE_TERMS).filter((term) => compact.includes(term))
  let best = null

  for (const entry of BRAND_CATALOG) {
    for (const token of entry.tokens) {
      const tokenCompact = compactLabel(token)
      const exact = compact === tokenCompact
      const normalizedExact = normalized === tokenCompact && compact !== tokenCompact
      const containsBrand = tokenCompact && compact.includes(tokenCompact) && compact !== tokenCompact
      const distance = editDistance(normalized, tokenCompact)
      const lookalike = distance <= 1 && compact !== tokenCompact
      if (exact && !suspiciousTerms.length) continue

      let score = 0
      const reasons = []
      if (normalizedExact) {
        score += 48
        reasons.push(`Character substitution makes the domain look like ${entry.brand}.`)
      } else if (lookalike) {
        score += 40
        reasons.push(`Domain label is one edit away from ${entry.brand}.`)
      }
      if (containsBrand) {
        score += 26
        reasons.push(`Brand token for ${entry.brand} appears inside the domain label.`)
      }
      if (suspiciousTerms.length) {
        score += Math.min(24, suspiciousTerms.length * 8)
        reasons.push(`Suspicious lure terms detected: ${suspiciousTerms.join(', ')}.`)
      }
      if (SUSPICIOUS_TLDS.has(tld)) {
        score += 12
        reasons.push(`Suspicious TLD detected: .${tld}.`)
      }
      if (typeof ageDays === 'number' && ageDays <= 30) {
        score += 10
        reasons.push('Domain age is very new for a branded service.')
      }
      if (score <= 0) continue
      const candidate = {
        active: score >= 35,
        score: Math.min(100, score),
        threat_level: score >= 70 ? 'threat' : (score >= 35 ? 'suspicious' : 'safe'),
        brand: entry.brand,
        domain,
        matched_label: rootLabel,
        reasons,
        suspicious_terms: suspiciousTerms,
      }
      if (!best || candidate.score > best.score) best = candidate
    }
  }

  if (!best) {
    return {
      active: false,
      score: 0,
      threat_level: 'safe',
      domain,
      reasons: [],
      suspicious_terms: suspiciousTerms,
    }
  }

  return {
    ...best,
    summary: best.active
      ? `${best.domain} may be impersonating ${best.brand}.`
      : `${best.domain} shares some naming traits with ${best.brand}.`,
  }
}

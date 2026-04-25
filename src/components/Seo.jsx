import { useEffect } from 'react'

function ensureMeta(attribute, key, content) {
  if (!content) return
  const selector = `meta[${attribute}="${key}"]`
  let tag = document.head.querySelector(selector)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attribute, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function ensureLink(rel, href) {
  if (!href) return
  let link = document.head.querySelector(`link[rel="${rel}"]`)
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', rel)
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)
}

export default function Seo({ title, description, path = '/', image = '/favicon.svg' }) {
  useEffect(() => {
    const origin = window.location.origin
    const canonical = `${origin}${path}`
    const imageUrl = image.startsWith('http') ? image : `${origin}${image}`

    document.title = title
    ensureMeta('name', 'description', description)
    ensureMeta('property', 'og:type', 'website')
    ensureMeta('property', 'og:site_name', 'Trustive AI')
    ensureMeta('property', 'og:title', title)
    ensureMeta('property', 'og:description', description)
    ensureMeta('property', 'og:url', canonical)
    ensureMeta('property', 'og:image', imageUrl)
    ensureMeta('name', 'twitter:card', 'summary')
    ensureMeta('name', 'twitter:title', title)
    ensureMeta('name', 'twitter:description', description)
    ensureMeta('name', 'twitter:image', imageUrl)
    ensureLink('canonical', canonical)
  }, [description, image, path, title])

  return null
}

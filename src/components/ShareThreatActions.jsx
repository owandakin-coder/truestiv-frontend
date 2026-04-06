import { useMemo } from 'react'

function openCentered(url) {
  window.open(url, '_blank', 'noopener,noreferrer,width=700,height=640')
}

export default function ShareThreatActions({
  title,
  summary,
  shareUrl,
  hashtags = ['TrustiveAI', 'CyberSecurity'],
}) {
  const shareText = useMemo(
    () => `${title}: ${summary}`.trim(),
    [title, summary]
  )

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=${encodeURIComponent(hashtags.join(','))}`
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`

  const handleNativeShare = async () => {
    if (!navigator.share) {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
      return
    }

    await navigator.share({
      title,
      text: shareText,
      url: shareUrl,
    })
  }

  return (
    <div className="share-actions">
      <button type="button" className="platform-button" onClick={() => openCentered(twitterUrl)}>
        Share to X
      </button>
      <button type="button" className="platform-button secondary" onClick={() => openCentered(linkedInUrl)}>
        Share to LinkedIn
      </button>
      <button type="button" className="platform-button ghost" onClick={handleNativeShare}>
        Copy or Share
      </button>
    </div>
  )
}

export default function PortalHero({
  kicker,
  title,
  copy,
  actions = null,
  className = '',
  titleWide = false,
}) {
  const classes = ['intel-hero-card', 'portal-hero', 'portal-hero-single', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      <div className="intel-hero-content portal-hero-main">
        <div className="portal-hero-kicker-row">
          <div className="portal-hero-kicker-dot" />
          <span className="portal-hero-kicker-label">{kicker}</span>
        </div>
        <h1 className={`portal-hero-title${titleWide ? ' portal-hero-title-wide' : ''}`}>{title}</h1>
        {copy ? <p className="portal-hero-copy">{copy}</p> : null}
        {actions ? <div className="intel-hero-actions">{actions}</div> : null}
      </div>
    </div>
  )
}

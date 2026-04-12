export default function SignalStrip({ items = [] }) {
  if (!items.length) return null

  return (
    <div className="signal-strip">
      {items.map((item) => (
        <div key={item.label} className="signal-strip-item">
          <div className="signal-strip-label">
            {item.live ? <span className="live-dot" /> : null}
            <span>{item.label}</span>
          </div>
          <div className="signal-strip-value">{item.value}</div>
          {item.copy ? <div className="signal-strip-copy">{item.copy}</div> : null}
        </div>
      ))}
    </div>
  )
}

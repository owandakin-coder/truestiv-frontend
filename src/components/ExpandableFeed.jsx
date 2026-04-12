import { useMemo, useState } from 'react'

export default function ExpandableFeed({
  items = [],
  initialCount = 5,
  renderItem,
  className = '',
  empty = null,
}) {
  const [expanded, setExpanded] = useState(false)
  const visibleItems = useMemo(
    () => (expanded ? items : items.slice(0, initialCount)),
    [expanded, initialCount, items]
  )

  if (!items.length) return empty

  return (
    <div className={className} style={{ display: 'grid', gap: 14 }}>
      {visibleItems.map(renderItem)}
      {items.length > initialCount ? (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button type="button" className="intel-button ghost" onClick={() => setExpanded((current) => !current)}>
            {expanded ? 'Show less' : `Show more (${items.length - initialCount} more)`}
          </button>
        </div>
      ) : null}
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

export default function IntelEmptyState({
  title,
  copy,
  examples = [],
  actionLabel = '',
  actionTo = '',
  icon = Sparkles,
}) {
  const Icon = icon

  return (
    <div className="intel-empty-state">
      <div className="intel-empty-state-icon">
        <Icon size={24} />
      </div>
      <div className="intel-empty-state-title">{title}</div>
      <p className="intel-empty-state-copy">{copy}</p>
      {examples.length ? (
        <div className="intel-empty-state-examples">
          {examples.map((example) => (
            <button
              key={example.label}
              type="button"
              className="intel-empty-state-chip"
              onClick={example.onClick}
            >
              {example.label}
            </button>
          ))}
        </div>
      ) : null}
      {actionLabel && actionTo ? (
        <Link className="intel-button ghost" to={actionTo}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}

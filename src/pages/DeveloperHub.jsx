import { API_BASE_URL } from '../services/api'

const commands = [
  'python -m trustive_cli analyze --channel email --sender finance@example.com "Urgent payment request"',
  'python -m trustive_cli media image ./sample.png',
  'python -m trustive_cli feed',
  'python -m trustive_cli geo-map',
]

export default function DeveloperHub() {
  return (
    <section className="platform-page">
      <div className="platform-hero">
        <div>
          <p className="platform-eyebrow">Priority 8 and 9</p>
          <h1>Developer Hub</h1>
          <p>Ship faster with the CLI package, the public API guide, and the generated OpenAPI schema.</p>
        </div>
      </div>

      <div className="platform-grid two-up">
        <article className="platform-panel">
          <h3>Public API Documentation</h3>
          <p>
            Swagger UI lives at <a href={`${API_BASE_URL}/api/docs`} target="_blank" rel="noreferrer">/api/docs</a>.
          </p>
          <p>
            Public API guide lives at <a href={`${API_BASE_URL}/api/public/guide`} target="_blank" rel="noreferrer">/api/public/guide</a>.
          </p>
          <p>
            OpenAPI JSON is available at <a href={`${API_BASE_URL}/openapi.json`} target="_blank" rel="noreferrer">/openapi.json</a>.
          </p>
        </article>

        <article className="platform-panel">
          <h3>CLI Package</h3>
          <p>Set <code>TRUSTIVE_API_URL</code> and <code>TRUSTIVE_TOKEN</code> in your shell before running commands.</p>
          <div className="platform-code-block">
            {commands.map((command) => (
              <code key={command}>{command}</code>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}

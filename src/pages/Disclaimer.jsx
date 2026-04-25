import PortalHero from '../components/PortalHero'

const sections = [
  {
    title: 'Informational Use Only',
    body:
      'Trustive AI provides security-related analysis and contextual threat information for informational purposes only. The platform does not provide legal, compliance, or incident response guarantees.',
  },
  {
    title: 'External Intelligence Sources',
    body:
      'Results may incorporate third-party reputation data, public threat feeds, and automated enrichment. These sources can change, become unavailable, or contain incomplete or outdated information.',
  },
  {
    title: 'No Guaranteed Detection',
    body:
      'A "safe" result does not guarantee that a URL, IP, file, or message is harmless. A "suspicious" or "phishing" result should be treated as a risk signal, not as final proof without further validation.',
  },
  {
    title: 'Operational Decisions',
    body:
      'Any technical, business, or investigative action you take based on platform output is your responsibility. Trustive AI should support decision-making, not replace human judgment or internal controls.',
  },
  {
    title: 'Provider and Availability Changes',
    body:
      'Threat visibility may vary over time depending on provider availability, feed latency, environment configuration, and service deployment state.',
  },
]

export default function Disclaimer() {
  return (
    <section className="intel-shell legal-shell">
      <PortalHero
        kicker="Legal"
        title="Disclaimer"
        copy="Threat results are advisory signals and should always be reviewed in context before action."
        className="portal-hero-left portal-hero-single fade-in"
      />

      <section className="intel-section-card legal-card fade-in-delay-1">
        <div className="legal-grid">
          {sections.map((section) => (
            <article key={section.title} className="legal-section">
              <h2 className="legal-section-title">{section.title}</h2>
              <p className="legal-section-copy">{section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}

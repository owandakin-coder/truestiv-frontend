import PortalHero from '../components/PortalHero'
import Seo from '../components/Seo'

const sections = [
  {
    title: 'What Trustive AI Is',
    body:
      'Trustive AI is an open cyber intelligence workspace built to help users scan suspicious indicators, review recurring threat signals, and move quickly from detection to context.',
  },
  {
    title: 'How Scoring Works',
    body:
      'Risk scoring combines scanner verdicts, recurring sightings, source overlap, and enrichment context. Signals tagged as suspicious or threat are weighted more heavily than one-off low-confidence observations.',
  },
  {
    title: 'Collection Pipeline',
    body:
      'The platform collects and normalizes threat intelligence from configured sources, deduplicates indicators, and surfaces the strongest signals across Threat Intel, Timeline, Lookup, and related investigation views.',
  },
  {
    title: 'What Users Should Expect',
    body:
      'Trustive AI helps accelerate triage and visibility. It is designed to support security review, not replace human validation, incident process, or organization-specific controls.',
  },
  {
    title: 'Known Limitations',
    body:
      'Threat feeds can be delayed, incomplete, or unavailable. A safe result is not a guarantee, and a suspicious or phishing result should still be reviewed in context before action.',
  },
  {
    title: 'Responsible Use',
    body:
      'The platform is intended for lawful defensive analysis, awareness, and research workflows. It should not be used to support phishing, fraud, or unauthorized activity.',
  },
]

export default function AboutMethodology() {
  return (
    <section className="intel-shell legal-shell">
      <Seo
        title="Trustive AI | About and Methodology"
        description="Learn what Trustive AI does, how signals are scored, and what users should expect from the intelligence workflow."
        path="/about"
      />

      <PortalHero
        kicker="Trust and Methodology"
        title="About Trustive AI"
        copy="What the platform does, how signals are scored, and what users should expect from the intelligence workflow."
        className="portal-hero-left portal-hero-single fade-in"
      />

      <section className="trust-facts-grid fade-in-delay-1">
        <article className="contact-card">
          <div className="signal-strip-label">Primary purpose</div>
          <strong className="contact-value">Threat scanning and intelligence review</strong>
          <p className="legal-section-copy">Built to move from suspicious input into context, history, and related signals quickly.</p>
        </article>
        <article className="contact-card">
          <div className="signal-strip-label">Core sources</div>
          <strong className="contact-value">Scanner, community, collection pipeline</strong>
          <p className="legal-section-copy">Signals are merged from direct scans, promoted findings, and scheduled intelligence collection.</p>
        </article>
        <article className="contact-card">
          <div className="signal-strip-label">User expectation</div>
          <strong className="contact-value">Advisory intelligence, not final truth</strong>
          <p className="legal-section-copy">Trustive AI supports triage and review, but sensitive decisions still need human validation.</p>
        </article>
      </section>

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

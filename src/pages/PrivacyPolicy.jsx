import PortalHero from '../components/PortalHero'
import Seo from '../components/Seo'

const sections = [
  {
    title: 'Information You Submit',
    body:
      'When you use Trustive AI, you may submit URLs, IP addresses, hashes, domains, message content, and related indicators for analysis. This information is used to deliver results, maintain scan history, and support intelligence workflows.',
  },
  {
    title: 'How Data Is Used',
    body:
      'Submitted indicators and analysis metadata may be processed to generate reputation checks, threat summaries, trend detection, and product-level intelligence views. Suspicious or threat-tagged results may also be surfaced in shared intelligence sections of the platform.',
  },
  {
    title: 'Third-Party Providers',
    body:
      'Trustive AI may enrich results through third-party threat intelligence and reputation providers. Submitted indicators may therefore be checked against external sources as part of normal platform operation.',
  },
  {
    title: 'Storage and Retention',
    body:
      'We retain technical scan history, guest session identifiers, and related intelligence records to support product functionality, troubleshooting, and platform quality. Retention periods may change as the service evolves.',
  },
  {
    title: 'Security and Limitations',
    body:
      'We apply reasonable measures to protect platform data, but no internet-facing service can guarantee absolute security. Users should avoid submitting secrets, credentials, or personal information that is not necessary for security analysis.',
  },
  {
    title: 'Contact',
    body:
      'Questions about privacy or data handling can be directed to contact@trustive.ai.',
  },
]

export default function PrivacyPolicy() {
  return (
    <section className="intel-shell legal-shell">
      <Seo
        title="Trustive AI | Privacy Policy"
        description="Review how Trustive AI processes submitted indicators, guest sessions, scan history, and related intelligence records."
        path="/privacy"
      />

      <PortalHero
        kicker="Legal"
        title="Privacy Policy"
        copy="Understand what Trustive AI processes, stores, and shares while delivering security analysis."
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

import PortalHero from '../components/PortalHero'
import Seo from '../components/Seo'

const sections = [
  {
    title: 'Acceptance of Terms',
    body:
      'By accessing and using Trustive AI, you agree to use the service responsibly, comply with applicable laws, and accept these terms as they apply to your use of the platform.',
  },
  {
    title: 'Permitted Use',
    body:
      'Trustive AI is intended for security awareness, defensive research, and lawful investigative workflows. You agree not to use the platform to support phishing, fraud, unauthorized intrusion, or any other abusive activity.',
  },
  {
    title: 'Service Availability',
    body:
      'We may update, suspend, or modify features, threat feeds, and enrichment sources at any time. Continuous availability, uninterrupted access, and completeness of external intelligence sources are not guaranteed.',
  },
  {
    title: 'User Responsibility',
    body:
      'You remain solely responsible for how you interpret and act on scan results, threat intelligence, and history surfaced by the platform. Always validate critical findings independently before taking irreversible action.',
  },
  {
    title: 'Intellectual Property',
    body:
      'The Trustive AI interface, branding, and product logic remain protected by applicable intellectual property laws. Third-party feed content remains subject to the rights and usage terms of its original providers.',
  },
  {
    title: 'Limitation of Liability',
    body:
      'Trustive AI is provided on an "as is" basis. We are not liable for direct or indirect loss arising from downtime, external feed inaccuracies, false positives, missed detections, or decisions made using the platform.',
  },
]

export default function TermsOfUse() {
  return (
    <section className="intel-shell legal-shell">
      <Seo
        title="Trustive AI | Terms of Use"
        description="Read the Trustive AI terms of use covering lawful use, service limitations, and user responsibility."
        path="/terms"
      />

      <PortalHero
        kicker="Legal"
        title="Terms of Use"
        copy="Use the platform lawfully, validate results carefully, and treat external intelligence as advisory."
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

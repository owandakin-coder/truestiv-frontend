import PortalHero from '../components/PortalHero'

const contactItems = [
  {
    label: 'General Inquiries',
    value: 'contact@trustive.ai',
    copy: 'Use this address for product questions, privacy requests, and feedback.',
  },
  {
    label: 'Security Feedback',
    value: 'contact@trustive.ai',
    copy: 'Report platform issues, data quality concerns, or security-related observations here.',
  },
  {
    label: 'Response Expectation',
    value: 'Business email workflow',
    copy: 'Trustive AI currently handles contact requests through email rather than a ticketing portal.',
  },
]

export default function Contact() {
  return (
    <section className="intel-shell legal-shell">
      <PortalHero
        kicker="Contact"
        title="Contact Trustive AI"
        copy="Reach out for product questions, platform feedback, or privacy and security requests."
        className="portal-hero-left portal-hero-single fade-in"
      />

      <section className="intel-section-card legal-card fade-in-delay-1">
        <div className="contact-grid">
          {contactItems.map((item) => (
            <article key={item.label} className="contact-card">
              <div className="signal-strip-label">{item.label}</div>
              <a href={`mailto:${item.value === 'contact@trustive.ai' ? item.value : 'contact@trustive.ai'}`} className="contact-value">
                {item.value}
              </a>
              <p className="legal-section-copy">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}

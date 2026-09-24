import { useSiteLang } from '../i18n/LanguageContext'
import { LEGAL_CONTACT, LEGAL_EFFECTIVE_DATE, type LegalCopy } from '../i18n/legal'
import { legalUi } from '../i18n/legalUi'
import LanguageSelect from './LanguageSelect'
import { Link } from 'react-router-dom'
import Footer from './Footer'
import Header from './Header'

export default function LegalDocument({ document: { title, description, sections } }: { document: LegalCopy }) {
  const { lang } = useSiteLang()
  const copy = legalUi[lang]
  const effectiveDate = new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(LEGAL_EFFECTIVE_DATE))
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header
        right={
          <div className="flex items-center gap-2"><LanguageSelect /><Link to="/" className="rounded-xl px-3 py-1.5 text-[13px] font-bold text-sub transition-colors hover:bg-white hover:text-ink md:px-4 md:py-2 md:text-sm">
            {copy.home}
          </Link></div>
        }
      />
      <main className="layout-app flex-1 py-10 sm:py-16">
        <article className="mx-auto max-w-3xl rounded-[28px] border border-gray-200/70 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.04)] sm:p-10">
          <p className="text-sm font-extrabold text-brand-dark">Glocalizer</p>
          <h1 className="mt-3 text-[30px] font-extrabold tracking-tight text-ink sm:text-[38px]">{title}</h1>
          <p className="mt-3 text-base leading-7 text-sub">{description}</p>
          <p className="mt-4 text-sm font-semibold text-sub">{copy.effective}: <time dateTime={LEGAL_EFFECTIVE_DATE}>{effectiveDate}</time></p>

          <div className="mt-10 space-y-10">
            {sections.map((section, index) => (
              <section key={section.title} aria-labelledby={`legal-section-${index}`}>
                <h2 id={`legal-section-${index}`} className="text-xl font-extrabold text-ink">
                  {index + 1}. {section.title}
                </h2>
                <div className="mt-3 space-y-3 text-[15px] leading-7 text-sub [&_a]:font-bold [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-extrabold [&_strong]:text-ink">
                  {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </section>
            ))}
          </div>
          <p className="mt-10 break-words border-t border-gray-100 pt-6 text-sm text-sub">
            {copy.contact}: <a className="font-bold text-ink underline underline-offset-2" href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>
          </p>
        </article>
      </main>
      <Footer />
    </div>
  )
}

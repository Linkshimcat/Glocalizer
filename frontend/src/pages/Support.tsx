import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { useSiteLang } from '../i18n/LanguageContext'
import { legalUi } from '../i18n/legalUi'
import { LEGAL_CONTACT } from '../i18n/legal'
import Footer from '../components/Footer'

export default function Support() {
  const { lang } = useSiteLang()
  const copy = legalUi[lang]
  useDocumentMeta(copy.supportTitle, copy.supportDescription)

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <main className="layout-app flex flex-1 items-start justify-center py-10 sm:py-16">
        <article className="w-full max-w-3xl rounded-panel border border-gray-200/70 bg-white p-6 sm:p-10">
          <p className="text-sm font-extrabold text-brand-dark">Glocalizer</p>
          <h1 className="mt-3 text-[30px] font-extrabold tracking-tight text-ink sm:text-[38px]">{copy.supportTitle}</h1>
          <p className="mt-3 text-base leading-7 text-sub">{copy.supportDescription}</p>
          <section className="mt-8 rounded-panel bg-surface p-5 sm:p-6">
            <h2 className="font-extrabold text-ink">{copy.supportEmail}</h2>
            <p className="mt-2 text-sm leading-6 text-sub">{copy.supportEmailHint}</p>
            <a
              href={`mailto:${LEGAL_CONTACT}`}
              className="mt-4 inline-flex min-h-11 items-center rounded-control bg-action px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-brand-dark"
            >
              {LEGAL_CONTACT}
            </a>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  )
}

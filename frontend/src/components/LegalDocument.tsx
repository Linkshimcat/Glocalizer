import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Footer from './Footer'
import Header from './Header'

interface LegalSection {
  title: string
  content: ReactNode
}

interface LegalDocumentProps {
  title: string
  description: string
  effectiveDate: string
  sections: LegalSection[]
}

export default function LegalDocument({ title, description, effectiveDate, sections }: LegalDocumentProps) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header
        right={
          <Link to="/" className="rounded-xl px-3 py-1.5 text-[13px] font-bold text-sub transition-colors hover:bg-white hover:text-ink md:px-4 md:py-2 md:text-sm">
            홈으로
          </Link>
        }
      />
      <main className="layout-app flex-1 py-10 sm:py-16">
        <article className="mx-auto max-w-3xl rounded-[28px] border border-gray-200/70 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.04)] sm:p-10">
          <p className="text-sm font-extrabold text-brand-dark">Glocalizer</p>
          <h1 className="mt-3 text-[30px] font-extrabold tracking-tight text-ink sm:text-[38px]">{title}</h1>
          <p className="mt-3 text-base leading-7 text-sub">{description}</p>
          <p className="mt-4 text-sm font-semibold text-sub">시행일: {effectiveDate}</p>

          <div className="mt-10 space-y-10">
            {sections.map((section, index) => (
              <section key={section.title} aria-labelledby={`legal-section-${index}`}>
                <h2 id={`legal-section-${index}`} className="text-xl font-extrabold text-ink">
                  {index + 1}. {section.title}
                </h2>
                <div className="mt-3 space-y-3 text-[15px] leading-7 text-sub [&_a]:font-bold [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-extrabold [&_strong]:text-ink">
                  {section.content}
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  )
}

import { ArrowUpRight, Archive, Check, Globe2, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import { useSiteLang } from '../i18n/LanguageContext'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { serviceDict } from '../i18n/service'

const FEATURES = [
  { icon: Sparkles, path: '/generate' },
  { icon: Globe2, path: '/localize' },
  { icon: ShieldCheck, path: '/review' },
  { icon: Archive, path: '/archive' },
] as const

export default function ServiceIntro() {
  const { lang, t } = useSiteLang()
  const s = serviceDict[lang]
  const pageRef = useRef<HTMLDivElement>(null)
  const workflowRef = useRef<HTMLElement>(null)
  const workflowProgressRef = useRef<HTMLDivElement>(null)
  const [motionReady, setMotionReady] = useState(false)
  useDocumentMeta(t.navService, s.intro)

  useEffect(() => {
    const page = pageRef.current
    if (!page) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion || !('IntersectionObserver' in window)) {
      setMotionReady(true)
      page.querySelectorAll('.service-reveal').forEach(element => element.classList.add('is-visible'))
      return
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' })
    page.querySelectorAll('.service-reveal').forEach(element => observer.observe(element))
    setMotionReady(true)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let frame = 0
    const updateProgress = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const section = workflowRef.current
        const progress = workflowProgressRef.current
        if (!section || !progress) return
        const rect = section.getBoundingClientRect()
        const value = Math.min(Math.max((window.innerHeight * 0.72 - rect.top) / (rect.height + window.innerHeight * 0.28), 0), 1)
        progress.style.setProperty('--workflow-progress', String(value))
      })
    }
    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [])

  return (
    <div ref={pageRef} className="service-page flex min-h-screen flex-col bg-white" data-motion-ready={motionReady}>
      <main className="flex-1">
        <section className="border-b border-brand/10 bg-white">
          <div className="layout-app service-reveal py-16 sm:py-24">
            <h1 className="mt-5 max-w-4xl whitespace-pre-line break-words text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">{s.title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-sub">{s.intro}</p>
            <Link to="/dashboard" className="service-cta mt-8 inline-flex items-center gap-3 rounded-control bg-action px-6 py-4 font-extrabold text-white">
              {s.start}<ArrowUpRight className="service-arrow" size={20} aria-hidden />
            </Link>
            <p className="mt-4 text-sm leading-6 text-sub">{s.account}</p>
          </div>
        </section>
        <section className="layout-app py-14 sm:py-20" aria-labelledby="service-features">
          <h2 id="service-features" className="service-reveal text-2xl font-extrabold tracking-tight sm:text-3xl">{s.heading}</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {s.features.map((feature, index) => {
              const { icon: Icon, path } = FEATURES[index]
              return (
                <article key={path} className="service-reveal service-feature-card flex flex-col rounded-panel border border-gray-200 bg-surface/50 p-6 sm:p-8" style={{ '--reveal-delay': `${index * 75}ms` } as CSSProperties}>
                  <div className="flex items-center justify-between">
                    <span className="service-feature-icon flex h-12 w-12 items-center justify-center rounded-panel bg-brand-soft text-brand-dark"><Icon size={24} aria-hidden /></span>
                  </div>
                  <h3 className="mt-6 text-xl font-extrabold leading-snug text-ink sm:text-2xl">{feature.title}</h3>
                  <p className="mt-3 leading-7 text-sub">{feature.description}</p>
                  <ul className="mb-8 mt-5 space-y-3 text-sm leading-6 text-sub">
                    {feature.details.map(detail => <li key={detail} className="flex gap-2"><Check size={17} className="mt-1 shrink-0 text-brand-dark" aria-hidden /><span>{detail}</span></li>)}
                  </ul>
                  <Link to={path} className="service-feature-link mt-auto flex items-center justify-between gap-3 border-t border-gray-200 pt-5 font-extrabold text-ink">{feature.action}<ArrowUpRight className="service-arrow shrink-0" size={20} aria-hidden /></Link>
                </article>
              )
            })}
          </div>
        </section>
        <section ref={workflowRef} className="service-workflow bg-surface py-14 sm:py-20" aria-labelledby="service-workflow">
          <div className="layout-app">
            <h2 id="service-workflow" className="service-reveal text-2xl font-extrabold tracking-tight sm:text-3xl">{s.workflow}</h2>
            <div ref={workflowProgressRef} className="service-workflow-progress" aria-hidden><span /></div>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {s.steps.map((step, index) => <li key={step.title} className="service-reveal service-workflow-step rounded-panel bg-white p-6" style={{ '--reveal-delay': `${index * 90}ms` } as CSSProperties}><span className="text-sm font-extrabold text-brand-dark">0{index + 1}</span><h3 className="mt-4 text-xl font-extrabold">{step.title}</h3><p className="mt-3 leading-7 text-sub">{step.description}</p></li>)}
            </ol>
          </div>
        </section>
        <section className="layout-app pt-14 sm:pt-20" aria-labelledby="service-faq">
          <h2 id="service-faq" className="service-reveal text-2xl font-extrabold sm:text-3xl">{s.faqTitle}</h2>
          <div className="mt-6 space-y-3">
            {s.faq.map(item => <details key={item.question} className="rounded-panel border border-gray-200 p-5 open:bg-surface">
              <summary className="cursor-pointer font-bold leading-7 text-ink">{item.question}</summary>
              <p className="mt-3 leading-7 text-sub">{item.answer}</p>
            </details>)}
          </div>
        </section>
        <section className="layout-app py-14 sm:py-20" aria-labelledby="service-notes">
          <h2 id="service-notes" className="service-reveal text-2xl font-extrabold sm:text-3xl">{s.notesTitle}</h2>
          <ul className="service-reveal mt-6 max-w-4xl list-disc space-y-3 pl-5 leading-7 text-sub">{s.notes.map(note => <li key={note}>{note}</li>)}</ul>
          <Link to="/dashboard" className="service-cta mt-8 inline-flex items-center gap-3 rounded-control bg-brand-soft px-6 py-4 font-extrabold text-ink">{s.start}<ArrowUpRight className="service-arrow" size={20} aria-hidden /></Link>
        </section>
      </main>
      <Footer />
    </div>
  )
}

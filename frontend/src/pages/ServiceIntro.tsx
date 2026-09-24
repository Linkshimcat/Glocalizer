import { ArrowLeft, ArrowUpRight, Archive, Check, Globe2, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import Header from '../components/Header'
import NavMenu from '../components/NavMenu'
import { useSiteLang } from '../i18n/LanguageContext'
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
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header sticky center={<NavMenu />} right={
        <Link to="/" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-sub hover:bg-surface hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden />{s.home}
        </Link>
      } />
      <main className="flex-1">
        <section className="border-b border-brand/10 bg-gradient-to-br from-brand-soft via-white to-surface">
          <div className="layout-app py-16 sm:py-24">
            <p className="text-sm font-extrabold text-brand-dark">Glocalizer · {t.navService}</p>
            <h1 className="mt-5 max-w-4xl whitespace-pre-line break-words text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">{s.title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-sub">{s.intro}</p>
            <Link to="/dashboard" className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-brand px-6 py-4 font-extrabold text-ink transition-opacity hover:opacity-80">
              {s.start}<ArrowUpRight size={20} aria-hidden />
            </Link>
            <p className="mt-4 text-sm leading-6 text-sub">{s.account}</p>
          </div>
        </section>
        <section className="layout-app py-14 sm:py-20" aria-labelledby="service-features">
          <h2 id="service-features" className="text-2xl font-extrabold tracking-tight sm:text-3xl">{s.heading}</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {s.features.map((feature, index) => {
              const { icon: Icon, path } = FEATURES[index]
              return (
                <article key={path} className="flex flex-col rounded-[28px] border border-gray-200 bg-surface/50 p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark"><Icon size={24} aria-hidden /></span>
                    <span aria-hidden className="text-sm font-extrabold text-sub">0{index + 1}</span>
                  </div>
                  <h3 className="mt-6 text-xl font-extrabold leading-snug text-ink sm:text-2xl">{feature.title}</h3>
                  <p className="mt-3 leading-7 text-sub">{feature.description}</p>
                  <ul className="mb-8 mt-5 space-y-3 text-sm leading-6 text-sub">
                    {feature.details.map(detail => <li key={detail} className="flex gap-2"><Check size={17} className="mt-1 shrink-0 text-brand-dark" aria-hidden /><span>{detail}</span></li>)}
                  </ul>
                  <Link to={path} className="mt-auto flex items-center justify-between gap-3 border-t border-gray-200 pt-5 font-extrabold text-ink hover:text-brand-dark">{feature.action}<ArrowUpRight size={20} className="shrink-0" aria-hidden /></Link>
                </article>
              )
            })}
          </div>
        </section>
        <section className="bg-surface py-14 sm:py-20" aria-labelledby="service-workflow">
          <div className="layout-app">
            <h2 id="service-workflow" className="text-2xl font-extrabold tracking-tight sm:text-3xl">{s.workflow}</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {s.steps.map((step, index) => <li key={step.title} className="rounded-3xl bg-white p-6"><span className="text-sm font-extrabold text-brand-dark">0{index + 1}</span><h3 className="mt-4 text-xl font-extrabold">{step.title}</h3><p className="mt-3 leading-7 text-sub">{step.description}</p></li>)}
            </ol>
          </div>
        </section>
        <section className="layout-app py-14 sm:py-20" aria-labelledby="service-notes">
          <h2 id="service-notes" className="text-2xl font-extrabold sm:text-3xl">{s.notesTitle}</h2>
          <ul className="mt-6 max-w-4xl list-disc space-y-3 pl-5 leading-7 text-sub">{s.notes.map(note => <li key={note}>{note}</li>)}</ul>
          <Link to="/dashboard" className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-brand-soft px-6 py-4 font-extrabold text-ink hover:bg-surface">{s.start}<ArrowUpRight size={20} aria-hidden /></Link>
        </section>
      </main>
      <Footer />
    </div>
  )
}

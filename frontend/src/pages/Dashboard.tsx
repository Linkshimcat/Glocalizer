import { ArrowRight, Globe2, ShieldCheck, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Header from '../components/Header'
import NavMenu from '../components/NavMenu'
import { useSiteLang } from '../i18n/LanguageContext'
import { useUploads } from '../store/uploads'

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useSiteLang()
  const { files, targetLangs, projectStatus, resultReady, resetWorkflow } = useUploads()
  const hasWork = files.length > 0
  const resumePath = !projectStatus ? '/localize' : resultReady && ['completed', 'failed'].includes(projectStatus.status) ? '/result' : '/editor'
  const status = !projectStatus ? t.hubUpload : projectStatus.status === 'processing' ? t.hubProcessing : projectStatus.status === 'failed' ? t.hubFailed : resultReady ? t.hubResult : t.hubEditing
  const startNew = () => {
    if (hasWork && !window.confirm(t.hubConfirm)) return
    resetWorkflow()
    navigate('/localize')
  }
  const cards = [
    { title: t.hubLocalize, description: t.hubLocalizeDesc, Icon: Globe2, active: true },
    { title: t.hubReview, description: t.hubReviewDesc, Icon: ShieldCheck, active: false },
    { title: t.hubGenerate, description: t.hubGenerateDesc, Icon: Sparkles, active: false },
  ]

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <Header center={<NavMenu workspace />} sticky />
      <main className="layout-app py-10 sm:py-16">
        <p className="text-sm font-extrabold text-brand-dark">Glocalizer</p>
        <h1 className="mt-3 text-[30px] font-extrabold tracking-tight sm:text-[38px]">{t.hubTitle}</h1>
        <p className="mt-3 max-w-2xl break-keep text-base leading-relaxed text-sub">{t.hubSubtitle}</p>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {cards.map(({ title, description, Icon, active }) => (
            <section key={title} className="flex flex-col rounded-[28px] border border-gray-200/70 bg-white p-6 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark"><Icon className="h-7 w-7" /></span>
                {!active && <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-sub">{t.hubSoon}</span>}
              </div>
              <h2 className="mt-6 text-xl font-extrabold text-ink">{title}</h2>
              <p className="mb-7 mt-3 flex-1 break-keep text-sm leading-6 text-sub">{description}</p>
              <Button disabled={!active} onClick={() => hasWork ? navigate(resumePath) : startNew()} className="w-full">
                {active ? hasWork ? t.hubContinue : t.hubStart : t.hubSoon}{active && <ArrowRight className="h-4 w-4" />}
              </Button>
              {active && hasWork && <Button variant="ghost" onClick={startNew} className="mt-2 w-full">{t.hubNew}</Button>}
            </section>
          ))}
        </div>
        {hasWork && (
          <section className="mt-10" aria-labelledby="resume-title">
            <h2 id="resume-title" className="text-xl font-extrabold">{t.hubResume}</h2>
            <p className="mt-2 text-sm text-sub">{t.hubSession}</p>
            <div className="mt-4 flex flex-col gap-5 rounded-[24px] border border-gray-200/70 bg-white p-5 sm:flex-row sm:items-center sm:p-6">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface">
                  {files[0].url ? <img src={files[0].url} alt={files[0].name} className="h-full w-full object-contain" /> : <Globe2 className="h-7 w-7 text-sub" />}
                </div>
                <div className="min-w-0">
                  <span className="inline-block rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-dark">{status}</span>
                  <p className="mt-2 truncate font-bold">{files[0].name}</p>
                  <p className="mt-1 break-words text-sm text-sub">{t.hubFiles.replace('{n}', String(files.length))}{targetLangs.length > 0 && ` · ${targetLangs.map(lang => lang.label).join(' · ')}`}</p>
                </div>
              </div>
              <Button onClick={() => navigate(resumePath)}>{t.hubContinue}<ArrowRight className="h-4 w-4" /></Button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

import { useToast } from '../components/Toast'
import CloudProjectList from '../components/CloudProjectList'
import { ArrowRight, Globe2, ShieldCheck, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Header from '../components/Header'
import NavMenu from '../components/NavMenu'
import { useSiteLang } from '../i18n/LanguageContext'
import { useUploads } from '../store/uploads'

export default function Dashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useSiteLang()
  const { files, projectStatus, resultReady, resetWorkflow, flushCloudWork, cloudSaving } = useUploads()
  const hasWork = files.length > 0
  const resumePath = !projectStatus || projectStatus.status === 'created' ? '/localize' : resultReady && ['completed', 'failed'].includes(projectStatus.status) ? '/result' : '/editor'
  const startNew = async () => {
    if (hasWork && !window.confirm(t.cloudNewConfirm)) return
    try { await flushCloudWork(); resetWorkflow(); navigate('/localize') }
    catch (error) { toast(error instanceof Error ? error.message : t.cloudSaveFailed) }
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
              <p className="mb-7 mt-3 flex-1 break-normal text-sm leading-6 text-sub [overflow-wrap:anywhere]">{description}</p>
              <Button disabled={!active || cloudSaving} onClick={() => hasWork ? navigate(resumePath) : startNew()} className="w-full">
                {active ? hasWork ? t.hubContinue : t.hubStart : t.hubSoon}{active && <ArrowRight className="h-4 w-4" />}
              </Button>
              {active && hasWork && <Button variant="ghost" onClick={startNew} className="mt-2 w-full">{t.hubNew}</Button>}
            </section>
          ))}
        </div>
        <section className="mt-10" aria-labelledby="progress-title">
          <h2 id="progress-title" className="text-xl font-extrabold">{t.cloudInProgress}</h2>
          <CloudProjectList archive={false} />
        </section>
      </main>
    </div>
  )
}

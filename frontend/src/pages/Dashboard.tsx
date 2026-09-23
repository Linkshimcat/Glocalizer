import { useToast } from '../components/Toast'
import CloudProjectList from '../components/CloudProjectList'
import { ArrowRight, Globe2, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Header from '../components/Header'
import NavMenu from '../components/NavMenu'
import RollingText from '../components/RollingText'
import { useSiteLang } from '../i18n/LanguageContext'
import { useUploads } from '../store/uploads'
import GenerationList from '../components/GenerationList'
import Modal from '../components/Modal'

export default function Dashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useSiteLang()
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [startingNew, setStartingNew] = useState(false)
  const { files, projectStatus, resultReady, resetWorkflow, flushCloudWork, cloudSaving } = useUploads()
  const hasWork = files.length > 0
  const resumePath = !projectStatus || projectStatus.status === 'created' ? '/localize' : resultReady && ['completed', 'failed'].includes(projectStatus.status) ? '/result' : '/editor'
  const startNew = async () => {
    setStartingNew(true)
    try {
      await flushCloudWork()
      resetWorkflow()
      setNewTaskOpen(false)
      navigate('/localize')
    } catch (error) {
      toast(error instanceof Error ? error.message : t.cloudSaveFailed)
    } finally {
      setStartingNew(false)
    }
  }
  const requestNewTask = () => { if (hasWork) setNewTaskOpen(true); else void startNew() }
  const cards = [
    { title: t.hubLocalize, description: t.hubLocalizeDesc, Icon: Globe2, active: true },
    { title: t.hubReview, description: t.hubReviewDesc, Icon: ShieldCheck, active: true },
    { title: t.hubGenerate, description: t.hubGenerateDesc, Icon: Sparkles, active: true },
  ]

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <Header center={<NavMenu workspace />} sticky />
      <main className="layout-app py-10 sm:py-16">
        <p className="text-sm font-extrabold text-brand-dark">Glocalizer</p>
        <h1 className="mt-3 text-[30px] font-extrabold tracking-tight sm:text-[38px]">
          {/* 굴러 올라오는 글자는 aria-hidden이라 읽히는 제목을 따로 둔다. */}
          <span className="sr-only">{t.hubTitle}</span>
          <RollingText items={[t.hubTitle]} loop={false} />
        </h1>
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
              <Button disabled={!active || cloudSaving || startingNew} onClick={() => Icon === Sparkles ? navigate('/generate') : Icon === ShieldCheck ? navigate('/review') : hasWork ? navigate(resumePath) : requestNewTask()} className="w-full">
                {active ? hasWork && Icon === Globe2 ? t.hubContinue : t.hubStart : t.hubSoon}{active && <ArrowRight className="h-4 w-4" />}
              </Button>
              {active && hasWork && Icon === Globe2 && <Button variant="ghost" disabled={cloudSaving || startingNew} onClick={requestNewTask} className="mt-2 w-full">{t.hubNew}</Button>}
            </section>
          ))}
        </div>
        <section className="mt-10" aria-labelledby="progress-title">
          <h2 id="progress-title" className="text-xl font-extrabold">{t.cloudInProgress}</h2>
          <CloudProjectList archive={false} />
        </section>
        <GenerationList />
      </main>
      {newTaskOpen ? <Modal onClose={() => { if (!startingNew) setNewTaskOpen(false) }} labelledBy="new-task-title" closeLabel={t.commonClose}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark"><Globe2 className="h-6 w-6" /></div>
        <h2 id="new-task-title" className="mt-5 pr-8 text-xl font-extrabold text-ink">{t.cloudNewTitle}</h2>
        <p className="mt-3 break-keep text-sm leading-6 text-sub">{t.cloudNewConfirm}</p>
        <div className="mt-7 flex gap-3">
          <Button variant="secondary" disabled={startingNew} onClick={() => setNewTaskOpen(false)} className="flex-1">{t.cloudDeleteCancel}</Button>
          <Button disabled={startingNew} onClick={() => { void startNew() }} className="flex-1">
            {startingNew ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{t.cloudNewProceed}
          </Button>
        </div>
      </Modal> : null}
    </div>
  )
}

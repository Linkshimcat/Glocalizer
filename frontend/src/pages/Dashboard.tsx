import { useToast } from '../components/Toast'
import CloudProjectList from '../components/CloudProjectList'
import { ArrowRight, Globe2, Loader2, ShieldCheck, SmilePlus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Header from '../components/Header'
import NavMenu from '../components/NavMenu'
import heroCharacter from '../assets/studio/hero-character.png'
import { studioCopy } from '../i18n/studio'
import { useSiteLang } from '../i18n/LanguageContext'
import { useUploads } from '../store/uploads'
import GenerationList from '../components/GenerationList'
import Modal from '../components/Modal'

export default function Dashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const { t, lang } = useSiteLang()
  const copy = studioCopy[lang]
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  // 두 목록 모두 비었을 때만 빈 상태를 한 번 보여준다. null은 아직 못 불러왔다는 뜻이다.
  const [cloudCount, setCloudCount] = useState<number | null>(null)
  const [generationCount, setGenerationCount] = useState<number | null>(null)
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
    { title: t.hubGenerate, Icon: SmilePlus, run: () => navigate('/generate') },
    { title: t.hubLocalize, Icon: Globe2, run: requestNewTask },
    { title: t.hubReview, Icon: ShieldCheck, run: () => navigate('/review') },
  ]

  return (
    <div className="studio-dashboard min-h-screen">
      <Header center={<NavMenu workspace />} sticky />
      <main className="studio-dashboard-main">
        <div className="studio-dashboard-heading">
          <h1>{hasWork ? copy.resume : t.hubTitle}</h1>
          <p>{t.hubSubtitle}</p>
        </div>
        <div className="studio-start-grid">
          <section className="studio-resume" aria-label={hasWork ? copy.resume : copy.intro}>
            <img src={hasWork && files[0]?.url ? files[0].url : heroCharacter} alt="" className="studio-resume-art" />
            <div className="studio-resume-body">
              <h2>{hasWork ? files[0].name : copy.intro}</h2>
              <p>{hasWork ? t.hubFiles.replace('{n}', String(files.length)) : t.hubLocalizeDesc}</p>
              <div className="studio-resume-actions">
                <Button disabled={cloudSaving || startingNew} onClick={() => hasWork ? navigate(resumePath) : requestNewTask()}>
                  {hasWork ? t.hubContinue : t.hubStart}<ArrowRight size={17} />
                </Button>
                {hasWork && <Button variant="ghost" disabled={cloudSaving || startingNew} onClick={requestNewTask}>{t.hubNew}</Button>}
              </div>
            </div>
          </section>
          <section className="studio-new-work" aria-labelledby="new-work-title">
            <h2 id="new-work-title">{copy.newWork}</h2>
            <div className="studio-work-menu">
              {cards.map(({ title, Icon, run }) => <button key={title} type="button" disabled={cloudSaving || startingNew} onClick={run}>
                <Icon aria-hidden="true" /><strong>{title}</strong>
              </button>)}
            </div>
          </section>
        </div>
        <section className="studio-project-section" aria-labelledby="progress-title">
          <h2 id="progress-title">{copy.projects}</h2>
          <CloudProjectList archive={false} gallery onCount={setCloudCount} />
          <GenerationList archive={false} gallery onCount={setGenerationCount} />
          {cloudCount === 0 && generationCount === 0 ? <p className="mt-5 border-t border-gray-200 py-6 text-sm text-sub">{t.cloudEmptyProgress}</p> : null}
        </section>
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

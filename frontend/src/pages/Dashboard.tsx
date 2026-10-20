import { useToast } from '../components/Toast'
import ProjectLibrary from '../components/ProjectLibrary'
import SessionNotice from '../components/SessionNotice'
import { Globe2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import heroCharacter from '../assets/studio/hero-character-card.webp'
import createIcon from '../assets/studio/create.svg'
import localizeIcon from '../assets/studio/localize.svg'
import reviewIcon from '../assets/studio/review.svg'
import captionIcon from '../assets/studio/caption.svg'
import arrowRightIcon from '../assets/studio/cta-arrow.svg'
import { studioCopy } from '../i18n/studio'
import { useSiteLang } from '../i18n/LanguageContext'
import { useUploads } from '../store/uploads'
import Modal from '../components/Modal'

export default function Dashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const { t, lang } = useSiteLang()
  const copy = studioCopy[lang]
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
    { title: t.hubGenerate, icon: createIcon, run: () => navigate('/generate') },
    { title: t.hubLocalize, icon: localizeIcon, run: requestNewTask },
    { title: t.hubReview, icon: reviewIcon, run: () => navigate('/review') },
    { title: t.hubCaption, icon: captionIcon, run: requestNewTask },
  ]

  return (
    <div className="studio-dashboard min-h-screen">
      <main id="main-content" tabIndex={-1} className="studio-dashboard-main">
        <SessionNotice />
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
                  {hasWork ? t.hubContinue : t.hubStart}<img src={arrowRightIcon} alt="" aria-hidden="true" />
                </Button>
                {hasWork && <Button variant="ghost" disabled={cloudSaving || startingNew} onClick={requestNewTask}>{t.hubNew}</Button>}
              </div>
            </div>
          </section>
          <section className="studio-new-work" aria-labelledby="new-work-title">
            <h2 id="new-work-title">{copy.newWork}</h2>
            <div className="studio-work-menu">
              {cards.map(({ title, icon, run }) => <button key={title} type="button" disabled={cloudSaving || startingNew} onClick={run}>
                <img src={icon} alt="" aria-hidden="true" /><strong>{title}</strong>
              </button>)}
            </div>
          </section>
        </div>
        <section className="studio-project-section" aria-labelledby="progress-title">
          <h2 id="progress-title">{copy.projects}</h2>
          <ProjectLibrary loginMessage={copy.loginMessage} />
        </section>
      </main>
      {newTaskOpen ? <Modal onClose={() => { if (!startingNew) setNewTaskOpen(false) }} labelledBy="new-task-title" closeLabel={t.commonClose}>
        <div className="text-sub"><Globe2 className="h-6 w-6" /></div>
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

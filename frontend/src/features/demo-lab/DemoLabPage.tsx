import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Footer from '../../components/Footer'
import WorkflowSteps from '../../components/WorkflowSteps'
import { useTheme } from '../../store/ThemeContext'
import { useSiteLang } from '../../i18n/LanguageContext'
import { demoLabCopy } from '../../i18n/demoLab'
import { qaCopy } from '../../i18n/qa'
import { trackEvent } from '../../lib/analytics'
import QaGrid from '../qa/QaGrid'
import EvidenceDrawer from '../qa/EvidenceDrawer'
import { findingsByImage } from '../qa/qaReport'
import LaunchPreview from '../launch-preview/LaunchPreview'
import LocalizationReplay from '../replay/LocalizationReplay'
import { publishedSamples } from './samples'
import type { DemoLanguage, DemoSample } from './samples/types'
import { downloadSample } from './download'
import './demo-lab.css'

export default function DemoLabPage() {
  const { lang } = useSiteLang()
  const { theme, toggleTheme } = useTheme()
  const copy = demoLabCopy(lang)
  const [samples, setSamples] = useState<DemoSample[]>(publishedSamples)
  const [selected, setSelected] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [language, setLanguage] = useState<DemoLanguage>('ja')
  const [candidate, setCandidate] = useState(0)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<'success' | 'error' | null>(null)
  const busyRef = useRef(false)
  const start = useRef<number | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const sample = samples.find(item => item.id === selected)
  const steps = [copy.select, copy.ocr, copy.translation, copy.cleanup, copy.qa, copy.download]
  const choice = sample?.candidates[language][candidate]
  const report = sample?.reports[language][candidate] ?? null
  const image = sample && choice ? { id: sample.id, name: sample.title, url: choice.png, width: sample.width, height: sample.height, inspectable: report !== null } : null
  useEffect(() => {
    // Fixture bundle is excluded from production. Never treat it as service evidence.
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('fixture') === '1') {
      void import('./samples/development').then(module => setSamples(module.developmentSamples))
    }
  }, [])
  function go(next: number) {
    setNotice(null); setStep(next)
    if (next === 4) trackEvent('qa_reviewed', { experimentGroup: 'demo', imageCount: 1 })
    requestAnimationFrame(() => heading.current?.focus())
  }
  function select(id: string) {
    if (start.current === null) {
      start.current = performance.now()
      trackEvent('demo_started', { experimentGroup: 'demo', imageCount: 1 })
    }
    setSelected(id); setCandidate(0); go(1)
  }
  async function download(zipped: boolean) {
    if (!sample || !choice || busyRef.current) return
    busyRef.current = true; setBusy(true); setNotice(null)
    try {
      await downloadSample(sample, language, candidate, zipped)
      setNotice('success')
      trackEvent('export_succeeded', { experimentGroup: 'demo', imageCount: 1, durationMs: start.current === null ? undefined : performance.now() - start.current })
    } catch {
      setNotice('error'); trackEvent('export_failed', { experimentGroup: 'demo', imageCount: 1 })
    } finally { busyRef.current = false; setBusy(false) }
  }
  const picture = (url: string, title: string, boxes = false) => <figure><div className="demo-image" style={{ aspectRatio: sample ? `${sample.width}/${sample.height}` : '1' }}><img src={url} alt={title} />{boxes && sample?.regions.map((box, index) => <span key={index} className="demo-ocr" style={{ left: `${box.x / sample.width * 100}%`, top: `${box.y / sample.height * 100}%`, width: `${box.width / sample.width * 100}%`, height: `${box.height / sample.height * 100}%` }} />)}</div><figcaption>{title}</figcaption></figure>
  return <div className="flex min-h-svh flex-col"><main id="main-content" className="demo-lab layout-app flex-1" tabIndex={-1}>
    <header className="demo-header"><button className="demo-theme" onClick={toggleTheme}>{theme === 'dark' ? copy.light : copy.dark}</button><p className="demo-eyebrow">GLOCALIZER / DEMO LAB</p><h1>{copy.demoLabPageTitle}</h1><p>{copy.intro}</p></header>
    <p className="demo-banner">{copy.sampleNotice}</p>
    {samples.some(item => item.provenance.kind === 'development-fixture') && <p className="demo-banner" role="note">{copy.fixtureNotice}</p>}
    <WorkflowSteps steps={steps} current={step} />
    <h2 className="demo-step-title" ref={heading} tabIndex={-1}>{steps[step]}</h2>
    {step === 0 && <div className="demo-cards">{samples.length === 0 ? <p className="demo-panel">{copy.empty}</p> : samples.map(item => <button className="demo-panel demo-sample" key={item.id} onClick={() => select(item.id)}><img src={item.original} alt="" /><strong>{item.title}</strong><span>{item.description}</span></button>)}</div>}
    {step > 0 && sample && choice && <>
      {step === 1 && <div className="demo-columns">{picture(sample.original, copy.original, true)}<section className="demo-panel"><h3>{copy.ocr}</h3><p className="demo-source">{sample.sourceText}</p><p className="demo-muted">{sample.provenance.processedAt ?? copy.missing}</p></section></div>}
      {step === 2 && <><fieldset className="demo-languages"><legend>{copy.language}</legend>{(['en', 'ja', 'zh'] as const).map(code => <label key={code}><input type="radio" name="demo-language" value={code} checked={language === code} onChange={() => { setLanguage(code); setCandidate(0) }} />{code.toUpperCase()}</label>)}</fieldset><div className="demo-columns">{picture(choice.png, choice.text)}<fieldset className="demo-options"><legend>{copy.translation}</legend>{sample.candidates[language].map((option, index) => <label className="demo-panel" key={index}><input type="radio" name="demo-candidate" checked={candidate === index} onChange={() => setCandidate(index)} /><strong lang={language}>{option.text}</strong><span lang="ko">{option.meaning} · {option.tone}</span></label>)}</fieldset></div></>}
      {step === 3 && <div className="demo-columns">{picture(sample.original, copy.original)}{picture(sample.cleaned, copy.cleaned)}</div>}
      {step === 4 && image && <><p className="demo-muted">{copy.disclaimer}</p>{!report && <p role="status">{copy.noReport}</p>}<div className="demo-columns demo-evidence"><QaGrid images={[image]} grouped={findingsByImage(report)} copy={qaCopy(lang)} /><EvidenceDrawer image={image} findings={report?.findings.filter(f => f.imageId === image.id) ?? []} copy={qaCopy(lang)} /></div><Link className="demo-link" to="/login?next=%2Feditor">{copy.edit}</Link></>}
      {step === 5 && <><div className="demo-columns">{picture(choice.png, choice.text)}<section className="demo-panel"><h3>{copy.download}</h3><p>{copy.sampleNotice}</p><div className="demo-actions"><button disabled={busy} onClick={() => void download(false)}>PNG</button><button disabled={busy} onClick={() => void download(true)}>ZIP</button></div><p role={notice === 'error' ? 'alert' : 'status'}>{busy ? copy.busy : notice ? copy[notice] : ''}</p><Link className="demo-link" to="/login?next=%2Fdashboard">{copy.save}</Link></section></div><LaunchPreview image={choice.png} caption={choice.text} title={copy.preview} note={copy.previewNote} /><LocalizationReplay stages={sample.stages} labels={{ ocr: copy.ocr, translation: copy.translation, cleanup: copy.cleanup, edit: copy.editStage, qa: copy.qa }} title={copy.replay} missing={copy.missing} /><section className="demo-panel" key={sample.id}><h2>{copy.rights}</h2><p>{sample.rights.source}</p><p>{sample.rights.font}</p><p>{sample.rights.aiGenerated ? 'AI-generated' : 'Not AI-generated'}</p><p className="demo-muted">{sample.rights.evidence}</p>{[copy.rightsImage, copy.rightsFont, copy.rightsAi].map(label => <label className="demo-check" key={label}><input type="checkbox" />{label}</label>)}<p className="demo-muted">{copy.rightsNote}</p></section></>}
      <nav className="demo-actions" aria-label={copy.demoLabPageTitle}><button disabled={busy} onClick={() => go(step - 1)}>{copy.previous}</button>{step < 5 ? <button onClick={() => go(step + 1)}>{copy.next}</button> : <button disabled={busy} onClick={() => { setSelected(null); go(0) }}>{copy.restart}</button>}</nav>
    </>}
    <Link className="demo-link" to="/login?next=%2Flocalize">{copy.login}</Link>
  </main><Footer /></div>
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { ImagePlus, Sparkles, ArrowRight, LoaderCircle } from 'lucide-react'
import Header from '../components/Header'
import NavMenu from '../components/NavMenu'
import Button from '../components/Button'
import { useAuth } from '../store/AuthContext'
import { useSiteLang } from '../i18n/LanguageContext'
import { generationCopy } from '../i18n/generation'
import { downloadGeneration, generationRequest, prepareReference, type GenerationProject, type GenerationImage } from '../lib/generationApi'

const categories = ['animal', 'person', 'food', 'object', 'fantasy'] as const
const tags = ['cute', 'simple', 'pastel', 'bold', 'playful', 'chic', 'warm', 'funny'] as const
const conditions = { animal: 'animal character', person: 'human character', food: 'food character', object: 'object character', fantasy: 'fantasy character', cute: 'cute', simple: 'simple design', pastel: 'pastel colors', bold: 'bold outlines', playful: 'playful personality', chic: 'chic personality', warm: 'warm and friendly', funny: 'humorous and expressive' }
export default function Generate() {
  const { token } = useAuth()
  const { lang } = useSiteLang()
  const t = generationCopy(lang)
  const [params, setParams] = useSearchParams()
  const [projects, setProjects] = useState<GenerationProject[]>([])
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [reference, setReference] = useState<string>()
  const [category, setCategory] = useState<typeof categories[number]>()
  const [selectedTags, setSelectedTags] = useState<typeof tags[number][]>([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [poses, setPoses] = useState<string[]>(['환하게 웃으며 인사', '눈물을 흘리며 슬퍼함', '하트를 안고 사랑을 표현'])
  const [slot, setSlot] = useState(0)
  const [caption, setCaption] = useState('')
  const [revision, setRevision] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const polling = useRef(false)
  polling.current = projects.some(p => p.images.some(i => ['queued', 'running'].includes(i.status)))
  const project = projects.find(p => p.id === params.get('project')) ?? (params.get('new') === '1' ? undefined : projects[0])
  const slotImages = project?.images.filter(i => i.slot === slot) ?? []
  const latest = slotImages.at(-1)
  const image = [...slotImages].reverse().find(i => i.status === 'completed')
  const busy = submitting || !!project?.images.some(i => ['queued', 'running'].includes(i.status))
  const load = useCallback(async () => {
    if (!token) return
    const [config, result] = await Promise.all([
      generationRequest<{ enabled: boolean }>(token, '/config'),
      generationRequest<{ projects: GenerationProject[] }>(token, '/projects'),
    ])
    setEnabled(config.enabled); setProjects(result.projects)
  }, [token])
  useEffect(() => {
    let disposed = false
    const refresh = async () => { try { await load() } catch (e) { if (!disposed) setError(e instanceof Error ? e.message : 'API error') } finally { if (!disposed) setLoading(false) } }
    void refresh()
    const interval = setInterval(() => { if (polling.current && document.visibilityState === 'visible') void refresh() }, 4000)
    return () => { disposed = true; clearInterval(interval) }
  }, [load])
  useEffect(() => { setCaption(image?.caption ?? ''); setRevision(latest?.prompt ?? '') }, [image?.id, image?.caption, latest?.id, latest?.prompt])
  const action = async (fn: () => Promise<void>) => {
    setSubmitting(true); setError('')
    try { await fn(); await load() } catch (e) { setError(e instanceof Error ? e.message : 'API error') } finally { setSubmitting(false) }
  }
  const create = () => action(async () => {
    let current = project
    if (!current) {
      const instructions = [category ? `Category: ${conditions[category]}.` : '', selectedTags.length ? `Style and personality: ${selectedTags.map(tag => conditions[tag]).join(', ')}.` : '', prompt.trim()].filter(Boolean).join('\n')
      current = await generationRequest<GenerationProject>(token!, '/projects', 'POST', { prompt: instructions, reference })
      setProjects(prev => [current!, ...prev]); setParams({ project: current.id })
    }
    await generationRequest(token!, `/projects/${current.id}/images`, 'POST', { slot: 0, prompt: '중립 표정으로 전체 캐릭터 디자인을 보여주세요.' })
  })
  const attach = async (files: FileList | null) => {
    if (!files?.length || uploading) return
    if (files.length !== 1) { setError(t.oneImage); return }
    setUploading(true); setError('')
    try { setReference(await prepareReference(files[0])) } catch { setError(t.imageError) } finally { setUploading(false) }
  }
  if (!token) return <Navigate to="/login?next=/generate" replace />
  const cost = project?.images.reduce((sum, i) => sum + Number(i.cost_usd ?? i.reserve_usd), 0) ?? 0
  const cardImage = (i: GenerationImage | undefined, label: string) => i?.url ? <img src={i.url} alt={label} className="h-full w-full object-contain" /> : <Sparkles className="h-10 w-10 text-brand/40" />
  return <div className="min-h-screen bg-[#FAFBFC]">
    <Header center={<NavMenu workspace />} sticky />
    <main className="layout-app py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold text-brand-dark">Glocalizer · {t.sample}</p><Button variant="outline" onClick={() => { setParams({ new: '1' }); setSlot(0); setPrompt(''); setReference(undefined); setCategory(undefined); setSelectedTags([]) }} disabled={busy || uploading}>{t.new}</Button></div>
      <h1 className="mt-4 text-[28px] font-extrabold tracking-tight sm:text-[36px]">{t.title}</h1>
      <p className="mt-3 text-sub">{t.subtitle}</p>
      {!enabled && !loading && <p role="status" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t.disabled}</p>}
      {error && <div role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}<Button variant="ghost" size="sm" onClick={() => action(load)}>{t.retry}</Button></div>}
      {loading ? <p className="mt-8 text-sub">{t.loading}</p> : !project ? <section className="mx-auto mt-10 max-w-2xl rounded-[28px] border border-gray-200 bg-white p-5 sm:p-7">
        <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false) }} onDrop={e => { e.preventDefault(); setDragging(false); void attach(e.dataTransfer.files) }} className={`flex min-h-60 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-6 text-center transition-colors ${dragging ? 'border-brand bg-brand-soft' : 'border-gray-200 bg-[#FAFBFC]'}`} aria-busy={uploading}>
          {reference ? <><img src={reference} alt={t.attach} className="h-32 w-full object-contain" /><div className="flex flex-wrap justify-center gap-2"><Button variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={uploading}>{t.fileSelect}</Button><Button variant="ghost" size="sm" onClick={() => setReference(undefined)} disabled={uploading}>{t.remove}</Button></div></> : <><span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark">{uploading ? <LoaderCircle className="animate-spin" size={30} /> : <ImagePlus size={30} />}</span><h2 className="text-base font-extrabold">{t.dropTitle}</h2><p className="text-sm leading-6 text-sub">{t.dropHelp}</p><Button size="sm" onClick={() => fileInput.current?.click()} disabled={uploading}>{t.fileSelect}</Button></>}
        </div>
        <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" aria-label={t.attach} className="hidden" onChange={e => { void attach(e.target.files); e.target.value = '' }} />
        <fieldset className="mt-6"><legend className="text-sm font-bold">{t.category}<span className="ml-2 text-xs font-normal text-sub">{t.optional}</span></legend><div className="mt-3 flex flex-wrap gap-2">{categories.map(value => <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(prev => prev === value ? undefined : value)} className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${category === value ? 'border-brand bg-brand-soft text-brand-dark' : 'border-gray-200 text-sub hover:border-brand'}`}>{t[value]}</button>)}</div></fieldset>
        <fieldset className="mb-6 mt-5"><legend className="text-sm font-bold">{t.tags}<span className="ml-2 text-xs font-normal text-sub">{t.optional}</span></legend><div className="mt-3 flex flex-wrap gap-2">{tags.map(value => <button key={value} type="button" aria-pressed={selectedTags.includes(value)} onClick={() => setSelectedTags(prev => prev.includes(value) ? prev.filter(tag => tag !== value) : [...prev, value])} className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${selectedTags.includes(value) ? 'border-brand bg-brand-soft font-bold text-brand-dark' : 'border-gray-200 text-sub hover:border-brand'}`}># {t[value]}</button>)}</div></fieldset>
        <label htmlFor="character-prompt" className="font-bold">{t.prompt}</label>
        <textarea id="character-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={700} placeholder={t.placeholder} className="mt-4 min-h-32 w-full resize-y rounded-2xl bg-surface p-4 outline-none focus:ring-2 focus:ring-brand" />
        <div className="mt-4 flex justify-end"><Button onClick={create} disabled={!enabled || submitting || uploading || !prompt.trim()}><Sparkles size={18} />{t.create}</Button></div>
      </section> : <div className="mt-8 grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <section className="min-w-0 rounded-[28px] border border-gray-200 bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-extrabold">{slot === 0 ? t.base : `${t.expressions} ${slot}`}</h2>{project.confirmed && <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-dark">{t.confirmed}</span>}</div>
          <p className="mt-2 break-words text-sm text-sub">{project.prompt}</p>
          <div className="relative mx-auto mt-5 flex aspect-[740/640] max-w-md items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-[repeating-conic-gradient(#f2f4f6_0%_25%,white_0%_50%)] bg-[length:20px_20px]">
            {cardImage(image, slot === 0 ? t.base : t.expressions)}
            {caption && image && <span className="absolute left-0 right-0 top-[2%] text-center text-[clamp(15px,3vw,22px)] font-black text-ink [paint-order:stroke] [-webkit-text-stroke:3px_white]">{caption}</span>}
            {latest && ['queued', 'running'].includes(latest.status) && <span role="status" className="absolute bottom-4 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm shadow-sm"><LoaderCircle size={16} className="animate-spin" />{t[latest.status as 'queued' | 'running']}</span>}
          </div>
          {latest?.error && <p className="mt-3 text-sm text-red-600">{latest.error}</p>}
          {!latest && <p className="mt-3 text-sm text-sub">{t.missing}</p>}
          <div className="mt-5 grid grid-cols-4 gap-2">{[0, 1, 2, 3].map(s => {
            const completed = [...project.images].reverse().find(i => i.slot === s && i.status === 'completed')
            const newest = project.images.filter(i => i.slot === s).at(-1)
            return <button key={s} onClick={() => setSlot(s)} aria-pressed={slot === s} aria-label={s === 0 ? t.base : `${t.expressions} ${s}`} className={`overflow-hidden rounded-xl border-2 p-1 ${slot === s ? 'border-brand bg-brand-soft' : 'border-gray-100'}`}><div className="flex aspect-square items-center justify-center">{cardImage(completed, s === 0 ? t.base : `${t.expressions} ${s}`)}</div><span className="block truncate text-[11px]">{newest && newest.status !== 'completed' ? t[newest.status] : s === 0 ? t.base : `${t.expressions} ${s}`}</span></button>
          })}</div>
          {slot === 0 && !project.confirmed && <Button className="mt-5 w-full" disabled={!image || busy} onClick={() => action(async () => { await generationRequest(token, `/projects/${project.id}/confirm`, 'POST'); setSlot(1) })}>{t.confirm}<ArrowRight size={16} /></Button>}
          {!latest && slot === 0 && <Button className="mt-3 w-full" onClick={create} disabled={busy || !enabled}>{t.create}</Button>}
          <p className="mt-5 text-xs leading-5 text-sub">{t.format}</p>
        </section>
        <aside className="min-w-0 space-y-5">
          <section className="rounded-3xl border border-gray-200 bg-white p-5"><h2 className="font-extrabold">{t.expressions}</h2><div className="mt-4 space-y-3">{poses.map((pose, index) => <label key={index} className="block text-xs font-bold text-sub">{index + 1}<input value={pose} maxLength={500} onChange={e => setPoses(prev => prev.map((value, i) => i === index ? e.target.value : value))} className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm text-ink" /></label>)}</div><Button className="mt-4 h-auto min-h-11 w-full py-2" disabled={!enabled || busy || !project.confirmed || project.images.some(i => i.slot !== 0) || poses.some(p => !p.trim())} onClick={() => action(async () => { await generationRequest(token, `/projects/${project.id}/samples`, 'POST', { prompts: poses }); setSlot(1) })}>{t.generate}</Button></section>
          {image && <section className="rounded-3xl border border-gray-200 bg-white p-5"><label className="text-sm font-bold" htmlFor="sticker-caption">{t.caption}</label><input id="sticker-caption" maxLength={16} value={caption} onChange={e => setCaption(e.target.value)} className="mt-3 w-full rounded-xl border border-gray-200 p-3" /><Button variant="outline" className="mt-3 w-full" disabled={submitting} onClick={() => action(async () => { await generationRequest(token, `/projects/${project.id}/images/${image.id}`, 'PATCH', { caption }) })}>{t.save}</Button><Button className="mt-2 w-full" disabled={submitting} onClick={() => action(async () => { await generationRequest(token, `/projects/${project.id}/images/${image.id}`, 'PATCH', { caption }); await downloadGeneration(token, project.id, image.id) })}>{t.download}</Button></section>}
          {latest && !(slot === 0 && project.confirmed) && <section className="rounded-3xl border border-gray-200 bg-white p-5"><label htmlFor="revision" className="text-sm font-bold">{t.editPrompt}</label><textarea id="revision" value={revision} maxLength={500} onChange={e => setRevision(e.target.value)} className="mt-3 min-h-20 w-full rounded-xl border border-gray-200 p-3" /><Button variant="outline" className="mt-3 h-auto min-h-11 w-full py-2" disabled={!enabled || busy || !revision.trim()} onClick={() => action(async () => { await generationRequest(token, `/projects/${project.id}/images`, 'POST', { slot, prompt: revision }) })}>{t.regenerate}</Button></section>}
          <p className="px-2 text-xs leading-5 text-sub">{t.budget}: ${cost.toFixed(3)}<br />{t.unknown}<br />{t.limit}</p>
        </aside>
      </div>}
      <section className="mt-10"><h2 className="text-lg font-extrabold">{t.history}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{projects.map(p => <button key={p.id} onClick={() => { setParams({ project: p.id }); setSlot(0) }} className="flex min-w-0 items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark"><Sparkles size={20} /></span><span className="min-w-0"><span className="block truncate font-bold">{p.prompt}</span><span className="text-xs text-sub">{p.day} · {p.images.filter(i => i.status === 'completed').length} PNG</span></span></button>)}</div></section>
    </main>
  </div>
}

import { enqueueRemainingGeneration } from '../lib/generationApi'
import { workflowCopy } from '../i18n/workflow'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Astroid, CheckCircle2, Download, Globe2, LoaderCircle, Plus, ShieldCheck, Sparkles, X } from 'lucide-react'
import AILocalizationBadge from '../components/AILocalizationBadge'
import Button from '../components/Button'
import Modal from '../components/Modal'
import RollingText from '../components/RollingText'
import StickerThumbnail from '../components/StickerThumbnail'
import { useAuth } from '../store/AuthContext'
import { useSiteLang } from '../i18n/LanguageContext'
import { generationCopy } from '../i18n/generation'
import { CAPTION_ANCHOR_X, CAPTION_ANCHOR_Y, CAPTION_HORIZONTALS, CAPTION_SIZES, CAPTION_VERTICALS, DEFAULT_CAPTION_STYLE, downloadGeneration, downloadGenerationSet, downloadGenerationSets, fetchGenerationFile, generationRequest, latestCompletedImages, prepareReference, thumbnailImage, type CaptionStyle, type GenerationImage, type GenerationProject, type StickerPlanItem } from '../lib/generationApi'
import { useUploads } from '../store/uploads'
import dragNDropImage from '../assets/GCFrontendUI/DragNDropIMG.svg'

const categories = ['animal', 'pet', 'person', 'baby', 'couple', 'food', 'drink', 'object', 'plant', 'fantasy', 'robot', 'monster'] as const
// 그림체와 성격은 고르는 결이 달라 묶음을 나눈다. 선택 상태는 하나로 합쳐 프롬프트에 붙인다.
const styleTags = ['simple', 'bold', 'pastel', 'vivid', 'monotone', 'watercolor', 'crayon', 'lineart', 'retro', 'glossy'] as const
const moodTags = ['cute', 'chubby', 'fluffy', 'playful', 'funny', 'chic', 'warm', 'cool', 'emotional', 'energetic'] as const
const tagGroups = [{ key: 'styleTags', values: styleTags }, { key: 'moodTags', values: moodTags }] as const
type CaptionSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'
type BatchDraftItem = { prompt: string; reference?: string }
type BatchDoneItem = { projectId: string; prompt: string }
const BATCH_STORAGE_KEY = 'glocalizer:generateBatch:v1'

function sameCaptionStyle(left: CaptionStyle, right: CaptionStyle): boolean {
  return left.anchor === right.anchor && left.size === right.size && left.color === right.color && left.stroke === right.stroke
}

const conditions = {
  animal: 'animal character', pet: 'pet dog or cat character', person: 'human character', baby: 'baby character',
  couple: 'couple of two characters', food: 'food character', drink: 'drink character', object: 'everyday object character',
  plant: 'plant or flower character', fantasy: 'fantasy creature character', robot: 'robot character', monster: 'friendly monster character',
  simple: 'simple minimal design', bold: 'bold thick outlines', pastel: 'soft pastel colors', vivid: 'vivid saturated colors',
  monotone: 'monotone limited palette', watercolor: 'watercolour painted texture', crayon: 'crayon hand-drawn texture',
  lineart: 'clean line art with flat fills', retro: 'retro 90s cartoon style', glossy: 'glossy shiny shading',
  cute: 'cute', chubby: 'chubby round body', fluffy: 'fluffy furry texture', playful: 'playful personality',
  funny: 'humorous and expressive', chic: 'chic personality', warm: 'warm and friendly', cool: 'cool and confident',
  emotional: 'soft emotional mood', energetic: 'energetic and lively',
}

function GenerationPageSkeleton({ label }: { label: string }) {
  return <div role="status" aria-label={label} aria-busy="true" className="mt-8 grid animate-pulse gap-5 motion-reduce:animate-none lg:grid-cols-[1fr_340px]"><span className="sr-only">{label}</span><div className="rounded-panel border border-gray-200 bg-white p-6"><div className="h-6 w-40 rounded bg-gray-200" /><div className="mx-auto mt-6 aspect-[740/640] max-w-md rounded-panel bg-gray-100" /><div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6">{Array.from({ length: 24 }, (_, i) => <div key={i} className="aspect-square rounded-panel bg-gray-100" />)}</div></div><div className="h-80 rounded-panel border border-gray-200 bg-white" /></div>
}

export default function Generate() {
  const { token, checkingSession } = useAuth(); const navigate = useNavigate(); const { addFiles } = useUploads(); const { lang } = useSiteLang(); const t = generationCopy(lang); const w = workflowCopy[lang]
  const [params, setParams] = useSearchParams(); const [projects, setProjects] = useState<GenerationProject[]>([]); const [enabled, setEnabled] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false)
  const [prompt, setPrompt] = useState(''); const [reference, setReference] = useState<string>(); const [category, setCategory] = useState<typeof categories[number]>(); const [selectedTags, setSelectedTags] = useState<(typeof styleTags[number] | typeof moodTags[number])[]>([]); const [dragging, setDragging] = useState(false); const [uploading, setUploading] = useState(false)
  const [slot, setSlot] = useState(0); const [caption, setCaption] = useState(''); const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(DEFAULT_CAPTION_STYLE); const [captionImageId, setCaptionImageId] = useState<string | null>(null); const [captionSaveStatus, setCaptionSaveStatus] = useState<CaptionSaveStatus>('idle'); const [revision, setRevision] = useState(''); const [planDraft, setPlanDraft] = useState<StickerPlanItem[]>([]); const [completeOpen, setCompleteOpen] = useState(false)
  const mutationLock = useRef(false); const planDirty = useRef(false); const planProjectId = useRef<string | undefined>(undefined);
  const [notice, setNotice] = useState('')
  const [creationMode, setCreationMode] = useState<'single' | 'batch'>('single')
  const [batchDraft, setBatchDraft] = useState<BatchDraftItem[]>([{ prompt: '' }])
  const [batchQueue, setBatchQueue] = useState<BatchDraftItem[]>([])
  const [batchDone, setBatchDone] = useState<BatchDoneItem[]>([])
  const [batchActive, setBatchActive] = useState(false)
  const batchFileInput = useRef<HTMLInputElement>(null); const batchFileIndex = useRef(0); const batchPendingItem = useRef<BatchDraftItem | null>(null)
  const fileInput = useRef<HTMLInputElement>(null); const polling = useRef(false); const captionSaveQueue = useRef<Promise<void>>(Promise.resolve()); const captionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null); const savedCaptionDrafts = useRef(new Map<string, { caption: string; style: CaptionStyle }>())
  const activeProject = projects.find(item => (item.status ?? 'active') === 'active')
  const project = projects.find(item => item.id === params.get('project')) ?? (params.get('new') === '1' ? undefined : activeProject ?? projects[0])
  polling.current = projects.some(item => item.images.some(image => ['queued', 'running'].includes(image.status)))
  const completedImages = useMemo(() => project ? latestCompletedImages(project) : [], [project])
  const completedSlots = useMemo(() => new Set(completedImages.map(image => image.slot)), [completedImages])
  const latest = project?.images.filter(image => image.slot === slot).at(-1)
  const currentPending = latest?.status === 'queued' || latest?.status === 'running'
  const image = completedImages.find(item => item.slot === slot)
  const projectStatus = project?.status ?? (completedImages.length === 24 ? 'completed' : 'active')
  const captionTargetKey = project && image ? `${project.id}:${image.id}` : ''
  const activeCaptionTarget = useRef('')
  activeCaptionTarget.current = captionTargetKey
  const busy = submitting || !!project?.images.some(item => ['queued', 'running'].includes(item.status))
  const plan = useMemo(() => project?.plan ?? [], [project])
  const pendingSlots = useMemo(() => new Set((project?.images ?? []).filter(item => item.status === 'queued' || item.status === 'running').map(item => item.slot)), [project])
  const remainingSlots = useMemo(() => planDraft.filter(item => !completedSlots.has(item.slot) && !pendingSlots.has(item.slot)).map(item => item.slot), [planDraft, completedSlots, pendingSlots])
  const load = useCallback(async () => { if (!token) return []; const [config, result] = await Promise.all([generationRequest<{ enabled: boolean }>(token, '/config'), generationRequest<{ projects: GenerationProject[] }>(token, '/projects')]); setEnabled(config.enabled); setProjects(result.projects); return result.projects }, [token])
  useEffect(() => { let disposed = false; const refresh = async () => { try { await load() } catch (reason) { if (!disposed) setError(reason instanceof Error ? reason.message : 'API error') } finally { if (!disposed) setLoading(false) } }; void refresh(); const interval = setInterval(() => { if (polling.current && document.visibilityState === 'visible') void refresh() }, 4000); return () => { disposed = true; clearInterval(interval) } }, [load])
  // 탭을 새로고침해도 일괄 생성 대기열/완료 목록이 유지되도록 로컬에 저장한다. 진행 중인 개별 캐릭터는
  // 서버 워커가 계속 처리하므로, 여기서는 "다음에 뭘 만들지"만 들고 있으면 된다.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BATCH_STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as { queue?: BatchDraftItem[]; done?: BatchDoneItem[]; active?: boolean }
      if (saved.queue?.length) setBatchQueue(saved.queue)
      if (saved.done?.length) setBatchDone(saved.done)
      if (saved.active) setBatchActive(true)
    } catch { /* 저장소를 못 읽어도(프라이빗 모드 등) 이번 세션에서 새로 시작하면 된다 */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    try {
      if (!batchActive && !batchQueue.length && !batchDone.length) { localStorage.removeItem(BATCH_STORAGE_KEY); return }
      localStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify({ queue: batchQueue, done: batchDone, active: batchActive }))
    } catch { /* 저장소를 못 써도 이번 탭에서는 그대로 진행된다 */ }
  }, [batchQueue, batchDone, batchActive])
  // Only hydrate drafts when selecting another image; polling updates must not replace an unsaved local draft.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setCaption(image?.caption ?? ''); setCaptionStyle(image?.caption_style ?? DEFAULT_CAPTION_STYLE); setCaptionImageId(image?.id ?? null); setCaptionSaveStatus('idle') }, [image?.id])
  useEffect(() => { setRevision(latest?.prompt ?? '') }, [latest?.id, latest?.prompt])
  const serverPlan = JSON.stringify(plan)
  useEffect(() => {
    if (planProjectId.current !== project?.id || !planDirty.current) {
      setPlanDraft(JSON.parse(serverPlan) as StickerPlanItem[])
      if (planProjectId.current !== project?.id) planDirty.current = false
      planProjectId.current = project?.id
    }
  }, [project?.id, serverPlan])
  const persistCaptionDraft = useCallback((projectId: string, imageId: string, draftCaption: string, draftStyle: CaptionStyle) => {
    const targetKey = `${projectId}:${imageId}`
    const operation = captionSaveQueue.current.catch(() => undefined).then(async () => {
      if (activeCaptionTarget.current === targetKey) setCaptionSaveStatus('saving')
      await generationRequest(token!, `/projects/${projectId}/images/${imageId}`, 'PATCH', { caption: draftCaption, style: draftStyle })
      savedCaptionDrafts.current.set(targetKey, { caption: draftCaption, style: draftStyle })
      setProjects(previous => previous.map(item => item.id !== projectId ? item : {
        ...item,
        images: item.images.map(projectImage => projectImage.id === imageId ? { ...projectImage, caption: draftCaption, caption_style: draftStyle } : projectImage),
      }))
      if (activeCaptionTarget.current === targetKey) setCaptionSaveStatus('saved')
    })
    captionSaveQueue.current = operation.catch(() => undefined)
    void operation.catch(() => { if (activeCaptionTarget.current === targetKey) setCaptionSaveStatus('error') })
    return operation
  }, [token])
  const flushCaptionDraft = useCallback(async () => {
    if (captionSaveTimer.current) {
      clearTimeout(captionSaveTimer.current)
      captionSaveTimer.current = null
    }
    if (!project || !image || projectStatus !== 'active' || captionImageId !== image.id) return captionSaveQueue.current
    const targetKey = `${project.id}:${image.id}`
    await captionSaveQueue.current
    const savedDraft = savedCaptionDrafts.current.get(targetKey)
    const savedCaption = savedDraft?.caption ?? image.caption ?? ''
    const savedStyle = savedDraft?.style ?? image.caption_style ?? DEFAULT_CAPTION_STYLE
    if (caption === savedCaption && sameCaptionStyle(captionStyle, savedStyle)) return
    await persistCaptionDraft(project.id, image.id, caption, captionStyle)
  }, [caption, captionImageId, captionStyle, image, project, projectStatus, persistCaptionDraft])
  const flushCaptionDraftRef = useRef(flushCaptionDraft)
  flushCaptionDraftRef.current = flushCaptionDraft
  useEffect(() => () => { void flushCaptionDraftRef.current().catch(() => undefined) }, [])
  useEffect(() => {
    if (!project || !image || projectStatus !== 'active' || captionImageId !== image.id) return
    const targetKey = `${project.id}:${image.id}`
    const savedDraft = savedCaptionDrafts.current.get(targetKey)
    const savedCaption = savedDraft?.caption ?? image.caption ?? ''
    const savedStyle = savedDraft?.style ?? image.caption_style ?? DEFAULT_CAPTION_STYLE
    if (caption === savedCaption && sameCaptionStyle(captionStyle, savedStyle)) return
    setCaptionSaveStatus('pending')
    const timer = setTimeout(() => {
      captionSaveTimer.current = null
      void persistCaptionDraft(project.id, image.id, caption, captionStyle).catch(() => undefined)
    }, 600)
    captionSaveTimer.current = timer
    return () => {
      clearTimeout(timer)
      if (captionSaveTimer.current === timer) captionSaveTimer.current = null
    }
  }, [caption, captionImageId, captionStyle, image, project, projectStatus, persistCaptionDraft])
  const selectSlot = async (nextSlot: number) => {
    try { await flushCaptionDraft(); setSlot(nextSlot) } catch { /* Keep the current image selected so its draft remains visible for retry. */ }
  }
  const selectProject = async (projectId: string) => {
    try { await flushCaptionDraft(); setParams({ project: projectId }); setSlot(0) } catch { /* Keep the current project selected so its draft remains visible for retry. */ }
  }
  const action = async (fn: () => Promise<unknown>) => {
    if (mutationLock.current) return
    mutationLock.current = true
    setSubmitting(true); setError(''); setNotice('')
    try { await fn(); await load() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'API error'); await load().catch(() => undefined) }
    finally { mutationLock.current = false; setSubmitting(false) }
  }
  // 단일 생성과 일괄 생성이 같은 "프로젝트 생성 + 대표 캐릭터 슬롯0 요청"을 공유한다.
  const createProject = (projectPrompt: string, projectReference?: string) => action(async () => { const created = await generationRequest<GenerationProject>(token!, '/projects', 'POST', { prompt: projectPrompt, reference: projectReference }); setProjects(previous => [created, ...previous]); setParams({ project: created.id }); await generationRequest(token!, `/projects/${created.id}/images`, 'POST', { slot: 0, prompt: '중립 표정으로 전체 캐릭터 디자인을 보여주세요.' }) })
  const create = () => { const instructions = [category ? `Category: ${conditions[category]}.` : '', selectedTags.length ? `Style and personality: ${selectedTags.map(tag => conditions[tag]).join(', ')}.` : '', prompt.trim()].filter(Boolean).join('\n'); return createProject(instructions, reference) }
  const attach = async (files: FileList | null, onDone?: (dataUrl: string) => void) => { if (!files?.length || uploading) return; if (files.length !== 1) { setError(t.oneImage); return } setUploading(true); setError(''); try { const dataUrl = await prepareReference(files[0]); if (onDone) onDone(dataUrl); else setReference(dataUrl) } catch { setError(t.imageError) } finally { setUploading(false) } }
  const updateBatchRow = (index: number, patch: Partial<BatchDraftItem>) => setBatchDraft(previous => previous.map((row, current) => current === index ? { ...row, ...patch } : row))
  const startBatch = () => {
    const queue = batchDraft.filter(row => row.prompt.trim()).map(row => ({ prompt: row.prompt.trim(), reference: row.reference }))
    if (!queue.length) return
    setBatchQueue(queue); setBatchDone([]); setBatchActive(true); setBatchDraft([{ prompt: '' }]); setCreationMode('single'); setError('')
  }
  const createPlan = () => action(async () => { const result = await generationRequest<{ plan: StickerPlanItem[] }>(token!, `/projects/${project!.id}/plan`, 'POST'); setPlanDraft(result.plan); planDirty.current = false })
  const savePlan = async () => { await generationRequest(token!, `/projects/${project!.id}/plan`, 'PATCH', { plan: planDraft }); planDirty.current = false }
  const generateAll = () => action(async () => {
    await flushCaptionDraft()
    const queued = await enqueueRemainingGeneration(token!, project!.id, planDraft)
    planDirty.current = false
    if (queued.slots.length) setSlot(queued.slots[0])
    if (queued.recovered) setNotice(w.batchRecovered)
  })
  const confirmBase = () => action(async () => {
    await flushCaptionDraft()
    try { await generationRequest(token!, `/projects/${project!.id}/confirm`, 'POST') }
    catch (error) {
      const fresh = await generationRequest<GenerationProject>(token!, `/projects/${project!.id}`)
      if (!fresh.confirmed) throw error
    }
    // Confirmation is durable even when the plan API fails; leave a visible retry action.
    try {
      const created = await generationRequest<{ plan: StickerPlanItem[] }>(token!, `/projects/${project!.id}/plan`, 'POST')
      setPlanDraft(created.plan); planDirty.current = false; setSlot(1)
    } catch { setError(w.planRetry) }
  })
  const sendToLocalization = () => action(async () => {
    if (!project || projectStatus !== 'completed') return
    const files: File[] = []
    for (let start = 0; start < completedImages.length; start += 4) files.push(...await Promise.all(completedImages.slice(start, start + 4).map(item => fetchGenerationFile(token!, project.id, item.id, item.slot))))
    addFiles(files); navigate('/localize')
  })
  const resetToNewWork = () => { setParams({ new: '1' }); setSlot(0); setPrompt(''); setReference(undefined); setCategory(undefined); setSelectedTags([]); setError('') }
  const startNew = async () => { try { await flushCaptionDraft() } catch { return } if (activeProject) { setParams({ project: activeProject.id }); setError(t.activeExists); return } resetToNewWork() }
  // 프로젝트 완료 후 진행 중 프로젝트가 남아 있는지 다시 확인한 다음 다음 작업을 엽니다. 일괄 생성 중이면
  // 방금 끝난 캐릭터를 완료 목록에 적어두기만 하고, 다음 캐릭터를 실제로 시작하는 건 아래 오케스트레이션
  // effect가 project가 undefined로 바뀐 걸 보고 이어서 한다(락을 쥔 채로 다음 action을 호출할 수 없어서다).
  const completeProject = async () => {
    if (!project || mutationLock.current) return
    mutationLock.current = true
    setSubmitting(true); setError('')
    try {
      await flushCaptionDraft()
      await generationRequest(token!, `/projects/${project.id}/complete`, 'POST')
      setCompleteOpen(false)
      if (batchActive) setBatchDone(previous => [...previous, { projectId: project.id, prompt: project.prompt }])
      const freshProjects = await load() ?? []
      const stillActive = freshProjects.find(item => (item.status ?? 'active') === 'active')
      if (stillActive) { setParams({ project: stillActive.id }); setError(t.activeExists) } else resetToNewWork()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'API error') } finally { mutationLock.current = false; setSubmitting(false) }
  }
  // 일괄 생성 오케스트레이션: 사람이 매번 누르던 확정→구성→생성→완료 단계를 폴링 결과를 보고 자동으로 이어간다.
  // 대표 캐릭터 확정도 사람 승인 없이 자동 통과시킨다 — 캐릭터 하나(~24장)당 실비용이 작아서(~$1.4) 이상한
  // 결과가 나와도 낭비가 크지 않고, "자동으로 다 돌린다"는 요청에 맞춘 선택이다. 나중에 승인 단계를 되살리고
  // 싶으면 이 블록의 confirmBase 자동 호출 조건만 지우면 된다.
  useEffect(() => {
    if (!batchActive || loading || submitting || mutationLock.current) return
    if (!activeProject) {
      // 서버에 진행 중인 프로젝트가 없다(막 완료됐거나 아직 시작 전) — 다음 캐릭터를 만들 차례다. project가
      // 아니라 activeProject로 판단해야, 사용자가 지난 프로젝트를 구경하는 중이어도 배치가 멈추지 않는다.
      // action()은 실패해도 던지지 않고 error만 채우므로, 시도 중인 항목은 성공(= activeProject가 생겨남)을
      // 직접 확인하기 전까지 큐에서 빼지 않는다 — 안 그러면 일시적 실패로 캐릭터 하나가 그냥 사라진다.
      if (batchPendingItem.current || !batchQueue.length) { if (!batchQueue.length) setBatchActive(false); return }
      batchPendingItem.current = batchQueue[0]
      void createProject(batchQueue[0].prompt, batchQueue[0].reference)
      return
    }
    if (!project) return // activeProject는 있지만 아직 목록에 막 반영되는 중 — 다음 폴링을 기다린다
    if (batchPendingItem.current) { setBatchQueue(previous => previous.slice(1)); batchPendingItem.current = null }
    // 사용자가 "생성 작업" 목록에서 다른(지난) 프로젝트를 보고 있는 동안에는 건드리지 않는다 — confirmBase 등은
    // 화면에 보이는 project를 기준으로 동작하므로, 여기서 넘어가면 엉뚱한 프로젝트를 자동 확정/완료시킬 수 있다.
    // 서버는 소유자당 active 프로젝트를 1개만 허용하므로, 지금 활성 프로젝트는 항상 배치가 만든 그 캐릭터다.
    if (project.id !== activeProject.id) return
    if (!project.confirmed) {
      if (completedImages.some(item => item.slot === 0) && !pendingSlots.has(0)) void confirmBase()
      return
    }
    if (remainingSlots.length > 0 && pendingSlots.size === 0) { void generateAll(); return }
    if (completedImages.length === 24 && pendingSlots.size === 0) void completeProject()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchActive, loading, submitting, project, activeProject, projectStatus, completedImages, pendingSlots, remainingSlots, plan.length, batchQueue])
  // 예산 한도 등으로 어느 단계든 실패하면(action()이 error를 채운다) 같은 요청을 계속 재시도하지 않도록 멈춘다.
  // batchQueue/batchDone은 그대로 둬서, 사용자가 "이어서 진행"을 누르면 멈춘 지점부터 다시 시작할 수 있다.
  useEffect(() => { if (batchActive && error) { setBatchActive(false); batchPendingItem.current = null } }, [error]) // eslint-disable-line react-hooks/exhaustive-deps
  if (checkingSession) return <div role="status" className="p-8 text-center">{w.checkingSession}</div>
  if (!token) return <Navigate to={`/login?next=${encodeURIComponent(`/generate?${params.toString()}`)}`} replace />
  const cardImage = (item: GenerationImage | undefined, label: string) => item?.url ? <img src={item.url} alt={label} className="h-full w-full object-contain" /> : <Sparkles className="h-8 w-8 text-brand/35" />

  return <div className="studio-generate min-h-screen bg-[#FAFBFC]"><main className="layout-app py-8 sm:py-12">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold text-brand-dark">Glocalizer · {t.sample}</p><Button variant="outline" onClick={startNew} disabled={busy || uploading}>{t.new}</Button></div><h1 className="mt-4 text-[28px] font-extrabold tracking-tight sm:text-[36px]">{t.title}</h1><p className="mt-3 text-sub">{t.subtitle}</p><div className="mt-3"><AILocalizationBadge label={t.aiGenerated} /></div>
    {!enabled && !loading && <p role="status" className="mt-5 rounded-panel border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t.disabled}</p>}{error && <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-panel bg-red-50 p-4 text-sm text-red-700"><span>{error}</span><div className="flex gap-2">{!batchActive && batchQueue.length > 0 && <Button variant="ghost" size="sm" onClick={() => { setError(''); setBatchActive(true) }}>{t.resumeBatch}</Button>}<Button variant="ghost" size="sm" onClick={() => action(load)}>{t.retry}</Button></div></div>}
    {notice && <p role="status" className="mt-5 rounded-panel bg-brand-soft p-4 text-sm text-brand-dark">{notice}</p>}
    {batchActive && <section role="status" aria-live="polite" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-panel border border-brand/20 bg-brand-soft/60 p-4"><p className="text-sm font-bold text-brand-dark">{t.batchProgress.replace('{done}', String(batchDone.length)).replace('{total}', String(batchDone.length + batchQueue.length + (project ? 1 : 0)))}</p><Button variant="outline" size="sm" onClick={() => setBatchActive(false)}>{t.batchCancel}</Button></section>}
    {!batchActive && batchDone.length > 0 && <section className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-panel border border-brand/20 bg-brand-soft/60 p-4"><p className="text-sm font-bold text-brand-dark">{t.batchFinished.replace('{n}', String(batchDone.length))}</p><div className="flex gap-2"><Button size="sm" disabled={submitting} onClick={() => action(async () => { await downloadGenerationSets(token!, projects.filter(item => batchDone.some(done => done.projectId === item.id))) })}><Download size={14} />{t.downloadAllSets}</Button><Button variant="ghost" size="sm" onClick={() => setBatchDone([])}>{t.dismiss}</Button></div></section>}
    {loading ? <GenerationPageSkeleton label={t.loading} /> : !project ? <section className="mx-auto mt-10 max-w-2xl rounded-panel border border-gray-200 bg-white p-5 sm:p-7">
      <div className="flex gap-2"><button type="button" aria-pressed={creationMode === 'single'} onClick={() => setCreationMode('single')} className={`rounded-control border px-4 py-2 text-sm font-bold ${creationMode === 'single' ? 'border-brand bg-brand-soft text-brand-dark' : 'border-gray-200 text-sub'}`}>{t.singleTab}</button><button type="button" aria-pressed={creationMode === 'batch'} onClick={() => setCreationMode('batch')} className={`rounded-control border px-4 py-2 text-sm font-bold ${creationMode === 'batch' ? 'border-brand bg-brand-soft text-brand-dark' : 'border-gray-200 text-sub'}`}>{t.batchTab}</button></div>
      {creationMode === 'single' ? <>
      <div className={`studio-upload relative isolate mt-5 flex min-h-60 flex-col items-center justify-center gap-3 rounded-panel border-2 border-dashed p-6 text-center transition-[border-color,background-color] duration-300 ${dragging ? 'border-brand bg-brand-soft' : 'border-gray-200 bg-[#FAFBFC] hover:border-brand/70 '}`} onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false) }} onDrop={event => { event.preventDefault(); setDragging(false); void attach(event.dataTransfer.files) }} data-dragging={dragging}>{reference ? <><img src={reference} alt={t.attach} className="h-32 w-full object-contain" /><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>{t.fileSelect}</Button><Button variant="ghost" size="sm" onClick={() => setReference(undefined)}>{t.remove}</Button></div></> : <><span className="flex h-16 w-16 items-center justify-center rounded-panel bg-brand-soft text-brand-dark">{uploading ? <LoaderCircle className="animate-spin" size={30} /> : <img src={dragNDropImage} alt="" aria-hidden className="h-10 w-10" />}</span><h2 className="font-extrabold">{t.dropTitle}</h2><p className="text-sm text-sub">{t.dropHelp}</p><Button size="sm" onClick={() => fileInput.current?.click()}>{t.fileSelect}</Button></>}</div><input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event => { void attach(event.target.files); event.target.value = '' }} />
      <fieldset className="mt-6"><legend className="text-sm font-bold">{t.category}<span className="ml-2 text-xs font-normal text-sub">{t.optional}</span></legend><div className="mt-3 flex flex-wrap gap-2">{categories.map(value => <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(previous => previous === value ? undefined : value)} className={`rounded-control border px-4 py-2 text-sm font-bold ${category === value ? 'border-brand bg-brand-soft text-brand-dark' : 'border-gray-200 text-sub'}`}>{t[value]}</button>)}</div></fieldset>
      {tagGroups.map(group => <fieldset key={group.key} className="mt-5"><legend className="text-sm font-bold">{t[group.key]}<span className="ml-2 text-xs font-normal text-sub">{t.optional}</span></legend><div className="mt-3 flex flex-wrap gap-2">{group.values.map(value => <button key={value} type="button" aria-pressed={selectedTags.includes(value)} onClick={() => setSelectedTags(previous => previous.includes(value) ? previous.filter(tag => tag !== value) : [...previous, value])} className={`rounded-control border px-3 py-1.5 text-sm ${selectedTags.includes(value) ? 'border-brand bg-brand-soft font-bold text-brand-dark' : 'border-gray-200 text-sub'}`}># {t[value]}</button>)}</div></fieldset>)}
      <label htmlFor="character-prompt" className="mt-8 block font-bold">{t.prompt}</label><textarea id="character-prompt" value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={700} placeholder={t.placeholder} className="mt-3 min-h-32 w-full resize-y rounded-control bg-surface p-4 outline-none focus:ring-2 focus:ring-brand" /><div className="mt-4 flex justify-end"><Button onClick={create} disabled={!enabled || submitting || uploading || !prompt.trim()}><Sparkles size={18} />{t.create}</Button></div>
      </> : <div className="mt-5">
        <p className="text-sm text-sub">{t.sample}</p>
        <div className="mt-4 space-y-4">{batchDraft.map((row, index) => <div key={index} className="rounded-panel border border-gray-200 p-4"><div className="flex items-center justify-between gap-2"><p className="text-xs font-extrabold text-brand-dark">{t.batchCharacter.replace('{n}', String(index + 1))}</p>{batchDraft.length > 1 && <button type="button" onClick={() => setBatchDraft(previous => previous.filter((_, current) => current !== index))} className="text-xs font-bold text-sub hover:text-red-600"><X size={14} className="inline" /> {t.removeCharacter}</button>}</div>
          <textarea value={row.prompt} onChange={event => updateBatchRow(index, { prompt: event.target.value })} maxLength={700} placeholder={t.placeholder} className="mt-2 min-h-20 w-full resize-y rounded-control bg-surface p-3 text-sm outline-none focus:ring-2 focus:ring-brand" />
          <div className="mt-2">{row.reference ? <div className="flex items-center gap-2"><img src={row.reference} alt={t.attach} className="h-14 w-14 rounded-control object-contain" /><Button variant="ghost" size="sm" onClick={() => updateBatchRow(index, { reference: undefined })}>{t.remove}</Button></div> : <Button variant="outline" size="sm" disabled={uploading} onClick={() => { batchFileIndex.current = index; batchFileInput.current?.click() }}>{t.attach}</Button>}</div>
        </div>)}</div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><Button variant="outline" size="sm" onClick={() => setBatchDraft(previous => [...previous, { prompt: '' }])}><Plus size={16} />{t.addCharacter}</Button><Button disabled={!enabled || submitting || !batchDraft.some(row => row.prompt.trim())} onClick={startBatch}><Sparkles size={18} />{t.startBatch}</Button></div>
        <input ref={batchFileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event => { void attach(event.target.files, dataUrl => updateBatchRow(batchFileIndex.current, { reference: dataUrl })); event.target.value = '' }} />
      </div>}
    </section> : <><section className="mt-8 rounded-panel border border-gray-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-brand-dark">{projectStatus === 'completed' ? t.statusCompleted : t.statusActive}</p><h2 className="mt-1 text-xl font-extrabold">{completedImages.length}/24 {t.progress}</h2>{pendingSlots.size > 0 && <p role="status" aria-live="polite" className="mt-1 flex items-center gap-2 text-sm font-bold text-brand-dark"><LoaderCircle size={14} className="animate-spin" />{t.generating.replace('{n}', String(pendingSlots.size))}</p>}</div>{projectStatus === 'completed' && <CheckCircle2 className="text-brand" />}</div><div className="mt-4 flex h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-brand transition-[width]" style={{ width: `${completedImages.length / 24 * 100}%` }} /><div className="sticker-shimmer h-full bg-brand/30 transition-[width]" style={{ width: `${pendingSlots.size / 24 * 100}%` }} /></div></section>
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_340px]"><section className="min-w-0 rounded-panel border border-gray-200 bg-white p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-extrabold">{slot === 0 ? t.base : `${t.expressions} ${slot}`}</h2>{project.confirmed && <span className="rounded-badge bg-brand-soft px-3 py-1 text-xs font-bold text-brand-dark">{t.confirmed}</span>}</div><p className="mt-2 break-words text-sm text-sub">{project.prompt}</p>
        <div className="relative mx-auto mt-5 flex aspect-[740/640] max-w-md items-center justify-center overflow-hidden rounded-panel border border-gray-100 bg-[repeating-conic-gradient(#f2f4f6_0%_25%,white_0%_50%)] bg-[length:20px_20px] [container-type:inline-size]">{!currentPending && cardImage(image, slot === 0 ? t.base : `${t.expressions} ${slot}`)}{caption && image && (() => { const [vertical, horizontal] = captionStyle.anchor.split('-'); const shift = horizontal === 'center' ? '-50%' : horizontal === 'right' ? '-100%' : '0'; return <span className="absolute whitespace-nowrap font-black [paint-order:stroke]" style={{ left: `${(CAPTION_ANCHOR_X[horizontal] ?? 370) / 740 * 100}%`, top: `${(CAPTION_ANCHOR_Y[vertical] ?? 56) / 640 * 100}%`, transform: `translate(${shift}, -100%)`, fontSize: `${captionStyle.size / 740 * 100}cqw`, color: captionStyle.color, WebkitTextStroke: `${captionStyle.size / 740 * 100 * 0.15}cqw ${captionStyle.stroke}` }}>{caption}</span> })()}{currentPending && <div role="status" aria-live="polite" className="sticker-shimmer absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/85"><span className="flex h-12 w-12 items-center justify-center rounded-panel bg-brand-soft text-brand-dark"><Astroid className="h-6 w-6" /></span><span className="sr-only">{latest.status === 'queued' ? t.queued : t.aiWorking}</span>{latest.status === 'queued' ? <span className="text-base font-extrabold text-brand-dark">{t.queued}</span> : <RollingText items={[t.drawingStage1, t.drawingStage2, t.drawingStage3]} className="text-base font-extrabold text-brand-dark" />}</div>}</div>{latest?.error && <p className="mt-3 text-sm text-red-600">{latest.error}</p>}{!latest && <p className="mt-3 text-sm text-sub">{t.missing}</p>}
        <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6">{Array.from({ length: 24 }, (_, currentSlot) => { const completed = completedImages.find(item => item.slot === currentSlot); const newest = project.images.filter(item => item.slot === currentSlot).at(-1); return <button key={currentSlot} type="button" onClick={() => { void selectSlot(currentSlot) }} aria-pressed={slot === currentSlot} className={`overflow-hidden rounded-control border-2 p-1 ${slot === currentSlot ? 'border-brand bg-brand-soft' : 'border-gray-100'}`}><div className={`flex aspect-square items-center justify-center overflow-hidden rounded-lg ${pendingSlots.has(currentSlot) ? 'sticker-shimmer bg-brand-soft/60' : ''}`}>{cardImage(completed, `${currentSlot + 1}`)}</div><span className="block truncate text-[11px]">{newest && newest.status !== 'completed' ? t[newest.status] : currentSlot === 0 ? t.base : `${currentSlot + 1}`}</span></button> })}</div>
        {slot === 0 && !project.confirmed && <Button className="mt-5 w-full" disabled={!image || busy} onClick={confirmBase}>{t.confirm}<ArrowRight size={16} /></Button>}{!latest && slot === 0 && <Button className="mt-3 w-full" onClick={() => action(async () => { await generationRequest(token, `/projects/${project.id}/images`, 'POST', { slot: 0, prompt: '중립 표정으로 전체 캐릭터 디자인을 보여주세요.' }) })} disabled={busy || !enabled}>{t.create}</Button>}<p className="mt-5 text-xs leading-5 text-sub">{t.format}</p></section>
      <aside className="min-w-0 space-y-5">{project.confirmed && projectStatus === 'active' && <section className="rounded-panel border border-gray-200 bg-white p-5"><h2 className="font-extrabold">{t.planTitle}</h2><p className="mt-2 text-sm leading-6 text-sub">{t.planDescription}</p>{planDraft.length === 0 ? <Button className="mt-4 w-full" disabled={busy} onClick={createPlan}><Sparkles size={17} />{t.createPlan}</Button> : <><details className="mt-4"><summary className="cursor-pointer rounded-panel bg-surface px-4 py-3 text-sm font-bold">{t.editPlan}</summary><div className="mt-3 max-h-[480px] space-y-3 overflow-y-auto pr-1">{planDraft.map((item, index) => <div key={item.slot} className="rounded-panel border border-gray-100 p-3"><p className="text-xs font-extrabold text-brand-dark">{item.slot + 1}/24</p><input value={item.pose} disabled={completedSlots.has(item.slot)} maxLength={500} onChange={event => { planDirty.current = true; setPlanDraft(previous => previous.map((value, current) => current === index ? { ...value, pose: event.target.value } : value)) }} className="mt-2 w-full rounded-control border border-gray-200 p-2.5 text-sm disabled:bg-gray-50" /><input value={item.caption} disabled={completedSlots.has(item.slot)} maxLength={16} onChange={event => { planDirty.current = true; setPlanDraft(previous => previous.map((value, current) => current === index ? { ...value, caption: event.target.value } : value)) }} className="mt-2 w-full rounded-control border border-gray-200 p-2.5 text-sm disabled:bg-gray-50" /></div>)}</div><Button variant="outline" className="mt-3 w-full" disabled={busy || planDraft.some(item => !item.pose.trim())} onClick={() => action(savePlan)}>{t.savePlan}</Button></details><Button className="mt-4 w-full" disabled={!enabled || busy || !remainingSlots.length || planDraft.some(item => !item.pose.trim())} onClick={generateAll}>{submitting ? <LoaderCircle className="animate-spin" size={17} /> : <Sparkles size={17} />}{submitting ? t.generating.replace('{n}', String(remainingSlots.length)) : t.generateAll.replace('{n}', String(remainingSlots.length))}</Button><p className="mt-3 text-xs leading-5 text-sub">{t.autoNote}</p></>}</section>}
        {image && <section className="rounded-panel border border-gray-200 bg-white p-5">
          <label className="text-sm font-bold" htmlFor="sticker-caption">{t.caption}</label>
          <input id="sticker-caption" maxLength={16} value={caption} disabled={projectStatus === 'completed'} onChange={event => setCaption(event.target.value)} className="mt-3 w-full rounded-control border border-gray-200 p-3 disabled:bg-gray-50" />
          {captionSaveStatus !== 'idle' && <p role="status" aria-live="polite" className="mt-2 min-h-5 text-xs text-sub">{captionSaveStatus === 'pending' ? t.captionSavePending : captionSaveStatus === 'saving' ? t.captionSaving : captionSaveStatus === 'saved' ? t.saved : t.captionSaveFailed}</p>}
          {projectStatus === 'active' && <details className="mt-4">
            <summary className="cursor-pointer rounded-panel bg-surface px-4 py-3 text-sm font-bold">{t.captionStyleTitle}</summary>
            <p className="mt-3 text-xs leading-5 text-sub">{t.captionAutoNote}</p>
            <p className="mt-4 text-xs font-bold text-sub">{t.captionPosition}</p>
            <div className="mt-2 grid w-fit grid-cols-3 gap-1.5">{CAPTION_VERTICALS.flatMap(vertical => CAPTION_HORIZONTALS.map(horizontal => { const value = `${vertical}-${horizontal}`; return <button key={value} type="button" aria-label={value} aria-pressed={captionStyle.anchor === value} onClick={() => setCaptionStyle(previous => ({ ...previous, anchor: value }))} className={`h-8 w-10 rounded-control border-2 ${captionStyle.anchor === value ? 'border-brand bg-brand-soft' : 'border-gray-200'}`} /> }))}</div>
            <p className="mt-4 text-xs font-bold text-sub">{t.captionSize}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{CAPTION_SIZES.map(size => <button key={size} type="button" aria-pressed={captionStyle.size === size} onClick={() => setCaptionStyle(previous => ({ ...previous, size }))} className={`rounded-control border-2 px-3 py-1.5 font-bold ${captionStyle.size === size ? 'border-brand bg-brand-soft text-brand-dark' : 'border-gray-200 text-sub'}`} style={{ fontSize: `${Math.round(size / 4)}px` }}>가</button>)}</div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-sub">{t.captionColor}<input type="color" aria-label={t.captionColor} value={captionStyle.color} onChange={event => setCaptionStyle(previous => ({ ...previous, color: event.target.value }))} className="h-9 w-12 cursor-pointer rounded-control border border-gray-200 bg-white p-1" /></label>
              <label className="flex items-center gap-2 text-xs font-bold text-sub">{t.captionOutline}<input type="color" aria-label={t.captionOutline} value={captionStyle.stroke} onChange={event => setCaptionStyle(previous => ({ ...previous, stroke: event.target.value }))} className="h-9 w-12 cursor-pointer rounded-control border border-gray-200 bg-white p-1" /></label>
            </div>
            <Button variant="ghost" size="sm" className="mt-3" disabled={submitting} onClick={() => setCaptionStyle(image.caption_style ?? DEFAULT_CAPTION_STYLE)}>{t.captionReset}</Button>
          </details>}
          {projectStatus === 'active' && <Button variant="outline" className="mt-3 w-full" disabled={submitting} onClick={() => { void flushCaptionDraft().catch(() => undefined) }}>{t.save}</Button>}
          <Button className="mt-2 w-full" disabled={submitting} onClick={() => action(async () => { await flushCaptionDraft(); await downloadGeneration(token, project.id, image.id) })}>{t.download}</Button>
        </section>}
        {latest && projectStatus === 'active' && !(slot === 0 && project.confirmed) && <section className="rounded-panel border border-gray-200 bg-white p-5"><label htmlFor="revision" className="text-sm font-bold">{t.editPrompt}</label><textarea id="revision" value={revision} maxLength={500} onChange={event => setRevision(event.target.value)} className="mt-3 min-h-20 w-full rounded-control border border-gray-200 p-3" /><Button variant="outline" className="mt-3 w-full" disabled={!enabled || busy || !revision.trim()} onClick={() => action(async () => { await flushCaptionDraft(); await generationRequest(token, `/projects/${project.id}/images`, 'POST', { slot, prompt: revision }) })}>{t.regenerate}</Button></section>}
        {projectStatus === 'active' && completedImages.length === 24 && <section className="rounded-panel border border-brand/20 bg-brand-soft/50 p-5"><h2 className="font-extrabold">{t.readyTitle}</h2><p className="mt-2 text-sm leading-6 text-sub">{t.readyDescription}</p><Button className="mt-4 w-full" onClick={() => setCompleteOpen(true)} disabled={busy}>{t.complete}</Button></section>}
        {projectStatus === 'completed' && <section className="rounded-panel border border-brand/20 bg-brand-soft/50 p-5"><h2 className="font-extrabold">{t.nextTitle}</h2><p className="mt-2 text-sm leading-6 text-sub">{t.nextDescription}</p><Button className="mt-4 w-full" disabled={submitting} onClick={() => action(async () => { await downloadGenerationSet(token, project) })}><Download size={17} />{t.downloadSet}</Button><Button variant="outline" className="mt-2 w-full" disabled={submitting} onClick={() => { void sendToLocalization() }}><Globe2 size={17} />{t.localizeNext}</Button><Button variant="outline" className="mt-2 w-full" onClick={() => navigate('/review')}><ShieldCheck size={17} />{t.reviewNext}</Button></section>}</aside></div></>}
    <section className="mt-10"><h2 className="text-lg font-extrabold">{t.history}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{projects.map(item => { const thumbnail = thumbnailImage(item); const count = latestCompletedImages(item).length; return <button key={item.id} onClick={() => { void selectProject(item.id) }} className="flex min-w-0 items-center gap-3 overflow-hidden rounded-control border border-gray-200 bg-white p-4 text-left"><span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-panel bg-brand-soft">{thumbnail?.url ? <StickerThumbnail image={thumbnail} /> : <Sparkles size={20} />}</span><span className="min-w-0"><span className="block truncate font-bold">{item.prompt}</span><span className="text-xs text-sub">{item.day} · {count}/24 · {(item.status ?? (count === 24 ? 'completed' : 'active')) === 'completed' ? t.statusCompleted : t.statusActive}</span></span></button> })}</div></section>
  </main>{completeOpen && project && <Modal onClose={() => { if (!submitting) setCompleteOpen(false) }} labelledBy="complete-project-title" closeLabel={t.cancel}><h2 id="complete-project-title" className="pr-8 text-xl font-extrabold">{t.completeTitle}</h2><p className="mt-3 text-sm leading-6 text-sub">{t.completeDescription}</p><div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={() => setCompleteOpen(false)} disabled={submitting}>{t.cancel}</Button><Button onClick={() => { void completeProject() }} disabled={submitting}>{t.complete}</Button></div></Modal>}</div>
}

import { useEffect, useRef, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import type { JapaneseMeaning as Meaning } from '../lib/api'
import { useUploads } from '../store/uploads'
import JapaneseSpeech from './JapaneseSpeech'

type Props = { fileId: string; regionId: string; text: string }
export default function JapaneseMeaning(props: Props) {
  const { explainJapanese } = useUploads()
  return <JapaneseMeaningPanel {...props} explainJapanese={explainJapanese} />
}
export function JapaneseMeaningPanel({ fileId, regionId, text, explainJapanese }: Props & {
  explainJapanese: (fileId: string, regionId: string, text: string) => Promise<{ text: string; explanation: Meaning }>
}) {
  const [result, setResult] = useState<{ text: string; explanation: Meaning }>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const requestId = useRef(0)
  const currentText = useRef(text.trim())
  currentText.current = text.trim()
  const stale = !!result && result.text !== text.trim()
  useEffect(() => {
    requestId.current++
    setBusy(false)
    setError(false)
    const counter = requestId
    return () => { counter.current++ }
  }, [text])
  async function check() {
    const requestedText = text.trim()
    const id = ++requestId.current
    setBusy(true); setError(false)
    try {
      const response = await explainJapanese(fileId, regionId, requestedText)
      if (id !== requestId.current || currentText.current !== requestedText) return
      if (response.text !== requestedText) throw new Error('Mismatched explanation')
      setResult(response)
    } catch { if (id === requestId.current) setError(true) }
    finally { if (id === requestId.current) setBusy(false) }
  }
  return <section lang="ko" aria-label="일본어 한국어 뜻풀이" className="mt-3 space-y-2 rounded-panel border border-gray-200 bg-white p-3 text-sm leading-relaxed" data-japanese-meaning>
    {stale && <p className="font-bold text-sub">수정 전 설명 · 현재 문구의 뜻을 다시 확인해주세요.</p>}
    {result ? <div className={stale ? 'text-sub' : ''}>
      {stale && <p className="break-words text-xs">이전 문구: {result.text}</p>}
      <p className="break-words"><strong>한국어 뜻 </strong>{result.explanation.meaning}</p>
      <p className="mt-2 break-words"><strong>말투 </strong>{result.explanation.register}</p>
      <details className="mt-1 text-xs"><summary className="min-h-11 cursor-pointer py-3 font-bold">더 알아보기</summary>
        <p><strong>사용 상황 </strong>{result.explanation.usage}</p>
        <p className="mt-2"><strong>원문과의 차이 </strong>{result.explanation.nuance}</p>
        <p className="mt-2">{result.explanation.recommendation}</p>
      </details>
    </div> : <p className="text-sub">일본어를 몰라도 뜻과 말투를 확인할 수 있어요.</p>}
    {(!result || stale || error) && <button type="button" onClick={() => void check()} disabled={busy || !text.trim()} className="flex min-h-11 items-center gap-2 rounded-control border border-gray-200 px-3 font-bold disabled:opacity-50">
      {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}{busy ? '뜻을 확인하고 있어요…' : error ? '뜻풀이 다시 시도' : stale ? '수정한 문구 뜻 확인' : '한국어 뜻 · 말투 확인'}
    </button>}
    <JapaneseSpeech text={text} itemKey={`${fileId}:${regionId}`} />
    <p role="status" aria-live="polite" className="text-xs text-sub">{error ? '설명을 불러오지 못했어요. 문구 편집과 다운로드는 계속할 수 있어요.' : busy ? '한국어 설명을 불러오고 있어요.' : result && !stale ? 'AI 뜻풀이 · 문맥에 따라 해석이 달라질 수 있어요.' : ''}</p>
  </section>
}

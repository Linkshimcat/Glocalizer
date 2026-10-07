import { Square, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSiteLang } from '../i18n/LanguageContext'
import { workflowCopy } from '../i18n/workflow'

export default function JapaneseSpeech({ text, itemKey }: { text: string; itemKey: string }) {
  const { lang } = useSiteLang()
  const w = workflowCopy[lang]
  const [hasVoice, setHasVoice] = useState<boolean | null>(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const utterance = useRef<SpeechSynthesisUtterance | null>(null)
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const synth = window.speechSynthesis
    const refresh = () => setHasVoice(synth.getVoices().some(voice => /^ja(?:-|_)/i.test(voice.lang) || voice.lang === 'ja'))
    // Some browsers populate voices only after their first getVoices() call.
    if (synth.getVoices().length) refresh()
    synth.addEventListener('voiceschanged', refresh)
    const timer = setTimeout(refresh, 1500)
    return () => { clearTimeout(timer); synth.removeEventListener('voiceschanged', refresh) }
  }, [])
  useEffect(() => {
    setPlaying(false)
    setFailed(false)
    return () => {
      if (utterance.current && 'speechSynthesis' in window) {
        utterance.current = null
        window.speechSynthesis.cancel()
      }
    }
  }, [text, itemKey])
  const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
  const toggle = () => {
    if (!supported) return
    const synth = window.speechSynthesis
    if (playing) { utterance.current = null; synth.cancel(); setPlaying(false); return }
    const voice = synth.getVoices().find(value => /^ja(?:-|_)/i.test(value.lang) || value.lang === 'ja')
    if (!voice) { setHasVoice(false); return }
    setHasVoice(true)
    setFailed(false)
    synth.cancel()
    const next = new SpeechSynthesisUtterance(text)
    next.voice = voice
    next.lang = 'ja-JP'
    next.rate = 0.85
    next.onend = () => { if (utterance.current === next) { utterance.current = null; setPlaying(false) } }
    next.onerror = () => { if (utterance.current === next) { utterance.current = null; setPlaying(false); setFailed(true) } }
    utterance.current = next
    setPlaying(true)
    try { synth.speak(next) } catch { utterance.current = null; setPlaying(false); setFailed(true) }
  }
  return <div className="mt-3">
    <button type="button" onClick={toggle} disabled={!supported || !text.trim() || hasVoice === false} aria-pressed={playing} className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-bold disabled:opacity-50">
      {playing ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}{playing ? w.stop : w.listen}
    </button>
    {(!supported || hasVoice === false || failed) && <p role="status" className="mt-2 text-xs text-sub">{failed ? w.speechFailed : w.noVoice}</p>}
  </div>
}

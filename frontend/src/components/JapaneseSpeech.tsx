import { RotateCcw, Square, Volume2 } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useSiteLang } from '../i18n/LanguageContext'
import { workflowCopy } from '../i18n/workflow'

const isJapanese = (voice: SpeechSynthesisVoice) => /^ja(?:[-_]|$)/i.test(voice.lang)

export default function JapaneseSpeech({ text, itemKey }: { text: string; itemKey: string }) {
  const { lang } = useSiteLang()
  const w = workflowCopy[lang]
  const hintId = useId()
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
  const [hasVoice, setHasVoice] = useState<boolean | null>(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const [rate, setRate] = useState(1)
  const utterance = useRef<SpeechSynthesisUtterance | null>(null)

  const stop = () => {
    // Clear ownership first: some engines dispatch cancellation errors synchronously.
    if (utterance.current && supported) {
      utterance.current = null
      window.speechSynthesis.cancel()
    }
    setPlaying(false)
  }

  useEffect(() => {
    if (!supported) return
    const synth = window.speechSynthesis
    const refresh = () => setHasVoice(synth.getVoices().some(isJapanese))
    if (synth.getVoices().length) refresh()
    synth.addEventListener('voiceschanged', refresh)
    const timer = setTimeout(refresh, 1500)
    return () => { clearTimeout(timer); synth.removeEventListener('voiceschanged', refresh) }
  }, [supported])

  useEffect(() => {
    setPlaying(false)
    setFailed(false)
    return () => {
      if (utterance.current && supported) {
        utterance.current = null
        window.speechSynthesis.cancel()
      }
    }
  }, [text, itemKey, rate, supported])

  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.visibilityState === 'hidden' && utterance.current) {
        utterance.current = null
        window.speechSynthesis.cancel()
        setPlaying(false)
      }
    }
    document.addEventListener('visibilitychange', stopWhenHidden)
    return () => document.removeEventListener('visibilitychange', stopWhenHidden)
  }, [])

  const toggle = () => {
    if (!supported || !text.trim()) return
    if (playing) { stop(); return }
    const synth = window.speechSynthesis
    const voices = synth.getVoices().filter(isJapanese)
    // Prefer a local voice, but never substitute a non-Japanese voice.
    const voice = voices.find(value => value.localService) ?? voices[0]
    if (!voice) { setHasVoice(false); return }
    setHasVoice(true)
    setFailed(false)
    synth.cancel()
    const next = new SpeechSynthesisUtterance(text.trim())
    next.voice = voice
    next.lang = 'ja-JP'
    next.rate = rate
    next.onend = () => { if (utterance.current === next) { utterance.current = null; setPlaying(false) } }
    next.onerror = () => { if (utterance.current === next) { utterance.current = null; setPlaying(false); setFailed(true) } }
    utterance.current = next
    setPlaying(true)
    try { synth.speak(next) } catch { utterance.current = null; setPlaying(false); setFailed(true) }
  }

  return (
    <div className="mt-3 rounded-control border border-brand/20 bg-brand-soft/50 p-3">
      <p id={hintId} className="text-xs leading-relaxed text-sub">{w.speechHint}</p>
      <div role="group" aria-label={w.speechSpeed} className="mt-3 flex flex-wrap gap-2">
        {[{ value: 1, label: w.speechNormal }, { value: 0.7, label: w.speechSlow }].map(option => (
          <button key={option.value} type="button" aria-pressed={rate === option.value}
            onClick={() => { stop(); setRate(option.value) }}
            className={`min-h-11 rounded-control border px-3 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${rate === option.value ? 'border-brand bg-white text-brand-dark' : 'border-transparent text-sub hover:bg-white/70'}`}>
            {option.label}
          </button>
        ))}
      </div>
      <button type="button" onClick={toggle} disabled={!supported || !text.trim() || hasVoice === false}
        aria-pressed={playing} aria-describedby={hintId}
        className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-brand px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50">
        {playing ? <Square aria-hidden="true" className="h-4 w-4" /> : <Volume2 aria-hidden="true" className="h-4 w-4" />}
        {playing ? w.stop : w.listen}
      </button>
      <div role="status" aria-live="polite" className="text-xs leading-relaxed text-sub">
        {(!supported || hasVoice === false || failed) && <p className="mt-2">{!supported ? w.speechUnsupported : failed ? w.speechFailed : w.noVoice}</p>}
        {supported && hasVoice === false && <p className="mt-1">{w.speechVoiceHelp}</p>}
      </div>
      {supported && hasVoice === false && (
        <button type="button" onClick={() => { setHasVoice(window.speechSynthesis.getVoices().some(isJapanese)); setFailed(false) }}
          className="mt-1 flex min-h-11 items-center gap-1.5 text-xs font-bold text-brand-dark underline">
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />{w.speechRetryVoices}
        </button>
      )}
    </div>
  )
}

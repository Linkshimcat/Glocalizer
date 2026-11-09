import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { CREATOR_FEEDBACK } from '../data/creatorFeedback'
import { useSiteLang } from '../i18n/LanguageContext'
import { creatorVoices } from '../i18n/creatorVoices'
import '../creator-voices.css'

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// 랜딩 아래쪽 "작가님 피드백" 섹션. 후기만 늘어놓지 않고, 작가님이 한 말과 그에 맞춰 실제로 고친 것을
// 짝으로 보여준다. 카드는 한 줄로 두고 옆으로 넘긴다. 데스크톱은 화살표로, 모바일은 밀어서 넘긴다.
export default function CreatorVoices() {
  const { lang } = useSiteLang()
  const t = creatorVoices[lang]
  const listRef = useRef<HTMLDivElement>(null)
  const [motionReady, setMotionReady] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [edges, setEdges] = useState({ start: true, end: false })

  // 가로로 밀려 있는 카드는 화면과 겹치지 않아 카드별로 관찰하면 나타나지 않는다. 목록 전체가 보일 때 함께 나타낸다.
  // 프리렌더 HTML과 JS 실행 전에는 data-motion-ready가 없어 카드가 그대로 보인다.
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      setRevealed(true)
      return
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      setRevealed(true)
      observer.disconnect()
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' })
    observer.observe(list)
    setMotionReady(true)
    return () => observer.disconnect()
  }, [])

  const updateEdges = useCallback(() => {
    const list = listRef.current
    if (!list) return
    const start = list.scrollLeft <= 1
    const end = list.scrollLeft + list.clientWidth >= list.scrollWidth - 1
    setEdges(previous => (previous.start === start && previous.end === end ? previous : { start, end }))
  }, [])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    updateEdges()
    list.addEventListener('scroll', updateEdges, { passive: true })
    const observer = new ResizeObserver(updateEdges)
    observer.observe(list)
    return () => {
      list.removeEventListener('scroll', updateEdges)
      observer.disconnect()
    }
  }, [updateEdges])

  const move = (direction: 1 | -1) => {
    const list = listRef.current
    const card = list?.firstElementChild
    if (!list || !(card instanceof HTMLElement)) return
    const gap = Number.parseFloat(getComputedStyle(list).columnGap) || 0
    list.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  return (
    <section className={`creator-voices${revealed ? ' is-visible' : ''}`} data-motion-ready={motionReady} aria-labelledby="creator-voices-title">
      <div className="creator-voices-heading">
        <h2 id="creator-voices-title">{t.title}</h2>
        <p>{t.description}</p>
      </div>
      <div className="creator-voices-controls">
        <button type="button" className="creator-voices-arrow" aria-label={t.previousLabel} disabled={edges.start} onClick={() => move(-1)}><ChevronLeft size={20} aria-hidden="true" /></button>
        <button type="button" className="creator-voices-arrow" aria-label={t.nextLabel} disabled={edges.end} onClick={() => move(1)}><ChevronRight size={20} aria-hidden="true" /></button>
      </div>
      {/* 가로로 스크롤되는 영역은 키보드로도 움직일 수 있게 포커스를 받는다. */}
      <div ref={listRef} className="creator-voices-list" role="region" aria-label={t.listLabel} tabIndex={0}>
        {CREATOR_FEEDBACK.map((card, index) => {
          const text = t.cards[card.id]
          return (
            <article key={card.id} className="creator-voice-card" style={{ '--voice-index': Math.min(index, 3) } as CSSProperties}>
              <header className="creator-voice-author">
                {card.avatarSrc
                  ? <img className="creator-voice-avatar" src={card.avatarSrc} alt="" width={44} height={44} loading="lazy" decoding="async" />
                  : <span className="creator-voice-avatar" aria-hidden="true">{card.initial}</span>}
                <div>
                  <p className="creator-voice-name">{card.name}</p>
                  <p className="creator-voice-meta">{t.role} · {t.dateLabel(card.feedbackDate)}</p>
                </div>
              </header>
              <blockquote className="creator-voice-quote">{'“'}{text.quote}{'”'}</blockquote>
              <p className="creator-voice-change"><strong>{t.changeLabel}</strong>{text.change}</p>
            </article>
          )
        })}
      </div>
      <p className="creator-voices-note">{t.note}</p>
    </section>
  )
}

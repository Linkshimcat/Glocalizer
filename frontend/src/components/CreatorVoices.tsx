import { CREATOR_FEEDBACK } from '../data/creatorFeedback'
import { useSiteLang } from '../i18n/LanguageContext'
import { creatorVoices } from '../i18n/creatorVoices'
import '../creator-voices.css'

// 랜딩 아래쪽 "작가님 피드백" 섹션. 후기만 늘어놓지 않고, 작가님이 한 말과 그에 맞춰 실제로 고친 것을
// 짝으로 보여준다. 데스크톱은 3열로 줄바꿈되고, 모바일은 카드를 옆으로 밀어 넘긴다.
export default function CreatorVoices() {
  const { lang } = useSiteLang()
  const t = creatorVoices[lang]
  return (
    <section className="creator-voices" aria-labelledby="creator-voices-title">
      <div className="creator-voices-heading">
        <h2 id="creator-voices-title">{t.title}</h2>
        <p>{t.description}</p>
      </div>
      {/* 가로로 스크롤되는 영역은 키보드로도 움직일 수 있게 포커스를 받는다. */}
      <div className="creator-voices-list" role="region" aria-label={t.listLabel} tabIndex={0}>
        {CREATOR_FEEDBACK.map(card => {
          const text = t.cards[card.id]
          return (
            <article key={card.id} className="creator-voice-card">
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

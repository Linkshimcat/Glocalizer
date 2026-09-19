import { useUploads } from '../store/uploads'
import { useToast } from './Toast'
import { LayoutDashboard, Loader2, LogOut, MessageSquare, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSiteLang } from '../i18n/LanguageContext'
import type { Dict } from '../i18n/translations'
import { submitFeedback, type FeedbackCategory } from '../lib/authApi'
import { useAuth } from '../store/AuthContext'
import Modal from './Modal'

const FEEDBACK_MIN_LENGTH = 10
const FEEDBACK_CATEGORIES: FeedbackCategory[] = ['bug', 'feature', 'other']
const FEEDBACK_CATEGORY_LABEL_KEYS: Record<FeedbackCategory, keyof Dict> = {
  bug: 'feedbackCategoryBug',
  feature: 'feedbackCategoryFeature',
  other: 'feedbackCategoryOther',
}

function initialOf(text: string): string {
  return text.trim().charAt(0).toUpperCase() || '?'
}

export default function AccountMenu() {
  const { user, token, logout } = useAuth()
  const { flushCloudWork, cloudSaving } = useUploads()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useSiteLang()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>('bug')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackSending, setFeedbackSending] = useState(false)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!user) return null

  const displayName = user.name ?? user.email ?? '사용자'

  const openFeedback = () => {
    setOpen(false)
    setFeedbackCategory('bug')
    setFeedbackMessage('')
    setFeedbackOpen(true)
  }

  const onSubmitFeedback = async () => {
    if (!token) return
    const trimmed = feedbackMessage.trim()
    if (trimmed.length < FEEDBACK_MIN_LENGTH) {
      toast(t.feedbackTooShort)
      return
    }
    setFeedbackSending(true)
    try {
      await submitFeedback(token, feedbackCategory, trimmed)
      toast(t.feedbackSuccess, 'success')
      setFeedbackOpen(false)
    } catch (error) {
      toast(error instanceof Error ? error.message : t.feedbackFailed)
    } finally {
      setFeedbackSending(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-label={t.accountMenu}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand text-sm font-bold text-white transition-opacity hover:opacity-90"
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          initialOf(displayName)
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-40 w-64 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]"
        >
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-base font-bold text-white">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                initialOf(displayName)
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-ink">{displayName}</p>
              {user.email && <p className="truncate text-xs font-medium text-sub">{user.email}</p>}
            </div>
          </div>
          <div className="border-t border-gray-100 p-1.5">
            {[
              { label: t.hubDashboard, path: '/dashboard', Icon: LayoutDashboard },
              { label: t.cloudArchive, path: '/archive', Icon: LayoutDashboard },
              { label: t.accountTitle, path: '/account', Icon: UserRound },
            ].map(({ label, path, Icon }) => (
              <button key={path} type="button" role="menuitem" onClick={() => { setOpen(false); navigate(path) }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-ink transition-colors hover:bg-surface">
                <Icon className="h-4 w-4 text-sub" />{label}
              </button>
            ))}

            <button type="button" role="menuitem" onClick={openFeedback} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-ink transition-colors hover:bg-surface">
              <MessageSquare className="h-4 w-4 text-sub" />{t.feedbackMenuLabel}
            </button>

            <button
              type="button"
              role="menuitem"
              disabled={cloudSaving}
              onClick={async () => {
                try {
                  await flushCloudWork()
                  setOpen(false)
                  if (['/account', '/archive'].includes(location.pathname)) navigate('/', { replace: true })
                  logout()
                } catch (error) { toast(error instanceof Error ? error.message : t.cloudSaveFailed) }
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-ink transition-colors hover:bg-surface"
            >
              <LogOut className="h-4 w-4 text-sub" />
              {t.navLogout}
            </button>
          </div>
        </div>
      )}

      {feedbackOpen && (
        <Modal onClose={() => setFeedbackOpen(false)} labelledBy="feedback-title" closeLabel={t.commonClose}>
          <h2 id="feedback-title" className="text-lg font-extrabold text-ink">{t.feedbackModalTitle}</h2>
          <p className="mt-2 text-sm text-sub">{t.feedbackModalDesc}</p>

          <div className="mt-4 flex rounded-xl bg-surface p-1">
            {FEEDBACK_CATEGORIES.map(category => (
              <button
                key={category}
                type="button"
                onClick={() => setFeedbackCategory(category)}
                className={`h-9 flex-1 rounded-lg text-sm font-bold transition-colors ${
                  feedbackCategory === category ? 'bg-white text-ink shadow-sm' : 'text-sub hover:text-ink'
                }`}
              >
                {t[FEEDBACK_CATEGORY_LABEL_KEYS[category]]}
              </button>
            ))}
          </div>

          <textarea
            value={feedbackMessage}
            onChange={event => setFeedbackMessage(event.target.value)}
            placeholder={t.feedbackPlaceholder}
            rows={5}
            autoFocus
            className="mt-4 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-ink outline-none transition-colors focus:border-brand"
          />
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setFeedbackOpen(false)} disabled={feedbackSending} className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-surface disabled:opacity-50">
              {t.accountCancel}
            </button>
            <button type="button" onClick={onSubmitFeedback} disabled={feedbackSending} className="flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
              {feedbackSending && <Loader2 className="h-4 w-4 animate-spin" />}
              {feedbackSending ? t.feedbackSending : t.feedbackSubmit}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

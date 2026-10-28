import { Laptop, Loader2, Smartphone, Tablet } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useSiteLang } from '../i18n/LanguageContext'
import { accountCopy } from '../i18n/account'
import type { AuthSession } from '../lib/authApi'
import { requestErrorMessage } from '../lib/requestError'
import { useAuth } from '../store/AuthContext'
import Modal from './Modal'
import { useToast } from './Toast'

function DeviceIcon({ label }: { label: string | null }) {
  const className = 'h-5 w-5 text-brand-dark'
  if (label?.endsWith('iPadOS')) return <Tablet aria-hidden="true" className={className} />
  if (label?.endsWith('iOS') || label?.endsWith('Android')) return <Smartphone aria-hidden="true" className={className} />
  return <Laptop aria-hidden="true" className={className} />
}

function formatLastActive(iso: string, locale: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const units: [Intl.RelativeTimeFormatUnit, number][] = [['day', 86400], ['hour', 3600], ['minute', 60]]
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.trunc(seconds / size), unit)
  }
  return rtf.format(0, 'second')
}

/** 페이지를 다시 열 때 직전 목록을 먼저 보여 주기 위한 메모리 캐시. 계정이 바뀌면 쓰지 않고, 새로고침하면 사라진다. */
let cachedSessions: { userId: string; sessions: AuthSession[] } | null = null

function SessionsSkeleton({ label }: { label: string }) {
  return (
    <ul role="status" aria-busy="true" aria-label={label} className="mt-5 divide-y divide-line">
      {[0, 1].map(index => (
        <li key={index} className="flex animate-pulse items-center gap-3 py-4">
          <span className="h-5 w-5 shrink-0 rounded bg-surface" />
          <div className="min-w-0 flex-1 space-y-2">
            <span className="block h-4 w-32 rounded bg-surface" />
            <span className="block h-3 w-48 max-w-full rounded bg-surface" />
          </div>
          <span className="h-9 w-20 shrink-0 rounded-control bg-surface" />
        </li>
      ))}
    </ul>
  )
}

/** 이 계정으로 로그인된 기기 목록과 기기별 로그아웃. 로그인 방식과 관계없이 모든 계정에 보인다. */
export default function DeviceSessions() {
  const { user, listSessions, revokeSession, revokeOtherSessions } = useAuth()
  const { lang, t: common } = useSiteLang()
  const t = accountCopy(lang)
  const toast = useToast()
  const [sessions, setSessions] = useState<AuthSession[] | null>(() => (cachedSessions && cachedSessions.userId === user?.id ? cachedSessions.sessions : null))
  const [loadFailed, setLoadFailed] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmingOthers, setConfirmingOthers] = useState(false)
  const [confirmingSession, setConfirmingSession] = useState<AuthSession | null>(null)

  const load = useCallback(async () => {
    setLoadFailed(false)
    try {
      setSessions(await listSessions())
    } catch {
      setLoadFailed(true)
    }
  }, [listSessions])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (sessions && user) cachedSessions = { userId: user.id, sessions }
  }, [sessions, user])

  const signOut = async (session: AuthSession) => {
    setBusyId(session.id)
    try {
      await revokeSession(session.id)
      setSessions(current => current?.filter(item => item.id !== session.id) ?? null)
      toast(t.accountSessionsRevoked, 'success')
    } catch (error) {
      toast(requestErrorMessage(error, lang, t.accountSessionsFailed))
      void load()
    } finally {
      setBusyId(null)
      setConfirmingSession(null)
    }
  }

  const signOutOthers = async () => {
    setBusyId('others')
    try {
      await revokeOtherSessions()
      setConfirmingOthers(false)
      toast(t.accountSessionsOthersRevoked, 'success')
      await load()
    } catch (error) {
      toast(requestErrorMessage(error, lang, t.accountSessionsFailed))
    } finally {
      setBusyId(null)
    }
  }

  const hasOthers = sessions?.some(session => !session.current) ?? false
  const hasLegacy = sessions?.some(session => session.legacy) ?? false

  return (
    <section className="mt-6 max-w-2xl rounded-panel border border-gray-200/70 bg-white p-6 sm:p-8" aria-label={t.accountSessionsTitle}>
      <h2 className="text-lg font-extrabold text-ink">{t.accountSessionsTitle}</h2>
      <p className="mt-1 text-sm text-sub">{t.accountSessionsDesc}</p>

      {sessions && <p className="mt-3 text-sm font-semibold text-brand-dark">{t.accountSessionsSummary.replace('{count}', String(sessions.length))}</p>}

      {sessions === null && !loadFailed && (
        <SessionsSkeleton label={t.accountSessionsLoading} />
      )}

      {loadFailed && (
        <div role="alert" className="mt-5 flex flex-wrap items-center gap-3 text-sm text-sub">
          <span>{t.accountSessionsLoadFailed}</span>
          <button type="button" onClick={() => void load()} className="rounded-control border border-gray-200 px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface">{t.accountSessionsRetry}</button>
        </div>
      )}

      {sessions && (
        <>
          <ul className="mt-5 divide-y divide-line">
            {sessions.map(session => (
              <li key={session.id} className="flex items-center gap-3 py-4">
                <DeviceIcon label={session.deviceLabel} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                    <span className="truncate">{session.legacy ? t.accountSessionsLegacy : session.deviceLabel ?? t.accountSessionsUnknownDevice}</span>
                    {session.current && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-dark">{t.accountSessionsCurrent}</span>}
                  </p>
                  {!session.legacy && (
                    <p className="mt-0.5 text-xs text-sub">
                      {t.accountSessionsLastActive.replace('{time}', formatLastActive(session.lastSeenAt, lang))}
                      {session.ipMasked ? ` · ${session.ipMasked}` : ''}
                    </p>
                  )}
                </div>
                {!session.current && (
                  <button
                    type="button"
                    onClick={() => setConfirmingSession(session)}
                    disabled={busyId !== null}
                    className="flex shrink-0 items-center gap-1.5 rounded-control border border-gray-200 px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface disabled:opacity-50"
                  >
                    {t.accountSessionsSignOut}
                  </button>
                )}
              </li>
            ))}
          </ul>

          {hasLegacy && <p className="mt-3 text-xs text-sub">{t.accountSessionsLegacyNote}</p>}

          {(hasOthers || hasLegacy) && (
            <div className="mt-5">
              <button type="button" onClick={() => setConfirmingOthers(true)} className="rounded-control border border-gray-200 px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface">{t.accountSessionsSignOutOthers}</button>
            </div>
          )}
        </>
      )}

      {confirmingSession && (
        <Modal
          onClose={() => { if (busyId === null) setConfirmingSession(null) }}
          labelledBy="sign-out-device-title"
          closeLabel={common.commonClose}
        >
          <h2 id="sign-out-device-title" className="pr-8 text-lg font-extrabold text-ink">{t.accountSessionsSignOut}</h2>
          <p className="mt-2 text-sm font-bold text-ink">{confirmingSession.legacy ? t.accountSessionsLegacy : confirmingSession.deviceLabel ?? t.accountSessionsUnknownDevice}</p>
          <p className="mt-1 text-sm text-sub">{t.accountSessionsSignOutOneAsk}</p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmingSession(null)} disabled={busyId !== null} className="rounded-control border border-gray-200 px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-surface disabled:opacity-50">{t.accountCancel}</button>
            <button type="button" onClick={() => void signOut(confirmingSession)} disabled={busyId !== null} className="flex items-center gap-1.5 rounded-control bg-action px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
              {busyId === confirmingSession.id && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.accountSessionsConfirm}
            </button>
          </div>
        </Modal>
      )}

      {confirmingOthers && (
        <Modal
          onClose={() => { if (busyId === null) setConfirmingOthers(false) }}
          labelledBy="sign-out-other-devices-title"
          closeLabel={common.commonClose}
        >
          <h2 id="sign-out-other-devices-title" className="pr-8 text-lg font-extrabold text-ink">{t.accountSessionsSignOutOthers}</h2>
          <p className="mt-2 text-sm text-sub">{t.accountSessionsSignOutOthersAsk}</p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmingOthers(false)} disabled={busyId !== null} className="rounded-control border border-gray-200 px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-surface disabled:opacity-50">{t.accountCancel}</button>
            <button type="button" onClick={() => void signOutOthers()} disabled={busyId !== null} className="flex items-center gap-1.5 rounded-control bg-action px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
              {busyId === 'others' && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.accountSessionsConfirm}
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}

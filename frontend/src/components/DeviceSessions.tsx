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

/** 이 계정으로 로그인된 기기 목록과 기기별 로그아웃. 로그인 방식과 관계없이 모든 계정에 보인다. */
export default function DeviceSessions() {
  const { listSessions, revokeSession, revokeOtherSessions } = useAuth()
  const { lang, t: common } = useSiteLang()
  const t = accountCopy(lang)
  const toast = useToast()
  const [sessions, setSessions] = useState<AuthSession[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmingOthers, setConfirmingOthers] = useState(false)

  const load = useCallback(async () => {
    setLoadFailed(false)
    try {
      setSessions(await listSessions())
    } catch {
      setLoadFailed(true)
    }
  }, [listSessions])

  useEffect(() => { void load() }, [load])

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

      {sessions === null && !loadFailed && (
        <div role="status" className="mt-5 flex items-center gap-2 text-sm text-sub"><Loader2 className="h-4 w-4 animate-spin" />{t.accountSessionsLoading}</div>
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
                    onClick={() => void signOut(session)}
                    disabled={busyId !== null}
                    className="flex shrink-0 items-center gap-1.5 rounded-control border border-gray-200 px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface disabled:opacity-50"
                  >
                    {busyId === session.id && <Loader2 className="h-4 w-4 animate-spin" />}
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

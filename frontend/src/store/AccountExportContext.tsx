import { Loader2 } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { accountCopy } from '../i18n/account'
import { useSiteLang } from '../i18n/LanguageContext'
import type { AccountExportProgress } from '../lib/accountExport'
import { emailMyDataLink } from '../lib/authApi'
import { downloadBlob } from '../lib/exportImage'
import { requestErrorMessage } from '../lib/requestError'
import { useAuth } from './AuthContext'

interface AccountExportState {
  busy: boolean
  progressLabel: string | null
  /** 이번 방문에서 내 컴퓨터로 받기를 끝냈는지(탈퇴 모달의 "다음" 조건) */
  downloaded: boolean
  /** 성공하면 true. 실패해도 던지지 않는다(탈퇴 모달이 "받지 않고 계속"을 막지 않게). */
  downloadToComputer: () => Promise<boolean>
  emailing: boolean
  emailLink: () => Promise<void>
}

const AccountExportContext = createContext<AccountExportState | null>(null)

/**
 * "내 데이터 받기"를 앱 전역에서 돌린다. 받는 중에 사이트 안 다른 페이지로 이동해도 계속되고,
 * 설정 페이지가 아닐 때는 화면 구석에 진행률을 띄운다. 탭을 닫으면 멈추므로 그때만 브라우저 확인창을 띄운다.
 */
export function AccountExportProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const { lang } = useSiteLang()
  const t = accountCopy(lang)
  const toast = useToast()
  const { pathname } = useLocation()
  const [progress, setProgress] = useState<AccountExportProgress | null>(null)
  const [downloaded, setDownloaded] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const running = useRef(false)

  const progressLabel = !progress ? null
    : progress.phase === 'collect' ? t.accountDataProgressCollect
    : progress.phase === 'pack' ? t.accountDataProgressPack
    : t.accountDataProgressRender.replace('{done}', String(progress.done + 1)).replace('{total}', String(progress.total))

  const downloadToComputer = useCallback(async (): Promise<boolean> => {
    if (!token || running.current) return false
    running.current = true
    setProgress({ phase: 'collect' })
    try {
      // ZIP·합성 코드는 받을 때만 불러와 첫 화면 번들을 키우지 않는다.
      const { buildAccountExport } = await import('../lib/accountExport')
      const { blob, fileName, renderFailures } = await buildAccountExport(token, setProgress)
      downloadBlob(blob, fileName)
      setDownloaded(true)
      toast(renderFailures.length > 0 ? t.accountDataPartial : t.accountDataDone, renderFailures.length > 0 ? 'warning' : 'success')
      return true
    } catch (error) {
      toast(requestErrorMessage(error, lang, t.accountDataFailed))
      return false
    } finally {
      running.current = false
      setProgress(null)
    }
  }, [token, toast, lang, t.accountDataPartial, t.accountDataDone, t.accountDataFailed])

  const emailLink = useCallback(async () => {
    if (!token || emailing) return
    setEmailing(true)
    try {
      const { sentTo } = await emailMyDataLink(token)
      toast(t.accountDataEmailSent.replace('{email}', sentTo), 'success')
    } catch (error) {
      toast(requestErrorMessage(error, lang, t.accountDataEmailFailed))
    } finally {
      setEmailing(false)
    }
  }, [token, emailing, toast, lang, t.accountDataEmailSent, t.accountDataEmailFailed])

  // 받는 중에 탭을 닫거나 새로고침하면 처음부터 다시 해야 하므로 브라우저 확인창을 띄운다.
  const busy = progress !== null
  useEffect(() => {
    if (!busy) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy])

  const value = useMemo(
    () => ({ busy, progressLabel, downloaded, downloadToComputer, emailing, emailLink }),
    [busy, progressLabel, downloaded, downloadToComputer, emailing, emailLink],
  )

  return (
    <AccountExportContext.Provider value={value}>
      {children}
      {busy && pathname !== '/account' && (
        <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-start gap-3 rounded-panel border border-gray-200 bg-white px-4 py-3 shadow-lg sm:max-w-sm">
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-brand-dark" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">{progressLabel}</p>
            <p className="mt-0.5 text-xs text-sub">{t.accountDataTimeNote}</p>
          </div>
        </div>
      )}
    </AccountExportContext.Provider>
  )
}

export function useAccountExport(): AccountExportState {
  const context = useContext(AccountExportContext)
  if (!context) throw new Error('useAccountExport must be used inside AccountExportProvider')
  return context
}

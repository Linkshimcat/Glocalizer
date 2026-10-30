import { useState } from 'react'
import { accountCopy } from '../i18n/account'
import { useSiteLang } from '../i18n/LanguageContext'
import { buildAccountExport, type AccountExportProgress } from '../lib/accountExport'
import { emailMyDataLink } from '../lib/authApi'
import { downloadBlob } from '../lib/exportImage'
import { requestErrorMessage } from '../lib/requestError'
import { useAuth } from '../store/AuthContext'
import { useToast } from './Toast'

/** test@example.com → t***@example.com */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@')
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(1, local.length - 1))}@${domain}`
}

/** 설정 카드와 탈퇴 모달이 함께 쓰는 "내 데이터 받기" 동작과 진행 상태. */
export function useAccountExport() {
  const { token } = useAuth()
  const { lang } = useSiteLang()
  const t = accountCopy(lang)
  const toast = useToast()
  const [progress, setProgress] = useState<AccountExportProgress | null>(null)
  const [downloaded, setDownloaded] = useState(false)
  const [emailing, setEmailing] = useState(false)

  const progressLabel = !progress ? null
    : progress.phase === 'collect' ? t.accountDataProgressCollect
    : progress.phase === 'pack' ? t.accountDataProgressPack
    : t.accountDataProgressRender.replace('{done}', String(progress.done + 1)).replace('{total}', String(progress.total))

  /** 성공하면 true. 실패해도 던지지 않는다(탈퇴 모달이 "받지 않고 계속"을 막지 않게). */
  const downloadToComputer = async (): Promise<boolean> => {
    if (!token || progress) return false
    try {
      const { blob, fileName, renderFailures } = await buildAccountExport(token, setProgress)
      downloadBlob(blob, fileName)
      setDownloaded(true)
      toast(renderFailures.length > 0 ? t.accountDataPartial : t.accountDataDone, renderFailures.length > 0 ? 'warning' : 'success')
      return true
    } catch (error) {
      toast(requestErrorMessage(error, lang, t.accountDataFailed))
      return false
    } finally {
      setProgress(null)
    }
  }

  const emailLink = async () => {
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
  }

  return { busy: progress !== null, progressLabel, downloaded, downloadToComputer, emailing, emailLink }
}

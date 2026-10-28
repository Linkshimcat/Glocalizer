import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { accountCopy } from '../i18n/account'
import { useSiteLang } from '../i18n/LanguageContext'
import { downloadMyData } from '../lib/authApi'
import { requestErrorMessage } from '../lib/requestError'
import { useAuth } from '../store/AuthContext'
import { AccountCard } from './AccountCard'
import { useToast } from './Toast'

/** 내 데이터 사본(JSON)을 내려받는다. */
export default function DataExportCard() {
  const { token } = useAuth()
  const { lang } = useSiteLang()
  const t = accountCopy(lang)
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const download = async () => {
    if (!token) return
    setBusy(true)
    try {
      const url = URL.createObjectURL(await downloadMyData(token))
      const link = document.createElement('a')
      link.href = url
      link.download = 'glocalizer-my-data.json'
      link.click()
      URL.revokeObjectURL(url)
      toast(t.accountDataDone, 'success')
    } catch (error) {
      toast(requestErrorMessage(error, lang, t.accountDataFailed))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AccountCard title={t.accountDataTitle} description={t.accountDataDesc}>
      <button type="button" onClick={() => void download()} disabled={busy} className="mt-5 flex items-center gap-1.5 rounded-control border border-gray-200 px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {t.accountDataButton}
      </button>
    </AccountCard>
  )
}

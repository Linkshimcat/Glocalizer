import { useAuth } from '../store/AuthContext'
import { useSiteLang } from '../i18n/LanguageContext'
import { experienceCopy } from '../i18n/experience'
import Button from './Button'
import StateNotice from './StateNotice'

export default function SessionNotice() {
  const { sessionError, refreshUser, checkingSession } = useAuth()
  const { lang } = useSiteLang()
  const copy = experienceCopy[lang]
  if (!sessionError) return null
  return <StateNotice error action={<Button variant="outline" size="sm" disabled={checkingSession} onClick={() => { void refreshUser() }}>{copy.retry}</Button>}>{copy.session}</StateNotice>
}

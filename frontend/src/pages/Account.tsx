import { requestErrorMessage } from '../lib/requestError'
import { Camera, ChevronRight, FileText, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import AccountSummaryCard from '../components/AccountSummaryCard'
import DataExportCard from '../components/DataExportCard'
import DefaultTargetLanguages from '../components/DefaultTargetLanguages'
import DeviceSessions from '../components/DeviceSessions'
import GoogleIcon from '../components/GoogleIcon'
import LanguageSelect from '../components/LanguageSelect'
import LoginHistoryCard from '../components/LoginHistoryCard'
import Modal from '../components/Modal'
import PaymentHistoryCard from '../components/PaymentHistoryCard'
import SessionNotice from '../components/SessionNotice'
import { experienceCopy } from '../i18n/experience'
import profileDeleteIcon from '../assets/iconsax-profile-delete.svg'
import { useToast } from '../components/Toast'
import { useSiteLang } from '../i18n/LanguageContext'
import { accountCopy } from '../i18n/account'
import type { ProfileUpdate, SecurityEmailTypes } from '../lib/authApi'
import { useAuth } from '../store/AuthContext'
import { useTheme } from '../store/ThemeContext'

const NAME_MAX_LENGTH = 30
const PHOTO_MAX_BYTES = 10 * 1024 * 1024
const PHOTO_EDGE = 512

/** 정사각형으로 가운데를 잘라 줄인 뒤 data URL로 만든다. 서버가 한 번 더 256px WebP로 재인코딩한다. */
async function toAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const edge = Math.min(PHOTO_EDGE, side)
  const canvas = document.createElement('canvas')
  canvas.width = edge
  canvas.height = edge
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, edge, edge)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.9)
}

export default function Account() {
  const { user, isAuthenticated, checkingSession, refreshUser, updateProfile, updateEmailPreferences, changePassword, deleteAccount } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t, lang } = useSiteLang()
  const tAccount = accountCopy(lang)
  const toast = useToast()
  const navigate = useNavigate()
  const enteredAuthenticated = useRef(isAuthenticated)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  // undefined: 변경 없음, null: 기본 이미지로, string: 새 사진(data URL)
  const [avatar, setAvatar] = useState<string | null | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [ackDataLoss, setAckDataLoss] = useState(false)
  const [ackResignup, setAckResignup] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [emailAlertsSaving, setEmailAlertsSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('profile')

  useEffect(() => {
    if (isAuthenticated) void refreshUser()
  }, [isAuthenticated, refreshUser])

  useEffect(() => {
    const sections = ['profile', 'security', 'preferences', 'plan', 'policy']
      .map(id => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null)
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible) setActiveSection(visible.target.id)
    }, { rootMargin: '-20% 0px -65%', threshold: 0 })
    sections.forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [isAuthenticated])

  if (checkingSession && !user) return <main id="main-content" tabIndex={-1} role="status" className="ui-recovery-page">{experienceCopy[lang].loading}</main>
  if (!isAuthenticated || !user) return <Navigate to={enteredAuthenticated.current ? '/' : '/login?next=/account'} replace />

  const shownName = editing ? name : user.name ?? ''
  const shownAvatar = avatar === undefined ? user.avatarUrl : avatar
  const initial = (shownName || user.email || '?').trim().charAt(0).toUpperCase() || '?'

  const startEditing = () => {
    setName(user.name ?? '')
    setAvatar(undefined)
    setEditing(true)
  }

  const cancelEditing = () => {
    setAvatar(undefined)
    setEditing(false)
  }

  const onPickPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > PHOTO_MAX_BYTES) {
      toast(tAccount.accountPhotoInvalid)
      return
    }
    try {
      setAvatar(await toAvatarDataUrl(file))
    } catch {
      toast(tAccount.accountPhotoInvalid)
    }
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      toast(tAccount.accountNameRequired)
      return
    }
    const update: ProfileUpdate = {}
    if (trimmed !== (user.name ?? '')) update.name = trimmed
    if (avatar !== undefined) update.avatar = avatar
    if (Object.keys(update).length === 0) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await updateProfile(update)
      setAvatar(undefined)
      setEditing(false)
      toast(tAccount.accountSaved, 'success')
    } catch (error) {
      toast(requestErrorMessage(error, lang, tAccount.accountSaveFailed))
    } finally {
      setSaving(false)
    }
  }

  const startChangingPassword = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setChangingPassword(true)
  }

  const cancelChangingPassword = () => setChangingPassword(false)

  const onChangePassword = async (event: FormEvent) => {
    event.preventDefault()
    if (!currentPassword) {
      toast(tAccount.accountPasswordCurrentRequired)
      return
    }
    if (newPassword.length < 8) {
      toast(tAccount.accountPasswordTooShort)
      return
    }
    if (newPassword !== confirmPassword) {
      toast(tAccount.accountPasswordMismatch)
      return
    }
    setPasswordSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setChangingPassword(false)
      toast(tAccount.accountPasswordSuccess, 'success')
    } catch (error) {
      toast(requestErrorMessage(error, lang, tAccount.accountPasswordFailed))
    } finally {
      setPasswordSaving(false)
    }
  }

  const openDeleteModal = () => {
    setAckDataLoss(false)
    setAckResignup(false)
    setDeleteModalOpen(true)
  }

  const onConfirmDelete = async () => {
    setDeletingAccount(true)
    try {
      await deleteAccount()
      setDeleteModalOpen(false)
      toast(tAccount.accountDeleteSuccess, 'success')
      navigate('/')
    } catch (error) {
      toast(requestErrorMessage(error, lang, tAccount.accountDeleteFailed))
    } finally {
      setDeletingAccount(false)
    }
  }

  const setSecurityEmailAlerts = async () => {
    const next = !(user.securityEmailNotifications ?? true)
    setEmailAlertsSaving(true)
    try {
      await updateEmailPreferences({ securityEmailNotifications: next })
      toast(next ? tAccount.accountEmailAlertsOn : tAccount.accountEmailAlertsSavedOff, 'success')
    } catch (error) {
      toast(requestErrorMessage(error, lang, tAccount.accountEmailAlertsFailed))
    } finally {
      setEmailAlertsSaving(false)
    }
  }

  const setEmailType = async (key: keyof SecurityEmailTypes, next: boolean) => {
    setEmailAlertsSaving(true)
    try {
      await updateEmailPreferences({ [key]: next })
      toast(tAccount.accountEmailTypeSaved, 'success')
    } catch (error) {
      toast(requestErrorMessage(error, lang, tAccount.accountEmailAlertsFailed))
    } finally {
      setEmailAlertsSaving(false)
    }
  }

  const emailTypes: [keyof SecurityEmailTypes, string][] = [
    ['newDeviceLogin', tAccount.accountEmailTypeNewDevice],
    ['passwordChanged', tAccount.accountEmailTypePassword],
    ['otherSessionsSignedOut', tAccount.accountEmailTypeSessions],
  ]

  const jumpToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(id)
  }

  const navItems = [
    ['profile', tAccount.accountNavProfile],
    ['security', tAccount.accountNavSecurity],
    ['preferences', tAccount.accountNavPreferences],
    ['plan', tAccount.accountNavPlan],
    ['policy', tAccount.accountNavPolicy],
  ] as const

  return (
    <div className="studio-account min-h-screen bg-[#FAFBFC]">
      <main id="main-content" tabIndex={-1} className="layout-app py-10 sm:py-16">
        <SessionNotice />
        <h1 className="mt-3 text-[30px] font-extrabold tracking-tight sm:text-[38px]">{tAccount.accountTitle}</h1>
        <p className="mt-3 text-base text-sub">{tAccount.accountDesc}</p>
        <nav aria-label={tAccount.accountQuickNavLabel} className="mt-6 -mx-4 flex max-w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:max-w-2xl sm:px-0">
          {navItems.map(([id, label]) => (
            <button key={id} type="button" onClick={() => jumpToSection(id)} aria-current={activeSection === id ? 'true' : undefined} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${activeSection === id ? 'bg-brand-soft text-brand-dark' : 'bg-surface text-sub hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </nav>
        <form id="profile" onSubmit={onSubmit} className="mt-6 max-w-2xl scroll-mt-6 rounded-panel border border-gray-200/70 bg-white p-6 sm:p-8" aria-label={tAccount.accountTitle}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-brand-soft text-2xl font-extrabold text-brand-dark">
                  {shownAvatar ? <img src={shownAvatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : initial}
                </div>
                {editing && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label={tAccount.accountChangePhoto}
                    className="absolute -bottom-1.5 -right-1.5 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-card bg-action text-white shadow-md transition-opacity hover:opacity-85"
                  >
                    <Camera className="h-[18px] w-[18px]" />
                  </button>
                )}
              </div>
              {editing && (
                <div className="flex flex-col items-start gap-1.5">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-bold text-ink hover:underline">
                    {tAccount.accountChangePhoto}
                  </button>
                  {shownAvatar && (
                    <button type="button" onClick={() => setAvatar(null)} className="text-sm font-semibold text-sub hover:underline">
                      {tAccount.accountRemovePhoto}
                    </button>
                  )}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onPickPhoto} />
            </div>
            {!editing && (
              <button type="button" onClick={startEditing} className="shrink-0 rounded-control border border-gray-200 px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface">
                {tAccount.accountEdit}
              </button>
            )}
          </div>

          <dl className="mt-7 divide-y divide-gray-100">
            <div className="pb-5">
              <dt className="text-sm font-semibold text-sub">
                <label htmlFor="account-name">{tAccount.accountName}</label>
              </dt>
              <dd className="mt-2">
                {editing ? (
                  <div className="relative">
                    <input
                      id="account-name"
                      value={name}
                      onChange={event => setName(event.target.value)}
                      maxLength={NAME_MAX_LENGTH}
                      autoFocus
                      className="w-full rounded-control border border-gray-200 px-4 py-3 pr-16 text-base font-bold text-ink outline-none transition-colors focus:border-brand"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-sub">
                      {name.length}/{NAME_MAX_LENGTH}
                    </span>
                  </div>
                ) : (
                  <span className="break-words text-base font-bold text-ink">{user.name?.trim() || tAccount.accountMissing}</span>
                )}
              </dd>
            </div>
            <div className="py-5">
              <dt className="text-sm font-semibold text-sub">{tAccount.accountEmail}</dt>
              <dd className="mt-2 break-words text-base font-bold text-ink">{user.email?.trim() || tAccount.accountMissing}</dd>
            </div>
            {user.createdAt && (
              <div className="py-5">
                <dt className="text-sm font-semibold text-sub">{tAccount.accountJoinedAt}</dt>
                <dd className="mt-2 text-base font-bold text-ink">{new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date(user.createdAt))}</dd>
              </div>
            )}
            <div className="pt-5">
              <dt className="text-sm font-semibold text-sub">{tAccount.accountSignupMethod}</dt>
              <dd className="mt-2 flex flex-col gap-2">
                {user.hasPassword === undefined && user.hasNaver === undefined && user.hasGoogle === undefined && user.hasKakao === undefined ? (
                  <span className="text-base font-bold text-sub">{tAccount.accountChecking}</span>
                ) : (
                  <>
                    {user.hasPassword && (
                      <span className="flex items-center gap-2 text-base font-bold text-ink">
                        <Mail aria-hidden="true" className="h-5 w-5 text-sub" />
                        {tAccount.accountEmailLogin}
                      </span>
                    )}
                    {user.hasNaver && (
                      <span className="flex items-center gap-2 text-base font-bold text-ink">
                        <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-[#03C75A] text-xs font-black text-white">N</span>
                        {tAccount.accountNaverLogin}
                      </span>
                    )}
                    {user.hasGoogle && (
                      <span className="flex items-center gap-2 text-base font-bold text-ink">
                        <GoogleIcon className="h-5 w-5" />
                        {tAccount.accountGoogleLogin}
                      </span>
                    )}
                    {user.hasKakao && (
                      <span className="flex items-center gap-2 text-base font-bold text-ink">
                        <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FEE500] text-xs font-black text-[#3C1E1E]">K</span>
                        {tAccount.accountKakaoLogin}
                      </span>
                    )}
                  </>
                )}
              </dd>
            </div>
          </dl>

          {editing && (
            <div className="mt-8 flex justify-end gap-2">
              <button type="button" onClick={cancelEditing} disabled={saving} className="rounded-control border border-gray-200 px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-surface disabled:opacity-50">
                {tAccount.accountCancel}
              </button>
              <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-control bg-action px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {tAccount.accountSave}
              </button>
            </div>
          )}
        </form>

        <AccountSummaryCard />

        <section id="plan" className="mt-6 max-w-2xl scroll-mt-6 rounded-panel border border-gray-200/70 bg-white p-6 sm:p-8" aria-label={tAccount.accountPlanTitle}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-ink">{tAccount.accountPlanTitle}</h2>
              <p className="mt-1 text-sm text-sub">{tAccount.accountPlanDesc}</p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-brand-soft px-3 py-1 text-sm font-bold text-brand-dark">
              {tAccount.accountPlanStatus}
            </span>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => navigate('/pricing')} className="rounded-control bg-action px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90">
              {tAccount.accountPlanPricing}
            </button>
            <button type="button" disabled className="rounded-control border border-gray-200 px-5 py-2.5 text-sm font-bold text-sub disabled:cursor-not-allowed disabled:opacity-70">
              {tAccount.accountPlanManage} · {tAccount.accountPlanComingSoon}
            </button>
          </div>
        </section>

        <PaymentHistoryCard />

        <div id="security" className="scroll-mt-6">
        {user.hasPassword && (
          <section className="mt-6 max-w-2xl rounded-panel border border-gray-200/70 bg-white p-6 sm:p-8" aria-label={tAccount.accountSecurityTitle}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-ink">{tAccount.accountSecurityTitle}</h2>
                <p className="mt-1 text-sm text-sub">{tAccount.accountSecurityDesc}</p>
              </div>
              {!changingPassword && (
                <button
                  type="button"
                  onClick={startChangingPassword}
                  className="shrink-0 rounded-control border border-gray-200 px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface"
                >
                  {tAccount.accountPasswordChangeCta}
                </button>
              )}
            </div>

            {changingPassword && (
              <form onSubmit={onChangePassword} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="current-password" className="text-sm font-semibold text-sub">
                    {tAccount.accountPasswordCurrentLabel}
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={event => setCurrentPassword(event.target.value)}
                    maxLength={72}
                    autoFocus
                    autoComplete="current-password"
                    className="mt-2 w-full rounded-control border border-gray-200 px-4 py-3 text-base font-bold text-ink outline-none transition-colors focus:border-brand"
                  />
                </div>
                <div>
                  <label htmlFor="new-password" className="text-sm font-semibold text-sub">
                    {tAccount.accountPasswordNewLabel}
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={event => setNewPassword(event.target.value)}
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    className="mt-2 w-full rounded-control border border-gray-200 px-4 py-3 text-base font-bold text-ink outline-none transition-colors focus:border-brand"
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="text-sm font-semibold text-sub">
                    {tAccount.accountPasswordConfirmLabel}
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    className="mt-2 w-full rounded-control border border-gray-200 px-4 py-3 text-base font-bold text-ink outline-none transition-colors focus:border-brand"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={cancelChangingPassword} disabled={passwordSaving} className="rounded-control border border-gray-200 px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-surface disabled:opacity-50">
                    {tAccount.accountCancel}
                  </button>
                  <button type="submit" disabled={passwordSaving} className="flex items-center gap-1.5 rounded-control bg-action px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
                    {passwordSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {tAccount.accountPasswordSubmit}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        <DeviceSessions />

        <LoginHistoryCard />

        <section className="mt-6 max-w-2xl rounded-panel border border-gray-200/70 bg-white p-6 sm:p-8" aria-label={tAccount.accountEmailAlertsTitle}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-ink">{tAccount.accountEmailAlertsTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-sub">{tAccount.accountEmailAlertsDesc}</p>
              {!(user.securityEmailNotifications ?? true) && <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">{tAccount.accountEmailAlertsOff}</p>}
            </div>
            <button type="button" role="switch" aria-checked={user.securityEmailNotifications ?? true} aria-label={tAccount.accountEmailAlertsTitle} disabled={emailAlertsSaving} onClick={() => void setSecurityEmailAlerts()} className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${(user.securityEmailNotifications ?? true) ? 'bg-action' : 'bg-gray-200'}`}>
              {emailAlertsSaving ? <Loader2 className="mx-auto h-4 w-4 animate-spin text-white" /> : <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${(user.securityEmailNotifications ?? true) ? 'translate-x-7' : 'translate-x-1'}`} />}
            </button>
          </div>
          {(user.securityEmailNotifications ?? true) && (
            <ul className="mt-5 divide-y divide-line border-t border-line">
              {emailTypes.map(([key, label]) => {
                const on = user.securityEmailTypes?.[key] ?? true
                return (
                  <li key={key} className="flex items-center justify-between gap-4 py-3">
                    <span className="text-sm font-bold text-ink">{label}</span>
                    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={emailAlertsSaving} onClick={() => void setEmailType(key, !on)} className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${on ? 'bg-action' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        </div>

        <section id="policy" className="mt-6 max-w-2xl scroll-mt-6 rounded-panel border border-gray-200/70 bg-white p-6 sm:p-8" aria-label={tAccount.accountPolicyTitle}>
          <h2 className="text-lg font-extrabold text-ink">{tAccount.accountPolicyTitle}</h2>
          <p className="mt-1 text-sm text-sub">{tAccount.accountPolicyDesc}</p>
          <div className="mt-5 divide-y divide-gray-100">
            <button type="button" onClick={() => navigate('/privacy')} className="flex w-full items-center gap-3 py-4 text-left font-bold text-ink transition-colors hover:text-brand-dark">
              <ShieldCheck aria-hidden="true" className="h-5 w-5 text-brand-dark" />
              <span className="flex-1">{t.privacyPolicy}</span>
              <ChevronRight aria-hidden="true" className="h-5 w-5 text-sub" />
            </button>
            <button type="button" onClick={() => navigate('/terms')} className="flex w-full items-center gap-3 py-4 text-left font-bold text-ink transition-colors hover:text-brand-dark">
              <FileText aria-hidden="true" className="h-5 w-5 text-brand-dark" />
              <span className="flex-1">{t.termsOfService}</span>
              <ChevronRight aria-hidden="true" className="h-5 w-5 text-sub" />
            </button>
          </div>
        </section>

        <section id="preferences" className="mt-6 max-w-2xl scroll-mt-6 rounded-panel border border-gray-200/70 bg-white p-6 sm:p-8" aria-label={tAccount.accountThemeTitle}>
          <div className="flex items-center justify-between gap-4 border-b border-line pb-5">
            <div>
              <h2 className="text-lg font-extrabold text-ink">{tAccount.accountLanguageTitle}</h2>
              <p className="mt-1 text-sm text-sub">{tAccount.accountLanguageDesc}</p>
            </div>
            <LanguageSelect />
          </div>
          <DefaultTargetLanguages />
          <div className="flex items-center justify-between gap-4 pt-5">
            <div>
              <h2 className="text-lg font-extrabold text-ink">{tAccount.accountThemeTitle}</h2>
              <p className="mt-1 text-sm text-sub">{tAccount.accountThemeDesc}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={theme === 'dark'}
              aria-label={theme === 'dark' ? tAccount.accountThemeLight : tAccount.accountThemeDark}
              onClick={toggleTheme}
              className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-action' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-6 w-6 transform rounded-full bg-[#ffffff] shadow transition-transform ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        </section>

        <DataExportCard />

        <section className="mt-6 max-w-2xl rounded-panel border border-red-200 bg-red-50/40 p-6 dark:border-red-900/50 dark:bg-red-950/20 sm:p-8" aria-label={tAccount.accountDangerZoneTitle}>
          <h2 className="text-lg font-extrabold text-red-600 dark:text-red-400">{tAccount.accountDangerZoneTitle}</h2>
          <p className="mt-2 text-sm text-red-900/70 dark:text-red-300/70">{tAccount.accountDangerZoneDesc}</p>
          <button
            type="button"
            onClick={openDeleteModal}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-control border border-red-300 bg-white px-5 py-[11px] text-sm font-bold text-red-600 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center">
              <img src={profileDeleteIcon} alt="" />
            </span>
            {tAccount.accountDeleteButton}
          </button>
        </section>
      </main>

      {deleteModalOpen && (
        <Modal
          onClose={() => { if (!deletingAccount) setDeleteModalOpen(false) }}
          labelledBy="delete-account-title"
          closeLabel={t.commonClose}
        >
          {deletingAccount ? (
            <div className="flex flex-col items-center py-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-red-600 dark:text-red-400" />
              <h2 id="delete-account-title" className="mt-4 text-lg font-extrabold text-ink">{tAccount.accountDeleteProcessingTitle}</h2>
              <p className="mt-2 text-sm text-sub">{tAccount.accountDeleteProcessingDesc}</p>
            </div>
          ) : (
            <>
              <h2 id="delete-account-title" className="text-lg font-extrabold text-ink">{tAccount.accountDeleteModalTitle}</h2>
              <p className="mt-2 text-sm text-sub">{tAccount.accountDeleteConfirm}</p>

              <div className="mt-5 space-y-3">
                <label className="flex cursor-pointer items-start gap-2.5 text-sm font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={ackDataLoss}
                    onChange={event => setAckDataLoss(event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  {tAccount.accountDeleteAckData}
                </label>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={ackResignup}
                    onChange={event => setAckResignup(event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  {tAccount.accountDeleteAckResignup}
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="rounded-control border border-gray-200 px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-surface"
                >
                  {tAccount.accountCancel}
                </button>
                <button
                  type="button"
                  disabled={!ackDataLoss || !ackResignup}
                  onClick={() => { void onConfirmDelete() }}
                  className="rounded-control bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-red-700"
                >
                  {tAccount.accountDeleteConfirmCta}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  )
}

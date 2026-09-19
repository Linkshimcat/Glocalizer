import { Camera, Loader2, Mail } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import GoogleIcon from '../components/GoogleIcon'
import Modal from '../components/Modal'
import NavMenu from '../components/NavMenu'
import { useToast } from '../components/Toast'
import { useSiteLang } from '../i18n/LanguageContext'
import type { ProfileUpdate } from '../lib/authApi'
import { useAuth } from '../store/AuthContext'

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
  const { user, isAuthenticated, refreshUser, updateProfile, deleteAccount } = useAuth()
  const { t } = useSiteLang()
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

  useEffect(() => {
    if (isAuthenticated) void refreshUser()
  }, [isAuthenticated, refreshUser])

  if (!isAuthenticated || !user) return <Navigate to={enteredAuthenticated.current ? '/' : '/login'} replace />

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
      toast(t.accountPhotoInvalid)
      return
    }
    try {
      setAvatar(await toAvatarDataUrl(file))
    } catch {
      toast(t.accountPhotoInvalid)
    }
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      toast(t.accountNameRequired)
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
      toast(t.accountSaved, 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : t.accountSaveFailed)
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
      toast(t.accountPasswordCurrentRequired)
      return
    }
    if (newPassword.length < 8) {
      toast(t.accountPasswordTooShort)
      return
    }
    if (newPassword !== confirmPassword) {
      toast(t.accountPasswordMismatch)
      return
    }
    setPasswordSaving(true)
    try {
      // TODO: 백엔드 비밀번호 변경 API 연결 후 실제 요청으로 교체
      toast(t.accountPasswordNotReady)
      setChangingPassword(false)
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
      toast(t.accountDeleteSuccess, 'success')
      navigate('/')
    } catch (error) {
      toast(error instanceof Error ? error.message : t.accountDeleteFailed)
    } finally {
      setDeletingAccount(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <Header center={<NavMenu workspace />} sticky />
      <main className="layout-app py-10 sm:py-16">
        <p className="text-sm font-extrabold text-brand-dark">Glocalizer</p>
        <h1 className="mt-3 text-[30px] font-extrabold tracking-tight sm:text-[38px]">{t.accountTitle}</h1>
        <p className="mt-3 text-base text-sub">{t.accountDesc}</p>
        <form onSubmit={onSubmit} className="mt-8 max-w-2xl rounded-[28px] border border-gray-200/70 bg-white p-6 sm:p-8" aria-label={t.accountTitle}>
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
                    aria-label={t.accountChangePhoto}
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-ink text-white transition-opacity hover:opacity-85"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                )}
              </div>
              {editing && (
                <div className="flex flex-col items-start gap-1.5">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-bold text-ink hover:underline">
                    {t.accountChangePhoto}
                  </button>
                  {shownAvatar && (
                    <button type="button" onClick={() => setAvatar(null)} className="text-sm font-semibold text-sub hover:underline">
                      {t.accountRemovePhoto}
                    </button>
                  )}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onPickPhoto} />
            </div>
            {!editing && (
              <button type="button" onClick={startEditing} className="shrink-0 rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface">
                {t.accountEdit}
              </button>
            )}
          </div>

          <dl className="mt-7 divide-y divide-gray-100">
            <div className="pb-5">
              <dt className="text-sm font-semibold text-sub">
                <label htmlFor="account-name">{t.accountName}</label>
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
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-16 text-base font-bold text-ink outline-none transition-colors focus:border-brand"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-sub">
                      {name.length}/{NAME_MAX_LENGTH}
                    </span>
                  </div>
                ) : (
                  <span className="break-words text-base font-bold text-ink">{user.name?.trim() || t.accountMissing}</span>
                )}
              </dd>
            </div>
            <div className="py-5">
              <dt className="text-sm font-semibold text-sub">{t.accountEmail}</dt>
              <dd className="mt-2 break-words text-base font-bold text-ink">{user.email?.trim() || t.accountMissing}</dd>
            </div>
            <div className="pt-5">
              <dt className="text-sm font-semibold text-sub">{t.accountSignupMethod}</dt>
              <dd className="mt-2 flex flex-col gap-2">
                {user.hasPassword === undefined && user.hasNaver === undefined && user.hasGoogle === undefined ? (
                  <span className="text-base font-bold text-sub">{t.accountChecking}</span>
                ) : (
                  <>
                    {user.hasPassword && (
                      <span className="flex items-center gap-2 text-base font-bold text-ink">
                        <Mail aria-hidden="true" className="h-5 w-5 text-sub" />
                        {t.accountEmailLogin}
                      </span>
                    )}
                    {user.hasNaver && (
                      <span className="flex items-center gap-2 text-base font-bold text-ink">
                        <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-md bg-[#03C75A] text-xs font-black text-white">N</span>
                        {t.accountNaverLogin}
                      </span>
                    )}
                    {user.hasGoogle && (
                      <span className="flex items-center gap-2 text-base font-bold text-ink">
                        <GoogleIcon className="h-5 w-5" />
                        {t.accountGoogleLogin}
                      </span>
                    )}
                  </>
                )}
              </dd>
            </div>
          </dl>

          {editing && (
            <div className="mt-8 flex justify-end gap-2">
              <button type="button" onClick={cancelEditing} disabled={saving} className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-surface disabled:opacity-50">
                {t.accountCancel}
              </button>
              <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.accountSave}
              </button>
            </div>
          )}
        </form>

        {user.hasPassword && (
          <section className="mt-6 max-w-2xl rounded-[28px] border border-gray-200/70 bg-white p-6 sm:p-8" aria-label={t.accountSecurityTitle}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-ink">{t.accountSecurityTitle}</h2>
                <p className="mt-1 text-sm text-sub">{t.accountSecurityDesc}</p>
              </div>
              {!changingPassword && (
                <button
                  type="button"
                  onClick={startChangingPassword}
                  className="shrink-0 rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface"
                >
                  {t.accountPasswordChangeCta}
                </button>
              )}
            </div>

            {changingPassword && (
              <form onSubmit={onChangePassword} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="current-password" className="text-sm font-semibold text-sub">
                    {t.accountPasswordCurrentLabel}
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={event => setCurrentPassword(event.target.value)}
                    autoFocus
                    autoComplete="current-password"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-base font-bold text-ink outline-none transition-colors focus:border-brand"
                  />
                </div>
                <div>
                  <label htmlFor="new-password" className="text-sm font-semibold text-sub">
                    {t.accountPasswordNewLabel}
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={event => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-base font-bold text-ink outline-none transition-colors focus:border-brand"
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="text-sm font-semibold text-sub">
                    {t.accountPasswordConfirmLabel}
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-base font-bold text-ink outline-none transition-colors focus:border-brand"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={cancelChangingPassword} disabled={passwordSaving} className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-surface disabled:opacity-50">
                    {t.accountCancel}
                  </button>
                  <button type="submit" disabled={passwordSaving} className="flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
                    {passwordSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t.accountPasswordSubmit}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        <section className="mt-6 max-w-2xl rounded-[28px] border border-red-200 bg-red-50/40 p-6 sm:p-8" aria-label={t.accountDangerZoneTitle}>
          <h2 className="text-lg font-extrabold text-red-600">{t.accountDangerZoneTitle}</h2>
          <p className="mt-2 text-sm text-red-900/70">{t.accountDangerZoneDesc}</p>
          <button
            type="button"
            onClick={openDeleteModal}
            className="mt-5 rounded-full border border-red-300 bg-white px-5 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-100"
          >
            {t.accountDeleteButton}
          </button>
        </section>
      </main>

      {deleteModalOpen && (
        <Modal onClose={() => setDeleteModalOpen(false)} labelledBy="delete-account-title" closeLabel={t.commonClose}>
          <h2 id="delete-account-title" className="text-lg font-extrabold text-ink">{t.accountDeleteModalTitle}</h2>
          <p className="mt-2 text-sm text-sub">{t.accountDeleteConfirm}</p>

          <div className="mt-5 space-y-3">
            <label className="flex cursor-pointer items-start gap-2.5 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={ackDataLoss}
                onChange={event => setAckDataLoss(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              {t.accountDeleteAckData}
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={ackResignup}
                onChange={event => setAckResignup(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              {t.accountDeleteAckResignup}
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deletingAccount}
              className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-surface disabled:opacity-50"
            >
              {t.accountCancel}
            </button>
            <button
              type="button"
              disabled={!ackDataLoss || !ackResignup || deletingAccount}
              onClick={() => { void onConfirmDelete() }}
              className="flex items-center gap-1.5 rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {deletingAccount && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.accountDeleteConfirmCta}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

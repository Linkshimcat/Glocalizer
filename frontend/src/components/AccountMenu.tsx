import { useUploads } from '../store/uploads'
import { useToast } from './Toast'
import { Info, LayoutDashboard, LogOut, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSiteLang } from '../i18n/LanguageContext'
import { useAuth } from '../store/AuthContext'

function initialOf(text: string): string {
  return text.trim().charAt(0).toUpperCase() || '?'
}

export default function AccountMenu() {
  const { user, logout } = useAuth()
  const { flushCloudWork, cloudSaving } = useUploads()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useSiteLang()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

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
              { label: t.navService, path: '/service', Icon: Info },
            ].map(({ label, path, Icon }) => (
              <button key={path} type="button" role="menuitem" onClick={() => { setOpen(false); navigate(path) }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-ink transition-colors hover:bg-surface">
                <Icon className="h-4 w-4 text-sub" />{label}
              </button>
            ))}

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
    </div>
  )
}

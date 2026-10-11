import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { legalUi } from '../i18n/legalUi'
import { useSiteLang } from '../i18n/LanguageContext'

const WORKSPACE_ROUTES = ['/dashboard', '/generate', '/localize', '/review', '/editor', '/result', '/archive', '/account']
const GITHUB_URL = 'https://github.com/Linkshimcat/Glocalizer'
type MenuName = 'workspace' | 'service'

export default function NavMenu() {
  const { t, lang } = useSiteLang()
  const { pathname, key } = useLocation()
  const [openMenu, setOpenMenu] = useState<MenuName | null>(null)
  const menuOpener = useRef<HTMLElement | null>(null)
  const openedOnHover = useRef(false)
  const inWorkspace = WORKSPACE_ROUTES.includes(pathname)

  useEffect(() => setOpenMenu(null), [key])

  useEffect(() => {
    if (!openMenu) return
    const onPointerDown = (event: PointerEvent) => {
      if ((event.target as Element | null)?.closest('.site-nav')) return
      closeMenu()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpenMenu(null)
      menuOpener.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openMenu])

  const closeMenu = () => setOpenMenu(null)
  const visitPage = (path: string) => {
    closeMenu()
    if (pathname === path) window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }
  const openOnHover = (event: ReactPointerEvent, name: MenuName) => {
    if (event.pointerType !== 'mouse') return
    openedOnHover.current = true
    menuOpener.current = event.currentTarget as HTMLElement
    setOpenMenu(name)
  }
  const openWithKeyboard = (event: ReactKeyboardEvent<HTMLElement>, name: MenuName) => {
    if (event.key !== 'ArrowDown') return
    event.preventDefault()
    openedOnHover.current = false
    menuOpener.current = event.currentTarget
    setOpenMenu(name)
    requestAnimationFrame(() => document.querySelector<HTMLAnchorElement>(`#${name}-nav-panel a`)?.focus())
  }
  const closeOtherMenu = (name: MenuName) => {
    setOpenMenu(current => current && current !== name ? null : current)
  }

  return (
    <>
      {/* The build-time prerender has no document; the backdrop only matters once the menu is interactive. */}
      {typeof document !== 'undefined' && createPortal(
        <div
          aria-hidden="true"
          className={`site-nav-backdrop${openMenu ? ' is-open' : ''}`}
          onPointerEnter={event => {
            if (event.pointerType === 'mouse' && openedOnHover.current) closeMenu()
          }}
          onClick={closeMenu}
        />,
        document.body,
      )}
      <nav
        aria-label={legalUi[lang].navigation}
        className="site-nav"
        onBlurCapture={event => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeMenu()
        }}
      >
        <div className="site-nav-entry">
          <Link
            to="/dashboard"
            className={`site-nav-trigger${inWorkspace ? ' is-active' : ''}`}
            aria-current={inWorkspace ? 'location' : undefined}
            onClick={() => visitPage('/dashboard')}
            onFocus={() => closeOtherMenu('workspace')}
            onPointerEnter={event => openOnHover(event, 'workspace')}
            onKeyDown={event => openWithKeyboard(event, 'workspace')}
          >{t.navWorkspace}</Link>
          <button
            type="button"
            className="site-nav-toggle"
            aria-label={`${t.navWorkspace} ${t.navSubmenu}`}
            aria-expanded={openMenu === 'workspace'}
            aria-controls="workspace-nav-panel"
            onFocus={() => closeOtherMenu('workspace')}
            onClick={event => {
              openedOnHover.current = false
              menuOpener.current = event.currentTarget
              setOpenMenu(current => current === 'workspace' ? null : 'workspace')
            }}
            onKeyDown={event => openWithKeyboard(event, 'workspace')}
          ><ChevronDown aria-hidden="true" /></button>
          <div id="workspace-nav-panel" className={`site-nav-panel site-nav-panel-workspace${openMenu === 'workspace' ? ' is-open' : ''}`} aria-hidden={openMenu !== 'workspace'} inert={openMenu !== 'workspace'} onClick={event => { if (event.target === event.currentTarget) closeMenu() }}>
            <div className="site-nav-panel-content">
              <Link to="/generate" className="site-nav-panel-link" onClick={closeMenu}>{t.hubGenerate}<ArrowUpRight aria-hidden="true" /></Link>
              <Link to="/localize" className="site-nav-panel-link" onClick={closeMenu}>{t.hubLocalize}<ArrowUpRight aria-hidden="true" /></Link>
              <Link to="/review" className="site-nav-panel-link" onClick={closeMenu}>{t.hubReview}<ArrowUpRight aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
        <div className="site-nav-entry">
          <Link
            to="/service"
            className={`site-nav-trigger${pathname === '/service' ? ' is-active' : ''}`}
            aria-current={pathname === '/service' ? 'page' : undefined}
            onClick={() => visitPage('/service')}
            onFocus={() => closeOtherMenu('service')}
            onPointerEnter={event => openOnHover(event, 'service')}
            onKeyDown={event => openWithKeyboard(event, 'service')}
          >{t.navService}</Link>
          <button
            type="button"
            className="site-nav-toggle"
            aria-label={`${t.navService} ${t.navSubmenu}`}
            aria-expanded={openMenu === 'service'}
            aria-controls="service-nav-panel"
            onFocus={() => closeOtherMenu('service')}
            onClick={event => {
              openedOnHover.current = false
              menuOpener.current = event.currentTarget
              setOpenMenu(current => current === 'service' ? null : 'service')
            }}
            onKeyDown={event => openWithKeyboard(event, 'service')}
          ><ChevronDown aria-hidden="true" /></button>
          <div id="service-nav-panel" className={`site-nav-panel site-nav-panel-service${openMenu === 'service' ? ' is-open' : ''}`} aria-hidden={openMenu !== 'service'} inert={openMenu !== 'service'} onClick={event => { if (event.target === event.currentTarget) closeMenu() }}>
            <div className="site-nav-panel-content">
              <Link to="/service#service-workflow" className="site-nav-panel-link" onClick={closeMenu}>{t.navServiceHowTo}<ArrowUpRight aria-hidden="true" /></Link>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="site-nav-panel-link" onClick={closeMenu}>{t.navServiceGithub}<ArrowUpRight aria-hidden="true" /></a>
              <a href="https://www.instagram.com/glocalizer__ogq/" target="_blank" rel="noreferrer" className="site-nav-panel-link" onClick={closeMenu}>Glocalizer Instagram<ArrowUpRight aria-hidden="true" /></a>
            </div>
          </div>
        </div>
        <Link
          to="/pricing"
          className={`site-nav-item${pathname === '/pricing' ? ' is-active' : ''}`}
          aria-current={pathname === '/pricing' ? 'page' : undefined}
          onClick={() => visitPage('/pricing')}
          onFocus={closeMenu}
          onPointerEnter={closeMenu}
        >{t.navPrice}</Link>
      </nav>
    </>
  )
}

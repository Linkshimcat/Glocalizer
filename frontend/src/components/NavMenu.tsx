import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { legalUi } from '../i18n/legalUi'
import { useSiteLang } from '../i18n/LanguageContext'

const WORKSPACE_ROUTES = ['/dashboard', '/generate', '/localize', '/review', '/editor', '/result', '/archive', '/account']
const GITHUB_URL = 'https://github.com/Linkshimcat/Glocalizer'
type MenuName = 'workspace' | 'service'

export default function NavMenu() {
  const { t, lang } = useSiteLang()
  const { pathname } = useLocation()
  const [openMenu, setOpenMenu] = useState<MenuName | null>(null)
  const workspaceTrigger = useRef<HTMLButtonElement>(null)
  const serviceTrigger = useRef<HTMLButtonElement>(null)
  const inWorkspace = WORKSPACE_ROUTES.includes(pathname)

  useEffect(() => setOpenMenu(null), [pathname])

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
      ;(openMenu === 'workspace' ? workspaceTrigger : serviceTrigger).current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openMenu])

  const closeMenu = () => setOpenMenu(null)
  const toggleMenu = (name: MenuName) => setOpenMenu(current => current === name ? null : name)
  const openOnHover = (event: ReactPointerEvent, name: MenuName) => {
    if (event.pointerType === 'mouse') setOpenMenu(name)
  }

  return (
    <>
      {/* The build-time prerender has no document; the backdrop only matters once the menu is interactive. */}
      {typeof document !== 'undefined' && createPortal(
        <div
          aria-hidden="true"
          className={`site-nav-backdrop${openMenu ? ' is-open' : ''}`}
          onPointerEnter={event => {
            if (event.pointerType === 'mouse') closeMenu()
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
        <div className="site-nav-entry" onPointerEnter={event => openOnHover(event, 'workspace')}>
          <button
            ref={workspaceTrigger}
            type="button"
            className={`site-nav-trigger${inWorkspace ? ' is-active' : ''}`}
            aria-expanded={openMenu === 'workspace'}
            aria-haspopup="true"
            aria-controls="workspace-nav-panel"
            onClick={event => {
              if (event.detail > 0 && window.matchMedia('(hover: none)').matches) toggleMenu('workspace')
              else setOpenMenu('workspace')
            }}
            onFocus={event => { if (event.currentTarget.matches(':focus-visible')) setOpenMenu('workspace') }}
          >{t.navWorkspace}</button>
          <div id="workspace-nav-panel" className={`site-nav-panel site-nav-panel-workspace${openMenu === 'workspace' ? ' is-open' : ''}`} aria-hidden={openMenu !== 'workspace'} inert={openMenu !== 'workspace'} onClick={event => { if (event.target === event.currentTarget) closeMenu() }}>
            <div className="site-nav-panel-content">
              <Link to="/dashboard" className="site-nav-panel-label" onClick={closeMenu}>{t.navWorkspaceExplore}</Link>
              <Link to="/generate" className="site-nav-panel-link" onClick={closeMenu}>{t.hubGenerate}<ArrowUpRight aria-hidden="true" /></Link>
              <Link to="/localize" className="site-nav-panel-link" onClick={closeMenu}>{t.hubLocalize}<ArrowUpRight aria-hidden="true" /></Link>
              <Link to="/review" className="site-nav-panel-link" onClick={closeMenu}>{t.hubReview}<ArrowUpRight aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
        <div className="site-nav-entry" onPointerEnter={event => openOnHover(event, 'service')}>
          <button
            ref={serviceTrigger}
            type="button"
            className={`site-nav-trigger${pathname === '/service' ? ' is-active' : ''}`}
            aria-expanded={openMenu === 'service'}
            aria-haspopup="true"
            aria-controls="service-nav-panel"
            onClick={event => {
              if (event.detail > 0 && window.matchMedia('(hover: none)').matches) toggleMenu('service')
              else setOpenMenu('service')
            }}
            onFocus={event => { if (event.currentTarget.matches(':focus-visible')) setOpenMenu('service') }}
          >{t.navService}</button>
          <div id="service-nav-panel" className={`site-nav-panel site-nav-panel-service${openMenu === 'service' ? ' is-open' : ''}`} aria-hidden={openMenu !== 'service'} inert={openMenu !== 'service'} onClick={event => { if (event.target === event.currentTarget) closeMenu() }}>
            <div className="site-nav-panel-content">
              <Link to="/service" className="site-nav-panel-label" onClick={closeMenu}>{t.navServiceExplore}</Link>
              <Link to="/service#service-workflow" className="site-nav-panel-link" onClick={closeMenu}>{t.navServiceHowTo}<ArrowUpRight aria-hidden="true" /></Link>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="site-nav-panel-link" onClick={closeMenu}>{t.navServiceGithub}<ArrowUpRight aria-hidden="true" /></a>
            </div>
          </div>
        </div>
        <Link
          to="/pricing"
          className={`site-nav-item${pathname === '/pricing' ? ' is-active' : ''}`}
          aria-current={pathname === '/pricing' ? 'page' : undefined}
          onPointerEnter={closeMenu}
        >{t.navPrice}</Link>
      </nav>
    </>
  )
}

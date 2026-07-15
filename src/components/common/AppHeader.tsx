import { Link } from "react-router-dom"
import { Logo } from "@/components/common/Logo"
import type { ReactNode } from "react"

/**
 * Application header used on dashboard/editor.
 * `section` shows the current context next to the logo.
 */
export function AppHeader({
  section,
  right,
}: {
  section?: string
  right?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/" aria-label="Glocalizer 홈">
            <Logo />
          </Link>
          {section ? (
            <>
              <span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
              <span className="hidden truncate text-[15px] font-medium text-text-secondary sm:block">
                {section}
              </span>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  )
}

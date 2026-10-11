import { Component, type ReactNode } from 'react'
import { useSiteLang } from '../i18n/LanguageContext'
import { experienceCopy } from '../i18n/experience'
import Button from './Button'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
}

/** 예상하지 못한 화면 오류를 흰 화면 대신 복구 가능한 안내 화면으로 바꾼다. */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return <ErrorScreen />
  }
}

function ErrorScreen() {
  const { t, lang } = useSiteLang()
  const copy = experienceCopy[lang]
  return <main id="main-content" tabIndex={-1} className="ui-recovery-page">
    <section aria-labelledby="page-error-title">
      <h1 id="page-error-title" className="page-title">{copy.errorTitle}</h1>
      <p className="mt-4 text-sub">{copy.errorHint}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => window.location.reload()}>{copy.reload}</Button>
        <Button onClick={() => window.location.assign('/dashboard')}>{t.hubDashboard}</Button>
      </div>
    </section>
  </main>
}

import { Component, type ReactNode } from 'react'

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

  private goToDashboard = () => {
    window.location.assign('/dashboard')
  }

  private reloadPage = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-5 py-10">
        <section className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-[0_14px_40px_rgba(0,0,0,0.08)]">
          <p className="text-sm font-extrabold text-brand-dark">Glocalizer</p>
          <h1 className="mt-3 text-2xl font-extrabold text-ink">화면을 불러오지 못했어요</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-sub">작업 데이터는 브라우저에 보관돼 있어요. 새로고침하거나 대시보드로 돌아가 다시 시도해주세요.</p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button type="button" onClick={this.reloadPage} className="h-11 rounded-xl border-2 border-gray-100 text-sm font-bold text-sub hover:border-gray-200">새로고침</button>
            <button type="button" onClick={this.goToDashboard} className="h-11 rounded-xl bg-brand text-sm font-bold text-white hover:bg-brand-dark">대시보드</button>
          </div>
        </section>
      </main>
    )
  }
}

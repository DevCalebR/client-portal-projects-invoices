import { Component, type ErrorInfo, type ReactNode } from 'react'
import { appConfig } from '../config/env'
import { clearSession } from '../data/storage'
import { logAppError } from '../utils/logger'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = {
    hasError: false,
  }

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logAppError(error, {
      scope: 'AppErrorBoundary',
      componentStack: errorInfo.componentStack,
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleResetSession = () => {
    clearSession()
    window.location.assign('/login')
  }

  public render() {
    if (this.state.hasError) {
      return (
        <main className="login-shell">
          <section className="card auth-card">
            <p className="eyebrow">Application error</p>
            <h1>Something went wrong</h1>
            <p className="auth-copy">
              The app hit an unexpected state. Reload the page first. If it keeps happening, contact{' '}
              {appConfig.supportEmail}.
            </p>
            <div className="form-actions">
              <button className="btn btn--primary" onClick={this.handleReload} type="button">
                Reload app
              </button>
              <button className="btn btn--ghost" onClick={this.handleResetSession} type="button">
                Reset session
              </button>
            </div>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}


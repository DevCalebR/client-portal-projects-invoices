import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AuthDebugPanel } from './AuthDebugPanel'
import { useAuth } from '../context/AuthContext'

type TrackedNavigateProps = {
  to: string
  reason: string
}

export const TrackedNavigate = ({ to, reason }: TrackedNavigateProps) => {
  const location = useLocation()
  const { getRedirectLoopPreview, registerRedirectAttempt } = useAuth()
  const preview = getRedirectLoopPreview({
    route: location.pathname,
    from: location.pathname,
    to,
    reason,
  })

  useEffect(() => {
    if (preview.blocked) {
      return
    }

    registerRedirectAttempt({
      route: location.pathname,
      from: location.pathname,
      to,
      reason,
    })
  }, [location.pathname, preview.blocked, reason, registerRedirectAttempt, to])

  if (preview.blocked) {
    return (
      <AuthDebugPanel
        title="Redirect loop detected"
        message="Workspace navigation redirected more than three times within two seconds. Redirects are paused until the session is stable."
        redirectDestination={to}
      />
    )
  }

  return <Navigate to={to} replace />
}

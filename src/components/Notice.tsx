import clsx from 'clsx'

export type NoticeTone = 'info' | 'success' | 'error' | 'warning'

interface NoticeProps {
  title: string
  message?: string
  tone?: NoticeTone
  compact?: boolean
  onDismiss?: () => void
}

export const Notice = ({
  title,
  message,
  tone = 'info',
  compact = false,
  onDismiss,
}: NoticeProps) => (
  <section
    className={clsx('notice', `notice--${tone}`, compact && 'notice--compact')}
    role={tone === 'error' ? 'alert' : 'status'}
  >
    <div className="notice__body">
      <strong>{title}</strong>
      {message ? <p>{message}</p> : null}
    </div>
    {onDismiss ? (
      <button className="btn btn--ghost btn--sm" onClick={onDismiss} type="button">
        Dismiss
      </button>
    ) : null}
  </section>
)


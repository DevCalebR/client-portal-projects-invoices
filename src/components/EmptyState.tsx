import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  message: string
  action?: ReactNode
}

export const EmptyState = ({ title, message, action }: EmptyStateProps) => (
  <section className="card empty-state">
    <h2>{title}</h2>
    <p>{message}</p>
    {action ? action : null}
  </section>
)

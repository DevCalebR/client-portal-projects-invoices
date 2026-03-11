import { useState } from 'react'
import { appConfig } from '../config/env'
import { Notice } from '../components/Notice'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useFeedback } from '../context/FeedbackContext'
import { BILLING_PLAN_LABELS, BILLING_PLAN_OPTIONS, TEAM_ROLE_OPTIONS, isAdminRole, isInternalRole, type BillingPlan, type OrganizationRole } from '../types/entities'
import { formatDateTime } from '../utils/format'
import { logAppError } from '../utils/logger'

export const SettingsPage = () => {
  const { user, organization, membership, members, invitations, clientProfile, inviteTeamMember } = useAuth()
  const { notifications, markNotificationRead, createCustomerPortal, createCheckout } = useData()
  const { notify } = useFeedback()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('CLIENT')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)

  if (!user || !membership) {
    return null
  }

  const isAdmin = isAdminRole(membership.role)
  const isInternal = isInternalRole(membership.role)
  const unreadNotifications = notifications.filter((notification) => !notification.readAt)

  const handleInvite = async () => {
    try {
      setInviteLoading(true)
      await inviteTeamMember({
        email: inviteEmail,
        role: inviteRole,
      })
      notify({
        title: 'Invitation sent',
        message: `An invitation was sent to ${inviteEmail}.`,
        tone: 'success',
      })
      setInviteEmail('')
      setInviteRole('CLIENT')
    } catch (error) {
      logAppError(error, { scope: 'SettingsPage.handleInvite' })
      notify({
        title: 'Unable to send invitation',
        message: error instanceof Error ? error.message : 'Please try again.',
        tone: 'error',
      })
    } finally {
      setInviteLoading(false)
    }
  }

  const handleStartCheckout = async (plan: BillingPlan) => {
    try {
      setBillingLoading(true)
      const response = await createCheckout({
        kind: 'subscription',
        plan,
      })
      window.location.href = response.url
    } catch (error) {
      logAppError(error, { scope: 'SettingsPage.handleStartCheckout', plan })
      notify({
        title: 'Unable to start checkout',
        message: error instanceof Error ? error.message : 'Please try again.',
        tone: 'error',
      })
    } finally {
      setBillingLoading(false)
    }
  }

  const handleOpenPortal = async () => {
    try {
      setBillingLoading(true)
      const response = await createCustomerPortal()
      window.location.href = response.url
    } catch (error) {
      logAppError(error, { scope: 'SettingsPage.handleOpenPortal' })
      notify({
        title: 'Unable to open billing portal',
        message: error instanceof Error ? error.message : 'Please try again.',
        tone: 'error',
      })
    } finally {
      setBillingLoading(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="card">
        <h1>Settings</h1>
        <p className="muted">
          Clerk manages authentication and organizations. PostgreSQL stores the workspace data behind this UI.
        </p>

        <div className="settings-grid">
          <div>
            <p className="muted">Signed in as</p>
            <p>{user.fullName}</p>
          </div>
          <div>
            <p className="muted">Email</p>
            <p>{user.email}</p>
          </div>
          <div>
            <p className="muted">Role</p>
            <p>{membership.role}</p>
          </div>
          <div>
            <p className="muted">Organization</p>
            <p>{organization?.name ?? 'No organization selected'}</p>
          </div>
          <div>
            <p className="muted">Plan</p>
            <p>{organization ? BILLING_PLAN_LABELS[organization.plan] : 'N/A'}</p>
          </div>
          <div>
            <p className="muted">Support email</p>
            <p>{appConfig.supportEmail}</p>
          </div>
          {clientProfile ? (
            <div>
              <p className="muted">Client profile</p>
              <p>{clientProfile.company ?? clientProfile.name}</p>
            </div>
          ) : null}
        </div>
      </section>

      {isAdmin && organization ? (
        <section className="card">
          <div className="panel-head">
            <div>
              <h2>Billing</h2>
              <p className="muted">
                Manage Stripe subscription billing and access the customer portal.
              </p>
            </div>
          </div>
          <div className="quick-action-grid">
            {BILLING_PLAN_OPTIONS.map((plan) => (
              <button
                key={plan}
                className="action-card button-reset"
                type="button"
                onClick={() => void handleStartCheckout(plan)}
                disabled={billingLoading}
              >
                <strong>{BILLING_PLAN_LABELS[plan]}</strong>
                <span>
                  {organization.plan === plan
                    ? 'Current active workspace plan.'
                    : 'Open Stripe checkout for this subscription tier.'}
                </span>
              </button>
            ))}
          </div>
          <div className="form-actions">
            <button className="btn btn--ghost" type="button" onClick={() => void handleOpenPortal()} disabled={billingLoading}>
              {billingLoading ? 'Opening…' : 'Open Stripe customer portal'}
            </button>
          </div>
        </section>
      ) : null}

      {isAdmin ? (
        <section className="card">
          <div className="panel-head">
            <div>
              <h2>Team invitations</h2>
              <p className="muted">Invite admins, managers, or clients into this organization.</p>
            </div>
          </div>
          <div className="form-row">
            <label>
              Email
              <input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} />
            </label>
            <label>
              Role
              <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as OrganizationRole)}>
                {TEAM_ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button
              className="btn btn--primary"
              type="button"
              onClick={() => void handleInvite()}
              disabled={inviteLoading || !inviteEmail}
            >
              {inviteLoading ? 'Sending…' : 'Send invitation'}
            </button>
          </div>
          {invitations.length > 0 ? (
            <div className="list-block">
              <h3>Pending invitations</h3>
              <ul className="list">
                {invitations.map((invitation) => (
                  <li className="list-item" key={invitation.id}>
                    <div>
                      <strong>{invitation.emailAddress}</strong>
                      <small>{invitation.role}</small>
                    </div>
                    <small className="muted">{String(invitation.status).toLowerCase()}</small>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {isInternal ? (
        <section className="card">
          <div className="panel-head">
            <div>
              <h2>Workspace members</h2>
              <p className="muted">Users currently synced into this organization workspace.</p>
            </div>
          </div>
          {members.length === 0 ? (
            <Notice title="No members yet" message="Invite users to start collaborating." tone="info" />
          ) : (
            <ul className="list">
              {members.map((member) => (
                <li className="list-item" key={member.id}>
                  <div>
                    <strong>{member.user.fullName}</strong>
                    <small>{member.user.email}</small>
                  </div>
                  <small className="muted">
                    {member.role} • {member.status.toLowerCase()}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="card">
        <div className="panel-head">
          <div>
            <h2>Notifications</h2>
            <p className="muted">Persistent notifications stored per user inside the organization.</p>
          </div>
        </div>
        {notifications.length === 0 ? (
          <p className="muted">No notifications yet.</p>
        ) : (
          <ul className="list">
            {notifications.map((notification) => (
              <li className="list-item" key={notification.id}>
                <div>
                  <strong>{notification.title}</strong>
                  <small>{notification.message}</small>
                  <small className="muted">{formatDateTime(notification.createdAt)}</small>
                </div>
                {!notification.readAt ? (
                  <button
                    className="btn btn--ghost btn--sm"
                    type="button"
                    onClick={() => void markNotificationRead(notification.id)}
                  >
                    Mark read
                  </button>
                ) : (
                  <small className="muted">Read</small>
                )}
              </li>
            ))}
          </ul>
        )}
        {unreadNotifications.length > 0 ? (
          <p className="muted">Unread: {unreadNotifications.length}</p>
        ) : null}
      </section>

      {organization ? (
        <section className="card">
          <h2>Runtime configuration</h2>
          <p className="muted">
            Frontend URL: {appConfig.appUrl}. Subscription billing and email delivery require the backend integration keys from `.env`.
          </p>
          <div className="settings-grid">
            <div>
              <p className="muted">Stripe customer</p>
              <p>{organization.stripeCustomerId || 'Will be created on first checkout'}</p>
            </div>
            <div>
              <p className="muted">Subscription</p>
              <p>{organization.stripeSubscriptionId || 'No active Stripe subscription recorded yet'}</p>
            </div>
            <div>
              <p className="muted">Billing contact</p>
              <p>{organization.billingEmail || user.email}</p>
            </div>
            <div>
              <p className="muted">Current period end</p>
              <p>{organization.stripeCurrentPeriodEnd ? formatDateTime(organization.stripeCurrentPeriodEnd) : 'N/A'}</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}

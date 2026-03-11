import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Notice } from '../components/Notice'
import { appConfig } from '../config/env'
import { useAuth } from '../context/AuthContext'

const loginSchema = z.object({
  email: z.string().trim().email('Use a valid email address to continue.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
})

type LoginValues = z.infer<typeof loginSchema>

export const LoginPage = () => {
  const navigate = useNavigate()
  const { user, login, loading } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
    reset,
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: appConfig.enableDemoMode ? 'admin@example.com' : '',
      password: appConfig.enableDemoMode ? 'admin123' : '',
    },
  })

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [loading, user, navigate])

  const onSubmit = async (values: LoginValues) => {
    const result = await login(values)
    if (result.ok) {
      reset()
      navigate('/dashboard', { replace: true })
      return
    }

    setError('root', {
      type: 'manual',
      message: result.message ?? 'Unable to login. Please try again.',
    })
  }

  if (loading && !user) {
    return (
      <main className="login-shell">
        <section className="card auth-card">
          <p className="loading-placeholder">Checking your session…</p>
        </section>
      </main>
    )
  }

  return (
    <main className="login-shell">
      <section className="card auth-card">
        <p className="eyebrow">{appConfig.enableDemoMode ? 'Freelance portfolio demo' : 'Secure login'}</p>
        <h1>Client Portal Login</h1>
        <p className="auth-copy">
          {appConfig.enableDemoMode
            ? 'Sign in with one of the seeded demo accounts. This app intentionally mirrors a real freelance workflow.'
            : `Use the credentials provisioned for your deployment. Contact ${appConfig.supportEmail} if access is unavailable.`}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="form-stack" aria-busy={isSubmitting}>
          <label>
            Email
            <input type="email" autoComplete="username" {...register('email')} />
          </label>
          {errors.email ? <p className="error">{errors.email.message}</p> : null}

          <label>
            Password
            <input type="password" autoComplete="current-password" {...register('password')} />
          </label>
          {errors.password ? <p className="error">{errors.password.message}</p> : null}

          {isSubmitting ? <p className="status">Signing in...</p> : null}
          {errors.root ? (
            <Notice title="Unable to sign in" message={errors.root.message} tone="error" />
          ) : null}

          <button className="btn btn--primary" type="submit" disabled={isSubmitting}>
            Login
          </button>
        </form>

        {appConfig.enableDemoMode ? (
          <>
            <p className="muted">
              Don&apos;t have an account? In this demo, use seeded credentials only.
            </p>
            <div className="demo-grid">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setValue('email', 'admin@example.com')
                  setValue('password', 'admin123')
                }}
              >
                Fill admin
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setValue('email', 'client@example.com')
                  setValue('password', 'client123')
                }}
              >
                Fill client
              </button>
            </div>
          </>
        ) : null}

        <Link to="/dashboard" className="skip-link">
          Continue if already authenticated
        </Link>
      </section>
    </main>
  )
}

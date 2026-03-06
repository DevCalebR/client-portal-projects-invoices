import { Link } from 'react-router-dom'

export const NotFoundPage = () => (
  <section className="card">
    <h1>404</h1>
    <p>This route does not exist.</p>
    <Link className="btn btn--primary" to="/dashboard">
      Go to dashboard
    </Link>
  </section>
)

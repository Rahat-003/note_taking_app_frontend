// Shared frame for the sign-in and create-account pages.
export default function AuthLayout({ title, subtitle, error, children, footer }) {
  return (
    <div className="auth">
      <div className="auth-inner">
        <div className="auth-brand"><span className="brand-mark">SN</span>Secure Notes</div>
        <section className="card auth-card">
          <div className="auth-title">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          {error && <div className="alert" role="alert">{error}</div>}
          {children}
        </section>
        <p className="auth-footer">{footer}</p>
      </div>
    </div>
  );
}

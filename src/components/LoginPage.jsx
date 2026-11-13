import { useState } from 'react';
import { api } from '../api.js';
import { Link } from '../router.jsx';
import AuthLayout from './AuthLayout.jsx';
import { FieldError, invalidProps } from './ErrorAlert.jsx';

/** notice: why the previous session ended (expired token, deactivated account), shown until the next attempt. */
export default function LoginPage({ onAuth, notice = null }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setTried(true);
    setError(null);
    try {
      onAuth(await api('/auth/login', { method: 'POST', body: form }));
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back. Sign in to your notes."
      error={error ?? (tried ? null : notice)}
      footer={<>Don&apos;t have an account? <Link to="/register">Create one</Link></>}
    >
      <form className="form" onSubmit={submit}>
        <label className="field">
          Email
          <input type="email" required autoFocus autoComplete="email" value={form.email} onChange={set('email')} {...invalidProps(error, 'email', 'LoginPage-email-error')} />
          <FieldError error={error} field="email" id="LoginPage-email-error" />
        </label>
        <label className="field">
          Password
          <input type="password" required autoComplete="current-password" value={form.password} onChange={set('password')} {...invalidProps(error, 'password', 'LoginPage-password-error')} />
          <FieldError error={error} field="password" id="LoginPage-password-error" />
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </AuthLayout>
  );
}

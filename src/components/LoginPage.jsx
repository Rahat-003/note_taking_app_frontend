import { useState } from 'react';
import { api } from '../api.js';
import { Link } from '../router.jsx';
import AuthLayout from './AuthLayout.jsx';

export default function LoginPage({ onAuth }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onAuth(await api('/auth/login', { method: 'POST', body: form }));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back. Sign in to your notes."
      error={error}
      footer={<>Don&apos;t have an account? <Link to="/register">Create one</Link></>}
    >
      <form className="form" onSubmit={submit}>
        <label className="field">
          Email
          <input type="email" required autoFocus autoComplete="email" value={form.email} onChange={set('email')} />
        </label>
        <label className="field">
          Password
          <input type="password" required autoComplete="current-password" value={form.password} onChange={set('password')} />
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </AuthLayout>
  );
}

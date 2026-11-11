import { useState } from 'react';
import { api } from '../api.js';
import { Link } from '../router.jsx';
import AuthLayout from './AuthLayout.jsx';

export default function RegisterPage({ onAuth }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onAuth(await api('/auth/register', { method: 'POST', body: form }));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle="It only takes a name, an email and a password."
      error={error}
      footer={<>Already have an account? <Link to="/login">Sign in</Link></>}
    >
      <form className="form" onSubmit={submit}>
        <label className="field">
          Name
          <input required autoFocus maxLength={100} autoComplete="name" value={form.name} onChange={set('name')} />
        </label>
        <label className="field">
          Email
          <input type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
        </label>
        <label className="field">
          Password
          <input type="password" required minLength={8} maxLength={72} autoComplete="new-password"
            value={form.password} onChange={set('password')} />
          <span className="field-hint">At least 8 characters.</span>
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthLayout>
  );
}

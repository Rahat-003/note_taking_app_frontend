import { useState } from 'react';
import { api } from '../api.js';
import { Link } from '../router.jsx';
import AuthLayout from './AuthLayout.jsx';
import { FieldError, invalidProps } from './ErrorAlert.jsx';

export default function RegisterPage({ onAuth }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onAuth(await api('/auth/register', { method: 'POST', body: form }));
    } catch (err) {
      setError(err);
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
          <input required autoFocus maxLength={100} autoComplete="name" value={form.name} onChange={set('name')} {...invalidProps(error, 'name', 'RegisterPage-name-error')} />
          <FieldError error={error} field="name" id="RegisterPage-name-error" />
        </label>
        <label className="field">
          Email
          <input type="email" required autoComplete="email" value={form.email} onChange={set('email')} {...invalidProps(error, 'email', 'RegisterPage-email-error')} />
          <FieldError error={error} field="email" id="RegisterPage-email-error" />
        </label>
        <label className="field">
          Password
          <input type="password" required minLength={8} maxLength={72} autoComplete="new-password"
            value={form.password} onChange={set('password')} {...invalidProps(error, 'password', 'RegisterPage-password-error')} />
          <FieldError error={error} field="password" id="RegisterPage-password-error" />
          <span className="field-hint">At least 8 characters.</span>
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthLayout>
  );
}

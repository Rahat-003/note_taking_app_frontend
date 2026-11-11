import { useState } from 'react';
import { api, splitList } from '../api.js';

export default function Profile({ user, onUpdated, onError }) {
  const [form, setForm] = useState({ name: user.name, interests: (user.interests || []).join(', '), password: '' });
  const [saved, setSaved] = useState(false);
  const set = (key) => (e) => { setSaved(false); setForm({ ...form, [key]: e.target.value }); };

  async function save(e) {
    e.preventDefault();
    try {
      const body = { name: form.name, interests: splitList(form.interests) };
      if (form.password) body.password = form.password;
      const res = await api('/auth/me', { method: 'PATCH', body });
      onUpdated(res.user);
      setForm({ ...form, password: '' });
      setSaved(true);
    } catch (err) { onError(err.message); }
  }

  return (
    <section className="card" style={{ maxWidth: 560 }}>
      <div className="card-header">
        <div>
          <h2>Profile</h2>
          <span className="card-subtitle">{user.email}</span>
        </div>
        <span className={`badge ${user.role?.name === 'admin' ? 'badge-admin' : ''}`}>{user.role?.name ?? 'no role'}</span>
      </div>
      <form className="form" onSubmit={save}>
        <input placeholder="Name" required value={form.name} onChange={set('name')} />
        <input placeholder="Interests, comma separated" value={form.interests} onChange={set('interests')} />
        <input type="password" placeholder="New password (optional)" minLength={8} autoComplete="new-password"
          value={form.password} onChange={set('password')} />
        <div className="form-actions">
          <button className="btn btn-primary">Save profile</button>
          {saved && <span className="success">Saved</span>}
        </div>
      </form>
    </section>
  );
}
